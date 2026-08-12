import { CommandMessage } from '@syltra/mqtt-contracts';
import { config } from './config';
import { logger } from './logger';
import { HaClient } from './ha-client';
import { CloudClient } from './cloud-client';
import { runDiscovery } from './discovery';
import { translateState } from './state-translator';
import { isSupportedDomain, mapCommandToHaService } from './capability-mapper';

async function handleCommand(haClient: HaClient, cloudClient: CloudClient, command: CommandMessage): Promise<void> {
  logger.info(`Executing command ${command.command_id} on ${command.device_external_ref}`);
  cloudClient.publishEvent({
    type: 'CommandRequested',
    correlation_id: command.correlation_id,
    payload: { device_external_ref: command.device_external_ref, capability: command.capability },
  });

  try {
    const { domain, service, serviceData } = mapCommandToHaService(
      command.device_external_ref,
      command.capability,
      command.action,
      command.value,
    );
    await haClient.callService(domain, service, serviceData);
    cloudClient.publishEvent({ type: 'CommandExecuted', correlation_id: command.correlation_id });
  } catch (err) {
    logger.error(`Command ${command.command_id} failed: ${(err as Error).message}`);
    cloudClient.publishEvent({
      type: 'CommandFailed',
      correlation_id: command.correlation_id,
      error: (err as Error).message,
    });
  }
}

async function main(): Promise<void> {
  logger.info(`SYLTRA Edge Agent starting for hub ${config.cloud.hubId}`);

  const haClient = new HaClient();
  const cloudClient = new CloudClient();

  cloudClient.connectMqtt((payload) => {
    void handleCommand(haClient, cloudClient, payload);
  });

  haClient.onStateChange((event) => {
    if (!event.new_state || !isSupportedDomain(event.entity_id)) return;
    const values = translateState(event.new_state);
    for (const { capability, value, unit } of values) {
      cloudClient.publishState({
        device_external_ref: event.entity_id,
        capability,
        value,
        unit,
        quality: 'valid',
      });
    }
  });

  haClient.connectWebSocket();

  const runDiscoveryOnce = () =>
    runDiscovery(haClient, cloudClient).catch((err) => logger.error(`Discovery failed: ${err.message}`));

  // Initial discovery once HA has had a moment to accept connections; then on an interval.
  setTimeout(runDiscoveryOnce, 3000);
  setInterval(runDiscoveryOnce, config.discoveryIntervalMs);

  setInterval(() => {
    cloudClient.sendHeartbeat().catch((err) => logger.error(`Heartbeat failed: ${err.message}`));
    cloudClient.publishHealth({ online: true, timestamp: new Date().toISOString() });
  }, config.heartbeatIntervalMs);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down');
    haClient.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal error: ${(err as Error).message}`);
  process.exit(1);
});
