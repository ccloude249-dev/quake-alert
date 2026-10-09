/**
 * Decide que accion ejecuta cada tipo de dispositivo segun el riesgo. Logica PURA.
 * Devuelve [{ kind, action, params }] que el gateway traduce al protocolo real
 * (MQTT, Zigbee, Modbus, webhook del fabricante, etc.).
 */
const PLAYBOOK = {
  rojo: {
    sirena:      { action: 'on', params: { pattern: 'continuo', seconds: 60 } },
    led:         { action: 'display', params: { message: 'EVACUAR - SISMO', color: 'rojo' } },
    valvula_gas: { action: 'close' },
    cerradura:   { action: 'unlock' },
    luz:         { action: 'on', params: { brightness: 100 } },
  },
  amarillo: {
    sirena:      { action: 'on', params: { pattern: 'intermitente', seconds: 30 } },
    led:         { action: 'display', params: { message: 'ALERTA SISMICA', color: 'ambar' } },
    valvula_gas: { action: 'close' },
    luz:         { action: 'on', params: { brightness: 80 } },
  },
  verde: {
    led:         { action: 'display', params: { message: 'Aviso sismico', color: 'cian' } },
  },
};

export function planActions(alert, devices) {
  const book = PLAYBOOK[alert.risk] || PLAYBOOK.amarillo;
  const cmds = [];
  for (const d of devices) {
    const rule = book[d.kind];
    if (!rule) continue;
    cmds.push({ deviceId: d.deviceId, kind: d.kind, action: rule.action, params: rule.params || {}, reason: 'alert:' + alert.risk });
  }
  return cmds;
}
