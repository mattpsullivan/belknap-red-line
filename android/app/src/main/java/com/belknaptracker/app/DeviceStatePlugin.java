package com.belknaptracker.app;

import android.Manifest;
import android.app.ActivityManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reports the device settings that decide whether background GPS survives the
 * screen locking.
 *
 * Exists because none of this is visible from JS. @capacitor/geolocation reports
 * ACCESS_FINE_LOCATION only and flattens it to granted/denied/prompt, so
 * "While using the app" and "Allow all the time" look identical; and
 * @capgo/background-geolocation exposes no permission query at all. The
 * start-recording setup gate could therefore tell the user to grant background
 * location but never confirm they had.
 *
 * Every field is best-effort. A missing system service or an unsupported API
 * level omits that key rather than failing the call - the JS side treats absent
 * fields as unknown, and a diagnostic must never be why a recording is lost.
 */
@CapacitorPlugin(name = "DeviceState")
public class DeviceStatePlugin extends Plugin {

    @PluginMethod
    public void getState(PluginCall call) {
        Context ctx = getContext();
        JSObject result = new JSObject();

        result.put("fineLocation", isGranted(ctx, Manifest.permission.ACCESS_FINE_LOCATION));
        result.put("coarseLocation", isGranted(ctx, Manifest.permission.ACCESS_COARSE_LOCATION));

        // ACCESS_BACKGROUND_LOCATION only exists from Android 10 (API 29). Below
        // that, foreground location implies background, so report it as granted
        // rather than leaving it unknown.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            result.put(
                "backgroundLocation",
                isGranted(ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            );
        } else {
            result.put("backgroundLocation", isGranted(ctx, Manifest.permission.ACCESS_FINE_LOCATION));
        }

        PowerManager power = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (power != null) {
            result.put(
                "ignoringBatteryOptimizations",
                power.isIgnoringBatteryOptimizations(ctx.getPackageName())
            );
            result.put("deviceIdleMode", power.isDeviceIdleMode());
            result.put("powerSaveMode", power.isPowerSaveMode());
        }

        // Separate from battery optimisation and easy to miss: "Background
        // activity" can be switched off per-app from Android 9 (API 28).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ActivityManager activity =
                (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            if (activity != null) {
                result.put("backgroundRestricted", activity.isBackgroundRestricted());
            }
        }

        LocationManager location =
            (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (location != null) {
            boolean gps = false;
            boolean network = false;
            try {
                gps = location.isProviderEnabled(LocationManager.GPS_PROVIDER);
                network = location.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            } catch (Exception ignored) {
                // Some OEMs throw for a provider that is not present at all.
            }
            result.put("locationServicesEnabled", gps || network);
        }

        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("model", Build.MODEL);

        call.resolve(result);
    }

    private boolean isGranted(Context ctx, String permission) {
        return ContextCompat.checkSelfPermission(ctx, permission)
            == PackageManager.PERMISSION_GRANTED;
    }
}
