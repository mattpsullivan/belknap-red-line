package com.belknaptracker.app;

import android.Manifest;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reports the device settings that decide whether background GPS survives the
 * screen locking, and opens the places they can be changed.
 *
 * Exists because none of this is visible from JS. @capacitor/geolocation reports
 * ACCESS_FINE_LOCATION only and flattens it to granted/denied/prompt, so
 * "While using the app" and "Allow all the time" look identical; and
 * @capgo/background-geolocation exposes no permission query at all. The
 * start-recording setup gate could therefore tell the user to grant background
 * location but never confirm they had - and on the 2026-07-26 walk it had not been
 * granted, nor had the battery-optimisation exemption.
 *
 * Also reports the app's own version, because release builds hide the in-app build
 * stamp (RELEASE_BUILD=1) and versionCode is the CI commit count, which the web
 * bundle has no way to know. Identifying the installed build from inside the app
 * cost real time on 2026-07-25.
 *
 * Every field is best-effort. A missing system service or an unsupported API level
 * omits that key rather than failing the call - the JS side treats absent fields as
 * unknown, and a diagnostic must never be why a recording is lost.
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

        try {
            PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            result.put("appVersion", info.versionName);
            result.put("appBuild", versionCodeOf(info));
        } catch (PackageManager.NameNotFoundException ignored) {
            // Cannot happen for our own package, but never fail the whole call.
        }

        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("model", Build.MODEL);

        call.resolve(result);
    }

    /**
     * The app's own details page. This is as close as Android permits to the
     * background-location toggle: there is deliberately no intent that opens a
     * specific permission, so the UI has to name the path
     * (Permissions -> Location -> "Allow all the time") rather than jump to it.
     */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        launch(intent, call);
    }

    /**
     * Battery optimisation is the one setting that CAN be fixed in a single tap:
     * this intent shows a system dialog that grants the exemption outright.
     * Requires REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in the manifest. If already
     * exempt, falls back to the settings list rather than showing a pointless
     * dialog.
     */
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        Context ctx = getContext();
        PowerManager power = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        boolean alreadyExempt =
            power != null && power.isIgnoringBatteryOptimizations(ctx.getPackageName());

        if (alreadyExempt) {
            launch(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), call);
            return;
        }

        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + ctx.getPackageName()));
        launch(intent, call);
    }

    /** System-wide location on/off, for when location services are disabled. */
    @PluginMethod
    public void openLocationSourceSettings(PluginCall call) {
        launch(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS), call);
    }

    /**
     * Start an activity, preferring the Activity context so the settings screen
     * lands on our task. Rejects rather than throwing if the OEM has no such
     * screen - some do not, and a missing settings page must not crash the app.
     */
    private void launch(Intent intent, PluginCall call) {
        try {
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open that settings screen: " + e.getMessage());
        }
    }

    private boolean isGranted(Context ctx, String permission) {
        return ContextCompat.checkSelfPermission(ctx, permission)
            == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * getLongVersionCode() is API 28+; minSdk here is 24, so the deprecated field
     * is still required on older devices. Suppression is scoped to this method so
     * it cannot mask an unrelated deprecation elsewhere.
     */
    @SuppressWarnings("deprecation")
    private static long versionCodeOf(PackageInfo info) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? info.getLongVersionCode()
            : info.versionCode;
    }
}
