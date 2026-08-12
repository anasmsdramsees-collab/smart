/**
 * Demo mode lets the dashboard run with no backend, which is what makes a
 * static Vercel deploy of `apps/admin` usable as a showcase.
 *
 * Most of the dashboard already renders from local state — the house map,
 * device cards, scenes, notifications and quick actions never call the API. Only
 * three things do: sign-in, the organization lookup, and the Adaptive panel.
 * Those are the only places that branch on `isDemo()`.
 *
 * Enabled by setting NEXT_PUBLIC_DEMO_MODE=1 at build time. It is off by
 * default, so a normal deployment still talks to the real API.
 */
export const isDemo = (): boolean => process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export const DEMO_ORG_ID = 'demo-organization';

export type DemoGoal = {
  id: string;
  objective: 'comfort' | 'energy_saving' | 'security' | 'sleep' | 'custom';
  name?: string;
  roomId?: string;
  constraints: { type: string; value: number | boolean }[];
  priority: number;
  activeFrom?: string;
  activeTo?: string;
  status: 'active' | 'satisfied' | 'abandoned';
};

export const DEMO_ROOMS = [
  { id: 'room-living', name: 'Living room' },
  { id: 'room-bedroom', name: 'Bedroom' },
  { id: 'room-kitchen', name: 'Kitchen' },
  { id: 'room-study', name: 'Study' },
];

/** Seeded so the Adaptive panel has something to show on a cold open. */
export const DEMO_GOALS: DemoGoal[] = [
  {
    id: 'demo-goal-sleep',
    objective: 'sleep',
    roomId: 'room-bedroom',
    constraints: [
      { type: 'temperature_min', value: 20 },
      { type: 'temperature_max', value: 22 },
    ],
    priority: 60,
    activeFrom: '22:00',
    activeTo: '07:00',
    status: 'active',
  },
  {
    id: 'demo-goal-energy',
    objective: 'energy_saving',
    roomId: 'room-living',
    constraints: [{ type: 'temperature_max', value: 26 }],
    priority: 30,
    status: 'active',
  },
  {
    id: 'demo-goal-custom',
    objective: 'custom',
    name: 'Keep the study quiet after 9pm',
    roomId: 'room-study',
    constraints: [
      { type: 'lights_off', value: true },
      { type: 'blinds_position', value: 0 },
    ],
    priority: 40,
    activeFrom: '21:00',
    activeTo: '07:00',
    status: 'active',
  },
];
