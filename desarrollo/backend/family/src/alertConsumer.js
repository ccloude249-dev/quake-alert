import { subscribe } from './bus.js';

/**
 * Consumidor del bus: cuando el Alert Engine publica `alert.issued`,
 * Family Safety abre una "ventana de seguridad" para las zonas afectadas
 * (en producción: notifica a los grupos, inicia el temporizador de check-in,
 * y marca como "pendiente" a quien no responda).
 */
export async function startAlertConsumer() {
  await subscribe('alert.issued', 'family.alert-issued', async (alert) => {
    if (alert.risk === 'verde') return; // solo niveles amarillo/rojo abren ventana
    console.log(
      `[family] ventana de seguridad abierta · zona=${alert.targetName} ` +
      `riesgo=${alert.risk} · solicitando check-in a los grupos`
    );
    // TODO: resolver grupos por zona y enviar push "¿Estás bien?" vía Notification svc.
  });
}
