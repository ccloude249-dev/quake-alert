/**
 * Puntaje de preparacion 0-100. Logica PURA. Pondera:
 *  - participacion (50%): % de esperados que respondieron
 *  - tiempo de evacuacion (35%): vs objetivo (mas rapido = mejor)
 *  - completitud de pasos (15%): pasos del protocolo completados
 */
export function computeScore(input) {
  const expected = Math.max(1, input.expectedParticipants || 0);
  const participation = Math.min(1, (input.checkins || 0) / expected);
  const target = Math.max(1, input.targetEvacSeconds || 90);
  const avg = input.avgEvacSeconds || target;
  const timeScore = Math.max(0, Math.min(1, target / Math.max(1, avg)));
  const steps = Math.max(0, Math.min(1, (input.avgSteps || 0) / (input.totalSteps || 3)));
  const score = participation * 50 + timeScore * 35 + steps * 15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function grade(score) {
  if (score >= 90) return 'Excelente';
  if (score >= 75) return 'Bueno';
  if (score >= 60) return 'Aceptable';
  return 'Requiere mejora';
}
