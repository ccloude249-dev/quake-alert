/** Habilidades del asistente. Cada una devuelve { reply, actions[], suggestions[] }. */

export const SKILLS = {
  evacuacion: () => ({
    reply: 'La ruta segura mas cercana evita pasos elevados y cristales. El refugio mas proximo esta a 240 m: Escuela Central. Sigue las flechas verdes.',
    actions: [{ type: 'abrir_mapa', target: 'refugios' }],
    suggestions: ['Ver mapa', 'Compartir mi ubicacion', 'Otro refugio'],
  }),
  que_hacer: () => ({
    reply: 'Agachate, cubrete bajo una mesa firme y sujetate. Alejate de ventanas. No uses elevadores ni corras hacia las salidas.',
    actions: [],
    suggestions: ['Y si estoy en la calle?', 'Y si manejo?', 'Reportar dano'],
  }),
  familia: () => ({
    reply: 'Tu red familiar: 3 de 4 a salvo. Diego esta en transito, localizando. Quieres enviar un check-in o llamar?',
    actions: [{ type: 'abrir_familia' }],
    suggestions: ['Enviar estoy bien', 'Llamar a Diego', 'Ver en mapa'],
  }),
  reportar: () => ({
    reply: 'Entendido. Comparte tu ubicacion y tipo de incidente (estructural, fuga de gas, persona herida) y lo escalo a proteccion civil.',
    actions: [{ type: 'abrir_reporte' }],
    suggestions: ['Dano estructural', 'Fuga de gas', 'Persona herida'],
  }),
  preparacion: () => ({
    reply: 'Tu nivel de preparacion es 92/100. Te falta: revisar el kit de emergencia (agua para 3 dias) y definir el punto de reunion familiar.',
    actions: [],
    suggestions: ['Checklist del kit', 'Definir punto de reunion'],
  }),
  fallback: () => ({
    reply: 'Estoy monitoreando tu zona. Puedo ayudarte con evacuacion, que hacer durante un sismo, el estado de tu familia o reportar un dano.',
    actions: [],
    suggestions: ['Ruta de evacuacion', 'Donde esta mi familia', 'Reportar dano'],
  }),
};
