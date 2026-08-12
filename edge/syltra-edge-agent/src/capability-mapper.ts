// Device Capability Layer (section 13/14): translates Home Assistant entity domains
// into the SYLTRA capability model. Nothing outside this file should know about HA
// domains or entity_id shapes.

export interface CapabilityDescriptor {
  capability: string;
  unit?: string;
}

export interface DomainMapping {
  type: string;
  capabilities: CapabilityDescriptor[];
}

const DOMAIN_MAP: Record<string, DomainMapping> = {
  climate: {
    type: 'hvac',
    capabilities: [{ capability: 'power' }, { capability: 'temperature', unit: 'celsius' }, { capability: 'mode' }, { capability: 'fan_speed' }],
  },
  light: {
    type: 'light',
    capabilities: [{ capability: 'power' }, { capability: 'brightness' }],
  },
  switch: {
    type: 'switch',
    capabilities: [{ capability: 'power' }],
  },
  cover: {
    type: 'blinds',
    capabilities: [{ capability: 'power' }, { capability: 'position', unit: 'percent' }],
  },
  lock: {
    type: 'lock',
    capabilities: [{ capability: 'locked' }],
  },
  sensor: {
    type: 'sensor',
    capabilities: [{ capability: 'value' }],
  },
  binary_sensor: {
    type: 'binary_sensor',
    capabilities: [{ capability: 'state' }],
  },
};

export function domainOf(entityId: string): string {
  return entityId.split('.')[0];
}

export function mapEntityToDevice(entityId: string): DomainMapping | undefined {
  return DOMAIN_MAP[domainOf(entityId)];
}

export function isSupportedDomain(entityId: string): boolean {
  return domainOf(entityId) in DOMAIN_MAP;
}

// Maps a SYLTRA command (capability + action + value) to a Home Assistant service call.
export interface HaServiceCall {
  domain: string;
  service: string;
  serviceData: Record<string, unknown>;
}

export function mapCommandToHaService(entityId: string, capability: string, action: string, value: unknown): HaServiceCall {
  const domain = domainOf(entityId);

  if (domain === 'climate' && capability === 'temperature' && action === 'set') {
    return { domain, service: 'set_temperature', serviceData: { entity_id: entityId, temperature: value } };
  }
  if (domain === 'climate' && capability === 'power') {
    return {
      domain,
      service: value ? 'turn_on' : 'turn_off',
      serviceData: { entity_id: entityId },
    };
  }
  if (domain === 'light' && capability === 'power') {
    return { domain, service: value ? 'turn_on' : 'turn_off', serviceData: { entity_id: entityId } };
  }
  if (domain === 'light' && capability === 'brightness' && action === 'set') {
    return { domain, service: 'turn_on', serviceData: { entity_id: entityId, brightness: value } };
  }
  if (domain === 'switch' && capability === 'power') {
    return { domain, service: value ? 'turn_on' : 'turn_off', serviceData: { entity_id: entityId } };
  }
  if (domain === 'cover' && capability === 'position' && action === 'set') {
    return { domain, service: 'set_cover_position', serviceData: { entity_id: entityId, position: value } };
  }
  if (domain === 'cover' && capability === 'power') {
    return { domain, service: value ? 'open_cover' : 'close_cover', serviceData: { entity_id: entityId } };
  }
  if (domain === 'lock' && capability === 'locked') {
    return { domain, service: value ? 'lock' : 'unlock', serviceData: { entity_id: entityId } };
  }

  throw new Error(`Unsupported command: domain=${domain} capability=${capability} action=${action}`);
}
