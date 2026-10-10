package gt.quakealert.alarma;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Locale;

/** Puente JS ↔ nativo: Capacitor.Plugins.QuakeAlarm.{start, stop, configure, status, test, silence, requestNotifications, openSettings}. */
@CapacitorPlugin(
        name = "QuakeAlarm",
        permissions = { @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" }) }
)
public class QuakeAlarmPlugin extends Plugin {

    @PluginMethod
    public void status(PluginCall call) { call.resolve(buildStatus(null)); }

    @PluginMethod
    public void configure(PluginCall call) {
        applyPrefs(call);
        call.resolve(buildStatus(null));
    }

    /** Arma la alarma: guarda preferencias y levanta el servicio vigilante en primer plano. */
    @PluginMethod
    public void start(PluginCall call) {
        applyPrefs(call);
        Context c = getContext();
        if (Prefs.serverUrl(c).isEmpty()) { call.reject("Falta serverUrl"); return; }
        if (!Prefs.enabled(c)) Battery.resetBaseline(c); // activación nueva = medición de consumo nueva
        Prefs.setEnabled(c, true);
        try {
            ContextCompat.startForegroundService(c, new Intent(c, GuardService.class));
        } catch (Exception e) {
            call.reject("No se pudo iniciar el servicio: " + e.getMessage());
            return;
        }
        call.resolve(buildStatus(Boolean.TRUE));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context c = getContext();
        Prefs.setEnabled(c, false);
        Battery.clearBaseline(c);
        c.stopService(new Intent(c, GuardService.class));
        AlarmController.silence(c);
        AlarmController.cancelScheduled(c);
        call.resolve(buildStatus(Boolean.FALSE));
    }

    /** Programa un simulacro con AlarmManager: salta a la hora exacta aunque el teléfono duerma (delaySec, por defecto 30). */
    @PluginMethod
    public void test(PluginCall call) {
        Integer d = call.getInt("delaySec", 30);
        int delay = Math.max(0, Math.min(300, d == null ? 30 : d));
        AlarmController.schedule(getContext(), delay);
        call.resolve(buildStatus(null));
    }

    @PluginMethod
    public void cancelTest(PluginCall call) {
        AlarmController.cancelScheduled(getContext());
        call.resolve(buildStatus(null));
    }

    @PluginMethod
    public void silence(PluginCall call) {
        AlarmController.silence(getContext());
        call.resolve(buildStatus(null));
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(buildStatus(null));
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsResult");
    }

    @PermissionCallback
    private void notificationsResult(PluginCall call) { call.resolve(buildStatus(null)); }

    /** kind: battery | batteryusage | fullscreen | dnd | notifications | app */
    @PluginMethod
    public void openSettings(PluginCall call) {
        String kind = call.getString("kind", "app");
        Context c = getContext();
        String pkg = c.getPackageName();
        try {
            Intent i;
            switch (kind == null ? "app" : kind) {
                case "battery":
                    i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
                    break;
                case "fullscreen":
                    i = Build.VERSION.SDK_INT >= 34
                            ? new Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT", Uri.parse("package:" + pkg))
                            : appDetails(pkg);
                    break;
                case "batteryusage":
                    i = new Intent(Intent.ACTION_POWER_USAGE_SUMMARY);
                    break;
                case "dnd":
                    i = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                    break;
                case "notifications":
                    i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
                    break;
                default:
                    i = appDetails(pkg);
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
            call.resolve();
        } catch (Exception e) {
            try {
                Intent d = appDetails(pkg);
                d.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(d);
                call.resolve();
            } catch (Exception e2) {
                call.reject("No se pudieron abrir los ajustes: " + e.getMessage());
            }
        }
    }

    private Intent appDetails(String pkg) {
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
    }

    private void applyPrefs(PluginCall call) {
        SharedPreferences.Editor e = Prefs.sp(getContext()).edit();
        String url = call.getString("serverUrl");
        if (url != null && !url.trim().isEmpty()) e.putString("serverUrl", url.trim().replaceAll("/+$", ""));
        Double radius = call.getDouble("radiusKm");
        if (radius != null) e.putInt("radiusKm", (int) Math.round(radius));
        Double mag = call.getDouble("minMag");
        if (mag != null) e.putFloat("minMag", mag.floatValue());
        Double lat = call.getDouble("lat");
        if (lat != null) e.putFloat("lat", lat.floatValue());
        Double lng = call.getDouble("lng");
        if (lng != null) e.putFloat("lng", lng.floatValue());
        Integer dur = call.getInt("durationSec");
        if (dur != null) e.putInt("durationSec", Math.max(10, Math.min(600, dur)));
        e.apply();
    }

    private JSObject buildStatus(Boolean runningOverride) {
        Context c = getContext();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        JSObject o = new JSObject();
        o.put("running", runningOverride != null ? runningOverride.booleanValue() : GuardService.running);
        o.put("connected", GuardService.connected);
        o.put("enabled", Prefs.enabled(c));
        o.put("lastOkAt", GuardService.lastOkAt);
        o.put("notifications", NotificationManagerCompat.from(c).areNotificationsEnabled());
        o.put("fullScreen", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent());
        o.put("battery", Build.VERSION.SDK_INT < 23 || pm.isIgnoringBatteryOptimizations(c.getPackageName()));
        boolean policy = Build.VERSION.SDK_INT >= 23 && nm.isNotificationPolicyAccessGranted();
        int filter = Build.VERSION.SDK_INT >= 23 ? nm.getCurrentInterruptionFilter() : NotificationManager.INTERRUPTION_FILTER_ALL;
        o.put("dnd", policy);
        o.put("dndActive", filter > NotificationManager.INTERRUPTION_FILTER_ALL);
        int rm = am.getRingerMode();
        o.put("ringer", rm == AudioManager.RINGER_MODE_SILENT ? "silent" : (rm == AudioManager.RINGER_MODE_VIBRATE ? "vibrate" : "normal"));
        int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM), cur = am.getStreamVolume(AudioManager.STREAM_ALARM);
        o.put("alarmVolPct", max > 0 ? Math.round(100f * cur / max) : 0);
        o.put("alarmActive", AlarmController.isActive());
        o.put("sdk", Build.VERSION.SDK_INT);
        o.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase(Locale.ROOT));
        o.put("model", Build.MODEL == null ? "" : Build.MODEL);
        o.put("androidRelease", Build.VERSION.RELEASE == null ? "" : Build.VERSION.RELEASE);
        o.put("batteryPct", Battery.pct(c));
        o.put("charging", Battery.charging(c));
        o.put("batSince", Battery.since(c));
        o.put("batStart", Battery.startPct(c));
        o.put("awakeMs", Battery.awakeMs(c));
        o.put("serverUrl", Prefs.serverUrl(c));
        o.put("radiusKm", Prefs.radiusKm(c));
        o.put("minMag", (double) Prefs.minMag(c));
        o.put("lastAlarm", Prefs.lastAlarm(c));
        long sa = Prefs.scheduledAt(c);
        o.put("scheduledAt", sa > System.currentTimeMillis() - 2000 ? sa : 0L);
        return o;
    }
}
