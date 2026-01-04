# Privacy Policy

**Belknap Tracker**

*Last Updated: January 2026*

## Overview

Belknap Tracker is a hiking trail tracking app designed with privacy as a core principle. This app operates entirely on your device with no data collection, no accounts, and no server communication.

## Data Collection

### What We Collect

**Nothing leaves your device.** All data is stored locally on your phone:

- **GPS coordinates** - Recorded only during active track recording sessions you initiate
- **Trail completions** - Dates and optional notes you enter when marking trails complete
- **App preferences** - Your settings (offline mode, etc.)

### What We Do NOT Collect

- No personal information (name, email, phone number)
- No account or login credentials
- No analytics or usage tracking
- No advertising identifiers
- No data transmitted to any server
- No third-party data sharing

## GPS Location Data

### When Location Is Used

The app accesses your device's GPS only when you explicitly:
1. View your position on the trail map
2. Start recording a hike

### Background Location

When you start recording a hike, the app may continue tracking your location while in the background or when your phone is locked. This allows continuous track recording during your hike.

**Background tracking:**
- Only occurs during active recording sessions you start
- Shows a notification indicating tracking is active
- Stops when you end the recording session
- Is never transmitted anywhere - stays on your device

### Location Data Storage

All GPS track data is stored only in your device's local storage (IndexedDB). It is:
- Never uploaded to any server
- Never shared with any third party
- Only accessible by you on your device
- Deletable at any time via Settings → Clear All Data

## Data Storage

All app data is stored locally using your device's built-in storage:

| Data Type | Storage Location | Retention |
|-----------|------------------|-----------|
| Trail completions | Device (IndexedDB) | Until you delete |
| GPS tracks | Device (IndexedDB) | Until you delete |
| Settings | Device (IndexedDB) | Until you delete |
| Map cache | Device (Cache API) | Automatic cleanup |

## Data Export & Deletion

### Export Your Data

You can export all your data at any time:
- **JSON format** - Complete backup of all completions and tracks
- **CSV format** - BRATTS workbook compatible format

### Delete Your Data

To delete all app data:
1. Open the app
2. Go to Settings
3. Tap "Clear All Data"
4. Confirm deletion

This permanently removes all completions, tracks, and preferences from your device.

## Third-Party Services

### Map Tiles

The app displays maps using tiles from OpenFreeMap (online mode) or bundled PMTiles (offline mode).

- **Online mode**: Your device downloads map tile images from OpenFreeMap servers. These requests include your general map viewport location but no personal identifiers.
- **Offline mode**: Map tiles are bundled with the app. No network requests are made.

No personal data is sent to map tile providers.

## Children's Privacy

This app does not knowingly collect any personal information from anyone, including children under 13. Since no data is collected or transmitted, there is no children's data to protect.

## Changes to This Policy

If we update this privacy policy, we will post the new version in the app and update the "Last Updated" date above.

## Contact

For questions about this privacy policy or the app:

- **GitHub Issues**: [Report an issue](https://github.com/your-username/belknap-red-line/issues)
- **Email**: your-email@example.com

## Summary

| Question | Answer |
|----------|--------|
| Do you collect my data? | No |
| Do you track my location? | Only when you record a hike, stored locally |
| Do you share data with third parties? | No |
| Do you use analytics? | No |
| Can I delete my data? | Yes, anytime in Settings |
| Do I need an account? | No |

**Your data stays on your device. Period.**
