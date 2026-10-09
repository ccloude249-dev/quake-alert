/**
 * Genera el guion de voz y su SSML. Logica PURA (sin red).
 * El SSML usa pausas y enfasis; cada asistente lo renderiza con su motor TTS.
 */
const STR = {
  es: { alert: 'Alerta sismica de Quake Alert.', strong: 'Sismo fuerte', moderate: 'Sismo moderado', minor: 'Sismo leve',
        arriveA: 'Llega en', arriveB: 'segundos a', action: 'Agachate, cubrete y sujetate. Alejate de ventanas.' },
  en: { alert: 'Quake Alert earthquake warning.', strong: 'Strong earthquake', moderate: 'Moderate earthquake', minor: 'Minor earthquake',
        arriveA: 'Arriving in', arriveB: 'seconds at', action: 'Drop, cover and hold on. Move away from windows.' },
};

function severity(risk, s) {
  if (risk === 'rojo') return s.strong;
  if (risk === 'amarillo') return s.moderate;
  return s.minor;
}

/** Estima la duracion hablada (~2.8 palabras/seg). */
function estimateDuration(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 2.8));
}

export function buildAnnouncement(alert, lang) {
  const s = STR[lang] || STR.es;
  const secs = alert.arrivalSeconds != null ? alert.arrivalSeconds : 0;
  const zone = alert.targetName || (lang === 'en' ? 'your area' : 'tu zona');
  const text = s.alert + ' ' + severity(alert.risk, s) + '. ' + s.arriveA + ' ' + secs + ' ' + s.arriveB + ' ' + zone + '. ' + s.action;
  const ssml = '<speak><emphasis level="strong">' + s.alert + '</emphasis><break time="300ms"/>' +
    severity(alert.risk, s) + '. <say-as interpret-as="cardinal">' + secs + '</say-as> ' + s.arriveB + ' ' + zone +
    '.<break time="250ms"/>' + s.action + '</speak>';
  return { text, ssml, durationSec: estimateDuration(text) };
}

export const ASSISTANTS = ['alexa', 'google', 'siri', 'ivr'];
