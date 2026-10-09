import { subscribe } from './bus.js';
import { regionalAlert } from './corporate.service.js';

/** Una alerta sismica externa dispara protocolo regional en todas las sedes. */
export async function startAlertConsumer() {
  await subscribe('alert.issued', 'corporate.alert-issued', async (alert) => {
    if (alert.risk === 'verde') return;
    await regionalAlert(alert.tenantId || 'demo', { risk: alert.risk });
  });
}
