-- Esquema inicial para la demo Talento360.
-- Ejecutar en SQL Editor de Supabase. Solo contiene datos ficticios.

create table if not exists public.employees (
  id text primary key,
  name text not null,
  document text not null unique,
  role text not null,
  area text not null,
  email text not null,
  phone text not null default 'Pendiente',
  city text not null default 'Pereira',
  start_date date not null,
  contract_end date not null,
  salary numeric(12, 2) not null check (salary >= 0),
  status text not null check (status in ('Activo', 'En inducción', 'Licencia')),
  documents text not null check (documents in ('Completo', 'Pendiente', 'En revisión')),
  created_at timestamptz not null default now()
);

create table if not exists public.affiliations (
  id text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  type text not null check (type in ('EPS', 'ARL', 'Pensión', 'Caja')),
  provider text not null,
  status text not null check (status in ('Validado', 'Pendiente', 'En revisión')),
  updated_at timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.affiliations enable row level security;

drop policy if exists "Authenticated users can read employees" on public.employees;
create policy "Authenticated users can read employees"
  on public.employees for select to authenticated
  using (true);

drop policy if exists "Authenticated users can insert employees" on public.employees;
create policy "Authenticated users can insert employees"
  on public.employees for insert to authenticated
  with check (true);

drop policy if exists "Authenticated users can update employees" on public.employees;
create policy "Authenticated users can update employees"
  on public.employees for update to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users can read affiliations" on public.affiliations;
create policy "Authenticated users can read affiliations"
  on public.affiliations for select to authenticated
  using (true);

drop policy if exists "Authenticated users can insert affiliations" on public.affiliations;
create policy "Authenticated users can insert affiliations"
  on public.affiliations for insert to authenticated
  with check (true);

drop policy if exists "Authenticated users can update affiliations" on public.affiliations;
create policy "Authenticated users can update affiliations"
  on public.affiliations for update to authenticated
  using (true) with check (true);

insert into public.employees (
  id, name, document, role, area, email, phone, city,
  start_date, contract_end, salary, status, documents
) values
  ('EMP-001', 'Laura Jiménez', '1.098.235.410', 'Analista de selección', 'Talento Humano', 'laura.jimenez@empresa.demo', '310 555 0134', 'Pereira', '2024-08-12', '2026-08-11', 3250000, 'Activo', 'Completo'),
  ('EMP-002', 'Carlos Medina', '1.088.490.122', 'Coordinador administrativo', 'Administración', 'carlos.medina@empresa.demo', '315 555 0189', 'Dosquebradas', '2022-02-07', '2027-02-06', 4680000, 'Activo', 'Completo'),
  ('EMP-003', 'Mariana Torres', '1.004.785.330', 'Auxiliar contable', 'Finanzas', 'mariana.torres@empresa.demo', '316 555 0220', 'Pereira', '2026-05-04', '2026-11-03', 2100000, 'En inducción', 'En revisión'),
  ('EMP-004', 'Andrés Salazar', '1.094.009.441', 'Técnico instalador', 'Operaciones', 'andres.salazar@empresa.demo', '320 555 0645', 'Manizales', '2025-06-01', '2026-06-01', 2450000, 'Activo', 'Pendiente'),
  ('EMP-005', 'Valentina Ríos', '1.020.677.904', 'Asesora comercial', 'Comercial', 'valentina.rios@empresa.demo', '311 555 0776', 'Armenia', '2025-07-15', '2026-07-14', 2700000, 'Licencia', 'Completo'),
  ('EMP-006', 'Santiago Vega', '1.115.604.210', 'Desarrollador frontend', 'Tecnología', 'santiago.vega@empresa.demo', '300 555 0912', 'Pereira', '2025-12-01', '2026-12-01', 5100000, 'Activo', 'Completo')
on conflict (id) do nothing;

insert into public.affiliations (id, employee_id, type, provider, status, updated_at) values
  ('AF-001', 'EMP-003', 'EPS', 'Proveedor demo A', 'En revisión', '2026-05-26T09:00:00Z'),
  ('AF-002', 'EMP-003', 'ARL', 'Proveedor demo B', 'Pendiente', '2026-05-26T09:00:00Z'),
  ('AF-003', 'EMP-004', 'Caja', 'Proveedor demo C', 'Pendiente', '2026-05-24T09:00:00Z'),
  ('AF-004', 'EMP-001', 'Pensión', 'Proveedor demo D', 'Validado', '2026-05-21T09:00:00Z'),
  ('AF-005', 'EMP-006', 'EPS', 'Proveedor demo A', 'Validado', '2026-05-18T09:00:00Z')
on conflict (id) do nothing;
