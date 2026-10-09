import mongoose from 'mongoose';
import { Drill, DrillCheckIn } from './models.js';
import { computeScore, grade } from './domain/scoring.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { drills: [], checkins: [] };
let seq = 0;

export async function createDrill(tenantId, dto) {
  const doc = {
    tenantId, name: dto.name, scope: dto.scope || 'organizacion', scheduledAt: dto.scheduledAt,
    expectedParticipants: dto.expectedParticipants || 0, targetEvacSeconds: dto.targetEvacSeconds || 90,
    phase: 'config', checkins: 0, avgEvacSeconds: 0, score: 0,
  };
  if (persistenceOn()) return Drill.create(doc);
  const d = { _id: 'mem-' + (++seq), ...doc }; mem.drills.push(d); return d;
}

export async function listDrills(tenantId) {
  if (persistenceOn()) return Drill.find({ tenantId }).sort({ createdAt: -1 }).lean();
  return mem.drills.filter((d) => d.tenantId === tenantId);
}

async function getDrill(tenantId, id) {
  if (persistenceOn()) return Drill.findOne({ tenantId, _id: id });
  return mem.drills.find((d) => d.tenantId === tenantId && String(d._id) === String(id));
}

export async function startDrill(tenantId, id) {
  const d = await getDrill(tenantId, id);
  if (!d) return null;
  d.phase = 'en_vivo'; d.startedAt = new Date();
  if (persistenceOn()) await d.save();
  await publish('drill.started', { tenantId, drillId: id, name: d.name });
  return d;
}

/** Registra un check-in de participante (tiempo de evacuacion + pasos). */
export async function checkIn(tenantId, id, dto) {
  const rec = { tenantId, drillId: id, participantId: dto.participantId, evacSeconds: dto.evacSeconds, completedSteps: dto.completedSteps || 0, at: new Date() };
  if (persistenceOn()) await DrillCheckIn.create(rec); else mem.checkins.push(rec);
  return rec;
}

async function checkinsFor(tenantId, id) {
  if (persistenceOn()) return DrillCheckIn.find({ tenantId, drillId: id }).lean();
  return mem.checkins.filter((c) => c.tenantId === tenantId && String(c.drillId) === String(id));
}

/** Finaliza, calcula promedio y puntaje, y publica resultados. */
export async function finishDrill(tenantId, id) {
  const d = await getDrill(tenantId, id);
  if (!d) return null;
  const cks = await checkinsFor(tenantId, id);
  const n = cks.length || 0;
  const avgEvac = n ? Math.round(cks.reduce((a, c) => a + (c.evacSeconds || 0), 0) / n) : 0;
  const avgSteps = n ? cks.reduce((a, c) => a + (c.completedSteps || 0), 0) / n : 0;
  const score = computeScore({ expectedParticipants: d.expectedParticipants, checkins: n, targetEvacSeconds: d.targetEvacSeconds, avgEvacSeconds: avgEvac, avgSteps, totalSteps: 3 });
  d.phase = 'finalizado'; d.finishedAt = new Date(); d.checkins = n; d.avgEvacSeconds = avgEvac; d.score = score;
  if (persistenceOn()) await d.save();
  const results = { drillId: id, name: d.name, participants: n, expected: d.expectedParticipants, avgEvacSeconds: avgEvac, score, grade: grade(score) };
  await publish('drill.finished', { tenantId, ...results });
  return results;
}

export async function results(tenantId, id) {
  const d = await getDrill(tenantId, id);
  if (!d) return null;
  return { drillId: id, name: d.name, phase: d.phase, participants: d.checkins, expected: d.expectedParticipants, avgEvacSeconds: d.avgEvacSeconds, score: d.score, grade: grade(d.score) };
}
