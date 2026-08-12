# SYLTRA Edge Agent

Bridges a SYLTRA Hub, a local Home Assistant instance, and SYLTRA Cloud over MQTT. The cloud never talks to Home Assistant directly — this agent is the only thing that does (see the golden rule in the root build prompt, section 03/18).

## Responsibilities

- Discovers Home Assistant entities and registers them as SYLTRA devices (idempotent).
- Subscribes to Home Assistant state changes and forwards them to SYLTRA Cloud as normalized capability values.
- Subscribes to commands from SYLTRA Cloud and executes them against Home Assistant, reporting success/failure back.
- Sends periodic heartbeats and health reports.
- Queues outgoing MQTT messages in memory while disconnected and flushes them on reconnect (see `src/offline-queue.ts` for the MVP limitation: memory-only, not yet persisted to disk).

## Setup

1. Register a hub from the cloud API (as an authenticated org member):
   ```bash
   curl -X POST http://localhost:3000/v1/organizations/<organizationId>/hubs \
     -H "Authorization: Bearer <accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"name": "Villa 01 Hub"}'
   ```
   This returns `{ hub: { id, ... }, pairingToken }`.

2. Copy `.env.example` to `.env` and fill in `SYLTRA_TENANT_ID` (the organization id), `SYLTRA_HUB_ID` (the hub id), `SYLTRA_HUB_TOKEN` (the pairing token), and your Home Assistant URL + long-lived access token.

3. Run:
   ```bash
   npm install
   npm run start:dev
   ```

## Home Assistant test environment

Don't point this at real devices first. Run Home Assistant in Docker with demo/virtual entities and verify discovery, state sync, and command execution end-to-end before connecting real hardware (section 42).

## Supported domains (MVP)

`climate`, `light`, `switch`, `sensor`, `binary_sensor` — see `src/capability-mapper.ts`. Extending to more domains means adding an entry there and a matching case in `src/state-translator.ts`.
