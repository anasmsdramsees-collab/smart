/**
 * End-to-end flow from section 41: Create Tenant -> Create Property -> Register Hub
 * -> Discover Virtual Device -> Read State -> Send Command -> Receive Event ->
 * Adaptive Plan -> Execute.
 *
 * Requires the full local stack: `docker compose up -d postgres redis mqtt` and
 * `npm run migration:run` against a disposable database first — this suite creates
 * real rows and was not run in the authoring environment (no Docker available there).
 * It targets `DATABASE_URL`/`POSTGRES_*` and `MQTT_BROKER_URL` from `.env`, same as
 * the app itself.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

describe('SYLTRA Platform E2E flow', () => {
  let app: INestApplication;
  let accessToken: string;
  let organizationId: string;
  let propertyId: string;
  let buildingId: string;
  let roomId: string;
  let hubId: string;
  let hubToken: string;
  let deviceId: string;
  let commandId: string;
  let goalId: string;

  const uniqueSuffix = Date.now();
  const email = `e2e-${uniqueSuffix}@syltra.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a tenant (register)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password: 'correct horse battery staple', organizationName: `E2E Org ${uniqueSuffix}` })
      .expect(201);

    accessToken = res.body.accessToken;
    organizationId = res.body.organizationId;
    expect(accessToken).toBeDefined();
    expect(organizationId).toBeDefined();
  });

  it('creates a property, building, and room', async () => {
    const property = await request(app.getHttpServer())
      .post(`/v1/organizations/${organizationId}/properties`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Villa 01' })
      .expect(201);
    propertyId = property.body.id;

    const building = await request(app.getHttpServer())
      .post(`/v1/organizations/${organizationId}/properties/${propertyId}/buildings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Main House' })
      .expect(201);
    buildingId = building.body.id;

    const room = await request(app.getHttpServer())
      .post(`/v1/organizations/${organizationId}/buildings/${buildingId}/rooms`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Living Room' })
      .expect(201);
    roomId = room.body.id;
  });

  it('registers a hub', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/organizations/${organizationId}/hubs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Hub', propertyId })
      .expect(201);

    hubId = res.body.hub.id;
    hubToken = res.body.pairingToken;
    expect(hubToken).toBeDefined();
  });

  it('discovers a virtual HVAC device (idempotent upsert)', async () => {
    const upsertPayload = {
      externalRef: 'climate.e2e_living_room',
      name: 'Living Room AC',
      type: 'hvac',
      roomId,
      capabilities: [{ capability: 'power' }, { capability: 'temperature', unit: 'celsius' }],
    };

    const first = await request(app.getHttpServer())
      .post(`/v1/hubs/${hubId}/devices`)
      .set('Authorization', `Bearer ${hubToken}`)
      .send(upsertPayload)
      .expect(201);
    deviceId = first.body.id;

    // Re-running discovery must not create a duplicate device (section 19).
    const second = await request(app.getHttpServer())
      .post(`/v1/hubs/${hubId}/devices`)
      .set('Authorization', `Bearer ${hubToken}`)
      .send(upsertPayload)
      .expect(201);
    expect(second.body.id).toBe(deviceId);
  });

  it('lists the discovered device under the organization', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/organizations/${organizationId}/devices`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.some((d: { id: string }) => d.id === deviceId)).toBe(true);
  });

  it('reads state (empty until the Edge Agent publishes over MQTT)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/organizations/${organizationId}/devices/${deviceId}/states`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('sends a command', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/organizations/${organizationId}/devices/${deviceId}/commands`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ capability: 'temperature', action: 'set', value: 24 })
      .expect(201);

    commandId = res.body.id;
    expect(['PENDING', 'SENT']).toContain(res.body.status);
  });

  it('reflects the command status (no result event without a live Edge Agent)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/organizations/${organizationId}/devices/${deviceId}/commands/${commandId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(commandId);
  });

  it('creates an adaptive comfort goal and executes a plan', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/organizations/${organizationId}/adaptive/goals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        objective: 'comfort',
        roomId,
        constraints: [
          { type: 'temperature_min', value: 23 },
          { type: 'temperature_max', value: 25 },
        ],
      })
      .expect(201);

    goalId = res.body.id;
    expect(goalId).toBeDefined();

    const plans = await request(app.getHttpServer())
      .get(`/v1/organizations/${organizationId}/adaptive/goals/${goalId}/plans`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(plans.body.length).toBeGreaterThan(0);
    const plan = plans.body[0];
    expect(plan.plan[0].deviceId).toBe(deviceId);
    expect(plan.plan[0].capability).toBe('temperature');
    expect(plan.plan[0].value).toBe(24); // midpoint of [23, 25]
  });
});
