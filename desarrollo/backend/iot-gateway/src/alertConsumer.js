import { subscribe } from './bus.js';
import { runPlaybook } from './iot.service.js';

export async function startAlertConsumer() {
  await subscribe('alert.issued', 'iot.alert-issued', async (alert) => {
    if (alert.risk === 'verde') return;
    const r = await runPlaybook(alert.tenantId || 'demo', alert);
    console.log('[iot] playbook ejecutado: ' + r.count + ' comandos para zona ' + (alert.targetName || alert.targetId));
  });
}
