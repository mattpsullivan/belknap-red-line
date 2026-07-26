package com.belknaptracker.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before super.onCreate() so the bridge
        // picks them up. See services/deviceState.ts for why this one exists.
        registerPlugin(DeviceStatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
