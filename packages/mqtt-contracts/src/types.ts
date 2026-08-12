// Wire-format contract shared between SYLTRA Cloud (services/api) and the
// SYLTRA Edge Agent (edge/syltra-edge-agent). Keep this in sync with
// services/api/src/database/entities/device-event.entity.ts's DeviceEventType —
// the values must match exactly since the cloud persists these strings directly.
export type DeviceEventType =
  | 'DeviceDiscovered'
  | 'DeviceUpdated'
  | 'DeviceConnected'
  | 'DeviceDisconnected'
  | 'StateChanged'
  | 'TemperatureChanged'
  | 'MotionDetected'
  | 'EnergyUpdated'
  | 'CommandRequested'
  | 'CommandExecuted'
  | 'CommandFailed'
  | 'AutomationTriggered'
  | 'PlanCreated'
  | 'PlanExecuted'
  | 'PlanFailed';

export type StateQuality = 'valid' | 'stale' | 'unknown';

// Published by the Edge Agent to MqttTopics.state(tenantId, hubId).
export interface StateMessage {
  device_external_ref: string;
  capability: string;
  value: unknown;
  unit?: string;
  quality?: StateQuality;
}

// Published by both sides to MqttTopics.events(tenantId, hubId).
export interface EventMessage {
  type: DeviceEventType;
  correlation_id?: string;
  payload?: Record<string, unknown>;
  error?: string;
}

// Published by the Cloud to MqttTopics.commands(tenantId, hubId), consumed by the Edge Agent.
export interface CommandMessage {
  command_id: string;
  device_id: string;
  device_external_ref: string;
  capability: string;
  action: string;
  value: unknown;
  correlation_id: string;
}

// Published by the Edge Agent to MqttTopics.health(tenantId, hubId).
export interface HealthMessage {
  online: boolean;
  timestamp: string;
}
