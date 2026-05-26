import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import {
  activity,
  initialAffiliations,
  initialAudit,
  initialDocuments,
  initialEmployees,
  navigation,
  type Affiliation,
  type AppRole,
  type AuditEntry,
  type Employee,
  type EmployeeDocument,
  type DocumentCategory,
  type Section,
} from './data'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  loadAffiliations,
  loadAudit,
  loadDocuments,
  loadEmployees,
  loadProfile,
  markAffiliationValidated,
  getDocumentUrl,
  recordAudit,
  saveEmployee,
  uploadDocument,
  validateDocument,
} from './services/talentService'

function App() {
  const [section, setSection] = useState<Section>('dashboard')
  const [employees, setEmployees] = useState<Employee[]>(() =>
    isSupabaseConfigured ? [] : initialEmployees,
  )
  const [affiliations, setAffiliations] = useState<Affiliation[]>(() =>
    isSupabaseConfigured ? [] : initialAffiliations,
  )
  const [documents, setDocuments] = useState<EmployeeDocument[]>(() =>
    isSupabaseConfigured ? [] : initialDocuments,
  )
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() =>
    isSupabaseConfigured ? [] : initialAudit,
  )
  const [role, setRole] = useState<AppRole>(() =>
    isSupabaseConfigured ? 'Empleado' : 'Recursos Humanos',
  )
  const [search, setSearch] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [databaseError, setDatabaseError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(Boolean(data.session))
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(Boolean(nextSession))
      setDatabaseError(null)
      setAuthReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      return
    }

    let cancelled = false
    Promise.all([
      loadProfile(session.user.id),
      loadEmployees(),
      loadAffiliations(),
      loadDocuments(),
      loadAudit(),
    ])
      .then(([profile, storedEmployees, storedAffiliations, storedDocuments, storedAudit]) => {
        if (!cancelled) {
          setRole(profile.role)
          setEmployees(storedEmployees)
          setAffiliations(storedAffiliations)
          setDocuments(storedDocuments)
          setAuditEntries(storedAudit)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDatabaseError('No fue posible consultar las tablas. Verifica que hayas ejecutado ambas migraciones SQL.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const isManagement = role === 'Administrador' || role === 'Recursos Humanos'
  const canSeeReports = role !== 'Empleado'
  const visibleEmployees = !isSupabaseConfigured && role === 'Empleado'
    ? employees.filter((employee) => employee.id === 'EMP-001')
    : employees
  const visibleAffiliations = !isSupabaseConfigured && role === 'Empleado'
    ? affiliations.filter((item) => item.employeeId === 'EMP-001')
    : affiliations
  const visibleDocuments = !isSupabaseConfigured && role === 'Empleado'
    ? documents.filter((item) => item.employeeId === 'EMP-001')
    : documents
  const selectedEmployee = visibleEmployees.find((employee) => employee.id === selectedEmployeeId)
  const query = search.toLocaleLowerCase()
  const filteredEmployees = visibleEmployees.filter((employee) =>
    `${employee.name} ${employee.document} ${employee.area} ${employee.role}`
      .toLocaleLowerCase()
      .includes(query),
  )
  const upcomingContracts = visibleEmployees
    .filter((employee) => daysUntil(employee.contractEnd) <= 90)
    .sort((a, b) => a.contractEnd.localeCompare(b.contractEnd))
  const activeEmployees = visibleEmployees.filter((employee) => employee.status !== 'Licencia').length
  const pendingAffiliations = visibleAffiliations.filter((item) => item.status !== 'Validado').length

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2800)
  }

  function addLocalAudit(action: string, detail: string) {
    setAuditEntries((current) => [
      { id: crypto.randomUUID(), action, detail, createdAt: 'Ahora' },
      ...current,
    ])
  }

  async function logAction(action: string, detail: string) {
    if (!isSupabaseConfigured) {
      addLocalAudit(action, detail)
      return
    }

    try {
      const entry = await recordAudit(action, detail)
      setAuditEntries((current) => [entry, ...current])
    } catch {
      // An audit failure does not roll back the action already performed.
    }
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextId = isSupabaseConfigured
      ? `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
      : `EMP-${String(employees.length + 1).padStart(3, '0')}`
    const newEmployee: Employee = {
      id: nextId,
      name: String(form.get('name')),
      document: String(form.get('document')),
      role: String(form.get('role')),
      area: String(form.get('area')),
      email: String(form.get('email')),
      phone: 'Pendiente',
      city: 'Pereira',
      startDate: String(form.get('startDate')),
      contractEnd: String(form.get('contractEnd')),
      salary: Number(form.get('salary')),
      status: 'En inducción',
      documents: 'Pendiente',
    }

    try {
      const storedEmployee = isSupabaseConfigured
        ? await saveEmployee(newEmployee)
        : newEmployee
      setEmployees((current) => [storedEmployee, ...current])
    } catch {
      notify('No se pudo guardar el empleado en Supabase.')
      return
    }
    setIsCreateOpen(false)
    setSelectedEmployeeId(newEmployee.id)
    setSection('employees')
    void logAction('Empleado registrado', `${newEmployee.name} fue incorporado al expediente digital.`)
    notify(isSupabaseConfigured ? 'Empleado guardado en Supabase.' : 'Empleado guardado localmente para la demostración.')
  }

  async function validateAffiliation(id: string) {
    try {
      const updated = isSupabaseConfigured
        ? await markAffiliationValidated(id)
        : { ...affiliations.find((item) => item.id === id)!, status: 'Validado' as const, updated: 'Ahora' }
      setAffiliations((current) =>
        current.map((item) => item.id === id ? updated : item),
      )
      void logAction('Afiliación validada', `El soporte ${id} se marcó como validado.`)
      notify('Soporte marcado como validado. No se envió información externa.')
    } catch {
      notify('No se pudo actualizar la afiliación en Supabase.')
    }
  }

  async function addDocument(employee: Employee, file: File, category: DocumentCategory) {
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowedMimeTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      notify('El documento debe ser PDF, PNG o JPG y pesar máximo 5 MB.')
      return
    }

    try {
      const document = isSupabaseConfigured
        ? await uploadDocument(employee.id, file, category)
        : {
            id: crypto.randomUUID(),
            employeeId: employee.id,
            name: file.name,
            category,
            status: 'Pendiente validación' as const,
            uploadedAt: 'Ahora',
          }
      setDocuments((current) => [document, ...current])
      void logAction('Documento cargado', `${file.name} se agregó al expediente de ${employee.name}.`)
      notify(isSupabaseConfigured ? 'Documento guardado en Storage privado.' : 'Documento añadido en modo demostración.')
    } catch {
      notify('No se pudo cargar el documento.')
    }
  }

  async function approveDocument(document: EmployeeDocument) {
    try {
      const updated = isSupabaseConfigured
        ? await validateDocument(document.id)
        : { ...document, status: 'Validado' as const }
      setDocuments((current) => current.map((item) => item.id === document.id ? updated : item))
      void logAction('Documento validado', `${document.name} fue aprobado.`)
      notify('Documento validado correctamente.')
    } catch {
      notify('No se pudo validar el documento.')
    }
  }

  async function viewDocument(document: EmployeeDocument) {
    if (!isSupabaseConfigured || !document.storagePath) {
      notify('Vista previa disponible al conectar Storage de Supabase.')
      return
    }

    try {
      const url = await getDocumentUrl(document.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      notify('No se pudo abrir el documento privado.')
    }
  }

  function exportEmployeesCsv() {
    const headers = ['Código', 'Nombre', 'Área', 'Cargo', 'Estado', 'Vigencia contrato']
    const rows = visibleEmployees.map((employee) => [
      employee.id,
      employee.name,
      employee.area,
      employee.role,
      employee.status,
      employee.contractEnd,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'empleados-talento360-demo.csv'
    link.click()
    URL.revokeObjectURL(url)
    notify('Reporte CSV generado con los registros visibles.')
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  if (isSupabaseConfigured && !authReady) {
    return <LoadingState message="Comprobando sesión segura..." />
  }

  if (isSupabaseConfigured && !session) {
    return <AuthScreen />
  }

  if (isSupabaseConfigured && isLoading) {
    return <LoadingState message="Cargando expediente y permisos..." />
  }

  return (
    <div className="app-shell">
      <Sidebar
        section={section}
        onSelect={setSection}
        isConnected={isSupabaseConfigured}
        role={role}
        onRoleChange={!isSupabaseConfigured
          ? (nextRole) => {
              setRole(nextRole)
              setSelectedEmployeeId(null)
              if (nextRole === 'Empleado' && section === 'reports') {
                setSection('dashboard')
              }
            }
          : undefined}
        userEmail={session?.user.email}
        onSignOut={supabase ? signOut : undefined}
      />
      <main className="workspace">
        <Topbar
          search={search}
          onSearch={setSearch}
          onCreate={isManagement ? () => setIsCreateOpen(true) : undefined}
        />
        <div className="demo-banner">
          <strong>{isSupabaseConfigured ? 'Supabase activo' : 'Modo local'}</strong>
          <span>Datos ficticios · sin conexión a entidades externas · sin procesamiento real de nómina</span>
        </div>
        {databaseError && <div className="error-banner">{databaseError}</div>}
        {isLoading && <div className="sync-status">Sincronizando datos con Supabase...</div>}
        {section === 'dashboard' && (
          <Dashboard
            employees={visibleEmployees}
            activeEmployees={activeEmployees}
            pendingAffiliations={pendingAffiliations}
            upcomingContracts={upcomingContracts}
            auditEntries={auditEntries}
            onNavigate={setSection}
          />
        )}
        {section === 'employees' && (
          <Employees
            employees={filteredEmployees}
            onSelect={setSelectedEmployeeId}
            onCreate={isManagement ? () => setIsCreateOpen(true) : undefined}
          />
        )}
        {section === 'contracts' && <Contracts employees={visibleEmployees} onSelect={setSelectedEmployeeId} />}
        {section === 'affiliations' && (
          <Affiliations
            affiliations={visibleAffiliations}
            employees={visibleEmployees}
            onValidate={isManagement ? validateAffiliation : undefined}
          />
        )}
        {section === 'reports' && canSeeReports && <Reports onExport={exportEmployeesCsv} />}
      </main>
      {selectedEmployee && (
        <EmployeePanel
          employee={selectedEmployee}
          affiliations={visibleAffiliations.filter((item) => item.employeeId === selectedEmployee.id)}
          documents={visibleDocuments.filter((item) => item.employeeId === selectedEmployee.id)}
          canManage={isManagement}
          onAddDocument={addDocument}
          onApproveDocument={approveDocument}
          onViewDocument={viewDocument}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}
      {isCreateOpen && isManagement && (
        <CreateEmployeeModal onClose={() => setIsCreateOpen(false)} onSubmit={createEmployee} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      return
    }

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    setWorking(true)
    setMessage(null)

    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    setWorking(false)
    if (error) {
      setMessage(error.message)
      return
    }

    if (mode === 'signup') {
      setMessage('Cuenta registrada. Si está habilitada la confirmación, revisa tu correo antes de ingresar.')
      setMode('login')
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="brand-mark">TH</div>
        <h1>Talento360</h1>
        <p>Demo conectada a Supabase para administrar empleados, contratos y soportes internos.</p>
        <span>Sin integraciones con entidades externas ni nómina real.</span>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Ingresar' : 'Crear usuario demo'}</h2>
        <p>Accede a la información protegida por políticas RLS.</p>
        <Field label="Correo electrónico" name="email" type="email" placeholder="admin@empresa.demo" required />
        <Field label="Contraseña" name="password" type="password" placeholder="Mínimo 6 caracteres" required />
        {message && <p className="auth-message">{message}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={working}>
          {working ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrar usuario'}
        </button>
        <button
          className="text-button auth-toggle"
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage(null)
          }}
        >
          {mode === 'login' ? 'Crear una cuenta para la demo' : 'Ya tengo una cuenta'}
        </button>
      </form>
    </main>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <main className="loading-state">
      <div className="brand-mark">TH</div>
      <p>{message}</p>
    </main>
  )
}

function Sidebar({
  section,
  onSelect,
  isConnected,
  role,
  onRoleChange,
  userEmail,
  onSignOut,
}: {
  section: Section
  onSelect: (section: Section) => void
  isConnected: boolean
  role: AppRole
  onRoleChange?: (role: AppRole) => void
  userEmail?: string
  onSignOut?: () => void
}) {
  const availableNavigation = role === 'Empleado'
    ? navigation.filter((item) => item.id !== 'reports')
    : navigation

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">TH</div>
        <div>
          <strong>Talento360</strong>
          <small>Gestión humana</small>
        </div>
      </div>
      <nav aria-label="Navegación principal">
        {availableNavigation.map((item) => (
          <button
            key={item.id}
            className={section === item.id ? 'nav-item active' : 'nav-item'}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span>{item.symbol}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-card">
        <small>{isConnected ? 'Supabase conectado' : 'Proyecto académico'}</small>
        <strong>Sistema de Gestión de Talento Humano</strong>
        <p>Versión demostrativa 0.2</p>
      </div>
      {onRoleChange && (
        <label className="role-select">
          <span>Visualizar como</span>
          <select value={role} onChange={(event) => onRoleChange(event.target.value as AppRole)}>
            <option>Administrador</option>
            <option>Recursos Humanos</option>
            <option>Gerencia</option>
            <option>Empleado</option>
          </select>
        </label>
      )}
      <div className="user-card">
        <span className="avatar">MH</span>
        <div>
          <strong>{userEmail ?? 'Michael Hurtado'}</strong>
          <small>{role}</small>
        </div>
      </div>
      {onSignOut && <button className="logout-button" type="button" onClick={onSignOut}>Cerrar sesión</button>}
    </aside>
  )
}

function Topbar({
  search,
  onSearch,
  onCreate,
}: {
  search: string
  onSearch: (value: string) => void
  onCreate?: () => void
}) {
  return (
    <header className="topbar">
      <label className="search">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar colaborador, cargo o documento"
        />
      </label>
      <div className="topbar-actions">
        <button type="button" className="notification" aria-label="Notificaciones">
          ◦
          <span />
        </button>
        {onCreate && (
          <button type="button" className="primary-button" onClick={onCreate}>
            + Nuevo empleado
          </button>
        )}
      </div>
    </header>
  )
}

function Dashboard({
  employees,
  activeEmployees,
  pendingAffiliations,
  upcomingContracts,
  auditEntries,
  onNavigate,
}: {
  employees: Employee[]
  activeEmployees: number
  pendingAffiliations: number
  upcomingContracts: Employee[]
  auditEntries: AuditEntry[]
  onNavigate: (section: Section) => void
}) {
  const completeDocuments = employees.filter((employee) => employee.documents === 'Completo').length

  return (
    <section className="page">
      <PageHeading
        title="Resumen general"
        description="Seguimiento operativo del talento humano"
        right={<span className="date-chip">Mayo 2026</span>}
      />
      <div className="metrics-grid">
        <MetricCard label="Colaboradores registrados" value={employees.length} change="+1 este mes" icon="◎" />
        <MetricCard label="Activos e inducción" value={activeEmployees} change="Gestión al día" icon="↗" />
        <MetricCard label="Afiliaciones pendientes" value={pendingAffiliations} change="Requieren soporte" icon="!" warning />
        <MetricCard label="Expedientes completos" value={`${completeDocuments}/${employees.length}`} change="Control documental" icon="✓" />
      </div>
      <div className="dashboard-grid">
        <article className="surface contract-alerts">
          <div className="surface-header">
            <div>
              <h2>Contratos por vencer</h2>
              <p>Próximos 90 días</p>
            </div>
            <button type="button" className="text-button" onClick={() => onNavigate('contracts')}>
              Ver todos
            </button>
          </div>
          {upcomingContracts.map((employee) => (
            <div className="contract-row" key={employee.id}>
              <Avatar name={employee.name} />
              <div>
                <strong>{employee.name}</strong>
                <small>{employee.role}</small>
              </div>
              <span className="days">{daysUntil(employee.contractEnd)} días</span>
            </div>
          ))}
        </article>
        <article className="surface process-panel">
          <div className="surface-header">
            <div>
              <h2>Estado de procesos</h2>
              <p>Ciclo del colaborador</p>
            </div>
          </div>
          <Progress label="Selección y contratación" amount={82} />
          <Progress label="Afiliaciones" amount={64} />
          <Progress label="Documentación" amount={76} />
          <Progress label="Evaluación de desempeño" amount={58} />
        </article>
        <article className="surface activity-panel">
          <div className="surface-header">
            <h2>Actividad reciente</h2>
          </div>
          {(auditEntries.length > 0 ? auditEntries : activity.map((entry, index) => ({
            id: `fallback-${index}`,
            action: entry.title,
            detail: entry.detail,
            createdAt: entry.time,
          }))).map((entry) => (
            <div className="timeline" key={entry.id}>
              <span />
              <div>
                <strong>{entry.action}</strong>
                <p>{entry.detail}</p>
              </div>
              <small>{entry.createdAt}</small>
            </div>
          ))}
        </article>
      </div>
    </section>
  )
}

function Employees({
  employees,
  onSelect,
  onCreate,
}: {
  employees: Employee[]
  onSelect: (id: string) => void
  onCreate?: () => void
}) {
  return (
    <section className="page">
      <PageHeading
        title="Empleados"
        description="Directorio y expedientes digitales"
        right={onCreate && <button className="secondary-button" onClick={onCreate}>Registrar ingreso</button>}
      />
      <article className="surface table-card">
        <div className="table-filter">
          <strong>{employees.length} resultados</strong>
          <span>Filtros: Todos los estados</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Área</th>
              <th>Fecha ingreso</th>
              <th>Documentos</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="person-cell">
                    <Avatar name={employee.name} />
                    <div>
                      <strong>{employee.name}</strong>
                      <small>{employee.role}</small>
                    </div>
                  </div>
                </td>
                <td>{employee.area}</td>
                <td>{formatDate(employee.startDate)}</td>
                <td><Badge value={employee.documents} /></td>
                <td><Badge value={employee.status} /></td>
                <td>
                  <button className="text-button" type="button" onClick={() => onSelect(employee.id)}>
                    Ver ficha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && <p className="empty">No hay colaboradores que coincidan con la búsqueda.</p>}
      </article>
    </section>
  )
}

function Contracts({ employees, onSelect }: { employees: Employee[]; onSelect: (id: string) => void }) {
  return (
    <section className="page">
      <PageHeading title="Contratos" description="Vigencias, alertas y renovación documental" />
      <div className="compact-metrics">
        <MetricCard label="Contratos vigentes" value={employees.filter((item) => daysUntil(item.contractEnd) > 90 && item.status !== 'Licencia').length} change="Datos simulados" icon="▤" />
        <MetricCard label="Próximos a vencer" value={employees.filter((item) => daysUntil(item.contractEnd) <= 90).length} change="Acción requerida" icon="!" warning />
        <MetricCard label="En renovación" value="1" change="Pendiente aprobación" icon="↻" />
      </div>
      <article className="surface cards-list">
        {employees.map((employee) => {
          const days = daysUntil(employee.contractEnd)
          const contractStatus = days <= 90 ? 'Próximo a vencer' : employee.status === 'Licencia' ? 'En renovación' : 'Vigente'
          return (
            <div className="contract-card" key={employee.id}>
              <div className="contract-person">
                <Avatar name={employee.name} />
                <div>
                  <strong>{employee.name}</strong>
                  <small>{employee.area} · {employee.id}</small>
                </div>
              </div>
              <div>
                <small>Finalización</small>
                <strong>{formatDate(employee.contractEnd)}</strong>
              </div>
              <div>
                <small>Salario demo</small>
                <strong>{formatCurrency(employee.salary)}</strong>
              </div>
              <Badge value={contractStatus} />
              <button className="text-button" type="button" onClick={() => onSelect(employee.id)}>Detalle</button>
            </div>
          )
        })}
      </article>
    </section>
  )
}

function Affiliations({
  affiliations,
  employees,
  onValidate,
}: {
  affiliations: Affiliation[]
  employees: Employee[]
  onValidate?: (id: string) => void
}) {
  return (
    <section className="page">
      <PageHeading
        title="Afiliaciones"
        description="Registro interno de soportes, sin conexión a entidades"
        right={<span className="lock-chip">Solo simulación</span>}
      />
      <article className="surface affiliation-board">
        {affiliations.map((item) => {
          const employee = employees.find((record) => record.id === item.employeeId)
          return (
            <div className="affiliation-card" key={item.id}>
              <div className="affiliation-title">
                <span className="type-tag">{item.type}</span>
                <Badge value={item.status} />
              </div>
              <strong>{employee?.name}</strong>
              <p>{item.provider}</p>
              <div className="affiliation-footer">
                <small>Actualizado: {item.updated}</small>
                {item.status !== 'Validado' && onValidate ? (
                  <button type="button" className="text-button" onClick={() => onValidate(item.id)}>
                    Validar soporte
                  </button>
                ) : item.status === 'Validado' ? (
                  <span className="confirmed">Completado</span>
                ) : (
                  <span className="read-only">Solo lectura</span>
                )}
              </div>
            </div>
          )
        })}
      </article>
    </section>
  )
}

function Reports({ onExport }: { onExport: () => void }) {
  const reports = [
    { title: 'Colaboradores activos', detail: 'Directorio consolidado por área', period: 'Actualizado hoy' },
    { title: 'Contratos por vencer', detail: 'Alertas de terminación y renovación', period: 'Próximos 90 días' },
    { title: 'Afiliaciones pendientes', detail: 'Soportes faltantes por empleado', period: 'Corte mayo 2026' },
    { title: 'Estado documental', detail: 'Expedientes completos y pendientes', period: 'Corte mayo 2026' },
  ]
  return (
    <section className="page">
      <PageHeading title="Reportes" description="Indicadores operativos para gerencia y talento humano" />
      <div className="reports-grid">
        {reports.map((report) => (
          <article className="surface report" key={report.title}>
            <span className="report-icon">▧</span>
            <h2>{report.title}</h2>
            <p>{report.detail}</p>
            <small>{report.period}</small>
            <button className="secondary-button" type="button" onClick={onExport}>Exportar CSV</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function EmployeePanel({
  employee,
  affiliations,
  documents,
  canManage,
  onAddDocument,
  onApproveDocument,
  onViewDocument,
  onClose,
}: {
  employee: Employee
  affiliations: Affiliation[]
  documents: EmployeeDocument[]
  canManage: boolean
  onAddDocument: (employee: Employee, file: File, category: DocumentCategory) => void
  onApproveDocument: (document: EmployeeDocument) => void
  onViewDocument: (document: EmployeeDocument) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'perfil' | 'contrato' | 'afiliaciones' | 'documentos'>('perfil')
  const [category, setCategory] = useState<DocumentCategory>('Contrato')

  return (
    <aside className="drawer" aria-label="Ficha del empleado">
      <button className="close-button" type="button" onClick={onClose}>×</button>
      <div className="profile-head">
        <Avatar name={employee.name} />
        <h2>{employee.name}</h2>
        <p>{employee.role}</p>
        <Badge value={employee.status} />
      </div>
      <div className="profile-tabs">
        <button className={tab === 'perfil' ? 'active' : ''} onClick={() => setTab('perfil')}>Perfil</button>
        <button className={tab === 'contrato' ? 'active' : ''} onClick={() => setTab('contrato')}>Contrato</button>
        <button className={tab === 'afiliaciones' ? 'active' : ''} onClick={() => setTab('afiliaciones')}>Afiliaciones</button>
        <button className={tab === 'documentos' ? 'active' : ''} onClick={() => setTab('documentos')}>Documentos</button>
      </div>
      {tab === 'perfil' && (
        <>
          <h3>Información laboral</h3>
          <Detail label="Identificación" value={employee.document} />
          <Detail label="Área" value={employee.area} />
          <Detail label="Ciudad" value={employee.city} />
          <Detail label="Correo" value={employee.email} />
          <Detail label="Teléfono" value={employee.phone} />
        </>
      )}
      {tab === 'contrato' && (
        <>
          <h3>Vinculación</h3>
          <Detail label="Cargo" value={employee.role} />
          <Detail label="Fecha ingreso" value={formatDate(employee.startDate)} />
          <Detail label="Vigencia hasta" value={formatDate(employee.contractEnd)} />
          <Detail label="Salario demo" value={formatCurrency(employee.salary)} />
          <div className="contract-notice">
            <strong>{daysUntil(employee.contractEnd)} días restantes</strong>
            <p>Alerta automática de vencimiento para gestión interna.</p>
          </div>
        </>
      )}
      {tab === 'afiliaciones' && (
        <>
          <h3>Registros internos</h3>
          {affiliations.length === 0 && <p className="drawer-empty">No hay registros vinculados.</p>}
          {affiliations.map((affiliation) => (
            <div className="file-row" key={affiliation.id}>
              <span>{affiliation.type}<small>{affiliation.provider}</small></span>
              <Badge value={affiliation.status} />
            </div>
          ))}
        </>
      )}
      {tab === 'documentos' && (
        <>
          <h3>Expediente documental</h3>
          {canManage && (
            <div className="upload-box">
              <select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
                <option>Contrato</option>
                <option>Identificación</option>
                <option>Afiliación</option>
                <option>Certificado</option>
              </select>
              <label className="upload-action">
                Subir PDF o imagen
                <input
                  accept=".pdf,image/png,image/jpeg"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      onAddDocument(employee, file, category)
                      event.target.value = ''
                    }
                  }}
                />
              </label>
            </div>
          )}
          {documents.length === 0 && <p className="drawer-empty">No hay documentos cargados.</p>}
          {documents.map((document) => (
            <div className="document-row" key={document.id}>
              <div>
                <strong>{document.name}</strong>
                <small>{document.category} · {document.uploadedAt}</small>
              </div>
              <Badge value={document.status} />
              <div className="document-actions">
                <button type="button" className="text-button" onClick={() => onViewDocument(document)}>Abrir</button>
                {canManage && document.status !== 'Validado' && (
                  <button type="button" className="text-button" onClick={() => onApproveDocument(document)}>Validar</button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </aside>
  )
}

function CreateEmployeeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-title">
          <div>
            <h2>Registrar empleado</h2>
            <p>Completa la información base del expediente laboral.</p>
          </div>
          <button type="button" className="close-button inline" onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <Field label="Nombre completo" name="name" placeholder="Ej. Daniela Moreno" required />
          <Field label="Documento" name="document" placeholder="1.000.000.000" required />
          <Field label="Cargo" name="role" placeholder="Analista" required />
          <Field label="Área" name="area" placeholder="Talento Humano" required />
          <Field label="Correo" name="email" type="email" placeholder="correo@empresa.demo" required />
          <Field label="Salario demo" name="salary" type="number" placeholder="2500000" required />
          <Field label="Fecha de ingreso" name="startDate" type="date" required />
          <Field label="Fin de contrato" name="contractEnd" type="date" required />
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="submit">Guardar empleado</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, ...props }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}

function PageHeading({ title, description, right }: { title: string; description: string; right?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {right}
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  icon,
  warning = false,
}: {
  label: string
  value: string | number
  change: string
  icon: string
  warning?: boolean
}) {
  return (
    <article className={warning ? 'metric warning' : 'metric'}>
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{change}</small>
    </article>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('')
  return <span className="avatar">{initials}</span>
}

function Badge({ value }: { value: string }) {
  const className = value === 'Completo' || value === 'Activo' || value === 'Validado' || value === 'Vigente'
    ? 'badge success'
    : value === 'Pendiente' || value === 'Pendiente validación' || value === 'Próximo a vencer'
      ? 'badge warning'
      : 'badge neutral'
  return <span className={className}>{value}</span>
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}

function Progress({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="progress-row">
      <div><span>{label}</span><strong>{amount}%</strong></div>
      <div className="progress"><span style={{ width: `${amount}%` }} /></div>
    </div>
  )
}

function daysUntil(date: string) {
  const today = new Date('2026-05-26T00:00:00')
  const target = new Date(`${date}T00:00:00`)
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000))
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

export default App
