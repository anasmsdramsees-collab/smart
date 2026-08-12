import { isSupportedDomain, mapCommandToHaService, mapEntityToDevice } from './capability-mapper';

describe('capability-mapper', () => {
  describe('mapEntityToDevice', () => {
    it('maps climate entities to the hvac capability set', () => {
      const mapping = mapEntityToDevice('climate.living_room');
      expect(mapping?.type).toBe('hvac');
      expect(mapping?.capabilities.map((c) => c.capability)).toEqual(
        expect.arrayContaining(['power', 'temperature', 'mode', 'fan_speed']),
      );
    });

    it('maps light entities to power + brightness', () => {
      const mapping = mapEntityToDevice('light.kitchen');
      expect(mapping?.type).toBe('light');
      expect(mapping?.capabilities.map((c) => c.capability)).toEqual(['power', 'brightness']);
    });

    it('returns undefined for unsupported domains', () => {
      expect(mapEntityToDevice('camera.front_door')).toBeUndefined();
    });
  });

  describe('isSupportedDomain', () => {
    it.each(['climate.a', 'light.a', 'switch.a', 'sensor.a', 'binary_sensor.a'])('supports %s', (entityId) => {
      expect(isSupportedDomain(entityId)).toBe(true);
    });

    it('rejects an unsupported domain', () => {
      expect(isSupportedDomain('camera.front_door')).toBe(false);
    });
  });

  describe('mapCommandToHaService', () => {
    it('maps a climate temperature set command', () => {
      const call = mapCommandToHaService('climate.living_room', 'temperature', 'set', 24);
      expect(call).toEqual({
        domain: 'climate',
        service: 'set_temperature',
        serviceData: { entity_id: 'climate.living_room', temperature: 24 },
      });
    });

    it('maps a light power-on command', () => {
      const call = mapCommandToHaService('light.kitchen', 'power', 'toggle', true);
      expect(call.service).toBe('turn_on');
      expect(call.domain).toBe('light');
    });

    it('maps a light power-off command', () => {
      const call = mapCommandToHaService('light.kitchen', 'power', 'toggle', false);
      expect(call.service).toBe('turn_off');
    });

    it('maps a light brightness set command', () => {
      const call = mapCommandToHaService('light.kitchen', 'brightness', 'set', 128);
      expect(call).toEqual({
        domain: 'light',
        service: 'turn_on',
        serviceData: { entity_id: 'light.kitchen', brightness: 128 },
      });
    });

    it('maps a switch power command', () => {
      const call = mapCommandToHaService('switch.pump', 'power', 'set', true);
      expect(call.service).toBe('turn_on');
      expect(call.domain).toBe('switch');
    });

    it('throws for an unsupported capability/action combination', () => {
      expect(() => mapCommandToHaService('sensor.temp', 'value', 'set', 1)).toThrow();
    });
  });
});
