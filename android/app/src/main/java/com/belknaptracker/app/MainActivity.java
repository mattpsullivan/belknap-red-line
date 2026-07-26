package com.belknaptracker.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before super.onCreate() so the bridge
        // picks them up. See services/deviceState.ts and services/heartbeat.ts for
        // why each exists - both report things JS cannot observe for itself.
        registerPlugin(DeviceStatePlugin.class);
        registerPlugin(HeartbeatPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
