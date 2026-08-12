# SYLTRA Platform

SYLTRA Cloud → SYLTRA Adaptive → SYLTRA Edge Agent → Home Assistant → Physical Devices.

This is the platform monorepo. See `docs/` and the build prompt in `../SYLTRA_CloudCodeMax_HomeAssistant_to_Hub_Build_Prompt.md` for the full architecture.

## Status: Stages 1-19 (software MVP)

All 19 stages from the build prompt have been implemented at MVP depth: cloud API, database schema, identity & multi-tenancy, device/capability model, MQTT infra, the SYLTRA Edge Agent, Home Assistant integration, discovery/state-sync/command execution, Adaptive Core with reconciliation, an admin dashboard, the installer flow (documented, see `docs/installer-flow.md`), the SILA intent API, security hardening, an E2E test suite, and the hardware integration contract.

**Verified live** (Docker Desktop installed and the full stack brought up for real): `docker compose up -d` builds and starts all four containers healthy, migrations run cleanly against real Postgres (26 tables, zero SQL errors), `/ready` reports all three dependencies `ok` from inside the running API container, the full E2E suite passes (9/9) against live Postgres/Redis/MQTT, and a manual live smoke test (register → JWT → create property) against the actual container succeeded. This live run caught and fixed three real bugs that no amount of lint/typecheck/unit-testing surfaced — see "Bugs only live testing caught" below.

**Still not run:** the Edge Agent against a real or virtual Home Assistant instance (needs a separate HA container/instance this environment doesn't have set up), and the Adaptive Core's reconciliation loop converging against a real sensor over time.

### Bugs only live testing caught

1. **DI wiring**: `TenantsModule` imported `AuthModule` but never re-exported it, so every module using `@UseGuards(JwtAuthGuard, TenantGuard)` transitively through `TenantsModule` (properties, buildings, rooms, hubs, devices, state, commands, adaptive — nearly the whole API) failed to boot with a "Nest can't resolve dependencies" error. `tsc` and `nest build` are both blind to this class of bug; only actually starting the app surfaces it. Fixed in `src/tenants/tenants.module.ts`.
2. **Docker build context**: the API and Edge Agent Dockerfiles predated the `@syltra/mqtt-contracts` shared package and didn't copy it into the build context, so `npm install` inside the container tried (and failed) to fetch it from the public npm registry. Fixed both Dockerfiles to build from the repo root and include the workspace package.
3. **Process never exits**: `AdaptiveService`'s reconciliation `setInterval` was never cleared, so the process (and therefore Jest, after `app.close()`) never exited cleanly — it just hung. Added `OnModuleDestroy` to clear the timer, plus `app.enableShutdownHooks()` in `main.ts` so `SIGTERM` triggers this in a real container too.

4. **API image never contained the app**: `services/api/Dockerfile` set `ENV NODE_ENV=production` *before* `npm install`, so npm omitted devDependencies — including `@nestjs/cli`. `nest build` then failed with exit 127 (`nest: not found`), leaving the image with no `dist/main.js`, and the container crash-looped on `Cannot find module '/app/services/api/dist/main.js'`. The failure was easy to miss because `docker compose up -d` happily starts the previous image when a rebuild fails. Rewritten as a multi-stage build: a builder stage with the full dependency tree (which also builds `@syltra/mqtt-contracts`, since the API imports it by its `main`/`types` entry points), and a runtime stage installed with `--omit=dev` that copies only the compiled output.
5. **No `.dockerignore`**: the build context was ~1 GB — host `node_modules` (built for darwin), every brand poster and product render, and a stale `services/api/dist` plus `tsconfig.tsbuildinfo` that could convince an incremental `nest build` its output was already current. Added a root `.dockerignore`; both service images build from the repo root so one file covers them.
6. **`CMD` missing `run`**: the API image ran `npm start:prod`, which npm rejects as an unknown command (`npm run start:prod` is the correct form).

Also fixed along the way: a pinned dependency resolved to the wrong major version (`typeorm` came back as `1.1.0`, a brand-new incompatible major, instead of the `0.3.x` line the code is written against — pinned explicitly), and hardcoded Docker Compose host ports now have env-var overrides (`POSTGRES_HOST_PORT`, etc.) since this machine already had unrelated Postgres/Redis/API processes on the default ports.

## Repository layout

```text
apps/            admin (implemented) — web, installer are placeholders (see docs/installer-flow.md)
services/        api (implemented) — the section 07 per-domain service split (identity, devices, etc.) lives inside services/api's modules for now rather than as separate deployables; splitting them out is a scaling step, not a Stage 1-19 requirement
edge/            syltra-edge-agent — implemented
integrations/    home-assistant — the Edge Agent talks to HA's own REST/WebSocket API directly (see edge/syltra-edge-agent/README.md); no separate custom HA component was built
packages/        mqtt-contracts (implemented: shared MQTT topics + wire-format types between api and edge-agent); capability-model, device-model, event-schema, command-schema, auth, shared remain placeholders
infrastructure/  Docker, Terraform, monitoring, environment configs
docs/            Architecture, installer flow, security checklist, hardware integration contract
tests/           Cross-service test suites (currently: services/api/test — see below)
```

## Prerequisites

- Node.js >= 20
- Docker + Docker Compose (for Postgres/Redis/MQTT/full stack)

## Setup

```bash
cp .env.example .env
npm install
```

## Run everything with Docker Compose

```bash
docker compose up -d
npm run migration:run --workspace=services/api
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

`docker compose up -d` starts PostgreSQL, Redis, Mosquitto (MQTT), and the API service. `depends_on` health checks make the API wait for Postgres and Redis before starting. Migrations are not run automatically — run them once after the first `up`.

## Run the API alone (without Docker)

```bash
npm run api:dev
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

By default this connects to `localhost` for Postgres/Redis/MQTT. Start just the infra containers if you want `/ready` to report `ok`:

```bash
docker compose up -d postgres redis mqtt
```

## Bring up the full device chain

1. `docker compose up -d` (Postgres, Redis, MQTT, API) then run migrations.
2. `npm run admin:dev` (or curl directly) — register a user/org, create a property/building/room, register a hub. Save the returned `pairingToken`.
3. Run Home Assistant separately (see `edge/syltra-edge-agent/README.md` — don't point at real devices first, use HA's demo/virtual entities).
4. Copy `edge/syltra-edge-agent/.env.example` to `.env`, fill in the pairing token + HA URL/token, then `npm run start:dev` inside `edge/syltra-edge-agent`.
5. Watch devices appear in the admin dashboard (`apps/admin`, `npm run admin:dev`) as the Edge Agent discovers HA entities.

## Health endpoints

- `GET /health` — liveness. Always `200 { status: "ok" }` if the process is running.
- `GET /live` — alias of `/health`.
- `GET /ready` — readiness. Checks Postgres, Redis, and MQTT connectivity. Returns `200` when all are reachable, `503` with a per-dependency breakdown otherwise.

## Test, lint, build

```bash
npm run api:test          # unit tests (no infra required)
npm run api:lint
npm run api:build
npm run test:e2e --workspace=services/api   # needs the full Docker stack + migrations run first
npm run admin:lint
npm run admin:build
```

The Edge Agent has its own `lint`/`build`/`test` scripts (`npm run test --workspace=edge/syltra-edge-agent`) — unit tests cover `capability-mapper.ts` and `state-translator.ts`, the pure-function core of the HA↔SYLTRA translation. The MQTT/WebSocket adapters around them are thin and untested; that's what the E2E suite and a real Home Assistant run are for.

## What to verify next

- [x] ~~Run `docker compose up -d` for real and confirm all four containers report healthy.~~ Done.
- [x] ~~Run migrations and the E2E suite against them.~~ Done — 9/9 passing.
- [ ] Run a real or demo Home Assistant instance and confirm the Edge Agent discovers entities, syncs state, and executes commands end-to-end.
- [ ] Confirm the Adaptive Core's reconciliation loop actually converges against a real (or simulated) temperature sensor over multiple cycles.

## Definition of done — Stage 1-19

See `docs/` for stage-specific detail: `docs/installer-flow.md`, `docs/security-checklist.md`, `docs/hardware-integration-contract.md`. Section 51 hardware readiness is documented but not build-tested against physical hardware — no SYLTRA hardware exists yet (section 51: "don't start manufacturing before Virtual Device E2E succeeds" — that E2E run, against *virtual* devices via the API, is now done; against a real Home Assistant instance it is still pending).
