import mongoose from 'mongoose';
import { EventLog } from './models.js';
import { sinceDate, countByType, riskDistribution, timeSeries, kpis } from './domain/aggregator.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = [];

/** Ingresa un evento del bus al almacen analitico. */
export async function record(tenantId, type, data) {
  const rec = { tenantId, type, risk: data && data.risk, payload: data || {}, at: new Date() };
  if (persistenceOn()) await EventLog.create(rec); else mem.push(rec);
  return rec;
}

async function load(tenantId, period) {
  const since = sinceDate(period);
  if (persistenceOn()) return EventLog.find({ tenantId, at: { $gte: since } }).lean();
  return mem.filter((e) => e.tenantId === tenantId && new Date(e.at) >= since);
}

/** Panel completo para un periodo (7d|30d|12m). */
export async function metrics(tenantId, period) {
  const events = await load(tenantId, period);
  return {
    period,
    kpis: kpis(events),
    byType: countByType(events),
    risk: riskDistribution(events),
    series: timeSeries(events, period),
    total: events.length,
  };
}

export async function recentEvents(tenantId, limit = 50) {
  if (persistenceOn()) return EventLog.find({ tenantId }).sort({ at: -1 }).limit(limit).lean();
  return mem.filter((e) => e.tenantId === tenantId).slice(-limit).reverse();
}
