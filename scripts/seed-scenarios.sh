#!/usr/bin/env bash
# Adds three manually-triggered scenario automations (Cinema, Party, Relax) to
# the demo villa. Each is a plain 'manual' automation, same mechanism as
# Emergency Mode — triggered on demand from the Automations page, not on a
# schedule. Each also defines offActions so the user can switch it back off,
# restoring every light and AC it touched to a normal state.
#
# Usage: API_URL=http://localhost:13000 EMAIL=test@syltra.sa PASSWORD=12345678 ./scripts/seed-scenarios.sh
set -euo pipefail

API_URL="${API_URL:-http://localhost:13000}"
EMAIL="${EMAIL:?Set EMAIL}"
PASSWORD="${PASSWORD:?Set PASSWORD}"

json_get() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{let cur=JSON.parse(d);for(const k of process.argv[1].split('.')){cur=cur?.[k];}console.log(cur);})" "$1"
}

TOKEN=$(curl -s -X POST "$API_URL/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | json_get accessToken)
ORG=$(curl -s "$API_URL/v1/organizations" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
echo "organization=$ORG"

curl -s "$API_URL/v1/organizations/$ORG/devices" -H "Authorization: Bearer $TOKEN" > /tmp/villa_devices_full.json

create_scenario() {
  local name="$1" actions="$2" off_actions="$3"
  curl -s -X POST "$API_URL/v1/organizations/$ORG/automations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"definition\":{\"type\":\"manual\",\"actions\":$actions,\"offActions\":$off_actions}}"
  echo
}

CINEMA_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const actions = [];
const dim = (name, level) => { const d = byName(name); if (d) { actions.push({deviceId:d.id, capability:'power', action:'set', value:true}); actions.push({deviceId:d.id, capability:'brightness', action:'set', value:level}); } };
const off = (name) => { const d = byName(name); if (d) actions.push({deviceId:d.id, capability:'power', action:'set', value:false}); };
dim('Living Room Light', 5);
off('Majlis Light'); off('Kitchen Light'); off('Master Bedroom Light'); off('Bedroom 2 Light'); off('Bedroom 3 Light'); off('Garage Light'); off('Exterior Light');
const ac = byName('Living Room AC');
if (ac) actions.push({deviceId:ac.id, capability:'temperature', action:'set', value:22});
console.log(JSON.stringify(actions));
")
CINEMA_OFF_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const actions = [];
for (const name of ['Majlis Light','Living Room Light','Kitchen Light','Master Bedroom Light','Bedroom 2 Light','Bedroom 3 Light','Garage Light','Exterior Light']) {
  const d = byName(name); if (d) { actions.push({deviceId:d.id, capability:'power', action:'set', value:true}); actions.push({deviceId:d.id, capability:'brightness', action:'set', value:60}); }
}
const ac = byName('Living Room AC');
if (ac) actions.push({deviceId:ac.id, capability:'temperature', action:'set', value:24});
console.log(JSON.stringify(actions));
")

PARTY_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const actions = [];
const full = (name) => { const d = byName(name); if (d) { actions.push({deviceId:d.id, capability:'power', action:'set', value:true}); actions.push({deviceId:d.id, capability:'brightness', action:'set', value:100}); } };
const off = (name) => { const d = byName(name); if (d) actions.push({deviceId:d.id, capability:'power', action:'set', value:false}); };
full('Majlis Light'); full('Living Room Light'); full('Exterior Light'); full('Kitchen Light');
off('Master Bedroom Light'); off('Bedroom 2 Light'); off('Bedroom 3 Light');
for (const room of ['Majlis AC','Living Room AC','Kitchen AC']) { const d = byName(room); if (d) actions.push({deviceId:d.id, capability:'temperature', action:'set', value:23}); }
console.log(JSON.stringify(actions));
")
PARTY_OFF_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const actions = [];
for (const name of ['Majlis Light','Living Room Light','Exterior Light','Kitchen Light','Master Bedroom Light','Bedroom 2 Light','Bedroom 3 Light']) {
  const d = byName(name); if (d) { actions.push({deviceId:d.id, capability:'power', action:'set', value:true}); actions.push({deviceId:d.id, capability:'brightness', action:'set', value:60}); }
}
for (const room of ['Majlis AC','Living Room AC','Kitchen AC']) { const d = byName(room); if (d) actions.push({deviceId:d.id, capability:'temperature', action:'set', value:24}); }
console.log(JSON.stringify(actions));
")

RELAX_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const actions = [];
const dim = (name, level) => { const d = byName(name); if (d) { actions.push({deviceId:d.id, capability:'power', action:'set', value:true}); actions.push({deviceId:d.id, capability:'brightness', action:'set', value:level}); } };
const off = (name) => { const d = byName(name); if (d) actions.push({deviceId:d.id, capability:'power', action:'set', value:false}); };
dim('Majlis Light', 35); dim('Master Bedroom Light', 35);
off('Living Room Light'); off('Kitchen Light'); off('Bedroom 2 Light'); off('Bedroom 3 Light'); off('Garage Light'); off('Exterior Light');
for (const room of ['Majlis AC','Master Bedroom AC']) { const d = byName(room); if (d) actions.push({deviceId:d.id, capability:'temperature', action:'set', value:24}); }
console.log(JSON.stringify(actions));
")
RELAX_OFF_ACTIONS=$(node -e "
const devices = require('/tmp/villa_devices_full.json');
const byName = n => devices.find(d => d.name === n);
const actions = [];
for (const name of ['Majlis Light','Master Bedroom Light','Living Room Light','Kitchen Light','Bedroom 2 Light','Bedroom 3 Light','Garage Light','Exterior Light']) {
  const d = byName(name); if (d) { actions.push({deviceId:d.id, capability:'power', action:'set', value:true}); actions.push({deviceId:d.id, capability:'brightness', action:'set', value:60}); }
}
for (const room of ['Majlis AC','Master Bedroom AC']) { const d = byName(room); if (d) actions.push({deviceId:d.id, capability:'temperature', action:'set', value:24}); }
console.log(JSON.stringify(actions));
")

echo "== Creating Cinema =="
create_scenario "Cinema" "$CINEMA_ACTIONS" "$CINEMA_OFF_ACTIONS"
echo "== Creating Party =="
create_scenario "Party" "$PARTY_ACTIONS" "$PARTY_OFF_ACTIONS"
echo "== Creating Relax =="
create_scenario "Relax" "$RELAX_ACTIONS" "$RELAX_OFF_ACTIONS"
echo "== Done. Refresh the dashboard. =="
