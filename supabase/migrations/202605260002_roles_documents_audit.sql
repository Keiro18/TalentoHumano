-- Extensión profesional de la demo: roles, documentos privados y auditoría.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Usuario demo',
  role text not null default 'Empleado'
    check (role in ('Administrador', 'Recursos Humanos', 'Gerencia', 'Empleado')),
  employee_id text references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario demo')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function private.current_app_role()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.current_employee_id()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select employee_id from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_hr_staff()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('Administrador', 'Recursos Humanos'), false);
$$;

create or replace function private.can_view_employee(target_id text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(
    private.current_app_role() in ('Administrador', 'Recursos Humanos', 'Gerencia')
    or private.current_employee_id() = target_id,
    false
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their profile" on public.profiles;
create policy "Users can view their profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_hr_staff());

drop policy if exists "Administrators update profiles" on public.profiles;
create policy "Administrators update profiles"
  on public.profiles for update to authenticated
  using (private.current_app_role() = 'Administrador')
  with check (private.current_app_role() = 'Administrador');

drop policy if exists "Authenticated users can read employees" on public.employees;
drop policy if exists "Authenticated users can insert employees" on public.employees;
drop policy if exists "Authenticated users can update employees" on public.employees;
create policy "Authorized users read employees"
  on public.employees for select to authenticated
  using (private.can_view_employee(id));
create policy "HR staff insert employees"
  on public.employees for insert to authenticated
  with check (private.is_hr_staff());
create policy "HR staff update employees"
  on public.employees for update to authenticated
  using (private.is_hr_staff()) with check (private.is_hr_staff());

drop policy if exists "Authenticated users can read affiliations" on public.affiliations;
drop policy if exists "Authenticated users can insert affiliations" on public.affiliations;
drop policy if exists "Authenticated users can update affiliations" on public.affiliations;
create policy "Authorized users read affiliations"
  on public.affiliations for select to authenticated
  using (private.can_view_employee(employee_id));
create policy "HR staff insert affiliations"
  on public.affiliations for insert to authenticated
  with check (private.is_hr_staff());
create policy "HR staff update affiliations"
  on public.affiliations for update to authenticated
  using (private.is_hr_staff()) with check (private.is_hr_staff());

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references public.employees(id) on delete cascade,
  name text not null,
  category text not null check (category in ('Contrato', 'Identificación', 'Afiliación', 'Certificado')),
  status text not null default 'Pendiente validación'
    check (status in ('Validado', 'Pendiente validación')),
  storage_path text not null unique,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.employee_documents enable row level security;
drop policy if exists "Authorized users read documents" on public.employee_documents;
create policy "Authorized users read documents"
  on public.employee_documents for select to authenticated
  using (private.can_view_employee(employee_id));
drop policy if exists "HR staff insert documents" on public.employee_documents;
create policy "HR staff insert documents"
  on public.employee_documents for insert to authenticated
  with check (private.is_hr_staff());
drop policy if exists "HR staff update documents" on public.employee_documents;
create policy "HR staff update documents"
  on public.employee_documents for update to authenticated
  using (private.is_hr_staff()) with check (private.is_hr_staff());

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  detail text not null,
  actor_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
drop policy if exists "Management reads audit logs" on public.audit_logs;
create policy "Management reads audit logs"
  on public.audit_logs for select to authenticated
  using (private.current_app_role() in ('Administrador', 'Recursos Humanos', 'Gerencia'));
drop policy if exists "HR staff insert audit logs" on public.audit_logs;
create policy "HR staff insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (private.is_hr_staff());

insert into public.audit_logs (action, detail) values
  ('Migración aplicada', 'Roles, documentos privados y auditoría activados para la demo.')
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-documents',
  'employee-documents',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "HR staff upload private documents" on storage.objects;
create policy "HR staff upload private documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'employee-documents' and private.is_hr_staff());

drop policy if exists "Authorized users read private documents" on storage.objects;
create policy "Authorized users read private documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'employee-documents'
    and private.can_view_employee((storage.foldername(name))[1])
  );

drop policy if exists "HR staff remove private documents" on storage.objects;
create policy "HR staff remove private documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'employee-documents' and private.is_hr_staff());

drop function if exists public.handle_new_user();
drop function if exists public.current_app_role();
drop function if exists public.current_employee_id();
drop function if exists public.is_hr_staff();
drop function if exists public.can_view_employee(text);

-- Luego de crear tu usuario, promociona exclusivamente la cuenta administradora:
-- update public.profiles set role = 'Administrador' where email = 'tu-correo@ejemplo.com';
