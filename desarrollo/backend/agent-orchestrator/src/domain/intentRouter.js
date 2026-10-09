/**
 * Ruteo de intenciones por reglas (sin red). En produccion se sustituye/encadena
 * con un LLM, pero la interfaz (detectIntent -> skill) permanece igual.
 */
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const RULES = [
  { intent: 'evacuacion', kw: ['evacua', 'salir', 'ruta', 'refugio', 'punto de reunion', 'donde voy'] },
  { intent: 'que_hacer', kw: ['que hago', 'durante', 'sismo', 'temblor', 'protegerme', 'agachar'] },
  { intent: 'familia', kw: ['familia', 'donde esta', 'mi hijo', 'mi mama', 'localiza', 'contacto'] },
  { intent: 'reportar', kw: ['reportar', 'dano', 'derrumbe', 'fuga', 'herido', 'emergencia'] },
  { intent: 'preparacion', kw: ['kit', 'preparar', 'mochila', 'plan', 'preparacion'] },
];

export function detectIntent(text) {
  const t = norm(text);
  for (const r of RULES) if (r.kw.some((k) => t.includes(norm(k)))) return r.intent;
  return 'fallback';
}
