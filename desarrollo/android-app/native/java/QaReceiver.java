package gt.quakealert.alarma;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

/** "Detener alarma" desde la notificación, simulacro programado (AlarmManager) y reinicio del vigilante tras reiniciar el teléfono. */
public class QaReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent != null ? intent.getAction() : null;
        if (a == null) return;
        if (AlarmController.ACTION_SILENCE.equals(a)) {
            AlarmController.silence(ctx);
        } else if (AlarmController.ACTION_FIRE.equals(a)) {
            fire(ctx);
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) {
            if (Prefs.enabled(ctx)) {
                try { ContextCompat.startForegroundService(ctx, new Intent(ctx, GuardService.class)); } catch (Exception ignored) { }
            }
        }
    }

    /** El sistema despierta el teléfono a la hora exacta: arrancar el servicio en primer plano y hacer sonar la alarma. */
    private void fire(Context ctx) {
        Prefs.setScheduledAt(ctx, 0);
        try { // mantiene la CPU despierta mientras arranca el servicio (se libera sola a los 15 s)
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuakeAlert:fire").acquire(15000);
        } catch (Exception ignored) { }
        try {
            ContextCompat.startForegroundService(ctx, new Intent(ctx, GuardService.class).setAction(GuardService.ACTION_FIRE));
        } catch (Exception e) {
            AlarmController.trigger(ctx, Quake.test(), true); // el sistema no dejó iniciar el servicio: suena desde aquí
        }
    }
}
