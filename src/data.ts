export type Section = 'dashboard' | 'employees' | 'contracts' | 'affiliations' | 'reports'

export type EmployeeStatus = 'Activo' | 'En inducción' | 'Licencia'
export type DocumentStatus = 'Completo' | 'Pendiente' | 'En revisión'
export type ContractStatus = 'Vigente' | 'Próximo a vencer' | 'En renovación'
export type AffiliationStatus = 'Validado' | 'Pendiente' | 'En revisión'
export type AppRole = 'Administrador' | 'Recursos Humanos' | 'Gerencia' | 'Empleado'
export type DocumentCategory = 'Contrato' | 'Identificación' | 'Afiliación' | 'Certificado'
export type EmployeeDocumentStatus = 'Validado' | 'Pendiente validación'

export interface Employee {
  id: string
  name: string
  document: string
  role: string
  area: string
  email: string
  phone: string
  city: string
  startDate: string
  contractEnd: string
  salary: number
  status: EmployeeStatus
  documents: DocumentStatus
}

export interface Affiliation {
  id: string
  employeeId: string
  type: 'EPS' | 'ARL' | 'Pensión' | 'Caja'
  provider: string
  status: AffiliationStatus
  updated: string
}

export interface EmployeeDocument {
  id: string
  employeeId: string
  name: string
  category: DocumentCategory
  status: EmployeeDocumentStatus
  uploadedAt: string
  storagePath?: string
}

export interface AuditEntry {
  id: string
  action: string
  detail: string
  createdAt: string
}

export interface TimelineEntry {
  title: string
  detail: string
  time: string
}

export const navigation: Array<{ id: Section; label: string; symbol: string }> = [
  { id: 'dashboard', label: 'Resumen', symbol: '▦' },
  { id: 'employees', label: 'Empleados', symbol: '◎' },
  { id: 'contracts', label: 'Contratos', symbol: '▤' },
  { id: 'affiliations', label: 'Afiliaciones', symbol: '✓' },
  { id: 'reports', label: 'Reportes', symbol: '◫' },
]

export const initialEmployees: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Laura Jiménez',
    document: '1.098.235.410',
    role: 'Analista de selección',
    area: 'Talento Humano',
    email: 'laura.jimenez@empresa.demo',
    phone: '310 555 0134',
    city: 'Pereira',
    startDate: '2024-08-12',
    contractEnd: '2026-08-11',
    salary: 3250000,
    status: 'Activo',
    documents: 'Completo',
  },
  {
    id: 'EMP-002',
    name: 'Carlos Medina',
    document: '1.088.490.122',
    role: 'Coordinador administrativo',
    area: 'Administración',
    email: 'carlos.medina@empresa.demo',
    phone: '315 555 0189',
    city: 'Dosquebradas',
    startDate: '2022-02-07',
    contractEnd: '2027-02-06',
    salary: 4680000,
    status: 'Activo',
    documents: 'Completo',
  },
  {
    id: 'EMP-003',
    name: 'Mariana Torres',
    document: '1.004.785.330',
    role: 'Auxiliar contable',
    area: 'Finanzas',
    email: 'mariana.torres@empresa.demo',
    phone: '316 555 0220',
    city: 'Pereira',
    startDate: '2026-05-04',
    contractEnd: '2026-11-03',
    salary: 2100000,
    status: 'En inducción',
    documents: 'En revisión',
  },
  {
    id: 'EMP-004',
    name: 'Andrés Salazar',
    document: '1.094.009.441',
    role: 'Técnico instalador',
    area: 'Operaciones',
    email: 'andres.salazar@empresa.demo',
    phone: '320 555 0645',
    city: 'Manizales',
    startDate: '2025-06-01',
    contractEnd: '2026-06-01',
    salary: 2450000,
    status: 'Activo',
    documents: 'Pendiente',
  },
  {
    id: 'EMP-005',
    name: 'Valentina Ríos',
    document: '1.020.677.904',
    role: 'Asesora comercial',
    area: 'Comercial',
    email: 'valentina.rios@empresa.demo',
    phone: '311 555 0776',
    city: 'Armenia',
    startDate: '2025-07-15',
    contractEnd: '2026-07-14',
    salary: 2700000,
    status: 'Licencia',
    documents: 'Completo',
  },
  {
    id: 'EMP-006',
    name: 'Santiago Vega',
    document: '1.115.604.210',
    role: 'Desarrollador frontend',
    area: 'Tecnología',
    email: 'santiago.vega@empresa.demo',
    phone: '300 555 0912',
    city: 'Pereira',
    startDate: '2025-12-01',
    contractEnd: '2026-12-01',
    salary: 5100000,
    status: 'Activo',
    documents: 'Completo',
  },
]

export const initialAffiliations: Affiliation[] = [
  { id: 'AF-001', employeeId: 'EMP-003', type: 'EPS', provider: 'Proveedor demo A', status: 'En revisión', updated: '26 may' },
  { id: 'AF-002', employeeId: 'EMP-003', type: 'ARL', provider: 'Proveedor demo B', status: 'Pendiente', updated: '26 may' },
  { id: 'AF-003', employeeId: 'EMP-004', type: 'Caja', provider: 'Proveedor demo C', status: 'Pendiente', updated: '24 may' },
  { id: 'AF-004', employeeId: 'EMP-001', type: 'Pensión', provider: 'Proveedor demo D', status: 'Validado', updated: '21 may' },
  { id: 'AF-005', employeeId: 'EMP-006', type: 'EPS', provider: 'Proveedor demo A', status: 'Validado', updated: '18 may' },
]

export const initialDocuments: EmployeeDocument[] = [
  { id: 'DOC-001', employeeId: 'EMP-001', name: 'Contrato laboral.pdf', category: 'Contrato', status: 'Validado', uploadedAt: '12 ago 2024' },
  { id: 'DOC-002', employeeId: 'EMP-001', name: 'Documento identidad.pdf', category: 'Identificación', status: 'Validado', uploadedAt: '12 ago 2024' },
  { id: 'DOC-003', employeeId: 'EMP-003', name: 'Contrato firmado.pdf', category: 'Contrato', status: 'Pendiente validación', uploadedAt: '04 may 2026' },
  { id: 'DOC-004', employeeId: 'EMP-004', name: 'Certificado caja.pdf', category: 'Afiliación', status: 'Pendiente validación', uploadedAt: '24 may 2026' },
]

export const initialAudit: AuditEntry[] = [
  { id: 'AUD-001', action: 'Empleado registrado', detail: 'Mariana Torres fue vinculada al expediente digital.', createdAt: 'Hoy, 09:14' },
  { id: 'AUD-002', action: 'Documento cargado', detail: 'Certificado caja.pdf para Andrés Salazar.', createdAt: 'Ayer, 16:40' },
  { id: 'AUD-003', action: 'Alerta generada', detail: 'Contrato de Andrés Salazar próximo a vencer.', createdAt: 'Ayer, 11:25' },
]

export const activity: TimelineEntry[] = [
  { title: 'Nueva contratación registrada', detail: 'Mariana Torres · Auxiliar contable', time: 'Hoy, 09:14' },
  { title: 'Documento pendiente', detail: 'Andrés Salazar · Certificado de afiliación', time: 'Ayer, 16:40' },
  { title: 'Contrato próximo a vencer', detail: 'Andrés Salazar · vencimiento en junio', time: 'Ayer, 11:25' },
  { title: 'Evaluación programada', detail: 'Ciclo semestral · área comercial', time: '23 may' },
]
