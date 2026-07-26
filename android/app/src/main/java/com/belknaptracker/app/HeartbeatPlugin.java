package com.belknaptracker.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * A liveness tick that survives the WebView being backgrounded.
 *
 * WHY THIS EXISTS
 *
 * Recording must not use GPS fixes as its only health signal. If fixes are both
 * the data and the liveness trigger, "no data" and "no liveness" are
 * indistinguishable and neither can be reported - which is exactly why the
 * 2026-07-25 hike was undiagnosable.
 *
 * A JS timer cannot provide that signal. On the 2026-07-26 walk, `setInterval`
 * produced 8 ticks where 71 were due, one arriving 468 seconds late, while GPS
 * callbacks ran 1,300 times without interruption. The cause is not power
 * management - @capgo already holds a PARTIAL_WAKE_LOCK and runs a foreground
 * service, so the CPU never sleeps - it is Chromium's background-page timer
 * throttling.
 *
 * Native timers are not subject to that policy, and bridge callbacks demonstrably
 * wake the JS context. So this schedules natively and notifies JS, giving the app
 * a heartbeat whose absence means something specific: that JS itself stopped
 * running, rather than that the GPS went quiet.
 *
 * Only runs while recording. Started and stopped explicitly from JS so an idle app
 * schedules nothing.
 */
@CapacitorPlugin(name = "Heartbeat")
public class HeartbeatPlugin extends Plugin {

    private ScheduledExecutorService executor;
    private ScheduledFuture<?> task;
    private long seq = 0;
    private long startedAtMs = 0;

    @PluginMethod
    public void start(PluginCall call) {
        int intervalMs = call.getInt("intervalMs", 20000);
        if (intervalMs < 1000) intervalMs = 1000;

        stopTicking();

        seq = 0;
        startedAtMs = System.currentTimeMillis();
        executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "belknap-heartbeat");
            t.setDaemon(true);
            return t;
        });

        final int interval = intervalMs;
        task = executor.scheduleAtFixedRate(
            () -> {
                try {
                    long now = System.currentTimeMillis();
                    seq++;
                    JSObject tick = new JSObject();
                    tick.put("seq", seq);
                    tick.put("at", now);
                    tick.put("elapsedMs", now - startedAtMs);
                    // Where the tick SHOULD have landed, so JS can report drift
                    // without needing its own timer to compare against.
                    tick.put("expectedAt", startedAtMs + seq * (long) interval);
                    notifyListeners("tick", tick);
                } catch (Exception e) {
                    // A throw here would silently kill the scheduled task, taking
                    // the liveness signal with it - the one thing that must not
                    // fail quietly.
                    android.util.Log.e("HeartbeatPlugin", "tick failed", e);
                }
            },
            interval,
            interval,
            TimeUnit.MILLISECONDS
        );

        JSObject result = new JSObject();
        result.put("intervalMs", interval);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopTicking();
        JSObject result = new JSObject();
        result.put("ticks", seq);
        call.resolve(result);
    }

    private void stopTicking() {
        if (task != null) {
            task.cancel(false);
            task = null;
        }
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopTicking();
        super.handleOnDestroy();
    }
}
