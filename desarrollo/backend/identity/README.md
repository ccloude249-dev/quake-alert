# Identity & Auth

Tenants, usuarios y autenticacion con **scrypt** (hash+salt), **2FA** por codigo de 6 digitos
y **tokens HMAC** firmados (JWT-lite, sin dependencias extra). Login social Google/Apple.

## Endpoints
- `POST /tenants`
- `POST /auth/register` - { email, password, name, phone }
- `POST /auth/login` - { email, password } -> exige 2FA
- `POST /auth/2fa/verify` - { email, code } -> { token }
- `POST /auth/social` - { provider, email, name } -> { token }
- `GET /me` - Bearer token
- `GET /health`

> El codigo 2FA se registra en consola; en produccion se entrega via Notification svc (SMS/email).
