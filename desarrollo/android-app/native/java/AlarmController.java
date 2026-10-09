package gt.quakealert.alarma;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

/**
 * Orquesta la alarma. Todo lo que hace que suene con el teléfono en silencio y bloqueado:
 *  · audio con USAGE_ALARM (el modo silencio no silencia el canal de alarma) + volumen de alarma al máximo
 *  · vibración con atributos de alarma (vibra aunque el timbre esté en silencio)
 *  · "No molestar" desactivado mientras suena (solo si el usuario dio el acceso)
 *  · pantalla encendida (wake lock) + notificación de pantalla completa que abre AlarmActivity sobre el bloqueo
 *  · flash de la linterna intermitente
 */
final class AlarmController {
    static final String CH_GUARD = "qa_guard_v1";
    static final String CH_ALARM = "qa_alarm_v1";
    static final int NOTIF_GUARD = 1001;
    static final int NOTIF_ALARM = 1002;
    static final String ACTION_SILENCE = "gt.quakealert.alarma.SILENCE";
    static final String ACTION_FIRE = "gt.quakealert.alarma.FIRE";

    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final long[] VIBRATION = {0, 500, 150, 500, 150, 500, 150, 500, 150, 900, 700};
    private static final AudioManager.OnAudioFocusChangeListener NO_OP_FOCUS = new AudioManager.OnAudioFocusChangeListener() {
        @Override public void onAudioFocusChange(int change) { }
    };

    private static Context appCtx;
    private static volatile boolean active = false;
    private static MediaPlayer player;
    private static AudioFocusRequest focusRequest;
    private static Vibrator vibrator;
    private static volatile String torchId;
    private static boolean torchOn = false;
    private static int prevAlarmVolume = -1;
    private static int prevFilter = -1;
    private static PowerManager.WakeLock screenLock;

    private static final Runnable AUTO_STOP = new Runnable() {
        @Override public void run() { if (appCtx != null) silence(appCtx); }
    };
    private static final Runnable STROBE = new Runnable() {
        @Override public void run() {
            String id = torchId;
            if (!active || id == null || appCtx == null) return;
            try {
                torchOn = !torchOn;
                ((CameraManager) appCtx.getSystemService(Context.CAMERA_SERVICE)).setTorchMode(id, torchOn);
            } catch (Exception ignored) { }
            MAIN.postDelayed(this, 350);
        }
    };

    private AlarmController() { }

    static boolean isActive() { return active; }

    /** Dispara la alarma completa. Seguro de llamar desde cualquier hilo. */
    static synchronized void trigger(Context ctx, Quake q, boolean test) {
        appCtx = ctx.getApplicationContext();
        Prefs.setScheduledAt(appCtx, 0);
        ensureChannels(appCtx);
        Prefs.setLastAlarm(appCtx, describe(q, test));
        wakeScreen(appCtx);
        startPlayback(appCtx);
        Intent full = fullScreenIntent(appCtx, q, test);
        postNotification(appCtx, q, test, full);
        try { appCtx.startActivity(full); } catch (Exception ignored) { } // si la app está al frente, se ve de inmediato
        MAIN.removeCallbacks(AUTO_STOP);
        MAIN.postDelayed(AUTO_STOP, Prefs.durationSec(appCtx) * 1000L);
    }

    static synchronized void silence(Context ctx) {
        Context app = ctx.getApplicationContext();
        MAIN.removeCallbacks(AUTO_STOP);
        stopPlayback(app, true);
        try { ((NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NOTIF_ALARM); } catch (Exception ignored) { }
        AlarmActivity.closeIfOpen();
    }

    // ---------- reproducción ----------
    private static void startPlayback(Context app) {
        stopPlayback(app, false);
        active = true;
        AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
        NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);

        try {
            if (prevAlarmVolume < 0) prevAlarmVolume = am.getStreamVolume(AudioManager.STREAM_ALARM);
            am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
        } catch (Exception ignored) { }

        try {
            if (Build.VERSION.SDK_INT >= 23 && nm.isNotificationPolicyAccessGranted()) {
                int cur = nm.getCurrentInterruptionFilter();
                if (cur > NotificationManager.INTERRUPTION_FILTER_ALL) {
                    if (prevFilter < 0) prevFilter = cur;
                    nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);
                }
            }
        } catch (Exception ignored) { }

        AudioAttributes aa = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        try {
            requestFocus(am, aa);
            player = MediaPlayer.create(app, R.raw.qa_siren, aa, am.generateAudioSessionId());
            if (player != null) {
                player.setLooping(true);
                player.setVolume(1f, 1f);
                player.setWakeMode(app, PowerManager.PARTIAL_WAKE_LOCK);
                player.start();
            }
        } catch (Exception e) { player = null; }

        try {
            vibrator = (Vibrator) app.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION, 0), aa);
                else vibrator.vibrate(VIBRATION, 0, aa);
            }
        } catch (Exception ignored) { }

        try {
            CameraManager cm = (CameraManager) app.getSystemService(Context.CAMERA_SERVICE);
            torchId = null;
            for (String id : cm.getCameraIdList()) {
                CameraCharacteristics cc = cm.getCameraCharacteristics(id);
                Boolean flash = cc.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                Integer facing = cc.get(CameraCharacteristics.LENS_FACING);
                if (Boolean.TRUE.equals(flash) && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) { torchId = id; break; }
            }
            if (torchId != null) MAIN.post(STROBE);
        } catch (Exception e) { torchId = null; }
    }

    private static void stopPlayback(Context app, boolean restoreSettings) {
        active = false;
        MAIN.removeCallbacks(STROBE);
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) { }
            try { player.release(); } catch (Exception ignored) { }
            player = null;
        }
        if (vibrator != null) {
            try { vibrator.cancel(); } catch (Exception ignored) { }
            vibrator = null;
        }
        if (torchId != null) {
            try { ((CameraManager) app.getSystemService(Context.CAMERA_SERVICE)).setTorchMode(torchId, false); } catch (Exception ignored) { }
            torchId = null;
            torchOn = false;
        }
        AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
        abandonFocus(am);
        if (restoreSettings) {
            if (prevAlarmVolume >= 0) {
                try { am.setStreamVolume(AudioManager.STREAM_ALARM, prevAlarmVolume, 0); } catch (Exception ignored) { }
                prevAlarmVolume = -1;
            }
            if (prevFilter >= 0) {
                try { ((NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE)).setInterruptionFilter(prevFilter); } catch (Exception ignored) { }
                prevFilter = -1;
            }
        }
    }

    private static void requestFocus(AudioManager am, AudioAttributes aa) {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(aa).setOnAudioFocusChangeListener(NO_OP_FOCUS).build();
                am.requestAudioFocus(focusRequest);
            } else {
                am.requestAudioFocus(NO_OP_FOCUS, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
            }
        } catch (Exception ignored) { }
    }

    private static void abandonFocus(AudioManager am) {
        try {
            if (Build.VERSION.SDK_INT >= 26) { if (focusRequest != null) am.abandonAudioFocusRequest(focusRequest); }
            else am.abandonAudioFocus(NO_OP_FOCUS);
        } catch (Exception ignored) { }
        focusRequest = null;
    }

    @SuppressWarnings("deprecation")
    private static void wakeScreen(Context app) {
        try {
            PowerManager pm = (PowerManager) app.getSystemService(Context.POWER_SERVICE);
            if (screenLock != null && screenLock.isHeld()) screenLock.release();
            screenLock = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "QuakeAlert:alarm-screen");
            screenLock.acquire(20000);
        } catch (Exception ignored) { }
    }

    // ---------- simulacro programado (AlarmManager) ----------
    private static PendingIntent firePending(Context app) {
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(app, 80, new Intent(app, QaReceiver.class).setAction(ACTION_FIRE), fl);
    }

    /**
     * Programa un simulacro con AlarmManager.setAlarmClock: el sistema lo dispara a la hora exacta aunque el teléfono
     * duerma (Doze), la app esté cerrada o la pantalla apagada. Devuelve la hora programada (epoch ms).
     */
    static long schedule(Context ctx, int delaySec) {
        Context app = ctx.getApplicationContext();
        long at = System.currentTimeMillis() + Math.max(0, delaySec) * 1000L;
        AlarmManager am = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = firePending(app);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) throw new SecurityException("sin permiso de alarmas exactas");
            int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent show = PendingIntent.getActivity(app, 81, new Intent(app, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP), fl);
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
        } catch (Exception e) {
            try { // sin permiso de alarmas exactas: respaldo aproximado (puede tardar si el teléfono está en reposo profundo)
                if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                else am.set(AlarmManager.RTC_WAKEUP, at, pi);
            } catch (Exception ignored) { }
        }
        Prefs.setScheduledAt(app, at);
        return at;
    }

    static void cancelScheduled(Context ctx) {
        Context app = ctx.getApplicationContext();
        try { ((AlarmManager) app.getSystemService(Context.ALARM_SERVICE)).cancel(firePending(app)); } catch (Exception ignored) { }
        Prefs.setScheduledAt(app, 0);
    }

    // ---------- notificaciones ----------
    static void ensureChannels(Context app) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CH_GUARD) == null) {
            NotificationChannel g = new NotificationChannel(CH_GUARD, "Vigilancia sísmica", NotificationManager.IMPORTANCE_LOW);
            g.setDescription("Mantiene la alarma activa en segundo plano. Podés ocultarla, pero no la desactives.");
            g.setShowBadge(false);
            nm.createNotificationChannel(g);
        }
        if (nm.getNotificationChannel(CH_ALARM) == null) {
            NotificationChannel a = new NotificationChannel(CH_ALARM, "Alarma de sismo", NotificationManager.IMPORTANCE_HIGH);
            a.setDescription("Sonido, vibración y pantalla encendida cuando hay un sismo cerca.");
            a.setSound(null, null);          // el sonido lo reproduce AlarmController por el canal ALARM
            a.enableVibration(false);        // la vibración también es propia
            a.enableLights(true);
            a.setLightColor(Color.RED);
            a.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            a.setBypassDnd(true);
            nm.createNotificationChannel(a);
        }
    }

    private static Intent fullScreenIntent(Context app, Quake q, boolean test) {
        return new Intent(app, AlarmActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NO_USER_ACTION)
                .putExtra("mag", q.mag).putExtra("place", q.place).putExtra("km", q.distanceKm)
                .putExtra("bearing", q.bearing).putExtra("time", q.time).putExtra("test", test);
    }

    private static void postNotification(Context app, Quake q, boolean test, Intent full) {
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent fs = PendingIntent.getActivity(app, 77, full, fl);
        PendingIntent stop = PendingIntent.getBroadcast(app, 78, new Intent(app, QaReceiver.class).setAction(ACTION_SILENCE), fl);
        Notification n = new NotificationCompat.Builder(app, CH_ALARM)
                .setSmallIcon(R.drawable.ic_stat_quake)
                .setContentTitle((test ? "SIMULACRO · " : "") + "Sismo M" + q.magLabel())
                .setContentText(q.detail())
                .setStyle(new NotificationCompat.BigTextStyle().bigText(q.detail()))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(0xFFFB5670)
                .setOngoing(true)
                .setAutoCancel(false)
                .setShowWhen(true)
                .setWhen(q.time > 0 ? q.time : System.currentTimeMillis())
                .setContentIntent(fs)
                .setFullScreenIntent(fs, true)
                .addAction(0, "DETENER ALARMA", stop)
                .build();
        try { ((NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIF_ALARM, n); } catch (Exception ignored) { }
    }

    private static String describe(Quake q, boolean test) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", q.id); o.put("mag", q.mag); o.put("place", q.place); o.put("km", q.distanceKm);
            o.put("bearing", q.bearing); o.put("time", q.time); o.put("at", System.currentTimeMillis()); o.put("test", test);
            return o.toString();
        } catch (Exception e) { return ""; }
    }
}
