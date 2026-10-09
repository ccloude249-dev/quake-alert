# QUAKE ALERT · App Android (APK)

La **App ciudadana** (`/app`) como app Android real, con una capa nativa que hace lo que un navegador no puede:

| Requisito | Cómo se logra |
|---|---|
| **No se duerme** | Servicio en primer plano (`GuardService`) + wake lock parcial + conexión en vivo con el servidor (SSE) y sondeo de respaldo cada 20–45 s. Se reinicia solo tras reiniciar el teléfono. |
| **Suena en silencio** | Audio con `USAGE_ALARM`: el modo silencio/vibración no silencia el canal de alarma. Sube el volumen de alarma al máximo mientras suena y lo restaura. Atraviesa "No molestar" si diste el acceso. |
| **Vibra** | Vibración con atributos de alarma (vibra aunque el timbre esté en silencio). |
| **Enciende el teléfono** | Wake lock de pantalla + notificación de pantalla completa → `AlarmActivity` sobre el bloqueo. Flash de la linterna intermitente. |

La interfaz es la web del servidor (familia, mapa, asistente…): se actualiza sin recompilar el APK. La tarjeta **Alarma sísmica** de Inicio activa y prueba la capa nativa (`qa-native.js`).

## Requisitos (una vez)
- Node 20+ · **JDK 21** · Android Studio (trae el SDK) · el servidor ya publicado (ver `DEPLOY.md` de la raíz).
- El dyno de Heroku **no debe dormirse** (Basic o superior): el vigilante 24/7 vive ahí.

## Generar el APK
```bash
cd desarrollo/android-app
npm run apk -- https://TU-APP.herokuapp.com
```
Resultado: `dist/QuakeAlert-debug.apk`. Instalar con `adb install -r dist/QuakeAlert-debug.apk` o copiándolo al teléfono (permitir "instalar apps desconocidas").
`npm run studio -- https://TU-APP.herokuapp.com` hace lo mismo pero abre Android Studio (▶ Run en un teléfono conectado).
Solo la alarma, sin la app completa: añadí `--path=/alarma`.

## Primer uso en el teléfono
1. Abrí **QUAKE ALERT** → en Inicio, tarjeta **Alarma sísmica** → **Activar alarma** (aceptá las notificaciones).
2. Dejá en verde lo que pide la tarjeta: *pantalla bloqueada* y *sin ahorro de batería* (cada botón abre el ajuste exacto). *No molestar* es opcional.
3. **Probar alarma en 30 s** → ponelo en silencio, bloquealo y esperá: se enciende la pantalla, suena, vibra y parpadea el flash. *Silenciar* lo detiene.
4. Con un sismo real pasa lo mismo; al tocar **Abrir la app** aparece la alerta con los datos reales y el check-in "¿Estás bien?" para la familia.

**Xiaomi / Huawei / Oppo / Vivo / Samsung:** activá también "Inicio automático" o "Sin restricciones" para la app (la tarjeta lo recuerda con un botón de ajustes). Sin eso el fabricante puede cerrar el servicio.

## Demostración (cuenta de operador)
- Usuario `operador@gmail.com` · contraseña `Admin123@@` (se crea sola en `qa-db.js`).
- Flujo: abrir la app → iniciar sesión → queda en la pantalla principal → la app activa el vigilante (pide notificaciones) y **a los 30 s dispara el simulacro**: aunque dejes que el teléfono se duerma o lo bloquees, se enciende la pantalla, suena la sirena a todo volumen y vibra, con la pantalla roja **SIMULACRO · ALERTA SÍSMICA**.
- Es robusto porque el simulacro lo programa el sistema (`AlarmManager.setAlarmClock`): salta a la hora exacta con el teléfono dormido, en reposo profundo o con la app cerrada. *Cancelar* lo anula; *Cerrar sesión* también.
- Antes de la demo, una vez: aceptar notificaciones y dejar en verde *pantalla bloqueada* y *sin ahorro de batería* en la tarjeta.
- Tras *Abrir la app*, aparece la alerta con los datos y el check-in "¿Estás bien?". Para repetir: *Probar alarma en 30 s* o cerrar sesión e iniciar de nuevo.
- Probar sin teléfono: abrir `Quake Alert Auth Mobile.dc.html` e iniciar sesión → en el navegador corre la cuenta regresiva de 30 s en la página y suena/vibra con la pantalla encendida (un navegador no puede despertar un teléfono dormido: eso lo hace el APK). Con `?nativedemo=1` en la URL de Auth Mobile se simula además la tarjeta nativa.

## Cómo está armado
- `native/java/` — `GuardService` (vigilante), `AlarmController` (sonido, vibración, flash, DND, pantalla), `AlarmActivity` (pantalla de alarma), `QuakeAlarmPlugin` (puente JS), `QaReceiver` (arranque y "Detener").
- `native/res/raw/qa_siren.wav` — sirena; reemplazala por otro audio con el mismo nombre si querés otro sonido.
- `scripts/setup.mjs` — crea `android/` con Capacitor, copia la capa nativa, parchea el manifiesto y compila. Es repetible: volvé a correrlo tras cambiar algo en `native/`.
- Web: `qa-native.js` (raíz del repo) es el puente; la App ciudadana y la Alarma Móvil lo detectan solos. Para ver la tarjeta desde un navegador: `/app?nativedemo=1`.
- Servidor: `/api/stream` (SSE) y `/api/quakes/recent` (sismos de los últimos minutos, pocos KB) en `server.js`.

## Play Store (más adelante)
Firmar con Android Studio ▸ Build ▸ Generate Signed Bundle / APK. Play pide declarar: uso de **pantalla completa** (app de alarmas), servicio en primer plano **special use**, **alarmas exactas** (`USE_EXACT_ALARM`) y exención de optimización de batería.

## Límites y siguiente fase
- Con el teléfono en reposo profundo y **sin** quitar la restricción de batería, Android puede retrasar la red. Con la exención (paso 2) funciona; para blindarlo del todo, la fase 2 es **Firebase Cloud Messaging** con prioridad alta como segundo camino (despierta el teléfono aunque el servicio esté dormido).
- La región vigilada la define el servidor (`REGION_KM`, Centroamérica). El radio y la magnitud los elige el usuario.
