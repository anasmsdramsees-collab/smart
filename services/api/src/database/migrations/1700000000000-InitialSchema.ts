import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`
      INSERT INTO roles (name) VALUES
        ('owner'), ('admin'), ('installer'), ('resident'), ('guest'), ('developer'), ('service')
    `);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        UNIQUE (role_id, resource, action)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_memberships_user ON memberships(user_id)`);

    await queryRunner.query(`
      CREATE TABLE properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_properties_org ON properties(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE buildings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_buildings_property ON buildings(property_id)`);

    await queryRunner.query(`
      CREATE TABLE floors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
        zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_rooms_building ON rooms(building_id)`);

    await queryRunner.query(`
      CREATE TABLE hubs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        serial_number TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        last_seen_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_hubs_org ON hubs(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        device_key TEXT NOT NULL UNIQUE,
        external_ref TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        status TEXT NOT NULL DEFAULT 'unknown',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_devices_org ON devices(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_devices_hub ON devices(hub_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_devices_hub_external_ref ON devices(hub_id, external_ref) WHERE external_ref IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE device_capabilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        capability TEXT NOT NULL,
        unit TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (device_id, capability)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE device_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        capability TEXT NOT NULL,
        value JSONB NOT NULL,
        unit TEXT,
        source TEXT NOT NULL,
        quality TEXT NOT NULL DEFAULT 'valid',
        observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_device_states_device_capability_time ON device_states(device_id, capability, observed_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE device_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        correlation_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_device_events_org_time ON device_events(organization_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE device_commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        capability TEXT NOT NULL,
        action TEXT NOT NULL,
        value JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_by TEXT NOT NULL,
        correlation_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_device_commands_device ON device_commands(device_id)`);
    await queryRunner.query(`CREATE INDEX idx_device_commands_correlation ON device_commands(correlation_id)`);

    await queryRunner.query(`
      CREATE TABLE automations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        definition JSONB NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE automation_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'running',
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at TIMESTAMPTZ,
        result JSONB
      )
    `);

    await queryRunner.query(`
      CREATE TABLE adaptive_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        objective TEXT NOT NULL,
        constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE adaptive_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id UUID NOT NULL REFERENCES adaptive_goals(id) ON DELETE CASCADE,
        plan JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE adaptive_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES adaptive_plans(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        capability TEXT NOT NULL,
        action TEXT NOT NULL,
        value JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE energy_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        watt_hours NUMERIC NOT NULL,
        reading_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_energy_readings_device_time ON energy_readings(device_id, reading_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id UUID,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE firmware_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hub_id UUID REFERENCES hubs(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        version TEXT NOT NULL,
        released_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (hub_id IS NOT NULL OR device_id IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE device_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        credential_type TEXT NOT NULL,
        secret_ref TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'device_credentials',
      'firmware_versions',
      'audit_logs',
      'notifications',
      'energy_readings',
      'adaptive_actions',
      'adaptive_plans',
      'adaptive_goals',
      'automation_runs',
      'automations',
      'device_commands',
      'device_events',
      'device_states',
      'device_capabilities',
      'devices',
      'hubs',
      'rooms',
      'zones',
      'floors',
      'buildings',
      'properties',
      'memberships',
      'permissions',
      'roles',
      'users',
      'organizations',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }
}
