/**
 * Lógica de dominio PURA del Alert Engine — sin Express, sin Mongo.
 * Calcula tiempo de llegada de la onda S, intensidad esperada (MMI) y riesgo.
 *
 * ⚠ Las constantes y fórmulas son una APROXIMACIÓN para el prototipo.
 *   En producción deben calibrarse con modelos sismológicos reales
 *   (GMPE/atenuación regional, velocidades por geología local, etc.).
 */

const VS_KM_S = 3.5;            // velocidad aprox. de la onda S (km/s)
const DETECTION_LATENCY_S = 3;  // latencia de detección + difusión

const toRad = (d) => (d * Math.PI) / 180;

/** Distancia en superficie entre dos {lat,lng} (Haversine, km). */
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Segundos de aviso antes de que llegue la onda S al objetivo. */
export function estimateArrivalSeconds(epicenter, target, depthKm = 10) {
  const surface = haversineKm(epicenter, target);
  const hypocentral = Math.sqrt(surface * surface + depthKm * depthKm);
  const sWave = hypocentral / VS_KM_S;
  return Math.max(0, Math.round(sWave - DETECTION_LATENCY_S));
}

/** Intensidad de Mercalli (MMI 1–12) aproximada por atenuación simple. */
export function estimateIntensity(magnitude, distanceKm) {
  const mmi = 1.5 * magnitude - 1.6 * Math.log10(Math.max(distanceKm, 1)) - 0.4;
  return Math.max(1, Math.min(12, Math.round(mmi)));
}

/** Nivel de riesgo por color a partir de la intensidad. */
export function riskLevel(intensity) {
  if (intensity >= 7) return 'rojo';
  if (intensity >= 5) return 'amarillo';
  return 'verde';
}

/**
 * Construye una alerta para un objetivo (zona/usuario) dado un evento sísmico.
 * event: { magnitude, depthKm, epicenter:{lat,lng} }
 * target: { id, name, location:{lat,lng} }
 */
export function buildAlert(event, target) {
  const distanceKm = haversineKm(event.epicenter, target.location);
  const arrivalSeconds = estimateArrivalSeconds(event.epicenter, target.location, event.depthKm);
  const intensity = estimateIntensity(event.magnitude, distanceKm);
  const risk = riskLevel(intensity);
  return {
    targetId: target.id,
    targetName: target.name,
    distanceKm: Math.round(distanceKm),
    arrivalSeconds,
    intensity,
    risk,
    channels: risk === 'verde' ? ['push'] : ['push', 'sms', 'whatsapp', 'sirena', 'voz'],
  };
}
