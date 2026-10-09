/** Protocolo por sector y riesgo. Logica PURA. */
const BY_SECTOR = {
  banca:     { rojo: 'Cierre de boveda + evacuacion', amarillo: 'Resguardo de cajas + alerta' },
  salud:     { rojo: 'Protocolo hospitalario + generadores', amarillo: 'Alerta a quirofanos' },
  educacion: { rojo: 'Evacuacion a punto de reunion', amarillo: 'Simulacro de agacharse y cubrirse' },
  industria: { rojo: 'Corte de energia + evacuacion', amarillo: 'Detener lineas criticas' },
  retail:    { rojo: 'Evacuacion de clientes', amarillo: 'Alerta a personal' },
  gobierno:  { rojo: 'Continuidad + evacuacion', amarillo: 'Alerta a brigadas' },
};

export function protocolFor(sector, risk) {
  const s = BY_SECTOR[sector] || BY_SECTOR.gobierno;
  if (risk === 'rojo') return { action: s.rojo, status: 'evacuacion' };
  if (risk === 'amarillo') return { action: s.amarillo, status: 'alerta' };
  return { action: 'Monitoreo', status: 'normal' };
}
