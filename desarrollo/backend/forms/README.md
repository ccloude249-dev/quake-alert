# Forms — microservicio de catálogos dinámicos

Node.js + Express + MongoDB. Guarda las **definiciones** que produce el Constructor de
Formularios (`formDefinitions`) y los **registros** capturados (`formSubmissions`).
Como Mongo es schemaless, un catálogo nuevo no requiere migraciones: se guarda su
definición y los datos van en un documento flexible.

## Endpoints
```
GET  /forms                       lista catálogos del tenant
GET  /forms/:key                  definición de un catálogo
PUT  /forms/:key                  crea/actualiza la definición  { catalog, fields:[...] }
POST /forms/:key/submissions      guarda un registro            { data:{...} }
GET  /forms/:key/submissions      registros del catálogo
```

## Correr
```bash
cd services/forms && cp .env.example .env && npm install && npm run dev   # :3004
```

## Probar
```bash
# Publicar la definición que exporta el Form Builder
curl -X PUT localhost:3004/forms/sensores -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "catalog": "Sensores QuakeBox", "fields": [
        { "type":"text","label":"Nombre","name":"nombre","required":true },
        { "type":"select","label":"Zona","name":"zona","options":["Zona 1","Zona 2"] } ] }'

# Capturar un registro
curl -X POST localhost:3004/forms/sensores/submissions -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "data": { "nombre": "QuakeBox Centro", "zona": "Zona 1" } }'

curl localhost:3004/forms/sensores/submissions -H 'x-tenant-id: gt'
```

El frontend renderiza la definición con `DynamicFormComponent`
(`frontend/console/src/app/shared/dynamic-form/`) — misma definición, web e Ionic.
