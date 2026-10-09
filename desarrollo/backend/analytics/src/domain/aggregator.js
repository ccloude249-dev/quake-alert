/** Agregaciones puras sobre una lista de eventos {type, risk, at}. */

const PERIODS = { '7d': 7, '30d': 30, '12m': 365 };

export function periodDays(period) { return PERIODS[period] || 30; }

export function sinceDate(period) {
  const d = new Date();
  d.setDate(d.getDate() - periodDays(period));
  return d;
}

/** Cuenta por tipo de evento. */
export function countByType(events) {
  const out = {};
  for (const e of events) out[e.type] = (out[e.type] || 0) + 1;
  return out;
}

/** Distribucion por nivel de riesgo (solo alertas). */
export function riskDistribution(events) {
  const out = { rojo: 0, amarillo: 0, verde: 0 };
  for (const e of events) if (e.type === 'alert.issued' && e.risk && out[e.risk] != null) out[e.risk]++;
  return out;
}

/** Serie temporal por bucket (dia o mes segun periodo). */
export function timeSeries(events, period) {
  const byMonth = period === '12m';
  const buckets = new Map();
  for (const e of events) {
    const d = new Date(e.at);
    const key = byMonth
      ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      : d.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([bucket, count]) => ({ bucket, count }));
}

/** KPIs de cabecera. */
export function kpis(events) {
  const alerts = events.filter((e) => e.type === 'alert.issued');
  const checkins = events.filter((e) => e.type === 'checkin.received');
  const notifs = events.filter((e) => e.type === 'notification.sent');
  const safe = checkins.filter((e) => (e.payload && e.payload.status) === 'bien').length;
  return {
    alerts: alerts.length,
    notifications: notifs.length,
    checkins: checkins.length,
    safeRate: checkins.length ? Math.round((safe / checkins.length) * 100) : null,
    seismicEvents: events.filter((e) => e.type === 'seismic.detected').length,
  };
}
