package gt.quakealert.alarma;

import android.content.Context;
import android.content.SharedPreferences;

/** Preferencias compartidas por la app (WebView), el servicio vigilante y el receptor de arranque. */
final class Prefs {
    private Prefs() { }

    static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences("qa_alarm", Context.MODE_PRIVATE);
    }

    static boolean enabled(Context c) { return sp(c).getBoolean("enabled", false); }
    static void setEnabled(Context c, boolean v) { sp(c).edit().putBoolean("enabled", v).apply(); }

    static String serverUrl(Context c) { return sp(c).getString("serverUrl", ""); }
    static int radiusKm(Context c) { return sp(c).getInt("radiusKm", 320); }
    static float minMag(Context c) { return sp(c).getFloat("minMag", 4.5f); }
    static double lat(Context c) { return sp(c).getFloat("lat", 14.6349f); }
    static double lng(Context c) { return sp(c).getFloat("lng", -90.5069f); }
    /** Segundos que suena la alarma si nadie la silencia. */
    static int durationSec(Context c) { return sp(c).getInt("durationSec", 90); }

    /** Hora (epoch ms) del simulacro programado con AlarmManager; 0 si no hay. */
    static long scheduledAt(Context c) { return sp(c).getLong("scheduledAt", 0L); }
    static void setScheduledAt(Context c, long t) { sp(c).edit().putLong("scheduledAt", t).apply(); }

    static String lastAlarm(Context c) { return sp(c).getString("lastAlarm", ""); }
    static void setLastAlarm(Context c, String json) { sp(c).edit().putString("lastAlarm", json).apply(); }

    /** true si el id es nuevo (y lo recuerda); false si ya se había procesado. Sobrevive reinicios del servicio. */
    static synchronized boolean markSeen(Context c, String id) {
        SharedPreferences sp = sp(c);
        String cur = sp.getString("seen", "");
        String[] ids = cur.isEmpty() ? new String[0] : cur.split(",");
        for (String s : ids) if (s.equals(id)) return false;
        StringBuilder sb = new StringBuilder();
        for (int i = Math.max(0, ids.length - 79); i < ids.length; i++) sb.append(ids[i]).append(',');
        sb.append(id);
        sp.edit().putString("seen", sb.toString()).apply();
        return true;
    }
}
