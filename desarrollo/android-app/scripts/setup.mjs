#!/usr/bin/env node
// QUAKE ALERT · App Android: prepara el proyecto nativo y, con --build, genera el APK.
//   npm run setup  -- https://TU-APP.herokuapp.com   crea/actualiza android/ (Capacitor + servicio nativo)
//   npm run apk    -- https://TU-APP.herokuapp.com   lo anterior + compila dist/QuakeAlert-debug.apk
//   npm run studio -- https://TU-APP.herokuapp.com   lo anterior + abre Android Studio
// Por defecto el APK abre la App ciudadana (/app). Para empaquetar solo la alarma: añadí --path=/alarma
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';
const MIN_JDK = 21; // Capacitor 7
const argv = process.argv.slice(2);
const p = (...a) => path.join(ROOT, ...a);
const log = (m) => console.log('\x1b[36m▸\x1b[0m ' + m);
const warn = (m) => console.warn('\x1b[33m! ' + m + '\x1b[0m');
const die = (m) => { console.error('\x1b[31m✖ ' + m + '\x1b[0m'); process.exit(1); };
const run = (cmd, args, cwd = ROOT) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: WIN });
  if (r.status !== 0) die('Falló: ' + cmd + ' ' + args.join(' '));
};

// 1) URL del servidor publicado (la app web vive ahí; el APK la muestra y le suma el servicio nativo)
const cfgFile = p('capacitor.config.json');
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const given = argv.find((a) => /^https?:\/\//i.test(a)) || process.env.QA_SERVER_URL || (cfg.server && cfg.server.url) || '';
const pathArg = (argv.find((a) => a.startsWith('--path=')) || '').slice(7);
const START = pathArg ? '/' + pathArg.replace(/^\/+/, '') : '/app';
const base = given.replace(/\/+$/, '').replace(/\/(app|alarma)$/i, '');
if (!/^https?:\/\/.+/i.test(base) || /TU-APP/i.test(base)) die('Falta la URL pública del servidor.\n  Ejemplo: npm run setup -- https://mi-app.herokuapp.com');
cfg.server = Object.assign({}, cfg.server, { url: base + START, cleartext: /^http:\/\//i.test(base) });
fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n');
for (const f of ['www/index.html', 'www/offline.html']) {
  const t = fs.readFileSync(p(f), 'utf8').replace(/(name="qa-start" content=")[^"]*(")/, (_, a, b) => a + base + START + b);
  fs.writeFileSync(p(f), t);
}
log('Servidor: ' + base + ' · pantalla de inicio: ' + START);

// 2) dependencias + proyecto Android de Capacitor
if (!fs.existsSync(p('node_modules/@capacitor/cli'))) { log('Instalando dependencias…'); run('npm', ['install']); }
if (!fs.existsSync(p('android'))) { log('Creando el proyecto Android…'); run('npx', ['cap', 'add', 'android']); }

// 3) capa nativa: servicio vigilante, alarma, plugin, recursos y manifiesto
const appId = cfg.appId;
const javaDir = p('android/app/src/main/java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const f of fs.readdirSync(p('native/java'))) {
  const src = fs.readFileSync(p('native/java', f), 'utf8').split('gt.quakealert.alarma').join(appId);
  fs.writeFileSync(path.join(javaDir, f), src);
}
const resDir = p('android/app/src/main/res');
for (const d of fs.readdirSync(resDir)) { // quitar el splash por defecto de Capacitor (todas las variantes)
  if (!d.startsWith('drawable')) continue;
  const f = path.join(resDir, d, 'splash.png');
  if (fs.existsSync(f)) fs.rmSync(f);
}
fs.cpSync(p('native/res'), resDir, { recursive: true, force: true });

const manFile = p('android/app/src/main/AndroidManifest.xml');
let man = fs.readFileSync(manFile, 'utf8');
const strip = (s, tag) => s.replace(new RegExp('\\s*<!-- QA:' + tag + ':BEGIN -->[\\s\\S]*?<!-- QA:' + tag + ':END -->', 'g'), '');
man = strip(strip(man, 'PERMS'), 'APP');
const perms = fs.readFileSync(p('native/manifest-permissions.xml'), 'utf8').trimEnd();
const comps = fs.readFileSync(p('native/manifest-components.xml'), 'utf8').trimEnd();
man = man.replace('<application', () => '<!-- QA:PERMS:BEGIN -->\n' + perms + '\n    <!-- QA:PERMS:END -->\n\n    <application');
man = man.replace('</application>', () => '    <!-- QA:APP:BEGIN -->\n' + comps + '\n        <!-- QA:APP:END -->\n    </application>');
if (cfg.server.cleartext && !/usesCleartextTraffic/.test(man)) man = man.replace('<application', () => '<application android:usesCleartextTraffic="true"');
fs.writeFileSync(manFile, man);
log('Capa nativa aplicada (servicio, alarma, permisos).');

run('npx', ['cap', 'sync', 'android']);

// 4) opcional: abrir Android Studio / compilar el APK
if (argv.includes('--open')) run('npx', ['cap', 'open', 'android']);

if (argv.includes('--build')) {
  const androidDir = p('android');
  const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', WIN ? 'java.exe' : 'java') : 'java';
  const v = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const m = /version "(\d+)(?:\.(\d+))?/.exec((v.stderr || '') + (v.stdout || ''));
  const major = m ? (m[1] === '1' ? Number(m[2]) : Number(m[1])) : 0;
  if (!major) warn('No pude detectar Java. Instalá JDK ' + MIN_JDK + ' y definí JAVA_HOME.');
  else if (major < MIN_JDK) die('Se detectó JDK ' + major + ' y hace falta JDK ' + MIN_JDK + '+ (definí JAVA_HOME).');

  const lp = path.join(androidDir, 'local.properties');
  if (!fs.existsSync(lp)) {
    const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(os.homedir(), 'Library/Android/sdk'), path.join(os.homedir(), 'Android/Sdk'), path.join(process.env.LOCALAPPDATA || '', 'Android/Sdk')]
      .find((d) => d && fs.existsSync(d));
    if (!sdk) die('No encuentro el Android SDK. Instalá Android Studio (o definí ANDROID_HOME) y repetí el comando.');
    fs.writeFileSync(lp, 'sdk.dir=' + sdk.replace(/\\/g, '\\\\') + '\n');
  }

  log('Compilando el APK (la primera vez descarga Gradle y tarda varios minutos)…');
  if (WIN) run('gradlew.bat', ['assembleDebug'], androidDir); else run('sh', ['gradlew', 'assembleDebug'], androidDir);
  const apk = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
  if (!fs.existsSync(apk)) die('No se generó el APK. Revisá el log de Gradle.');
  fs.mkdirSync(p('dist'), { recursive: true });
  const out = p('dist/QuakeAlert-debug.apk');
  fs.copyFileSync(apk, out);
  log('APK listo: ' + out);
  log('Instalar:  adb install -r "' + out + '"   (o copialo al teléfono y abrilo)');
}
