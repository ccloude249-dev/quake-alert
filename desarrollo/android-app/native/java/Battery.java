package gt.quakealert.alarma;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.BatteryManager;
import android.os.SystemClock;

/**
 * Medición honesta de batería para la demo. Android no deja que una app lea su propio porcentaje de consumo (eso lo
 * calcula el sistema en Ajustes › Batería), así que se mide lo que sí es observable: cuánto bajó la batería del teléfono
 * desde que se activó la alarma y cuánto tiempo retuvo el vigilante la CPU despierta.
 */
final class Battery {
    private Battery() { }

    private static long awakeUntil = 0; // elapsedRealtime hasta el que ya hay una toma de CPU vigente

    private static Intent sticky(Context c) {
        return c.getApplicationContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    }

    static int pct(Context c) {
        Intent i = sticky(c);
        if (i == null) return -1;
        int level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        return level < 0 || scale <= 0 ? -1 : Math.round(100f * level / scale);
    }

    static boolean charging(Context c) {
        Intent i = sticky(c);
        if (i == null) return false;
        int st = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        return st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
    }

    /** Empieza una medición nueva (al activar la alarma o al conectar el cargador). */
    static synchronized void resetBaseline(Context c) {
        awakeUntil = 0;
        Prefs.sp(c).edit().putLong("batSince", System.currentTimeMillis()).putInt("batStart", pct(c)).putLong("batAwakeMs", 0L).apply();
    }

    static void clearBaseline(Context c) { Prefs.sp(c).edit().putLong("batSince", 0L).apply(); }
    static long since(Context c) { return Prefs.sp(c).getLong("batSince", 0L); }
    static int startPct(Context c) { return Prefs.sp(c).getInt("batStart", -1); }
    static long awakeMs(Context c) { return Prefs.sp(c).getLong("batAwakeMs", 0L); }

    /**
     * Pide mantener la CPU despierta `ms` más. Devuelve true solo si eso alarga la toma vigente (el llamador entonces hace
     * wakeLock.acquire(ms)); así una toma corta nunca acorta una larga y el tiempo contado es el real, sin solapes.
     */
    static synchronized boolean extend(Context c, long ms) {
        long now = SystemClock.elapsedRealtime(), end = now + ms;
        if (end <= awakeUntil) return false;
        long add = end - Math.max(now, awakeUntil);
        awakeUntil = end;
        SharedPreferences sp = Prefs.sp(c);
        sp.edit().putLong("batAwakeMs", sp.getLong("batAwakeMs", 0L) + add).apply();
        return true;
    }
}
