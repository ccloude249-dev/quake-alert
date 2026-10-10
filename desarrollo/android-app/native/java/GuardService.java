package gt.quakealert.alarma;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Servicio en primer plano: conexión en vivo con el servidor (SSE, latido cada 25 s) y sondeo de respaldo.
 * Solo retiene la CPU unos segundos al procesar; el resto del tiempo el teléfono duerme normal. Cuando llega un sismo que cumple radio/magnitud llama a AlarmController.trigger().
 */
public class GuardService extends Service {
    static final String ACTION_FIRE = "gt.quakealert.alarma.FIRE_NOW";
    private static final long MAX_AGE_MS = 15 * 60 * 1000L;
    private static final int FGS_SPECIAL_USE = 1 << 30; // ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE (API 34)

    static volatile boolean running = false;
    static volatile boolean connected = false;
    static volatile long lastOkAt = 0;

    private final Handler main = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock cpuLock;
    private volatile boolean alive = false;
    private volatile int generation = 0;
    private volatile HttpURLConnection sseConn;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        AlarmController.ensureChannels(this);
        goForeground(); // siempre primero: Android exige startForeground() tras startForegroundService()
        if (intent == null && !Prefs.enabled(this)) { shutdown(); return START_NOT_STICKY; }
        if (!alive && Prefs.enabled(this)) startWorkers();
        if (intent != null && ACTION_FIRE.equals(intent.getAction())) fireSimulation();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        alive = false; running = false; connected = false; generation++;
        main.removeCallbacksAndMessages(null);
        closeSse();
        releaseLock();
        super.onDestroy();
    }

    private void goForeground() {
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent open = PendingIntent.getActivity(this, 10,
                new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP), fl);
        Notification n = new NotificationCompat.Builder(this, AlarmController.CH_GUARD)
                .setSmallIcon(R.drawable.ic_stat_quake)
                .setContentTitle("Alarma sísmica activa")
                .setContentText("Vigilando sismos cerca de vos · suena aunque el teléfono esté en silencio")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(0xFF22D3EE)
                .setContentIntent(open)
                .build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(AlarmController.NOTIF_GUARD, n, FGS_SPECIAL_USE);
        else startForeground(AlarmController.NOTIF_GUARD, n);
    }

    private void startWorkers() {
        final int g = ++generation;
        alive = true; running = true;
        try {
            if (cpuLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                cpuLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuakeAlert:guard");
                cpuLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) { }
        Thread sse = new Thread(new Runnable() { @Override public void run() { sseLoop(g); } }, "qa-sse");
        Thread poll = new Thread(new Runnable() { @Override public void run() { pollLoop(g); } }, "qa-poll");
        sse.setDaemon(true); poll.setDaemon(true);
        sse.start(); poll.start();
    }

    private void shutdown() {
        alive = false; running = false; connected = false; generation++;
        main.removeCallbacksAndMessages(null);
        closeSse();
        releaseLock();
        stopForeground(true);
        stopSelf();
    }

    private void releaseLock() {
        try { if (cpuLock != null && cpuLock.isHeld()) cpuLock.release(); } catch (Exception ignored) { }
    }

    // Wake lock con tiempo límite solo mientras hay trabajo; entre latidos la CPU duerme y el paquete SSE la despierta.
    private void awake(long ms) {
        try { if (cpuLock != null) cpuLock.acquire(ms); } catch (Exception ignored) { }
    }

    private void closeSse() {
        final HttpURLConnection c = sseConn;
        sseConn = null;
        if (c != null) new Thread(new Runnable() { @Override public void run() { try { c.disconnect(); } catch (Exception ignored) { } } }).start();
    }

    private boolean live(int g) { return alive && g == generation; }

    // Simulacro (lo programa AlarmManager): pasa por el mismo camino que una alarma real.
    private void fireSimulation() {
        AlarmController.trigger(this, Quake.test(), true);
        if (!Prefs.enabled(this)) shutdownWhenQuiet(); // servicio levantado solo para el simulacro: se apaga al terminar
    }

    private void shutdownWhenQuiet() {
        main.postDelayed(new Runnable() {
            @Override public void run() {
                if (Prefs.enabled(GuardService.this)) return;
                if (AlarmController.isActive()) { main.postDelayed(this, 3000); return; }
                shutdown();
            }
        }, 3000);
    }

    // ---------- conexión en vivo (SSE) ----------
    private void sseLoop(int g) {
        long backoff = 2000;
        while (live(g)) {
            HttpURLConnection c = null;
            try {
                String base = Prefs.serverUrl(this);
                if (base.isEmpty()) { Thread.sleep(5000); continue; }
                awake(20000);
                c = (HttpURLConnection) new URL(base + "/api/stream").openConnection();
                sseConn = c;
                c.setRequestProperty("Accept", "text/event-stream");
                c.setRequestProperty("Cache-Control", "no-cache");
                c.setConnectTimeout(15000);
                c.setReadTimeout(70000); // el servidor manda un latido cada 25 s
                if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode());
                connected = true; backoff = 2000; lastOkAt = System.currentTimeMillis();
                BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
                String line, event = "message";
                StringBuilder data = new StringBuilder();
                while (live(g) && (line = r.readLine()) != null) {
                    if (line.startsWith("event:") || line.startsWith("data:")) awake(10000);
                    if (line.isEmpty()) {
                        if (data.length() > 0 && "quake".equals(event)) onQuakeJson(data.toString());
                        event = "message";
                        data.setLength(0);
                    } else if (line.startsWith("event:")) event = line.substring(6).trim();
                    else if (line.startsWith("data:")) data.append(line.substring(5).trim());
                }
            } catch (InterruptedException ie) {
                return;
            } catch (Exception ignored) {
                // sin red o servidor reiniciando: reintento con espera creciente
            } finally {
                connected = false;
                if (c != null) { try { c.disconnect(); } catch (Exception ignored) { } }
            }
            // Reintentos rápidos (reinicio del servidor) se mantienen despiertos; si la red sigue caída no se retiene la CPU.
            if (backoff <= 8000) awake(backoff + 20000);
            try { Thread.sleep(backoff); } catch (InterruptedException ie) { return; }
            backoff = Math.min(backoff * 2, 30000);
        }
    }

    // ---------- sondeo de respaldo (solo sismos recientes de la región: pocos KB) ----------
    private void pollLoop(int g) {
        while (live(g)) {
            try { poll(); lastOkAt = System.currentTimeMillis(); } catch (Exception ignored) { }
            try { Thread.sleep(connected ? 45000 : 20000); } catch (InterruptedException ie) { return; }
        }
    }

    private void poll() throws Exception {
        String base = Prefs.serverUrl(this);
        if (base.isEmpty()) return;
        awake(30000);
        HttpURLConnection c = (HttpURLConnection) new URL(base + "/api/quakes/recent?minutes=15&minMag=" + Prefs.minMag(this)).openConnection();
        try {
            c.setConnectTimeout(15000);
            c.setReadTimeout(20000);
            if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode());
            BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[4096];
            int n;
            while ((n = r.read(buf)) > 0) sb.append(buf, 0, n);
            JSONArray arr = new JSONObject(sb.toString()).optJSONArray("events");
            if (arr == null) return;
            double lat = Prefs.lat(this), lng = Prefs.lng(this);
            for (int i = 0; i < arr.length(); i++) consider(Quake.parse(arr.optJSONObject(i), lat, lng));
        } finally {
            c.disconnect();
        }
    }

    private void onQuakeJson(String json) {
        try { consider(Quake.parse(new JSONObject(json), Prefs.lat(this), Prefs.lng(this))); } catch (Exception ignored) { }
    }

    private void consider(Quake q) {
        if (q == null || !Prefs.enabled(this)) return;
        if (System.currentTimeMillis() - q.time > MAX_AGE_MS) return;
        if (q.mag < Prefs.minMag(this) || q.distanceKm > Prefs.radiusKm(this)) return;
        if (!Prefs.markSeen(this, q.id)) return;
        AlarmController.trigger(this, q, false);
    }
}
