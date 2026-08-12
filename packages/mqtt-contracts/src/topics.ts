// MQTT topic namespace (section 43). No sensitive data goes in topic names.
export const MqttTopics = {
  events: (tenantId: string, hubId: string) => `syltra/${tenantId}/hubs/${hubId}/events`,
  commands: (tenantId: string, hubId: string) => `syltra/${tenantId}/hubs/${hubId}/commands`,
  state: (tenantId: string, hubId: string) => `syltra/${tenantId}/hubs/${hubId}/state`,
  health: (tenantId: string, hubId: string) => `syltra/${tenantId}/hubs/${hubId}/health`,

  eventsWildcard: 'syltra/+/hubs/+/events',
  stateWildcard: 'syltra/+/hubs/+/state',
  healthWildcard: 'syltra/+/hubs/+/health',
} as const;

export function parseHubTopic(topic: string): { tenantId: string; hubId: string; channel: string } | undefined {
  const match = topic.match(/^syltra\/([^/]+)\/hubs\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return undefined;
  }
  const [, tenantId, hubId, channel] = match;
  return { tenantId, hubId, channel };
}
