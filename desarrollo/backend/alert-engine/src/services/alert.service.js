import mongoose from 'mongoose';
import { SeismicEvent } from '../models/seismicEvent.model.js';
import { Alert } from '../models/alert.model.js';
import { buildAlert } from '../domain/alertCalculator.js';
import { publish } from '../config/broker.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;

/**
 * Ingiere un evento sísmico, calcula una alerta por cada objetivo y las publica.
 * dto: { magnitude, depthKm, epicenter:{lat,lng}, source, targets:[{id,name,location}] }
 */
export async function ingestEvent(tenantId, dto) {
  const eventData = {
    tenantId,
    magnitude: dto.magnitude,
    depthKm: dto.depthKm ?? 10,
    epicenter: dto.epicenter,
    source: dto.source ?? 'quakebox',
  };

  let eventId = null;
  if (persistenceOn()) {
    const saved = await SeismicEvent.create(eventData);
    eventId = saved._id;
  }

  await publish('seismic.detected', { tenantId, eventId, ...eventData });

  const targets = Array.isArray(dto.targets) && dto.targets.length ? dto.targets : DEFAULT_TARGETS;
  const alerts = [];

  for (const target of targets) {
    const computed = buildAlert(eventData, target);
    const alertDoc = { tenantId, eventId, ...computed, issuedAt: new Date() };

    if (persistenceOn()) {
      const saved = await Alert.create(alertDoc);
      alertDoc._id = saved._id;
    }
    await publish('alert.issued', alertDoc);
    alerts.push(alertDoc);
  }

  return { eventId, count: alerts.length, alerts };
}

/** Últimas alertas del tenant. */
export async function recentAlerts(tenantId, limit = 50) {
  if (!persistenceOn()) return [];
  return Alert.find({ tenantId }).sort({ issuedAt: -1 }).limit(limit).lean();
}

// Zonas demo (en producción vienen del servicio Smart City / Identity).
const DEFAULT_TARGETS = [
  { id: 'gt-centro', name: 'Ciudad de Guatemala', location: { lat: 14.6349, lng: -90.5069 } },
  { id: 'escuintla', name: 'Escuintla', location: { lat: 14.305, lng: -90.785 } },
  { id: 'antigua', name: 'Antigua Guatemala', location: { lat: 14.5586, lng: -90.7295 } },
];
