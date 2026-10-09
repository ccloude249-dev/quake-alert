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

export async function subscribe(pattern, queueName, handler) {
  if (!channel) { console.warn('[bus] sin canal - no se puede suscribir a', pattern); return; }
  const q = await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(q.queue, EXCHANGE, pattern);
  channel.consume(q.queue, async (msg) => {
    if (!msg) return;
    try {
      const envelope = JSON.parse(msg.content.toString());
      await handler(envelope.data, envelope);
      channel.ack(msg);
    } catch (err) {
      console.error('[bus] error procesando', pattern, err.message);
      channel.nack(msg, false, false);
    }
  });
  console.log('[bus] suscrito a', pattern, '->', queueName);
}
