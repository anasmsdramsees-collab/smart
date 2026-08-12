#!/usr/bin/env bash
# Adds safety sensors (gas, water leak, smoke, voltage) and shutoff valves
# (water, gas) to an already-seeded demo villa (see seed-demo-villa.sh), then
# creates an "Emergency Mode" manual automation: locks the main door, opens
# the designated emergency-exit gate, kills power to everything except one
# dim corridor light, and shuts the water and gas valves.
#
# Usage: API_URL=http://localhost:13000 EMAIL=test@syltra.sa PASSWORD=12345678 ./scripts/seed-safety-and-emergency.sh
set -euo pipefail

API_URL="${API_URL:-http://localhost:13000}"
EMAIL="${EMAIL:?Set EMAIL}"
PASSWORD="${PASSWORD:?Set PASSWORD}"

json_get() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{let cur=JSON.parse(d);for(const k of process.argv[1].split('.')){cur=cur?.[k];}console.log(cur);})" "$1"
}

echo "== Logging in as $EMAIL =="
TOKEN=$(curl -s -X POST "$API_URL/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | json_get accessToken)
ORG=$(curl -s "$API_URL/v1/organizations" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
echo "organization=$ORG"

BUILDINGS=$(curl -s "$API_URL/v1/organizations/$ORG/properties" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
BUILDING=$(curl -s "$API_URL/v1/organizations/$ORG/properties/$BUILDINGS/buildings" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
ROOMS_JSON=$(curl -s "$API_URL/v1/organizations/$ORG/buildings/$BUILDING/rooms" -H "Authorization: Bearer $TOKEN")

room_id() {
  echo "$ROOMS_JSON" | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d).find(x=>x.name==='$1');console.log(r?r.id:'')})"
}

echo "== Registering hub 'Villa Safety Hub' =="
HUB_RES=$(curl -s -X POST "$API_URL/v1/organizations/$ORG/hubs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Villa Safety Hub"}')
HUB_ID=$(echo "$HUB_RES" | json_get hub.id)
HUB_TOKEN=$(echo "$HUB_RES" | json_get pairingToken)
echo "hub=$HUB_ID"

upsert_device() {
  local external_ref="$1" name="$2" type="$3" room="$4" capabilities="$5"
  curl -s -X POST "$API_URL/v1/hubs/$HUB_ID/devices" -H "Authorization: Bearer $HUB_TOKEN" -H "Content-Type: application/json" \
    -d "{\"externalRef\":\"$external_ref\",\"name\":\"$name\",\"type\":\"$type\",\"roomId\":\"$room\",\"capabilities\":$capabilities}" \
    | json_get id
}

KITCHEN=$(room_id "Kitchen")
GARAGE=$(room_id "Garage")
LIVING=$(room_id "Living Room")

echo "== Safety sensors =="
SMOKE_KITCHEN=$(upsert_device "binary_sensor.smoke_kitchen" "Kitchen Smoke Detector" "smoke_sensor" "$KITCHEN" '[{"capability":"state"}]')
SMOKE_LIVING=$(upsert_device "binary_sensor.smoke_living_room" "Living Room Smoke Detector" "smoke_sensor" "$LIVING" '[{"capability":"state"}]')
GAS_KITCHEN=$(upsert_device "binary_sensor.gas_kitchen" "Kitchen Gas Detector" "gas_sensor" "$KITCHEN" '[{"capability":"state"}]')
LEAK_KITCHEN=$(upsert_device "binary_sensor.leak_kitchen" "Kitchen Water Leak Sensor" "water_sensor" "$KITCHEN" '[{"capability":"state"}]')
LEAK_GARAGE=$(upsert_device "binary_sensor.leak_garage" "Garage Water Leak Sensor" "water_sensor" "$GARAGE" '[{"capability":"state"}]')
VOLTAGE_GARAGE=$(upsert_device "sensor.voltage_panel" "Electrical Panel Voltage" "voltage_sensor" "$GARAGE" '[{"capability":"value","unit":"volt"}]')
echo "  smoke_kitchen=$SMOKE_KITCHEN smoke_living=$SMOKE_LIVING gas_kitchen=$GAS_KITCHEN leak_kitchen=$LEAK_KITCHEN leak_garage=$LEAK_GARAGE voltage=$VOLTAGE_GARAGE"

echo "== Shutoff valves =="
WATER_VALVE=$(upsert_device "valve.main_water" "Main Water Valve" "water_valve" "$GARAGE" '[{"capability":"position"}]')
GAS_VALVE=$(upsert_device "valve.main_gas" "Main Gas Valve" "gas_valve" "$GARAGE" '[{"capability":"position"}]')
echo "  water_valve=$WATER_VALVE gas_valve=$GAS_VALVE"

echo "== Collecting device ids for Emergency Mode =="
DEVICES=$(curl -s "$API_URL/v1/organizations/$ORG/devices" -H "Authorization: Bearer $TOKEN")
echo "$DEVICES" > /tmp/villa_devices_full.json

EMERGENCY_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const lights = devices.filter(d => d.type === 'light');
const acs = devices.filter(d => d.type === 'hvac');

const mainDoor = byName('Main Entrance Door');
const gate = byName('External Gate');
const garageDoor = byName('Garage Door');
const corridorLight = byName('Living Room Light'); // emergency exit path
const waterValve = byName('Main Water Valve');
const gasValve = byName('Main Gas Valve');

const actions = [];
if (mainDoor) actions.push({ deviceId: mainDoor.id, capability: 'lock', action: 'set', value: true });
if (gate) actions.push({ deviceId: gate.id, capability: 'position', action: 'set', value: true }); // designated emergency exit — unlocked/open
if (garageDoor) actions.push({ deviceId: garageDoor.id, capability: 'position', action: 'set', value: false });

for (const light of lights) {
  if (corridorLight && light.id === corridorLight.id) {
    actions.push({ deviceId: light.id, capability: 'power', action: 'set', value: true });
    actions.push({ deviceId: light.id, capability: 'brightness', action: 'set', value: 15 });
  } else {
    actions.push({ deviceId: light.id, capability: 'power', action: 'set', value: false });
  }
}

for (const ac of acs) {
  actions.push({ deviceId: ac.id, capability: 'power', action: 'set', value: false });
}

if (waterValve) actions.push({ deviceId: waterValve.id, capability: 'position', action: 'set', value: false });
if (gasValve) actions.push({ deviceId: gasValve.id, capability: 'position', action: 'set', value: false });

console.log(JSON.stringify(actions));
")

# Restores normal operation: unlock the main door, close the exit gate, turn
# every light back on at a normal brightness, restore AC power, reopen the
# water/gas valves.
EMERGENCY_OFF_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const lights = devices.filter(d => d.type === 'light');
const acs = devices.filter(d => d.type === 'hvac');

const mainDoor = byName('Main Entrance Door');
const gate = byName('External Gate');
const waterValve = byName('Main Water Valve');
const gasValve = byName('Main Gas Valve');

const actions = [];
if (mainDoor) actions.push({ deviceId: mainDoor.id, capability: 'lock', action: 'set', value: false });
if (gate) actions.push({ deviceId: gate.id, capability: 'position', action: 'set', value: false });

for (const light of lights) {
  actions.push({ deviceId: light.id, capability: 'power', action: 'set', value: true });
  actions.push({ deviceId: light.id, capability: 'brightness', action: 'set', value: 60 });
}
for (const ac of acs) {
  actions.push({ deviceId: ac.id, capability: 'power', action: 'set', value: true });
}
if (waterValve) actions.push({ deviceId: waterValve.id, capability: 'position', action: 'set', value: true });
if (gasValve) actions.push({ deviceId: gasValve.id, capability: 'position', action: 'set', value: true });

console.log(JSON.stringify(actions));
")

echo "== Creating 'Emergency Mode' automation =="
curl -s -X POST "$API_URL/v1/organizations/$ORG/automations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Emergency Mode\",\"definition\":{\"type\":\"manual\",\"actions\":$EMERGENCY_ACTIONS,\"offActions\":$EMERGENCY_OFF_ACTIONS}}"
echo
echo "== Done. Refresh the dashboard. =="
