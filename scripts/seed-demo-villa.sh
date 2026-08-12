#!/usr/bin/env bash
# Seeds a full demo villa (rooms, lighting, AC units, garage door, external
# gate, main door, cameras) plus a day/night automation scenario, against a
# running SYLTRA Cloud API. Uses the hub device-discovery endpoint the same
# way a real Edge Agent would, so this is realistic seed data, not a
# database shortcut.
#
# Usage: API_URL=http://localhost:13000 EMAIL=test@syltra.sa PASSWORD=12345678 ./scripts/seed-demo-villa.sh
set -euo pipefail

API_URL="${API_URL:-http://localhost:13000}"
EMAIL="${EMAIL:?Set EMAIL}"
PASSWORD="${PASSWORD:?Set PASSWORD}"

json_get() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const v=JSON.parse(d);for(const k of process.argv[1].split('.')){if(v===undefined||v===null){break};};let cur=JSON.parse(d);for(const k of process.argv[1].split('.')){cur=cur?.[k];}console.log(cur);})" "$1"
}

echo "== Logging in as $EMAIL =="
LOGIN_RES=$(curl -s -X POST "$API_URL/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | json_get accessToken)
if [ "$TOKEN" = "undefined" ]; then
  echo "Login failed: $LOGIN_RES" >&2
  exit 1
fi

ORG=$(curl -s "$API_URL/v1/organizations" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
echo "organization=$ORG"

echo "== Ensuring a property/building exist =="
PROPERTIES=$(curl -s "$API_URL/v1/organizations/$ORG/properties" -H "Authorization: Bearer $TOKEN")
PROP=$(echo "$PROPERTIES" | node -e "process.stdin.on('data',d=>{const a=JSON.parse(d);console.log(a[0]?a[0].id:'')})")
if [ -z "$PROP" ]; then
  PROP=$(curl -s -X POST "$API_URL/v1/organizations/$ORG/properties" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Villa"}' | json_get id)
fi
echo "property=$PROP"

BUILDINGS=$(curl -s "$API_URL/v1/organizations/$ORG/properties/$PROP/buildings" -H "Authorization: Bearer $TOKEN")
BUILDING=$(echo "$BUILDINGS" | node -e "process.stdin.on('data',d=>{const a=JSON.parse(d);console.log(a[0]?a[0].id:'')})")
if [ -z "$BUILDING" ]; then
  BUILDING=$(curl -s -X POST "$API_URL/v1/organizations/$ORG/properties/$PROP/buildings" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Main Villa"}' | json_get id)
fi
echo "building=$BUILDING"

# bash 3.2 (macOS default) has no associative arrays — use parallel indexed
# arrays plus a lookup function instead.
ROOM_NAMES=()
ROOM_ID_VALUES=()

room_id() {
  local name="$1"
  local i
  for i in "${!ROOM_NAMES[@]}"; do
    if [ "${ROOM_NAMES[$i]}" = "$name" ]; then
      echo "${ROOM_ID_VALUES[$i]}"
      return
    fi
  done
}

create_room() {
  local name="$1"
  local existing
  existing=$(curl -s "$API_URL/v1/organizations/$ORG/buildings/$BUILDING/rooms" -H "Authorization: Bearer $TOKEN" \
    | node -e "process.stdin.on('data',d=>{const a=JSON.parse(d);const r=a.find(x=>x.name==='$name');console.log(r?r.id:'')})")
  if [ -n "$existing" ]; then
    echo "$existing"
    return
  fi
  curl -s -X POST "$API_URL/v1/organizations/$ORG/buildings/$BUILDING/rooms" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\"}" | json_get id
}

echo "== Creating rooms =="
for room in "Majlis" "Living Room" "Master Bedroom" "Bedroom 2" "Bedroom 3" "Kitchen" "Garage" "Exterior"; do
  id=$(create_room "$room")
  ROOM_NAMES+=("$room")
  ROOM_ID_VALUES+=("$id")
  echo "  $room -> $id"
done

echo "== Registering hub 'Villa Demo Hub' =="
HUB_RES=$(curl -s -X POST "$API_URL/v1/organizations/$ORG/hubs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Villa Demo Hub"}')
HUB_ID=$(echo "$HUB_RES" | json_get hub.id)
HUB_TOKEN=$(echo "$HUB_RES" | json_get pairingToken)
echo "hub=$HUB_ID"

upsert_device() {
  local external_ref="$1" name="$2" type="$3" room="$4" capabilities="$5"
  local rid
  rid=$(room_id "$room")
  curl -s -X POST "$API_URL/v1/hubs/$HUB_ID/devices" -H "Authorization: Bearer $HUB_TOKEN" -H "Content-Type: application/json" \
    -d "{\"externalRef\":\"$external_ref\",\"name\":\"$name\",\"type\":\"$type\",\"roomId\":\"$rid\",\"capabilities\":$capabilities}" \
    | json_get id
}

echo "== Lighting (all rooms) =="
LIGHT_CAPS='[{"capability":"power"},{"capability":"brightness"}]'
for room in "Majlis" "Living Room" "Master Bedroom" "Bedroom 2" "Bedroom 3" "Kitchen" "Garage" "Exterior"; do
  slug=$(echo "$room" | tr '[:upper:] ' '[:lower:]_')
  id=$(upsert_device "light.${slug}" "$room Light" "light" "$room" "$LIGHT_CAPS")
  echo "  $room light -> $id"
done

echo "== AC units (interior rooms) =="
AC_CAPS='[{"capability":"power"},{"capability":"temperature","unit":"celsius"},{"capability":"mode"},{"capability":"fan_speed"}]'
for room in "Majlis" "Living Room" "Master Bedroom" "Bedroom 2" "Bedroom 3" "Kitchen"; do
  slug=$(echo "$room" | tr '[:upper:] ' '[:lower:]_')
  id=$(upsert_device "climate.${slug}" "$room AC" "hvac" "$room" "$AC_CAPS")
  echo "  $room AC -> $id"
done

echo "== Doors / gate =="
GARAGE_DOOR_ID=$(upsert_device "cover.garage_door" "Garage Door" "garage_door" "Garage" '[{"capability":"position"}]')
GATE_ID=$(upsert_device "cover.exterior_gate" "External Gate" "gate" "Exterior" '[{"capability":"position"}]')
MAIN_DOOR_ID=$(upsert_device "lock.main_entrance" "Main Entrance Door" "door" "Living Room" '[{"capability":"lock"}]')
echo "  garage_door=$GARAGE_DOOR_ID gate=$GATE_ID main_door=$MAIN_DOOR_ID"

echo "== Cameras (demo feed) =="
CAMERA_CAPS='[{"capability":"stream"}]'
CAM_ENTRANCE_ID=$(upsert_device "camera.main_entrance" "Main Entrance Camera" "camera" "Living Room" "$CAMERA_CAPS")
CAM_GARAGE_ID=$(upsert_device "camera.garage" "Garage Camera" "camera" "Garage" "$CAMERA_CAPS")
CAM_EXTERIOR_ID=$(upsert_device "camera.exterior" "Exterior Camera" "camera" "Exterior" "$CAMERA_CAPS")
CAM_MAJLIS_ID=$(upsert_device "camera.majlis" "Majlis Camera" "camera" "Majlis" "$CAMERA_CAPS")
echo "  entrance=$CAM_ENTRANCE_ID garage=$CAM_GARAGE_ID exterior=$CAM_EXTERIOR_ID majlis=$CAM_MAJLIS_ID"

echo "== Collecting AC device ids for the day/night automation =="
DEVICES=$(curl -s "$API_URL/v1/organizations/$ORG/devices" -H "Authorization: Bearer $TOKEN")
AC_IDS=$(echo "$DEVICES" | node -e "process.stdin.on('data',d=>{const a=JSON.parse(d).filter(x=>x.type==='hvac').map(x=>x.id);console.log(JSON.stringify(a))})")
LIGHT_IDS=$(echo "$DEVICES" | node -e "process.stdin.on('data',d=>{const a=JSON.parse(d).filter(x=>x.type==='light').map(x=>x.id);console.log(JSON.stringify(a))})")

DAY_ACTIONS=$(node -e "
const acs=$AC_IDS, lights=$LIGHT_IDS;
const actions=[
  ...acs.map(id=>({deviceId:id,capability:'temperature',action:'set',value:25})),
  ...lights.map(id=>({deviceId:id,capability:'power',action:'set',value:false})),
];
console.log(JSON.stringify(actions));
")
NIGHT_ACTIONS=$(node -e "
const acs=$AC_IDS, lights=$LIGHT_IDS;
const actions=[
  ...acs.map(id=>({deviceId:id,capability:'temperature',action:'set',value:23})),
  ...lights.map(id=>({deviceId:id,capability:'power',action:'set',value:true})),
  ...lights.map(id=>({deviceId:id,capability:'brightness',action:'set',value:60})),
];
console.log(JSON.stringify(actions));
")

echo "== Creating day/night automation =="
AUTOMATION_RES=$(curl -s -X POST "$API_URL/v1/organizations/$ORG/automations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Villa day/night\",\"definition\":{\"type\":\"day_night\",\"dayStart\":\"06:00\",\"nightStart\":\"19:00\",\"dayActions\":$DAY_ACTIONS,\"nightActions\":$NIGHT_ACTIONS}}")
echo "$AUTOMATION_RES"

echo "== Done. Refresh the dashboard. =="
