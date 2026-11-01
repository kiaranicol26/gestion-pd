# Configuración inicial de Gestión PD

Esta guía se completa antes de habilitar usuarios reales.

## 1. Supabase
1. Crear un proyecto Supabase exclusivo para Gestión PD.
2. En SQL Editor, ejecutar el archivo `supabase/migrations/0001_initial_schema.sql`.
3. Copiar Project URL y Publishable/anon key a un archivo local `.env.local`.
4. En Authentication > URL Configuration, agregar las URLs locales y de producción autorizadas.

Variables del frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No usar la service_role key en el frontend. Nunca subir secretos al repositorio.

## 2. Discord OAuth2
1. Crear una aplicación en Discord Developer Portal.
2. En OAuth2, configurar el callback URL que indique Supabase en Authentication > Providers > Discord.
3. Copiar Client ID y Client Secret a la configuración del proveedor Discord en Supabase.
4. Habilitar únicamente los scopes necesarios. El inicio de sesión usa identify y email; la verificación de pertenencia al servidor se realizará del lado servidor con el bot.

## 3. Bot y validación de servidor
Para comprobar que una cuenta pertenece al servidor de Discord, la integración de servidor debe validar el Discord user ID contra el Guild ID usando un bot con permisos mínimos. El token del bot se guardará como secreto de Edge Function/entorno del servidor, nunca en React ni en GitHub.

## 4. Primer administrador
El primer administrador se provisionará mediante un proceso de bootstrap de un solo uso, ejecutado del lado servidor. El secreto inicial se generará al desplegar ese proceso y no se guardará en el repositorio. No reutilizar tokens publicados en conversaciones.

## 5. Reglas operativas
- Todo acceso requiere Discord OAuth.
- El perfil queda sin aprobar por defecto hasta completar la verificación del servidor y el flujo de registro.
- Los roles se asignan desde Gestión de administradores.
- Los períodos salariales se crean manualmente.
- Al crear un período, se captura el salario vigente de cada agente activo.
- Al cerrar un período, la fotografía financiera queda congelada; solo puede cambiar el estado de pago y sus datos de auditoría.
