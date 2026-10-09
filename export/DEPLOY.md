# Deploy en Heroku — QUAKE ALERT (prototipos)

Este repo sirve el **ecosistema de prototipos** (la capa de experiencia / frontend
de demostración) como un sitio estático sobre un dyno web de Node.

## Requisitos
- Cuenta de Heroku + Heroku CLI (`heroku login`)
- Git

## Pasos

```bash
# 1. Inicializa git (si aún no)
git init
git add .
git commit -m "QUAKE ALERT — ecosistema de prototipos"

# 2. Crea la app (elige un nombre único)
heroku create quake-alert-demo

# 3. Despliega
git push heroku main      # o 'master' según tu rama

# 4. Abre
heroku open
```

Heroku detecta el **buildpack de Node** al ver `package.json`, corre `npm install`
(instala Express) y arranca con el `Procfile` → `node server.js`.

## Cómo funciona
- `server.js` (Express) sirve los archivos estáticos. Rutas: `/` → Landing pública · `/consola` → plataforma web · `/app` → app ciudadana · `/alarma` → alarma de bolsillo · `/api/health` → estado del vigilante.
- Los Design Components (`.dc.html`) cargan **React/Babel desde CDN** y hacen `fetch`
  de sus archivos hermanos **en el navegador** (mismo origen). Por eso basta servirlos
  por HTTP — no requieren build step.
- `PORT` lo inyecta Heroku; el server ya lo respeta (`process.env.PORT`).

## Notas
- Requiere internet del lado del cliente (CDN de React/Babel y Google Fonts).
- Para un dominio propio: `heroku domains:add app.quakealert.gt`.
- Para forzar HTTPS o headers, se puede ampliar `server.js`.
- Si prefieres el buildpack estático oficial, este setup con Express es más portable
  y no depende de buildpacks de terceros.

## Alertas en segundo plano (Web Push) — "funciona con el teléfono bloqueado"
Una página web no puede ejecutar código por sí sola con la pantalla apagada: por eso el
vigilante vive en el servidor. `server.js` consulta el USGS cada 30 s y manda **Web Push**
a cada teléfono suscrito cuando hay un sismo dentro de su radio/magnitud. La notificación
llega (vibra + suena) con la pantalla bloqueada o la app cerrada.

```bash
npm install                          # agrega web-push
npx web-push generate-vapid-keys     # una sola vez
heroku config:set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:alertas@tudominio.gt
git push heroku main
```
Si no fijás las claves, se generan solas al arrancar pero se pierden al reiniciar el dyno
(las suscripciones quedan inválidas). Heroku ya sirve HTTPS, requisito para push.

### Demo en el teléfono
1. Abrí `/Quake Alert Alarma Móvil.dc.html` desde la URL publicada.
   - Android: Chrome directo (instalar es opcional).
   - iPhone: **Compartir ▸ Agregar a inicio** y abrirla desde el ícono (iOS 16.4+). Sin eso Apple no permite push.
2. Tocá **Activar alertas en segundo plano** → aceptá el permiso.
3. Tocá **Probar con pantalla bloqueada** y bloqueá el teléfono: a los 10 s vibra y aparece la notificación.

### Variables
- `POLL_MS` (30000), `USGS_FEED`, `DATA_DIR`, `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`.
- Suscripciones en `data/subscriptions.json` (efímero en Heroku: al reiniciar, la app se re-suscribe sola
  al abrirse; para producción moverlo a Postgres/Redis).

### Límites reales por plataforma
- **Android**: push con pantalla bloqueada y app cerrada ✓. Con la app abierta, el *modo guardián*
  mantiene la pantalla encendida (Wake Lock) y un audio inaudible evita que Chrome congele la pestaña.
- **iPhone**: push solo instalada en pantalla de inicio; Safari no vibra y respeta el switch de silencio
  (la sirena va como `<audio>`, que sí suena aun en silencio). Con la app abierta, el modo guardián mantiene la revisión activa.
