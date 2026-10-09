import mongoose from 'mongoose';
import { Site, SiteEvent } from './models.js';
import { protocolFor } from './domain/protocol.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { sites: [], events: [] };

export async function upsertSite(tenantId, dto) {
  const doc = {
    tenantId, siteId: dto.siteId, name: dto.name, sector: dto.sector, city: dto.city,
    location: dto.location, headcount: dto.headcount || 0, protocol: dto.protocol || 'estandar',
  };
  if (persistenceOn()) return Site.findOneAndUpdate({ tenantId, siteId: dto.siteId }, { $set: doc }, { new: true, upsert: true });
  const ex = mem.sites.find((s) => s.tenantId === tenantId && s.siteId === dto.siteId);
  if (ex) { Object.assign(ex, doc); return ex; }
  const s = { ...doc, status: 'normal' }; mem.sites.push(s); return s;
}

export async function listSites(tenantId, sector) {
  if (persistenceOn()) return Site.find(sector ? { tenantId, sector } : { tenantId }).lean();
  return mem.sites.filter((s) => s.tenantId === tenantId && (!sector || s.sector === sector));
}

/** Aplica protocolo a una sede segun el riesgo. */
async function applyProtocol(tenantId, site, risk) {
  const p = protocolFor(site.sector, risk);
  if (persistenceOn()) await Site.updateOne({ tenantId, siteId: site.siteId }, { $set: { status: p.status } });
  else { const m = mem.sites.find((x) => x.tenantId === tenantId && x.siteId === site.siteId); if (m) m.status = p.status; }
  const rec = { tenantId, siteId: site.siteId, risk, action: p.action, at: new Date() };
  if (persistenceOn()) await SiteEvent.create(rec); else mem.events.push(rec);
  return { siteId: site.siteId, name: site.name, sector: site.sector, ...p };
}

/** Alerta regional: activa protocolo en todas las sedes (o de un sector). */
export async function regionalAlert(tenantId, dto) {
  const risk = dto.risk || 'rojo';
  const sites = await listSites(tenantId, dto.sector);
  const applied = [];
  for (const s of sites) applied.push(await applyProtocol(tenantId, s, risk));
  await publish('corporate.alert', { tenantId, risk, sector: dto.sector || 'todos', sites: applied.length });
  return { risk, count: applied.length, applied };
}

export async function clearAll(tenantId) {
  if (persistenceOn()) await Site.updateMany({ tenantId }, { $set: { status: 'despejado' } });
  else mem.sites.filter((s) => s.tenantId === tenantId).forEach((s) => { s.status = 'despejado'; });
  return { status: 'despejado' };
}

export async function corporateStatus(tenantId) {
  const sites = await listSites(tenantId);
  const bySector = {};
  for (const s of sites) {
    bySector[s.sector] = bySector[s.sector] || { total: 0, inAlert: 0, headcount: 0 };
    bySector[s.sector].total++;
    bySector[s.sector].headcount += s.headcount || 0;
    if (s.status !== 'normal' && s.status !== 'despejado') bySector[s.sector].inAlert++;
  }
  return { sites: sites.length, headcount: sites.reduce((a, s) => a + (s.headcount || 0), 0), bySector, detail: sites };
}
