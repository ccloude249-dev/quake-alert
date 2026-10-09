import amqp from 'amqplib';

const EXCHANGE = 'quakealert.events';
let channel = null;

export async function connectBus(url) {
  if (!url) { console.warn('[bus] sin AMQP_URL - publish a consola, sin consumo'); return; }
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  conn.on('close', () => { channel = null; console.warn('[bus] conexion cerrada'); });
  console.log('[bus] RabbitMQ conectado');
}

export async function publish(routingKey, data) {
  const envelope = { type: routingKey, occurredAt: new Date().toISOString(), data };
  if (!channel) { console.log('[event]', routingKey, JSON.stringify(data)); return; }
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(envelope)),
    { contentType: 'application/json', persistent: true });
}
