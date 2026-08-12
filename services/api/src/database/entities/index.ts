import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Membership } from './membership.entity';
import { Property } from './property.entity';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Zone } from './zone.entity';
import { Room } from './room.entity';
import { Hub } from './hub.entity';
import { Device } from './device.entity';
import { DeviceCapability } from './device-capability.entity';
import { DeviceState } from './device-state.entity';
import { DeviceEvent } from './device-event.entity';
import { DeviceCommand } from './device-command.entity';
import { Automation } from './automation.entity';
import { AutomationRun } from './automation-run.entity';
import { AdaptiveGoal } from './adaptive-goal.entity';
import { AdaptivePlan } from './adaptive-plan.entity';
import { AdaptiveAction } from './adaptive-action.entity';
import { EnergyReading } from './energy-reading.entity';
import { Notification } from './notification.entity';
import { AuditLog } from './audit-log.entity';
import { FirmwareVersion } from './firmware-version.entity';
import { DeviceCredential } from './device-credential.entity';

export const entities = [
  Organization,
  User,
  Role,
  Permission,
  Membership,
  Property,
  Building,
  Floor,
  Zone,
  Room,
  Hub,
  Device,
  DeviceCapability,
  DeviceState,
  DeviceEvent,
  DeviceCommand,
  Automation,
  AutomationRun,
  AdaptiveGoal,
  AdaptivePlan,
  AdaptiveAction,
  EnergyReading,
  Notification,
  AuditLog,
  FirmwareVersion,
  DeviceCredential,
];

export * from './organization.entity';
export * from './user.entity';
export * from './role.entity';
export * from './permission.entity';
export * from './membership.entity';
export * from './property.entity';
export * from './building.entity';
export * from './floor.entity';
export * from './zone.entity';
export * from './room.entity';
export * from './hub.entity';
export * from './device.entity';
export * from './device-capability.entity';
export * from './device-state.entity';
export * from './device-event.entity';
export * from './device-command.entity';
export * from './automation.entity';
export * from './automation-run.entity';
export * from './adaptive-goal.entity';
export * from './adaptive-plan.entity';
export * from './adaptive-action.entity';
export * from './energy-reading.entity';
export * from './notification.entity';
export * from './audit-log.entity';
export * from './firmware-version.entity';
export * from './device-credential.entity';
