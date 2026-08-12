import { HaState } from './ha-client';
import { translateState } from './state-translator';

function state(overrides: Partial<HaState>): HaState {
  return {
    entity_id: 'sensor.x',
    state: 'unknown',
    attributes: {},
    last_changed: new Date().toISOString(),
    ...overrides,
  };
}

describe('translateState', () => {
  it('translates a climate state into power, mode, temperature, fan_speed', () => {
    const values = translateState(
      state({
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { current_temperature: 23.5, fan_mode: 'auto' },
      }),
    );

    expect(values).toEqual(
      expect.arrayContaining([
        { capability: 'power', value: true },
        { capability: 'mode', value: 'heat' },
        { capability: 'temperature', value: 23.5, unit: 'celsius' },
        { capability: 'fan_speed', value: 'auto' },
      ]),
    );
  });

  it('reports climate power as false when state is off', () => {
    const values = translateState(state({ entity_id: 'climate.living_room', state: 'off' }));
    expect(values).toContainEqual({ capability: 'power', value: false });
  });

  it('translates a light state into power + brightness', () => {
    const values = translateState(
      state({ entity_id: 'light.kitchen', state: 'on', attributes: { brightness: 200 } }),
    );
    expect(values).toEqual([
      { capability: 'power', value: true },
      { capability: 'brightness', value: 200 },
    ]);
  });

  it('translates a switch state into power only', () => {
    const values = translateState(state({ entity_id: 'switch.pump', state: 'on' }));
    expect(values).toEqual([{ capability: 'power', value: true }]);
  });

  it('translates a numeric sensor state', () => {
    const values = translateState(state({ entity_id: 'sensor.temp', state: '21.4' }));
    expect(values).toEqual([{ capability: 'value', value: 21.4 }]);
  });

  it('keeps a non-numeric sensor state as a string', () => {
    const values = translateState(state({ entity_id: 'sensor.mode', state: 'eco' }));
    expect(values).toEqual([{ capability: 'value', value: 'eco' }]);
  });

  it('translates a binary_sensor state into a boolean', () => {
    const values = translateState(state({ entity_id: 'binary_sensor.motion', state: 'on' }));
    expect(values).toEqual([{ capability: 'state', value: true }]);
  });

  it('returns an empty array for unsupported domains', () => {
    expect(translateState(state({ entity_id: 'camera.front_door', state: 'idle' }))).toEqual([]);
  });
});
