/**
 * Plantillas de mensaje por nivel de riesgo e idioma. Logica PURA.
 * Devuelve { title, body } listos para cualquier canal de texto.
 */
const COPY = {
  es: {
    rojo:     { title: 'ALERTA SISMICA', verb: 'Sismo fuerte detectado' },
    amarillo: { title: 'Alerta sismica', verb: 'Sismo moderado detectado' },
    verde:    { title: 'Aviso sismico', verb: 'Sismo leve detectado' },
    action:   'Agachate, cubrete y sujetate. Alejate de ventanas.',
  },
  en: {
    rojo:     { title: 'EARTHQUAKE ALERT', verb: 'Strong earthquake detected' },
    amarillo: { title: 'Earthquake alert', verb: 'Moderate earthquake detected' },
    verde:    { title: 'Seismic notice', verb: 'Minor earthquake detected' },
    action:   'Drop, cover and hold on. Move away from windows.',
  },
};

export function buildMessage(alert, lang) {
  const c = COPY[lang] || COPY.es;
  const lvl = c[alert.risk] || c.amarillo;
  const secs = alert.arrivalSeconds != null ? alert.arrivalSeconds : '?';
  const body = lvl.verb + '. Llega en ' + secs + ' s a ' + (alert.targetName || 'tu zona') +
    ' (intensidad ' + (alert.intensity || '-') + '). ' + c.action;
  return { title: lvl.title, body };
}
