# Gestión PD

Plataforma independiente para gestionar agentes, instructores, capacitaciones y períodos salariales.

## Stack
- React + TypeScript + Vite
- Supabase (PostgreSQL, Auth y Edge Functions)
- Discord.js: solicitudes de registro desde la web y entrega de contraseña definitiva por MD

## Autenticación
La persona inicia el registro desde la web con su nombre de usuario original de Discord. El bot localiza al miembro en el servidor, vincula la cuenta a su ID único de Discord y envía la contraseña definitiva por mensaje privado. Para iniciar sesión, la web solicita únicamente esa contraseña.

## Desarrollo local
1. Instalar Node.js 20 o superior.
2. Ejecutar `npm install`.
3. Copiar `.env.example` a `.env.local` y completar las variables públicas de Supabase.
4. Ejecutar `npm run dev`.

Para configurar y ejecutar el bot, consultar [bot/README.md](bot/README.md) y [docs/CONFIGURACION.md](docs/CONFIGURACION.md).

## Variables
Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

El token del bot, la service role key y los secretos de Edge Functions deben permanecer exclusivamente en entornos de servidor. Nunca guardarlos en React ni en Git.

## Estado
Base de aplicación y flujo de autenticación en desarrollo. Los módulos operativos se habilitarán por etapas. La base de datos se crea mediante las migraciones de `supabase/migrations`.
