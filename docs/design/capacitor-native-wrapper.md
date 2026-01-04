# Capacitor Native Wrapper Design

> **Branch:** `feature/capacitor-native`
> **Status:** Design Phase
> **Last Updated:** 2026-01-04

## Overview

This document outlines the approach for wrapping the Belknap Red-Line Tracker PWA in Capacitor to enable **background GPS tracking** while the phone is locked.

## Goals

1. Enable GPS tracking with screen locked during hikes
2. Preserve existing functionality (maps, offline, data)
3. Maximize code reuse (~95%+ of existing codebase)
4. Maintain web PWA as primary distribution, native as enhancement
5. **App Store ready** - proper assets, privacy policy, metadata for iOS/Android submission

## Non-Goals

- Replace the PWA (web remains primary distribution)
- Native map SDK (MapLibre GL JS in WebView is sufficient)
- Push notifications (not needed for this app)
- Backend/cloud sync (stays offline-first)

## Plugin Comparison

### @capacitor-community/background-geolocation

| Aspect | Details |
|--------|---------|
| **License** | MIT (free) |
| **Capacitor** | v3-v7 supported |
| **Accuracy** | Lower - optimized for battery |
| **API** | `addWatcher()` / `removeWatcher()` |
| **Maintenance** | Community maintained |

**Pros:**
- Free, open source
- Simpler API
- Smaller footprint

**Cons:**
- Less accurate position fixes
- Known issue: Android stops after 5 min without `useLegacyBridge: true`

### @capgo/background-geolocation

| Aspect | Details |
|--------|---------|
| **License** | MIT (free) |
| **Accuracy** | High - prioritizes precision over battery |
| **API** | `start()` / `stop()` + event listeners |
| **Bonus** | `setPlannedRoute()` for deviation alerts |

**Pros:**
- Better accuracy (important for trail detection)
- Route deviation alerts (could warn if off-trail)
- Actively maintained fork

**Cons:**
- Slightly larger codebase
- Less battle-tested than community plugin

### Recommendation

**Use @capgo/background-geolocation** for this hiking app:
- Accuracy matters for trail auto-detection (we use 50m buffer + 80% coverage)
- Route deviation feature aligns with hiking safety use case
- Free like community plugin

---

## Architecture

### Current Flow (PWA)

```
┌─────────────────────────────────────────────────┐
│                 React App                        │
│  ┌───────────────────────────────────────────┐  │
│  │            useGeolocation.ts              │  │
│  │   navigator.geolocation.watchPosition()   │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │                         │
│                        ▼                         │
│  ┌───────────────────────────────────────────┐  │
│  │          useTrackRecording.ts             │  │
│  │   Stores points → IndexedDB via Dexie     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Problem:** Browser suspends `watchPosition()` when app backgrounds.

### Proposed Flow (Capacitor)

```
┌─────────────────────────────────────────────────┐
│              Native iOS/Android Shell            │
│  ┌───────────────────────────────────────────┐  │
│  │     Background Geolocation Plugin         │  │
│  │  (runs in native layer, survives lock)    │  │
│  └─────────────────────┬─────────────────────┘  │
│                        │ JS Bridge               │
│                        ▼                         │
│  ┌───────────────────────────────────────────┐  │
│  │              WebView                       │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │      useGeolocation.ts (adapted)    │  │  │
│  │  │  Capacitor.isNative? → use plugin   │  │  │
│  │  │  else → navigator.geolocation       │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │                                           │  │
│  │  Everything else unchanged:               │  │
│  │  - MapLibre GL JS ✓                       │  │
│  │  - PMTiles ✓                              │  │
│  │  - IndexedDB + Dexie ✓                    │  │
│  │  - All React components ✓                 │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Add Capacitor Core

```bash
# Install Capacitor
npm install @capacitor/core
npm install -D @capacitor/cli

# Initialize (creates capacitor.config.ts)
npx cap init "Belknap Tracker" "com.belknaptracker.app"

# Add platforms
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

**capacitor.config.ts:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belknaptracker.app',
  appName: 'Belknap Tracker',
  webDir: 'dist',
  server: {
    // For dev: proxy to Vite dev server
    // url: 'http://localhost:5173',
    // cleartext: true
  },
  android: {
    // Required for background-geolocation plugin
    useLegacyBridge: true
  }
};

export default config;
```

### Phase 2: Add Background Geolocation Plugin

```bash
npm install @capgo/background-geolocation
npx cap sync
```

### Phase 3: Platform Configuration

**iOS (ios/App/App/Info.plist):**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Track your position on the trail map</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Record your hike even when the app is in the background</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Phase 4: Geolocation Abstraction Layer

Create a unified interface that works in both web and native:

**src/services/geolocation/index.ts:**
```typescript
import { Capacitor } from '@capacitor/core';
import { createWebGeolocationProvider } from './web';
import { createNativeGeolocationProvider } from './native';

export interface GeolocationProvider {
  startWatching(callback: (position: GeoPosition) => void): Promise<string>;
  stopWatching(watcherId: string): Promise<void>;
  openSettings(): Promise<void>;
}

export function createGeolocationProvider(): GeolocationProvider {
  if (Capacitor.isNativePlatform()) {
    return createNativeGeolocationProvider();
  }
  return createWebGeolocationProvider();
}
```

**src/services/geolocation/native.ts:**
```typescript
import BackgroundGeolocation from '@capgo/background-geolocation';
import type { GeolocationProvider, GeoPosition } from './types';

export function createNativeGeolocationProvider(): GeolocationProvider {
  return {
    async startWatching(callback) {
      await BackgroundGeolocation.addListener('position', (position) => {
        callback({
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy,
          timestamp: position.time,
        });
      });

      await BackgroundGeolocation.start({
        distanceFilter: 5, // meters
        interval: 5000,    // ms
        notificationTitle: 'Recording hike',
        notificationText: 'Belknap Tracker is recording your trail',
      });

      return 'native-watcher';
    },

    async stopWatching() {
      await BackgroundGeolocation.stop();
      await BackgroundGeolocation.removeAllListeners();
    },

    async openSettings() {
      await BackgroundGeolocation.openSettings();
    }
  };
}
```

**src/services/geolocation/web.ts:**
```typescript
import type { GeolocationProvider, GeoPosition } from './types';

export function createWebGeolocationProvider(): GeolocationProvider {
  let watchId: number | null = null;

  return {
    async startWatching(callback) {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            callback({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            });
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );

        resolve(`web-${watchId}`);
      });
    },

    async stopWatching() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    },

    async openSettings() {
      // Web can't open settings, but can show instructions
      window.alert('Please enable location in your browser settings');
    }
  };
}
```

### Phase 5: Update useGeolocation Hook

**src/hooks/useGeolocation.ts** (modified):
```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { createGeolocationProvider } from '@/services/geolocation';
import type { GeoPosition } from '@/services/geolocation/types';

const provider = createGeolocationProvider();

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { throttleMs = 5000, minDistanceMeters = 5 } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const watcherIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastPositionRef = useRef<GeoPosition | null>(null);

  const handlePosition = useCallback((pos: GeoPosition) => {
    const now = Date.now();

    // Throttle
    if (now - lastUpdateRef.current < throttleMs) return;

    // Distance filter
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        pos.lat,
        pos.lng
      );
      if (distance < minDistanceMeters) return;
    }

    lastUpdateRef.current = now;
    lastPositionRef.current = pos;
    setPosition(pos);
  }, [throttleMs, minDistanceMeters]);

  const startWatching = useCallback(async () => {
    if (watcherIdRef.current) return;

    try {
      setError(null);
      setIsWatching(true);
      lastUpdateRef.current = 0;
      lastPositionRef.current = null;

      watcherIdRef.current = await provider.startWatching(handlePosition);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsWatching(false);
    }
  }, [handlePosition]);

  const stopWatching = useCallback(async () => {
    if (watcherIdRef.current) {
      await provider.stopWatching(watcherIdRef.current);
      watcherIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watcherIdRef.current) {
        provider.stopWatching(watcherIdRef.current);
      }
    };
  }, []);

  return { position, error, isWatching, startWatching, stopWatching };
}
```

---

## Build & Development Workflow

### Scripts (package.json additions)

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "cap:sync": "npx cap sync",
    "cap:android": "npm run build && npx cap sync && npx cap open android",
    "cap:ios": "npm run build && npx cap sync && npx cap open ios",
    "cap:run:android": "npm run build && npx cap sync && npx cap run android",
    "cap:run:ios": "npm run build && npx cap sync && npx cap run ios"
  }
}
```

### Development Flow

1. **Web development** (unchanged):
   ```bash
   npm run dev
   ```

2. **Native development**:
   ```bash
   npm run build           # Build web assets
   npx cap sync            # Copy to native projects
   npx cap open android    # Open in Android Studio
   npx cap open ios        # Open in Xcode
   ```

3. **Live reload on device** (optional):
   ```bash
   # In capacitor.config.ts, enable server.url
   npm run dev &
   npx cap run android --livereload
   ```

---

## File Structure Changes

```
belknap-redline-tracker/
├── src/
│   ├── services/
│   │   └── geolocation/          # NEW: Abstraction layer
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── web.ts
│   │       └── native.ts
│   └── hooks/
│       └── useGeolocation.ts     # MODIFIED: Use provider
├── android/                       # NEW: Generated by Capacitor
├── ios/                           # NEW: Generated by Capacitor
├── capacitor.config.ts            # NEW: Capacitor configuration
└── package.json                   # MODIFIED: New scripts + deps
```

---

## Testing Strategy

### Unit Tests
- Mock `Capacitor.isNativePlatform()` to test both branches
- Test throttling/distance filtering logic (unchanged)

### Integration Tests
- Web provider: Use existing jsdom + fake geolocation
- Native provider: Mock the plugin in tests

### Device Testing
- Real Android device required for background behavior
- iOS Simulator doesn't simulate background well
- Test scenarios:
  - Start recording → lock phone → walk → unlock → verify track

---

## Known Limitations & Mitigations

### iOS Background Restrictions
iOS aggressively kills background apps. Mitigations:
1. User must enable "Always Allow" location permission
2. User should disable battery optimization for the app
3. App uses foreground service notification (required by both platforms)

### Battery Impact
Background GPS is power-hungry. Mitigations:
1. `distanceFilter: 5` reduces updates when stationary
2. Consider adding "hiking mode" toggle that increases interval when stationary
3. Show battery warning when starting background recording

### Android 13+ Notification Permission
Required for foreground service notification. Plugin handles permission request automatically after location permission granted.

---

## Potential Plugin Improvements

If contributing back to @capgo/background-geolocation:

1. **Batch upload support**: Queue positions when offline, sync when connected
2. **Geofence triggers**: Alert when entering/leaving trail areas
3. **Accuracy mode toggle**: Switch between high-accuracy (hiking) and battery-saver (in-town)
4. **Statistics**: Expose battery usage metrics

---

## Migration Path

### For Existing PWA Users
- Web app continues working exactly as before
- Native app is an optional upgrade for background GPS
- Data stored in IndexedDB works in WebView (same origin)

### Rollout Strategy
1. Phase 1: Build and test internally
2. Phase 2: TestFlight (iOS) / Internal Testing (Android)
3. Phase 3: Public release (if desired)
4. Web PWA remains primary distribution

---

## Open Questions

1. **App Store presence**: Do we want to publish, or just sideload for personal use?
2. **Offline maps in native**: PMTiles works in WebView, but should we explore native map SDK for better performance?
3. **Elevation during recording**: Can we capture elevation from GPS or need post-processing?

---

## App Store Requirements

### App Identity

| Field | Value |
|-------|-------|
| **App ID** | `com.belknaptracker.app` |
| **App Name** | Belknap Tracker |
| **Bundle Display Name** | Belknap Tracker |
| **Version** | 1.0.0 |
| **Build** | 1 |

### Required Assets

#### App Icons

Source: Create a 1024x1024 PNG master icon, then generate all sizes.

**iOS Icons** (in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`):
- 20x20 @1x, @2x, @3x (Notification)
- 29x29 @1x, @2x, @3x (Settings)
- 40x40 @1x, @2x, @3x (Spotlight)
- 60x60 @2x, @3x (App Icon)
- 76x76 @1x, @2x (iPad)
- 83.5x83.5 @2x (iPad Pro)
- 1024x1024 (App Store)

**Android Icons** (in `android/app/src/main/res/`):
- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

**Tool:** Use [capacitor-assets](https://github.com/ionic-team/capacitor-assets) to generate from single source.

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#3B82F6'
```

#### Splash Screens

**iOS:** LaunchScreen.storyboard (Capacitor generates default)
**Android:** drawable splash screens (generated by capacitor-assets)

### App Store Metadata

#### iOS App Store Connect

| Field | Content |
|-------|---------|
| **Name** | Belknap Tracker |
| **Subtitle** | Red-line the Belknap Range |
| **Category** | Health & Fitness |
| **Description** | Track your progress hiking all trails in New Hampshire's Belknap Range. Record your hikes with GPS, auto-detect completed trails, and work toward completing all 59 trails and 67+ miles. Fully offline capable - no account required, your data stays on your device. |
| **Keywords** | hiking, trails, belknap, new hampshire, redline, gps, tracker, outdoor |
| **Privacy URL** | (required - see below) |
| **Support URL** | GitHub repo or simple landing page |

**Screenshots Required:**
- 6.7" iPhone (1290 x 2796) - iPhone 14 Pro Max
- 6.5" iPhone (1284 x 2778) - iPhone 11 Pro Max
- 5.5" iPhone (1242 x 2208) - iPhone 8 Plus
- 12.9" iPad Pro (2048 x 2732)

#### Google Play Console

| Field | Content |
|-------|---------|
| **Title** | Belknap Tracker |
| **Short Description** | Track hiking progress on Belknap Range trails |
| **Full Description** | (same as iOS) |
| **Category** | Health & Fitness |
| **Content Rating** | Everyone |
| **Privacy Policy** | (required URL) |

**Screenshots Required:**
- Phone: 16:9 aspect ratio, min 320px, max 3840px
- 7" Tablet: optional
- 10" Tablet: optional

### Privacy Policy

**Required for:** Both iOS and Android (mandatory for apps using location)

**Content must include:**
1. What data is collected (GPS coordinates during active recording)
2. How data is stored (locally on device only)
3. What data is NOT collected (no server, no analytics, no account)
4. How to delete data (Settings → Clear All Data)
5. Contact information

**Implementation Options:**
1. Host on GitHub Pages: `https://yourusername.github.io/belknap-red-line/privacy`
2. Add `/privacy` route in app (then use app URL)
3. Simple static page on any hosting

**Template location:** `docs/privacy-policy.md` (to be created)

### Background Location Justification

**iOS App Store Review requires explanation for:**
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `UIBackgroundModes` containing `location`

**Justification template:**
> This app records hiking GPS tracks while the user is actively hiking. Background location is required because hikers typically keep their phones in pockets or packs with the screen locked during multi-hour hikes. The app displays a persistent notification when recording and stops tracking when the user ends the recording session. Location data is stored only on the user's device and is never transmitted to any server.

---

## Detailed File Structure

```
belknap-redline-tracker/
├── src/
│   ├── services/
│   │   └── geolocation/              # NEW: Platform abstraction
│   │       ├── index.ts              # Factory function
│   │       ├── types.ts              # Shared interfaces
│   │       ├── webProvider.ts        # navigator.geolocation wrapper
│   │       └── nativeProvider.ts     # @capgo plugin wrapper
│   ├── hooks/
│   │   └── useGeolocation.ts         # MODIFIED: Use provider factory
│   ├── pages/
│   │   └── PrivacyPage.tsx           # NEW: In-app privacy policy
│   └── ... (unchanged)
│
├── android/                           # NEW: Generated by `npx cap add android`
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # Permissions configured here
│   │   │   ├── java/.../MainActivity.java
│   │   │   └── res/
│   │   │       ├── mipmap-*/         # App icons
│   │   │       ├── drawable/         # Splash screens
│   │   │       └── values/
│   │   │           ├── strings.xml   # App name
│   │   │           └── styles.xml    # Theme
│   │   └── build.gradle              # App-level config
│   ├── build.gradle                  # Project-level config
│   ├── capacitor.settings.gradle
│   └── variables.gradle              # SDK versions
│
├── ios/                               # NEW: Generated by `npx cap add ios`
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist            # Permissions, background modes
│   │   │   ├── AppDelegate.swift
│   │   │   └── Assets.xcassets/      # Icons, colors
│   │   ├── App.xcodeproj/
│   │   └── Podfile                   # CocoaPods dependencies
│   └── capacitor.config.json         # iOS-specific overrides (optional)
│
├── resources/                         # NEW: Source assets for generation
│   ├── icon.png                      # 1024x1024 master icon
│   ├── icon-foreground.png           # Android adaptive icon foreground
│   ├── icon-background.png           # Android adaptive icon background
│   └── splash.png                    # 2732x2732 splash source
│
├── capacitor.config.ts                # NEW: Capacitor configuration
├── package.json                       # MODIFIED: New deps + scripts
└── docs/
    ├── design/
    │   └── capacitor-native-wrapper.md  # This document
    └── privacy-policy.md              # NEW: Privacy policy content
```

---

## @capgo/background-geolocation API Detail

### Installation

```bash
npm install @capgo/background-geolocation
npx cap sync
```

### Core API

```typescript
import BackgroundGeolocation from '@capgo/background-geolocation';

// Start tracking
await BackgroundGeolocation.start({
  // Accuracy
  distanceFilter: 5,        // Meters between updates (default: 0)
  desiredAccuracy: 'high',  // 'high' | 'balanced' | 'low' | 'passive'

  // Background behavior
  interval: 5000,           // Milliseconds between updates
  fastestInterval: 2000,    // Minimum interval (Android)

  // Notifications (required for background on both platforms)
  notificationTitle: 'Recording hike',
  notificationText: 'Belknap Tracker is tracking your trail',
  notificationIconColor: '#3B82F6',

  // Activity detection (optional)
  activityType: 'fitness',  // iOS: helps with accuracy
  pauseLocationUpdatesAutomatically: false,
});

// Listen for positions
const positionListener = await BackgroundGeolocation.addListener(
  'position',
  (position) => {
    console.log('Position:', position);
    // position.latitude, position.longitude, position.accuracy,
    // position.altitude, position.speed, position.bearing, position.time
  }
);

// Listen for errors
const errorListener = await BackgroundGeolocation.addListener(
  'error',
  (error) => {
    console.error('Location error:', error.message);
  }
);

// Stop tracking
await BackgroundGeolocation.stop();

// Clean up listeners
positionListener.remove();
errorListener.remove();

// Open device location settings
await BackgroundGeolocation.openSettings();

// Check/request permissions
const status = await BackgroundGeolocation.checkPermissions();
// status.location: 'granted' | 'denied' | 'prompt'
// status.backgroundLocation: 'granted' | 'denied' | 'prompt' (Android 10+)

await BackgroundGeolocation.requestPermissions();
```

### Plugin Events

| Event | Payload | When |
|-------|---------|------|
| `position` | `{ latitude, longitude, accuracy, altitude, speed, bearing, time }` | New location fix |
| `error` | `{ message }` | Location error |
| `start` | `void` | Tracking started |
| `stop` | `void` | Tracking stopped |

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| iOS kills background app | Medium | High | Clear user guidance on settings; test extensively |
| Plugin bugs/incompatibilities | Low | Medium | Community plugin is mature; can fork if needed |
| WebView performance issues | Low | Low | MapLibre is GPU-accelerated; already tested |
| App Store rejection | Medium | Medium | Prepare thorough justification; iterate |

### Mitigation Strategies

1. **iOS Background Termination**
   - Show in-app guidance for enabling "Always Allow"
   - Recommend disabling battery optimization
   - Test on real devices for extended periods
   - Consider "recording mode" UI that encourages user to check app

2. **App Store Rejection**
   - Prepare detailed privacy policy
   - Write clear background location justification
   - Test all functionality before submission
   - Be prepared for 1-2 rejection cycles

---

## References

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor Assets](https://github.com/ionic-team/capacitor-assets)
- [@capgo/background-geolocation](https://github.com/Cap-go/capacitor-background-geolocation)
- [@capacitor-community/background-geolocation](https://github.com/capacitor-community/background-geolocation)
- [iOS Background Location](https://developer.apple.com/documentation/corelocation/handling_location_updates_in_the_background)
- [iOS App Store Review Guidelines - Location](https://developer.apple.com/app-store/review/guidelines/#location)
- [Google Play Location Policy](https://support.google.com/googleplay/android-developer/answer/9799150)
