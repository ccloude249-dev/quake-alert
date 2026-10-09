import mongoose from 'mongoose';
import { SensorReading } from './models.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;

const THRESHOLD = Number(process.env.TRIGGER_THRESHOLD || 0.08);
const QUORUM = Number(process.env.QUORUM || 3);
const WINDOW_MS = Number(process.env.WINDOW_MS || 8000);
const COOLDOWN_MS = 30000;

const triggers = []; // { sensorId, location, peakAmplitude, at } recientes
let lastDeclaredAt = 0;

const centroid = (pts) => ({
  lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
  lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
});

/** Magnitud estimada (ilustrativa) a partir de la amplitud pico máxima. */
const estimateMagnitude = (maxAmp) =>
  Math.max(3, Math.min(8, +(4.5 + 2.5 * Math.log10(maxAmp / 0.02)).toFixed(1)));

/**
 * Ingiere una lectura. Si supera el umbral, entra al buffer; cuando hay
 * quórum de sensores distintos dentro de la ventana, declara un evento
 * sísmico y publica `seismic.detected`.
 */
export async function ingestReading(tenantId, dto) {
  const reading = {
    tenantId,
    sensorId: dto.sensorId,
    location: dto.location,
    peakAmplitude: dto.peakAmplitude,
    at: new Date(),
  };
  if (persistenceOn()) await SensorReading.create(reading);

  const now = Date.now();
  // poda ventana
  while (triggers.length && now - triggers[0].at > WINDOW_MS) triggers.shift();

  let declared = null;
  if (dto.peakAmplitude >= THRESHOLD) {
    const existing = triggers.find((t) => t.sensorId === dto.sensorId);
    if (existing) { existing.peakAmplitude = dto.peakAmplitude; existing.at = now; }
    else triggers.push({ ...reading, at: now });

    const distinct = [...new Map(triggers.map((t) => [t.sensorId, t])).values()];
    if (distinct.length >= QUORUM && now - lastDeclaredAt > COOLDOWN_MS) {
      lastDeclaredAt = now;
      const maxAmp = Math.max(...distinct.map((t) => t.peakAmplitude));
      const event = {
        tenantId,
        magnitude: estimateMagnitude(maxAmp),
        depthKm: 10,
        epicenter: centroid(distinct.map((t) => t.location)),
        source: 'detection',
        sensors: distinct.length,
      };
      await publish('seismic.detected', event);
      triggers.length = 0; // cooldown
      declared = event;
    }
  }

  return { accepted: true, triggersInWindow: triggers.length, declared };
}
