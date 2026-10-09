# Reglas de proyecto (plantilla reutilizable)

> Pega esto en el `CLAUDE.md` o en el prompt inicial de un proyecto nuevo para que
> mantenga la misma estructura de entrega y las mismas reglas de trabajo.
> Reemplaza `<PRODUCTO>` y la identidad por los del proyecto.

---

## 1. Estructura de entrega — SIEMPRE actualizada
El proyecto se mantiene en **dos carpetas de entrega**. Manténlas al día en cada cambio
significativo.

### `requerimientos/` — el *qué* y el *por qué*
- `PROMPT_MASTER.md` — qué es el producto, módulos, alcance.
- `ARQUITECTURA_Y_SEGURIDAD.md` — cómo se construye y se asegura.
- `MEMORIA_DEL_PROYECTO.md` — qué se ha hecho, qué se decidió y qué falta (se actualiza siempre).

### `desarrollador/` — el *cómo* (fuentes listos para levantar y desplegar)
| Subcarpeta | Qué es | Cómo se corre |
|---|---|---|
| `landingpage/` | Landing de marketing aislada (HTML + CSS + JS + imágenes) | Servidor estático |
| `frontend/` | Prototipo integrado completo (landing + acceso + app por roles + demo + móvil) con assets | Servidor estático |
| `server/` | API real lista para compilar y desplegar | Node + Postgres (o el stack que aplique) |
| `instrucciones.md` | Cómo levantar cada carpeta, dónde tocar qué y trampas conocidas | — |

> Para publicar una **demo** al público, genera además una carpeta `publicar/` con archivos
> autónomos (un solo HTML cada uno, funcionan offline) y enlazados entre sí:
> `index.html` (landing) + el app empaquetado + video + `docs/`.

---

## 2. Reglas de trabajo
- **`desarrollador/frontend/` es la ubicación canónica del prototipo.** Edita ahí; no
  dupliques en la raíz.
- Al tocar el prototipo o el backend, **actualiza `requerimientos/MEMORIA_DEL_PROYECTO.md`**
  (qué cambió, qué se decidió, qué queda pendiente).
- La landing aislada (`desarrollador/landingpage/`) es una copia de marketing; sus CTA de
  demo/login apuntan a `../frontend/` dentro del paquete y, en producción, a la URL pública.
- **Todo debe funcionar de verdad.** Nada de botones muertos, inputs sin conectar ni toggles
  decorativos. Si algo es demo, que al menos mute el estado local; si hay backend, que llame al API.
- **Doble modo:** el frontend funciona en **demo** (datos de ejemplo, sin servidor) y en
  **vivo** (conectado al API). Sin servidor configurado nunca debe romperse.

---

## 3. Reglas de cara al usuario final (CRÍTICO)
- **Nada de lo que ve el usuario final menciona herramientas de IA ni cómo se construyó.**
  Cero referencias a asistentes de IA, "generado con/por", "powered by", marcas de
  herramienta o etiquetas `generator`. Aplica a landing, app, demo publicada, docs públicos,
  metadatos y comentarios del HTML.
- **No mencionar marcas ni clientes externos** en los entregables.
- Las menciones a herramientas internas (guías de deploy, bitácora) solo viven en documentos
  internos que el cliente/usuario final **nunca** ve — y aun así conviene mantenerlas neutrales
  por si se comparten ("equipo de desarrollo" en vez del nombre de la herramienta).

---

## 4. Identidad (reemplazar por la del proyecto)
- Paleta: `<color-1>` · `<color-2>` · `<color-3>` · acento `<acento>`.
- Tipografías: `<Titulares>` (display), `<UI>` (interfaz), `<Datos>` (mono).
- Idiomas: `<ES/EN>` · Tema: `<claro/oscuro>`.

---

## 5. Mapa rápido (rellenar por proyecto)
- App web (prototipo): `desarrollador/frontend/<PRODUCTO>.html`
- Landing: `desarrollador/frontend/<PRODUCTO> - Landing.html` · `desarrollador/landingpage/`
- API / backend: `desarrollador/server/`
- Demo publicable: `publicar/`
- Carpetas de trabajo (no entrega): `shots/`, `uploads/`, `export/`
