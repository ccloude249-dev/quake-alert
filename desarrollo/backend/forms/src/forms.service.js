import mongoose from 'mongoose';
import { FormDefinition, FormSubmission } from './models.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { defs: new Map(), subs: [] }; // fallback sin DB

const slug = (s) =>
  (s || 'catalogo').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'catalogo';

/** Crea o actualiza la definición de un catálogo. */
export async function upsertDefinition(tenantId, key, dto) {
  const k = key || slug(dto.catalog);
  const def = { tenantId, key: k, catalog: dto.catalog, fields: dto.fields || [] };
  if (persistenceOn()) {
    return FormDefinition.findOneAndUpdate(
      { tenantId, key: k },
      { $set: def, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
  }
  mem.defs.set(`${tenantId}:${k}`, { ...def, version: 1 });
  return mem.defs.get(`${tenantId}:${k}`);
}

export async function getDefinition(tenantId, key) {
  if (persistenceOn()) return FormDefinition.findOne({ tenantId, key }).lean();
  return mem.defs.get(`${tenantId}:${key}`) || null;
}

export async function listDefinitions(tenantId) {
  if (persistenceOn()) return FormDefinition.find({ tenantId }).select('key catalog version').lean();
  return [...mem.defs.values()].filter((d) => d.tenantId === tenantId);
}

/** Guarda un registro capturado con el formulario dinámico. */
export async function submit(tenantId, formKey, data) {
  const record = { tenantId, formKey, data };
  if (persistenceOn()) return FormSubmission.create(record);
  record._id = 'mem-' + (mem.subs.length + 1);
  mem.subs.push(record);
  return record;
}

export async function listSubmissions(tenantId, formKey, limit = 100) {
  if (persistenceOn()) return FormSubmission.find({ tenantId, formKey }).sort({ createdAt: -1 }).limit(limit).lean();
  return mem.subs.filter((s) => s.tenantId === tenantId && s.formKey === formKey);
}
