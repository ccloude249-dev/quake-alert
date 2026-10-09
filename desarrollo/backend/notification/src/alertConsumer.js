import { subscribe } from './bus.js';
import { dispatchAlert } from './notification.service.js';

/**
 * Lado consumidor: el Alert Engine publica alert.issued -> aqui se difunde por todos
 * los canales. assistance.requested (de Family) escala a brigadas / 911.
 */
export async function startAlertConsumer() {
  await subscribe('alert.issued', 'notification.alert-issued', async (alert) => {
    const tenantId = alert.tenantId || 'demo';
    if (alert.risk === 'verde') { await dispatchAlert(tenantId, { ...alert, channels: ['push'] }, 'es'); return; }
    await dispatchAlert(tenantId, alert, 'es');
  });
  await subscribe('assistance.requested', 'notification.assistance', async (req) => {
    const tenantId = req.tenantId || 'demo';
    console.log('[notification] ESCALAMIENTO 911/brigadas :: miembro=' + (req.memberName || req.memberId) + ' estado=' + req.status);
    await dispatchAlert(tenantId, {
      eventId: req.alertEventId, targetId: req.memberId, targetName: 'Brigada / 911',
      risk: 'rojo', arrivalSeconds: 0, intensity: 9, channels: ['push', 'sms', 'voz'],
    }, 'es');
  });
}
