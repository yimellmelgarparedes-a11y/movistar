# Mi Movistar – Facturación (prototipo académico)
Prototipo del curso Creatividad Empresarial. **No es la app oficial de Movistar.** Datos ilustrativos.

## Correr
`cp .env.example .env && npm install && npm run dev`

## Desplegar (GitHub Pages)
1. Sube a un repo `mi-movistar-facturacion`. 2. Settings > Pages > Source: GitHub Actions.
3. Settings > Secrets and variables > Actions > **Variables**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (valores en `.env.example`). 4. Push a `main`.

## Datos
Se guardan nombre, celular y eventos de uso en Supabase. Ver y exportar: tabla `events`/`participants` en el panel de Supabase.
**Al terminar el curso, borra los datos** (SQL: `truncate participants cascade;`).
Nunca pongas la `service_role` key en el repo.

## Panel del investigador
`<url>/#/admin` (correo y contraseña del usuario admin de Supabase). Incluye métricas, exportar CSV y borrar todos los datos.
