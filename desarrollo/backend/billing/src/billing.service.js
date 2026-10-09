import mongoose from 'mongoose';
import { Subscription, Usage } from './models.js';
import { PLANS, planById, overLimit } from './domain/pricing.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { subs: [], usage: [] };

export function listPlans() { return PLANS; }

export async function subscribe(tenantId, dto) {
  const plan = planById(dto.plan).id;
  const renews = new Date(); renews.setMonth(renews.getMonth() + 1);
  const doc = { tenantId, plan, status: 'activa', seats: dto.seats || 1, startedAt: new Date(), renewsAt: renews };
  let sub;
  if (persistenceOn()) sub = await Subscription.findOneAndUpdate({ tenantId }, { $set: doc }, { new: true, upsert: true });
  else { sub = mem.subs.find((s) => s.tenantId === tenantId); if (sub) Object.assign(sub, doc); else { sub = doc; mem.subs.push(sub); } }
  await publish('subscription.changed', { tenantId, plan });
  return sub;
}

export async function getSubscription(tenantId) {
  if (persistenceOn()) return Subscription.findOne({ tenantId }).lean();
  return mem.subs.find((s) => s.tenantId === tenantId) || { tenantId, plan: 'free', status: 'activa' };
}

/** Registra uso y avisa si supera el limite del plan. */
export async function meter(tenantId, dto) {
  const rec = { tenantId, metric: dto.metric, qty: dto.qty || 1, at: new Date() };
  if (persistenceOn()) await Usage.create(rec); else mem.usage.push(rec);
  const sub = await getSubscription(tenantId);
  const used = await usageTotal(tenantId, dto.metric);
  const exceeded = overLimit(sub.plan, dto.metric, used);
  if (exceeded) await publish('billing.limit.exceeded', { tenantId, metric: dto.metric, used, plan: sub.plan });
  return { recorded: rec, used, exceeded };
}

async function usageTotal(tenantId, metric) {
  const since = new Date(); since.setMonth(since.getMonth() - 1);
  if (persistenceOn()) {
    const rows = await Usage.find({ tenantId, metric, at: { $gte: since } }).lean();
    return rows.reduce((a, r) => a + (r.qty || 0), 0);
  }
  return mem.usage.filter((u) => u.tenantId === tenantId && u.metric === metric && new Date(u.at) >= since).reduce((a, r) => a + (r.qty || 0), 0);
}

export async function usageSummary(tenantId) {
  const sub = await getSubscription(tenantId);
  const metrics = ['alertas', 'sensores', 'sedes', 'sms', 'voz'];
  const out = {};
  for (const m of metrics) { const used = await usageTotal(tenantId, m); out[m] = { used, limit: (planById(sub.plan).limits || {})[m] ?? null }; }
  return { plan: sub.plan, status: sub.status, usage: out };
}
