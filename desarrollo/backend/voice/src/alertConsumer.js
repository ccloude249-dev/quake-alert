import { subscribe } from './bus.js';
import { announce } from './voice.service.js';

/** Solo amarillo/rojo disparan anuncio de voz automatico. */
export async function startAlertConsumer() {
  await subscribe('alert.issued', 'voice.alert-issued', async (alert) => {
    if (alert.risk === 'verde') return;
    await announce(alert.tenantId || 'demo', alert, { lang: 'es' });
  });
}
