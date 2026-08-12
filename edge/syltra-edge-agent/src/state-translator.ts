import { HaState } from './ha-client';
import { domainOf } from './capability-mapper';

export interface CapabilityValue {
  capability: string;
  value: unknown;
  unit?: string;
}

// Translates a raw Home Assistant state object into the SYLTRA capability/value
// pairs observed on the device (section 20/23: Observed State).
export function translateState(state: HaState): CapabilityValue[] {
  const domain = domainOf(state.entity_id);
  const values: CapabilityValue[] = [];

  switch (domain) {
    case 'climate':
      values.push({ capability: 'power', value: state.state !== 'off' });
      values.push({ capability: 'mode', value: state.state });
      if (typeof state.attributes.current_temperature === 'number') {
        values.push({ capability: 'temperature', value: state.attributes.current_temperature, unit: 'celsius' });
      }
      if (typeof state.attributes.fan_mode === 'string') {
        values.push({ capability: 'fan_speed', value: state.attributes.fan_mode });
      }
      break;
    case 'light':
      values.push({ capability: 'power', value: state.state === 'on' });
      if (typeof state.attributes.brightness === 'number') {
        values.push({ capability: 'brightness', value: state.attributes.brightness });
      }
      break;
    case 'switch':
      values.push({ capability: 'power', value: state.state === 'on' });
      break;
    case 'cover':
      values.push({ capability: 'power', value: state.state === 'open' });
      if (typeof state.attributes.current_position === 'number') {
        values.push({ capability: 'position', value: state.attributes.current_position, unit: 'percent' });
      }
      break;
    case 'lock':
      values.push({ capability: 'locked', value: state.state === 'locked' });
      break;
    case 'sensor':
      values.push({ capability: 'value', value: parseSensorValue(state.state) });
      break;
    case 'binary_sensor':
      values.push({ capability: 'state', value: state.state === 'on' });
      break;
    default:
      break;
  }

  return values;
}

function parseSensorValue(raw: string): number | string {
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? raw : parsed;
}
