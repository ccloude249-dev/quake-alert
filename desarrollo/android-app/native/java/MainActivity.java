package gt.quakealert.alarma;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(QuakeAlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
