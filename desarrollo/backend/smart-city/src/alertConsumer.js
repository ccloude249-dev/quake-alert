import { subscribe } from './bus.js';
import { Zone } from './models.js';
import mongoose from 'mongoose';

/** Cuando llega una alerta sismica externa, marca las zonas afectadas en alerta. */
export async function startAlertConsumer() {
  await subscribe('alert.issued', 'smartcity.alert-issued', async (alert) => {
    if (alert.risk === 'verde') return;
    if (mongoose.connection?.readyState !== 1) {
      console.log('[smart-city] zona ' + (alert.targetName || alert.targetId) + ' -> ' + (alert.risk === 'rojo' ? 'evacuacion' : 'alerta'));
      return;
    }
    const status = alert.risk === 'rojo' ? 'evacuacion' : 'alerta';
    await Zone.updateMany({ tenantId: alert.tenantId || 'demo', zoneId: alert.targetId }, { $set: { status } });
  });
}
