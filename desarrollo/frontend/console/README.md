# Consola QUAKE ALERT (Angular)

Consola web **Angular 18 (standalone)** conectada al microservicio **Alert Engine**.
Muestra el feed de alertas en vivo y permite **disparar un evento sísmico** de prueba.
Es el patrón base para las consolas de Gobierno, Empresarial, Municipal y Studio.

## Estructura
```
src/
  main.ts, index.html, styles.css        bootstrap + tema QUAKE ALERT
  environments/environment.ts            URL del Alert Engine + tenant
  app/
    app.config.ts                        provideHttpClient()
    app.component.ts                      shell (header)
    core/
      models.ts                          tipos Alert / SeismicEventInput
      alert.service.ts                   HttpClient → Alert Engine
    features/alerts/alerts.component.ts   simulador + feed de alertas
```

## Correr
```bash
cd frontend/console
npm install
npm start            # http://localhost:4200
```
Levanta antes el Alert Engine (`services/alert-engine`, puerto 3001). El Alert Engine ya
trae **CORS** habilitado para que el navegador pueda llamarlo.

> Si no generaste el workspace con la CLI, `npm install` ya trae todo lo necesario para
> `ng serve` con esta estructura. Para añadir router, lint, tests, etc., usa `ng generate`.

## App móvil (Ionic + Angular)
La app ciudadana se construye con **Ionic + Angular (Capacitor)** y **reutiliza este mismo
patrón**: el `AlertService` (HttpClient) y los modelos son idénticos; cambian los componentes
de UI por componentes Ionic (`ion-card`, `ion-button`, etc.) y se añaden plugins de Capacitor
para **push (FCM/APNs)**, **geolocalización** y **ejecución en segundo plano**. Los prototipos
`Quake Alert App`, `Assistant`, `Onboarding` y `Voice` son la referencia visual/flujo.

```bash
# Esqueleto sugerido para la app móvil
npm i -g @ionic/cli
ionic start quake-alert-app blank --type=angular --capacitor
# copiar core/ (models.ts, alert.service.ts) y apuntar environment al gateway
```
