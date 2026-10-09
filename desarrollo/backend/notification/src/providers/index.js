/**
 * Adaptadores de proveedor. En produccion: FCM/APNs, Twilio, WhatsApp Cloud API,
 * SendGrid, motor de voz, gateway de sirenas. Aqui DEGRADAN a consola (modo demo)
 * pero exponen la MISMA interfaz async send() para enchufar el real sin tocar el dominio.
 */
function makeProvider(channel, providerName) {
  return {
    channel,
    name: providerName,
    async send(msg) {
      // TODO: integrar SDK real. Por ahora registra y reporta 'simulado'.
      console.log('[notify:' + channel + '] -> ' + (msg.targetName || msg.targetId || 'broadcast') + ' :: ' + msg.title);
      return { status: 'simulado', provider: providerName };
    },
  };
}

export const PROVIDERS = {
  push:     makeProvider('push', 'fcm-apns'),
  sms:      makeProvider('sms', 'twilio'),
  whatsapp: makeProvider('whatsapp', 'whatsapp-cloud'),
  email:    makeProvider('email', 'sendgrid'),
  voz:      makeProvider('voz', 'voice-engine'),
  sirena:   makeProvider('sirena', 'iot-siren-gw'),
};
