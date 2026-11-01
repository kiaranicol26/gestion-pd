# Gestión PD Discord Bot

Worker de Discord que procesa la cola de solicitudes creada desde la pantalla **Registrarse** de la web.

## Requisitos

- Node.js 20 o superior.
- Bot agregado al servidor de Discord correcto.
- **Server Members Intent** habilitado en Discord Developer Portal.
- Migraciones de Supabase aplicadas y Edge Functions desplegadas.

## Configuración

Copiar `.env.example` a `.env` y completar las variables. El archivo `.env` no debe subirse a GitHub.

```bash
npm install
npm start
```

El proceso consulta la cola cada cinco segundos. Mantenerlo encendido en un host permanente.

## Resolución de identidad

La web pide el nombre de usuario original de Discord. El worker compara ese valor con `member.user.username` (ignorando mayúsculas/minúsculas), no con el nickname del servidor ni con el display name. Después de localizarlo, usa el ID numérico de Discord para crear la cuenta única.

Si no encuentra una coincidencia exacta, no envía una contraseña. Si el ID ya está registrado, informa al miembro por MD y no crea otra cuenta.

## Secretos

- `DISCORD_BOT_TOKEN`: solo en este host.
- `SUPABASE_SERVICE_ROLE_KEY`: solo en este host y en el entorno seguro de Edge Functions.
- `DISCORD_BOT_API_SECRET`: debe coincidir con el secreto de Supabase.
- `LOGIN_PASSWORD_PEPPER`: solo en Supabase Edge Functions.

Nunca publicar estos valores ni enviarlos por chat.
