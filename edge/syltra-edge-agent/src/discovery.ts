import { HaClient } from './ha-client';
import { CloudClient } from './cloud-client';
import { isSupportedDomain, mapEntityToDevice } from './capability-mapper';
import { logger } from './logger';

// Hub Registration -> Connect HA -> Discover Entities -> Normalize -> Map Capabilities
// -> Create SYLTRA Devices -> Sync State (section 19). Re-running this is safe: the
// cloud's device upsert is idempotent on (hub_id, external_ref).
export async function runDiscovery(haClient: HaClient, cloudClient: CloudClient): Promise<void> {
  const states = await haClient.getStates();
  const supported = states.filter((s) => isSupportedDomain(s.entity_id));

  logger.info(`Discovery: ${states.length} HA entities, ${supported.length} supported by SYLTRA capability model`);

  for (const state of supported) {
    const mapping = mapEntityToDevice(state.entity_id);
    if (!mapping) continue;

    try {
      await cloudClient.upsertDevice({
        externalRef: state.entity_id,
        name: (state.attributes.friendly_name as string) ?? state.entity_id,
        type: mapping.type,
        capabilities: mapping.capabilities,
      });
    } catch (err) {
      logger.error(`Failed to upsert device for ${state.entity_id}: ${(err as Error).message}`);
    }
  }
}
