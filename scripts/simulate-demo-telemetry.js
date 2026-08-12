#!/usr/bin/env node
/**
 * Publishes realistic-but-simulated sensor readings over MQTT, exactly the
 * way a real SYLTRA Edge Agent would (same topic shape, same StateMessage
 * contract from @syltra/mqtt-contracts) — no shortcuts into the database.
 * This is demo/trial telemetry, not a real weather feed or real power meter.
 *
 * Usage:
 *   node scripts/simulate-demo-telemetry.js --once
 *   node scripts/simulate-demo-telemetry.js --loop --interval 30000
 *
 * Config comes from a JSON file (default: /tmp/villa_telemetry_config.json)
 * shaped as:
 *   {
 *     "tenantId": "...",
 *     "sensorsHubId": "...",
 *     "villaHubId": "...",
 *     "rooms": [{ "externalRef": "climate.majlis", "name": "Majlis" }, ...]
 *   }
 */
const mqtt = require('mqtt');

const CONFIG_PATH = process.env.TELEMETRY_CONFIG || '/tmp/villa_telemetry_config.json';
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const LOOP = process.argv.includes('--loop');
const intervalArgIndex = process.argv.indexOf('--interval');
const INTERVAL_MS = intervalArgIndex !== -1 ? Number(process.argv[intervalArgIndex + 1]) : 30000;

const config = JSON.parse(require('fs').readFileSync(CONFIG_PATH, 'utf8'));

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function stateTopic(hubId) {
  return `syltra/${config.tenantId}/hubs/${hubId}/state`;
}

function publishState(client, hubId, deviceExternalRef, capability, value, unit) {
  client.publish(
    stateTopic(hubId),
    JSON.stringify({ device_external_ref: deviceExternalRef, capability, value, unit, quality: 'valid' }),
  );
}

function tick(client) {
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 19;

  // Outdoor weather — hot Saudi daytime, cooler at night.
  const outdoorTemp = isDaytime ? randomBetween(36, 44) : randomBetween(26, 32);
  const outdoorHumidity = randomBetween(15, 35);
  publishState(client, config.sensorsHubId, 'sensor.outdoor_weather', 'temperature', outdoorTemp, 'celsius');
  publishState(client, config.sensorsHubId, 'sensor.outdoor_weather', 'humidity', outdoorHumidity, 'percent');

  // Per-room indoor climate — AC keeps it close to its target, small jitter.
  for (const room of config.rooms) {
    const indoorTemp = randomBetween(22, 25.5);
    const indoorHumidity = randomBetween(38, 52);
    publishState(client, config.villaHubId, room.externalRef, 'temperature', indoorTemp, 'celsius');
    publishState(client, config.villaHubId, room.externalRef, 'humidity', indoorHumidity, 'percent');
  }

  // Villa-wide power draw — higher during daytime AC load.
  const powerDraw = isDaytime ? randomBetween(2200, 4800) : randomBetween(900, 2000);
  publishState(client, config.sensorsHubId, 'sensor.villa_energy_meter', 'power_draw', Math.round(powerDraw), 'watt');

  console.log(`[${new Date().toISOString()}] published telemetry (outdoor ${outdoorTemp}°C, power ${Math.round(powerDraw)}W)`);
}

const client = mqtt.connect(BROKER_URL);
client.on('connect', () => {
  console.log(`Connected to ${BROKER_URL}`);
  tick(client);
  if (LOOP) {
    setInterval(() => tick(client), INTERVAL_MS);
  } else {
    setTimeout(() => client.end(), 500);
  }
});
client.on('error', (err) => {
  console.error('MQTT error:', err.message);
  process.exit(1);
});
