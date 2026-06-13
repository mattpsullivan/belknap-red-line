import { describe, it, expect } from 'vitest';
import type { Location, CallbackError } from '@capgo/background-geolocation';
import { createNullBackgroundGeolocationClient } from './backgroundGeolocationClient';

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

describe('null background geolocation client', () => {
  it('tracks start options and stop/openSettings calls', async () => {
    const client = createNullBackgroundGeolocationClient();

    expect(client.starts).toEqual([]);
    expect(client.stopCount).toBe(0);
    expect(client.openSettingsCount).toBe(0);

    await client.start(
      { backgroundTitle: 'T', distanceFilter: 5, requestPermissions: true },
      () => {},
      () => {}
    );
    await client.stop();
    await client.openSettings();

    expect(client.starts).toEqual([
      { backgroundTitle: 'T', distanceFilter: 5, requestPermissions: true },
    ]);
    expect(client.stopCount).toBe(1);
    expect(client.openSettingsCount).toBe(1);
  });

  it('delivers emitted locations to the registered callback', async () => {
    const client = createNullBackgroundGeolocationClient();
    const received: Location[] = [];

    await client.start({}, (loc) => received.push(loc), () => {});
    client.emit(location({ latitude: 1, longitude: 2 }));

    expect(received).toHaveLength(1);
    expect(received[0].latitude).toBe(1);
    expect(received[0].longitude).toBe(2);
  });

  it('delivers emitted errors to the registered callback', async () => {
    const client = createNullBackgroundGeolocationClient();
    const errors: CallbackError[] = [];

    await client.start({}, () => {}, (err) => errors.push(err));
    const error = Object.assign(new Error('no fix'), { code: 'POSITION_UNAVAILABLE' });
    client.emitError(error);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('no fix');
  });

  it('stops delivering after stop()', async () => {
    const client = createNullBackgroundGeolocationClient();
    const received: Location[] = [];

    await client.start({}, (loc) => received.push(loc), () => {});
    await client.stop();
    client.emit(location());

    expect(received).toHaveLength(0);
  });

  it('returns configured permission responses', async () => {
    const granted = createNullBackgroundGeolocationClient({
      permissions: { location: 'granted' },
    });
    expect(await granted.checkPermissions()).toEqual({ location: 'granted' });
    // requestPermissions falls back to the configured permissions
    expect(await granted.requestPermissions()).toEqual({ location: 'granted' });
  });

  it('defaults to prompt for check and granted for request', async () => {
    const client = createNullBackgroundGeolocationClient();
    expect(await client.checkPermissions()).toEqual({ location: 'prompt' });
    expect(await client.requestPermissions()).toEqual({ location: 'granted' });
  });

  it('honours a distinct requestPermissions response', async () => {
    const client = createNullBackgroundGeolocationClient({
      permissions: { location: 'prompt' },
      requestPermissionsResult: { location: 'denied' },
    });
    expect(await client.checkPermissions()).toEqual({ location: 'prompt' });
    expect(await client.requestPermissions()).toEqual({ location: 'denied' });
  });
});
