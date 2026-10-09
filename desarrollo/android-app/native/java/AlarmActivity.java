package gt.quakealert.alarma;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.text.format.DateUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.lang.ref.WeakReference;
import java.util.Locale;

/** Pantalla de alarma: enciende el teléfono y se muestra sobre el bloqueo. La UI se arma aquí, sin XML. */
public class AlarmActivity extends Activity {
    private static WeakReference<AlarmActivity> current;

    private LinearLayout root;
    private TextView tagView, magView, placeView, metaView;
    private ValueAnimator pulse;

    static void closeIfOpen() {
        final AlarmActivity a = current != null ? current.get() : null;
        if (a != null) a.runOnUiThread(new Runnable() { @Override public void run() { a.finish(); } });
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        current = new WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);

        int pad = dp(28);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(pad, dp(72), pad, dp(40));
        root.setBackgroundColor(0xFF2A0710);

        tagView = label("ALERTA SÍSMICA", 13, 0xFFFB5670, Typeface.MONOSPACE, Typeface.BOLD);
        tagView.setLetterSpacing(0.25f);
        magView = label("M–", 104, 0xFFFFFFFF, Typeface.DEFAULT_BOLD, Typeface.BOLD);
        placeView = label("", 22, 0xFFFFFFFF, Typeface.DEFAULT, Typeface.NORMAL);
        metaView = label("", 15, 0xFFF3B8C2, Typeface.MONOSPACE, Typeface.NORMAL);

        View spacer = new View(this);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        Button stop = button("SILENCIAR ALARMA", 0xFFFB5670, 0xFFFFFFFF);
        Button open = button("ABRIR LA APP", 0x33FFFFFF, 0xFFFFFFFF);
        stop.setOnClickListener(v -> { AlarmController.silence(this); finish(); });
        open.setOnClickListener(v -> {
            AlarmController.silence(this);
            startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
            finish();
        });

        root.addView(tagView);
        root.addView(magView);
        root.addView(placeView);
        root.addView(metaView);
        root.addView(spacer);
        root.addView(stop);
        root.addView(open);
        setContentView(root);
        bind(getIntent());

        pulse = ValueAnimator.ofArgb(0xFF2A0710, 0xFF6B1224);
        pulse.setDuration(520);
        pulse.setRepeatMode(ValueAnimator.REVERSE);
        pulse.setRepeatCount(ValueAnimator.INFINITE);
        pulse.addUpdateListener(a -> root.setBackgroundColor((Integer) a.getAnimatedValue()));
        pulse.start();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        bind(intent);
    }

    @Override
    protected void onDestroy() {
        if (pulse != null) pulse.cancel();
        if (current != null && current.get() == this) current = null;
        super.onDestroy();
    }

    private void bind(Intent i) {
        boolean test = i.getBooleanExtra("test", false);
        double mag = i.getDoubleExtra("mag", 0);
        int km = i.getIntExtra("km", 0);
        String place = i.getStringExtra("place");
        String bearing = i.getStringExtra("bearing");
        long time = i.getLongExtra("time", 0);
        tagView.setText(test ? "SIMULACRO · ALERTA SÍSMICA" : "ALERTA SÍSMICA");
        magView.setText(String.format(Locale.US, "M%.1f", mag));
        placeView.setText(place == null || place.isEmpty() ? "Sismo" : place);
        String meta = km + " km" + (bearing == null || bearing.isEmpty() ? "" : " · rumbo " + bearing);
        if (test) meta += " · simulacro de demostración";
        else if (time > 0) meta += " · " + DateUtils.getRelativeTimeSpanString(time, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS);
        metaView.setText(meta);
    }

    private TextView label(String text, float sp, int color, Typeface tf, int style) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        t.setTypeface(tf, style);
        t.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        t.setLayoutParams(lp);
        return t;
    }

    private Button button(String text, int bg, int fg) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(fg);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable();
        g.setColor(bg);
        g.setCornerRadius(dp(16));
        b.setBackground(g);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(64));
        lp.topMargin = dp(12);
        b.setLayoutParams(lp);
        return b;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
