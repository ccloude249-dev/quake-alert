/** Catalogo de planes y precios (USD/mes). Logica PURA. */
export const PLANS = [
  { id: 'free',     name: 'Free',     priceUsd: 0,    limits: { alertas: 100,    sensores: 1,   sedes: 1 }, features: ['App ciudadana', 'Alertas push'] },
  { id: 'ciudad',   name: 'Ciudad',   priceUsd: 499,  limits: { alertas: 50000,  sensores: 50,  sedes: 20 }, features: ['Sirenas/LED', 'Panel municipal', 'Voz'] },
  { id: 'empresa',  name: 'Empresa',  priceUsd: 999,  limits: { alertas: 200000, sensores: 200, sedes: 100 }, features: ['Multi-sede', 'Simulacros', 'Integraciones'] },
  { id: 'nacional', name: 'Nacional', priceUsd: 4999, limits: { alertas: -1,      sensores: -1,  sedes: -1 }, features: ['Ilimitado', 'SLA 24/7', 'Soporte dedicado'] },
];

export function planById(id) { return PLANS.find((p) => p.id === id) || PLANS[0]; }

/** Indica si una metrica supero el limite del plan (-1 = ilimitado). */
export function overLimit(plan, metric, used) {
  const limit = (planById(plan).limits || {})[metric];
  if (limit == null || limit < 0) return false;
  return used > limit;
}
