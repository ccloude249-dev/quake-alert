import { subscribe } from './bus.js';
import { record } from './analytics.service.js';

/** Escucha TODO el exchange (wildcard '#') y agrega cada evento. */
const TOPICS = ['seismic.detected', 'alert.issued', 'checkin.received', 'assistance.requested', 'notification.sent', 'voice.announced', 'device.commanded', 'city.alert.activated', 'drill.finished'];

export async function startEventConsumer() {
  for (const topic of TOPICS) {
    await subscribe(topic, 'analytics.' + topic, async (data) => {
      await record(data.tenantId || 'demo', topic, data);
    });
  }
}
