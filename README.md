# Gestión PD

Plataforma independiente para gestionar agentes, instructores, capacitaciones y períodos salariales.

## Stack
- React + TypeScript + Vite
- Supabase (PostgreSQL, Auth y Edge Functions)
- Discord OAuth2 mediante Supabase Auth
- Discord.js para el bot de registro (se implementará en una fase posterior)

## Desarrollo local
1. Instalar Node.js LTS.
2. Ejecutar `npm install`.
3. Copiar `.env.example` a `.env.local` y completar las variables de Supabase.
4. Ejecutar `npm run dev`.

## Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nunca guardar claves de servicio, tokens de Discord ni secretos en el frontend o en Git.

## Estado
Fundación del proyecto. La autenticación y los módulos se habilitarán por etapas. La base de datos se crea mediante las migraciones de `supabase/migrations`.
