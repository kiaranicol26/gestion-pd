# Configuración de Gestión PD

Esta guía describe la autenticación mediante solicitud web y entrega automática de contraseña por MD. No se utiliza Discord OAuth para iniciar sesión.

## 1. Supabase

1. Crear un proyecto Supabase exclusivo para Gestión PD.
2. Ejecutar en SQL Editor, en este orden:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_password_login.sql`
   - `supabase/migrations/0003_registration_requests.sql`
3. Copiar Project URL y Publishable key al archivo local `.env.local` del frontend.

Variables del frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La Publishable key puede estar en el navegador. **Nunca** colocar `service_role`, el token del bot ni secretos en React, `.env.local` del frontend o GitHub.

## 2. Edge Functions

Desplegar desde la raíz del repositorio con Supabase CLI:

```bash
supabase functions deploy request-registration
supabase functions deploy resolve-password-login
supabase functions deploy bot-register-user
```

Configurar estos secretos en Supabase Functions:
- `LOGIN_PASSWORD_PEPPER`: secreto aleatorio largo y permanente usado para calcular el HMAC de las contraseñas.
- `DISCORD_BOT_API_SECRET`: secreto aleatorio compartido exclusivamente entre el bot y la función `bot-register-user`.

Supabase proporciona `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` al entorno de las Edge Functions. Verificarlo en la configuración del proyecto; nunca exponer la service role key en el frontend.

Las funciones públicas `request-registration` y `resolve-password-login` no requieren JWT de usuario. `bot-register-user` está protegida por el encabezado secreto que solo conoce el bot.

## 3. Bot de Discord

El bot utiliza la aplicación existente de Discord:

1. En Discord Developer Portal, agregar/habilitar el usuario Bot de la aplicación.
2. En Bot, activar **Server Members Intent** (Privileged Gateway Intents).
3. Invitar el bot al servidor correcto con el scope `bot`. No necesita permisos administrativos.
4. Copiar el token del bot y el ID del servidor.
5. En la carpeta `bot`, copiar `.env.example` como `.env` y completar:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DISCORD_BOT_API_SECRET` (el mismo valor configurado en Supabase)

Instalar y ejecutar el bot:

```bash
cd bot
npm install
npm start
```

El bot debe permanecer ejecutándose en un servidor/host permanente. Si se cierra, las solicitudes quedan pendientes y no se envían MD.

## 4. Flujo de registro

1. La persona abre **Registrarse** en la web e ingresa su nombre de usuario original de Discord.
2. La Edge Function agrega una solicitud a una cola privada.
3. El bot busca una coincidencia exacta, sin usar apodos ni nombres visibles, dentro del servidor configurado.
4. El bot obtiene el ID inmutable de Discord y comprueba que no exista una cuenta vinculada.
5. Supabase crea la cuenta interna y guarda un HMAC de la contraseña definitiva.
6. El bot envía la contraseña por MD. Si el MD no se puede enviar, el bot elimina la cuenta recién creada.
7. La persona inicia sesión ingresando únicamente esa contraseña.

El nombre de Discord se usa para localizar al miembro; la vinculación y la unicidad se basan en el ID numérico de Discord. Si el usuario cambia su nombre, la vinculación no cambia.

## 5. Seguridad y operación

- Una cuenta de Discord solo puede registrarse una vez.
- Las contraseñas no se guardan en texto plano; la tabla de credenciales está cerrada para usuarios normales.
- La contraseña se entrega una sola vez por MD. El usuario debe guardarla de forma segura.
- La cuenta no puede registrarse de nuevo si ya existe. La recuperación de contraseña debe implementarse como flujo separado antes de producción.
- Si el usuario tiene los MD cerrados, debe habilitarlos para recibir el mensaje.
- No compartir ni publicar el token del bot, la service role key, `LOGIN_PASSWORD_PEPPER` o `DISCORD_BOT_API_SECRET`.
- Antes de habilitar usuarios reales, probar el flujo con una cuenta de prueba y revisar los registros de Edge Functions.

## 6. Primer administrador y módulos

El primer administrador se provisionará mediante un proceso de bootstrap de un solo uso, ejecutado del lado servidor. Los roles se asignan desde Gestión de administradores.

Los períodos salariales se crean manualmente. Al crear un período se captura el salario vigente de cada agente activo. Al cerrar un período, la fotografía financiera queda congelada; solo puede cambiar el estado de pago y sus datos de auditoría.
