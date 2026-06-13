import { describe, it, expect } from 'vitest';
import type { Location } from '@capgo/background-geolocation';
import { createNativeProvider } from './nativeProvider';
import { createNullBackgroundGeolocationClient } from './backgroundGeolocationClient';
import { GeolocationErrorCode } from './types';
import type { GeoPosition, GeolocationError } from './types';

/** Build a complete @capgo Location for tests. */
function location(overrides: Partial<Location> = {}): Location {
  return {
    latitude: 43.5,
    longitude: -71.3,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    simulated: false,
    bearing: null,
    speed: null,
    time: 1_700_000_000_000,
    ...overrides,
  };
}

describe('native geolocation provider', () => {
  it('reports background support', () => {
    const provider = createNativeProvider(
      createNullBackgroundGeolocationClient()
    );
    expect(provider.supportsBackground).toBe(true);
  });

  it('starts a background watch with mapped options and returns an id', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);

    const id = await provider.startWatching(
      () => {},
      () => {},
      {
        distanceFilter: 10,
        notificationTitle: 'Hiking',
        notificationText: 'Tracking trail',
      }
    );

    expect(id).toBe('native-watcher');
    expect(client.starts).toEqual([
      {
        backgroundTitle: 'Hiking',
        backgroundMessage: 'Tracking trail',
        distanceFilter: 10,
        requestPermissions: true,
      },
    ]);
  });

  it('applies default notification text and distance filter', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);

    await provider.startWatching(() => {}, () => {});

    expect(client.starts[0]).toMatchObject({
      backgroundTitle: 'Recording hike',
      backgroundMessage: 'Belknap Tracker is tracking your trail',
      distanceFilter: 5,
      requestPermissions: true,
    });
  });

  it('maps native locations to GeoPosition for the consumer', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);
    const positions: GeoPosition[] = [];

    await provider.startWatching((p) => positions.push(p), () => {});
    client.emit(
      location({
        latitude: 43.51,
        longitude: -71.28,
        accuracy: 8,
        altitude: 300,
        speed: 1.2,
        bearing: 90,
        time: 1_700_000_000_123,
      })
    );

    expect(positions).toEqual([
      {
        lat: 43.51,
        lng: -71.28,
        accuracy: 8,
        timestamp: 1_700_000_000_123,
        altitude: 300,
        speed: 1.2,
        bearing: 90,
      },
    ]);
  });

  it('treats null optional fields as undefined and missing time as 0', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);
    const positions: GeoPosition[] = [];

    await provider.startWatching((p) => positions.push(p), () => {});
    client.emit(location({ altitude: null, speed: null, bearing: null, time: null }));

    expect(positions[0]).toMatchObject({
      altitude: undefined,
      speed: undefined,
      bearing: undefined,
      timestamp: 0,
    });
  });

  it('maps a PERMISSION_DENIED error to the right code', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);
    const errors: GeolocationError[] = [];

    await provider.startWatching(() => {}, (e) => errors.push(e));
    client.emitError(
      Object.assign(new Error('denied'), { code: 'PERMISSION_DENIED' })
    );

    expect(errors[0]).toEqual({
      code: GeolocationErrorCode.PERMISSION_DENIED,
      message: 'denied',
    });
  });

  it('maps other errors to POSITION_UNAVAILABLE with a fallback message', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);
    const errors: GeolocationError[] = [];

    await provider.startWatching(() => {}, (e) => errors.push(e));
    client.emitError(Object.assign(new Error(''), { code: undefined }));

    expect(errors[0]).toEqual({
      code: GeolocationErrorCode.POSITION_UNAVAILABLE,
      message: 'Native geolocation error',
    });
  });

  it('rejects a second concurrent watcher', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);

    await provider.startWatching(() => {}, () => {});
    await expect(
      provider.startWatching(() => {}, () => {})
    ).rejects.toThrow('Already watching');
  });

  it('stops the watch and allows starting again', async () => {
    const client = createNullBackgroundGeolocationClient();
    const provider = createNativeProvider(client);

    await provider.startWatching(() => {}, () => {});
    await provider.stopWatching('native-watcher');
    expect(client.stopCount).toBe(1);

    // A fresh start is allowed after stopping.
    await expect(
      provider.startWatching(() => {}, () => {})
    ).resolves.toBe('native-watcher');
    expect(client.starts).toHaveLength(2);
  });

  it('delegates permission checks and settings to the client', async () => {
    const client = createNullBackgroundGeolocationClient({
      permissions: { location: 'granted' },
    });
    const provider = createNativeProvider(client);

    expect(await provider.checkPermissions()).toEqual({ location: 'granted' });
    expect(await provider.requestPermissions()).toEqual({ location: 'granted' });

    await provider.openSettings();
    expect(client.openSettingsCount).toBe(1);
  });
});
