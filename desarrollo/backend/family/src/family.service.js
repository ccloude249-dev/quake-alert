import mongoose from 'mongoose';
import { Group, CheckIn } from './models.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const memory = { groups: [], checkins: [] }; // fallback en modo sin DB

export async function createGroup(tenantId, dto) {
  const doc = { tenantId, name: dto.name, members: dto.members || [] };
  if (persistenceOn()) return Group.create(doc);
  const g = { _id: 'mem-' + (memory.groups.length + 1), ...doc };
  memory.groups.push(g);
  return g;
}

/** Registra el estado de un miembro y publica checkin.received. */
export async function checkIn(tenantId, dto) {
  const record = {
    tenantId,
    groupId: dto.groupId,
    memberId: dto.memberId,
    memberName: dto.memberName,
    status: dto.status, // 'bien' | 'ayuda' | 'medica'
    location: dto.location,
    alertEventId: dto.alertEventId,
    at: new Date(),
  };
  if (persistenceOn()) await CheckIn.create(record);
  else memory.checkins.push(record);

  await publish('checkin.received', record);
  // Escalamiento: ayuda / emergencia médica notifican a brigadas / 911.
  if (record.status !== 'bien') {
    await publish('assistance.requested', record);
  }
  return record;
}

/** Estado agregado del grupo (cuántos a salvo / pendientes). */
export async function groupStatus(tenantId, groupId) {
  if (!persistenceOn()) {
    const cks = memory.checkins.filter((c) => c.groupId === groupId);
    return { groupId, checkins: cks, safe: cks.filter((c) => c.status === 'bien').length };
  }
  const checkins = await CheckIn.find({ tenantId, groupId }).sort({ at: -1 }).lean();
  const latestByMember = new Map();
  for (const c of checkins) if (!latestByMember.has(c.memberId)) latestByMember.set(c.memberId, c);
  const latest = [...latestByMember.values()];
  return {
    groupId,
    safe: latest.filter((c) => c.status === 'bien').length,
    needHelp: latest.filter((c) => c.status !== 'bien').length,
    members: latest,
  };
}
