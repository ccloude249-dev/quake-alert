import amqp from 'amqplib';

const EXCHANGE = 'quakealert.events';
let channel = null;

/**
 * Conecta a RabbitMQ (CloudAMQP) y declara el exchange de tópicos.
 * Sin AMQP_URL el publisher degrada a consola — el servicio nunca se cae
 * por falta de broker.
 */
export async function connectBroker(url) {
  if (!url) {
    console.warn('[broker] AMQP_URL no definido — eventos se registran en consola');
    return;
  }
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  conn.on('close', () => { channel = null; console.warn('[broker] conexión cerrada'); });
  console.log('[broker] RabbitMQ conectado');
}

/**
 * Publica un evento de dominio al bus.
 * routingKey ej: 'alert.issued' · 'seismic.detected'
 */
export async function publish(routingKey, data) {
  const envelope = {
    type: routingKey,
    occurredAt: new Date().toISOString(),
    data,
  };
  if (!channel) {
    console.log('[event]', routingKey, JSON.stringify(data));
    return;
  }
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(envelope)), {
    contentType: 'application/json',
    persistent: true,
  });
}
