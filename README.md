# Talento360 - Demo de Gestión Humana

Prototipo navegable del Sistema de Gestión de Talento Humano planteado en los
documentos del proyecto. La demo usa React, TypeScript, Vite y Supabase.

## Alcance actual

- Panel general con métricas, vencimientos, progreso y actividad reciente.
- Listado de empleados con búsqueda y ficha individual.
- Registro de empleados persistente cuando Supabase está configurado.
- Vista de contratos y alertas de vencimiento.
- Seguimiento de afiliaciones internas y validación de soportes.
- Expediente con pestañas de perfil, contrato, afiliaciones y documentos.
- Roles visibles: Administrador, Recursos Humanos, Gerencia y Empleado.
- Carga de documentos privados en Supabase Storage, limitada a PDF/JPG/PNG de 5 MB.
- Historial de auditoría de acciones operativas.
- Reporte exportable en CSV.

## Integración Supabase

1. Crea un proyecto en Supabase.
2. Abre el `SQL Editor` y ejecuta el archivo:

```text
supabase/migrations/202605260001_demo_schema.sql
```

Ejecuta luego, en el mismo orden:

```text
supabase/migrations/202605260002_roles_documents_audit.sql
```

Los scripts crean empleados, afiliaciones, perfiles, documentos y auditoría;
activan Row Level Security (`RLS`); crean un bucket privado de Storage; y
agregan registros ficticios para presentar la demo.

3. Copia `.env.example` como `.env.local` y completa las credenciales públicas
del proyecto:

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

La clave publicable puede utilizarse en el navegador; la seguridad de los datos
depende de las políticas RLS. No agregues una `service_role` key a Vite.

4. Ejecuta la app y registra un usuario desde la pantalla de acceso. Si en
Supabase está activa la confirmación de correo, primero confirma el email.

5. El primer usuario se registra como `Empleado`. Para utilizar la gestión
completa, promueve únicamente la cuenta administradora desde `SQL Editor`:

```sql
update public.profiles
set role = 'Administrador'
where email = 'tu-correo@ejemplo.com';
```

Un administrador puede asignarse a un colaborador para probar el rol empleado:

```sql
update public.profiles
set role = 'Empleado', employee_id = 'EMP-001'
where email = 'empleado@ejemplo.com';
```

Si las variables no están definidas, la aplicación conserva el modo local para
presentaciones rápidas sin persistencia.

## Fuera de alcance

- No existe conexión con EPS, ARL, pensión, cajas de compensación ni Yéminus.
- No existe firma electrónica ni flujos de aprobación avanzados.
- No se realizan liquidaciones de nómina ni cálculos legales.
- Todos los datos semilla son ficticios.

## Ejecución

```bash
npm install
npm run dev
```

Para validar una compilación de producción:

```bash
npm run lint
npm run build
```

## Próxima fase propuesta

Agregar roles internos y Storage privado para documentos laborales, conservando
afiliaciones externas y nómina fuera del MVP inicial.
# TalentoHumano
