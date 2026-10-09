import amqp from 'amqplib';

const EXCHANGE = 'quakealert.events';
let channel = null;

export async function connectBus(url) {
  if (!url) { console.warn('[bus] sin AMQP_URL — eventos a consola'); return; }
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  conn.on('close', () => { channel = null; });
  console.log('[bus] RabbitMQ conectado');
}

export async function publish(routingKey, data) {
  const envelope = { type: routingKey, occurredAt: new Date().toISOString(), data };
  if (!channel) { console.log('[event]', routingKey, JSON.stringify(data)); return; }
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(envelope)),
    { contentType: 'application/json', persistent: true });
}
