import { supabase } from '../lib/supabase'
import type {
  Affiliation,
  AffiliationStatus,
  AppRole,
  AuditEntry,
  DocumentStatus,
  Employee,
  EmployeeDocument,
  EmployeeDocumentStatus,
  EmployeeStatus,
} from '../data'

interface EmployeeRow {
  id: string
  name: string
  document: string
  role: string
  area: string
  email: string
  phone: string
  city: string
  start_date: string
  contract_end: string
  salary: number
  status: EmployeeStatus
  documents: DocumentStatus
}

interface AffiliationRow {
  id: string
  employee_id: string
  type: Affiliation['type']
  provider: string
  status: AffiliationStatus
  updated_at: string
}

interface DocumentRow {
  id: string
  employee_id: string
  name: string
  category: EmployeeDocument['category']
  status: EmployeeDocumentStatus
  storage_path: string
  created_at: string
}

interface AuditRow {
  id: string
  action: string
  detail: string
  created_at: string
}

interface ProfileRow {
  role: AppRole
  employee_id: string | null
}

function client() {
  if (!supabase) {
    throw new Error('Supabase no ha sido configurado.')
  }

  return supabase
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    role: row.role,
    area: row.area,
    email: row.email,
    phone: row.phone,
    city: row.city,
    startDate: row.start_date,
    contractEnd: row.contract_end,
    salary: row.salary,
    status: row.status,
    documents: row.documents,
  }
}

function mapAffiliation(row: AffiliationRow): Affiliation {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    provider: row.provider,
    status: row.status,
    updated: new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(row.updated_at)),
  }
}

function mapDocument(row: DocumentRow): EmployeeDocument {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    category: row.category,
    status: row.status,
    storagePath: row.storage_path,
    uploadedAt: new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(row.created_at)),
  }
}

function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    action: row.action,
    detail: row.detail,
    createdAt: new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(row.created_at)),
  }
}

export async function loadProfile(userId: string) {
  const { data, error } = await client()
    .from('profiles')
    .select('role, employee_id')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data as ProfileRow
}

export async function loadEmployees() {
  const { data, error } = await client()
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as EmployeeRow[]).map(mapEmployee)
}

export async function loadAffiliations() {
  const { data, error } = await client()
    .from('affiliations')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as AffiliationRow[]).map(mapAffiliation)
}

export async function loadDocuments() {
  const { data, error } = await client()
    .from('employee_documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as DocumentRow[]).map(mapDocument)
}

export async function loadAudit() {
  const { data, error } = await client()
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    throw error
  }

  return (data as AuditRow[]).map(mapAudit)
}

export async function recordAudit(action: string, detail: string) {
  const { data, error } = await client()
    .from('audit_logs')
    .insert({ action, detail })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapAudit(data as AuditRow)
}

export async function saveEmployee(employee: Employee) {
  const { data, error } = await client()
    .from('employees')
    .insert({
      id: employee.id,
      name: employee.name,
      document: employee.document,
      role: employee.role,
      area: employee.area,
      email: employee.email,
      phone: employee.phone,
      city: employee.city,
      start_date: employee.startDate,
      contract_end: employee.contractEnd,
      salary: employee.salary,
      status: employee.status,
      documents: employee.documents,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapEmployee(data as EmployeeRow)
}

export async function markAffiliationValidated(id: string) {
  const { data, error } = await client()
    .from('affiliations')
    .update({ status: 'Validado', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapAffiliation(data as AffiliationRow)
}

export async function uploadDocument(employeeId: string, file: File, category: EmployeeDocument['category']) {
  const normalizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${employeeId}/${crypto.randomUUID()}-${normalizedName}`
  const { error: storageError } = await client()
    .storage
    .from('employee-documents')
    .upload(storagePath, file, { upsert: false })

  if (storageError) {
    throw storageError
  }

  const { data, error } = await client()
    .from('employee_documents')
    .insert({
      employee_id: employeeId,
      name: file.name,
      category,
      status: 'Pendiente validación',
      storage_path: storagePath,
    })
    .select()
    .single()

  if (error) {
    await client().storage.from('employee-documents').remove([storagePath])
    throw error
  }

  return mapDocument(data as DocumentRow)
}

export async function validateDocument(id: string) {
  const { data, error } = await client()
    .from('employee_documents')
    .update({ status: 'Validado' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapDocument(data as DocumentRow)
}

export async function getDocumentUrl(storagePath: string) {
  const { data, error } = await client()
    .storage
    .from('employee-documents')
    .createSignedUrl(storagePath, 60)

  if (error) {
    throw error
  }

  return data.signedUrl
}
