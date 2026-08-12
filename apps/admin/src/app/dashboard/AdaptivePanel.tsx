'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Play, Pause, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/components/locale-provider';
import { DEMO_GOALS, DEMO_ROOMS, isDemo } from '@/lib/demo';

/* Mirrors services/api/src/adaptive/dto/create-goal.dto.ts. */
const OBJECTIVES = ['comfort', 'energy_saving', 'security', 'sleep', 'custom'] as const;
type Objective = (typeof OBJECTIVES)[number];

type Constraint = { type: string; value: number | boolean };

type Goal = {
  id: string;
  objective: Objective;
  name?: string;
  roomId?: string;
  constraints: Constraint[];
  priority: number;
  activeFrom?: string;
  activeTo?: string;
  status: 'active' | 'satisfied' | 'abandoned';
};

type Room = { id: string; name: string };

const STATUS_TINT: Record<Goal['status'], string> = {
  active: 'bg-[#22c55e]/15 text-[#22c55e]',
  satisfied: 'bg-[#2b7eff]/15 text-[#4c8dff]',
  abandoned: 'bg-white/5 text-[#6c7a90]',
};

export default function AdaptivePanel({ organizationId }: { organizationId: string }) {
  const { t } = useI18n();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);

  // draft goal
  const [objective, setObjective] = useState<Objective>('comfort');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [tempMin, setTempMin] = useState('22');
  const [tempMax, setTempMax] = useState('24');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');
  const [priority, setPriority] = useState('0');

  const load = useCallback(async () => {
    if (!organizationId) return;
    if (isDemo()) {
      // Seeded in-memory; creating and pausing below stay client-side too, so
      // the panel is fully interactive without a backend.
      setGoals((current) => (current.length ? current : [...DEMO_GOALS]));
      setRooms(DEMO_ROOMS);
      setLoading(false);
      return;
    }
    try {
      const [g, r] = await Promise.all([
        apiFetch<Goal[]>(`/v1/organizations/${organizationId}/adaptive/goals`),
        apiFetch<Room[]>(`/v1/organizations/${organizationId}/rooms`).catch(() => [] as Room[]),
      ]);
      setGoals(g);
      setRooms(r);
      setError(null);
    } catch {
      setError(t.adaptive.failed);
    } finally {
      setLoading(false);
    }
  }, [organizationId, t.adaptive.failed]);

  useEffect(() => {
    load();
  }, [load]);

  async function createGoal() {
    setSaving(true);
    try {
      const constraints: Constraint[] = [];
      // Temperature is the one constraint the resident tunes directly; every
      // other constraint comes from the objective's defaults on the server.
      if (objective === 'comfort' || objective === 'sleep' || objective === 'custom') {
        if (tempMin) constraints.push({ type: 'temperature_min', value: Number(tempMin) });
        if (tempMax) constraints.push({ type: 'temperature_max', value: Number(tempMax) });
      }

      if (isDemo()) {
        setGoals((gs) => [
          {
            id: `demo-${Date.now()}`,
            objective,
            name: name || undefined,
            roomId: roomId || undefined,
            constraints,
            priority: Number(priority) || 0,
            activeFrom: activeFrom || undefined,
            activeTo: activeTo || undefined,
            status: 'active',
          },
          ...gs,
        ]);
        setComposing(false);
        setName('');
        return;
      }

      await apiFetch(`/v1/organizations/${organizationId}/adaptive/goals`, {
        method: 'POST',
        body: JSON.stringify({
          objective,
          name: name || undefined,
          roomId: roomId || undefined,
          constraints,
          priority: Number(priority) || 0,
          activeFrom: activeFrom || undefined,
          activeTo: activeTo || undefined,
        }),
      });
      setComposing(false);
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adaptive.failed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleGoal(goal: Goal) {
    const next = goal.status === 'active' ? 'abandoned' : 'active';
    setGoals((gs) => gs.map((g) => (g.id === goal.id ? { ...g, status: next } : g)));
    if (isDemo()) return;
    try {
      await apiFetch(`/v1/organizations/${organizationId}/adaptive/goals/${goal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
    } catch {
      await load();
    }
  }

  const roomName = (id?: string) => rooms.find((r) => r.id === id)?.name ?? '—';

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0b1018]">
      <header className="flex items-start justify-between px-5 pb-3 pt-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
            <span className="h-4 w-1 rounded-full bg-[#2b7eff]" />
            {t.adaptive.title}
          </h2>
          <p className="mt-1 ps-3 text-[11px] text-[#6c7a90]">{t.adaptive.subtitle}</p>
        </div>
        <button
          onClick={() => setComposing((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-[#2b7eff]/40 bg-[#2b7eff]/10 px-3 py-1.5 text-[11px] font-semibold text-[#4c8dff] transition hover:bg-[#2b7eff]/20"
        >
          <Plus size={14} />
          {t.adaptive.newGoal}
        </button>
      </header>

      {composing && (
        <div className="mx-4 mb-4 rounded-xl border border-white/[0.07] bg-[#0d131d] p-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <label className="col-span-2 xl:col-span-3">
              <span className="mb-1 block text-[11px] text-[#6c7a90]">{t.adaptive.objective}</span>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o}
                    onClick={() => setObjective(o)}
                    className={`rounded-lg border px-2 py-2 text-start text-[11px] font-semibold transition ${
                      objective === o
                        ? 'border-[#2b7eff]/50 bg-[#2b7eff]/10 text-[#4c8dff]'
                        : 'border-white/[0.07] text-[#8b98ab] hover:border-white/20'
                    }`}
                  >
                    {t.adaptive.objectives[o]}
                    <span className="mt-0.5 block text-[9px] font-normal leading-tight text-[#6c7a90]">
                      {t.adaptive.objectiveHints[o]}
                    </span>
                  </button>
                ))}
              </div>
            </label>

            <label className="col-span-2 xl:col-span-3">
              <span className="mb-1 block text-[11px] text-[#6c7a90]">{t.adaptive.goalName}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.adaptive.goalNamePlaceholder}
                className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-3 py-2 text-[12px] text-white placeholder-[#4a566b] focus:border-[#2b7eff]/50 focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block text-[11px] text-[#6c7a90]">{t.adaptive.room}</span>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-3 py-2 text-[12px] text-white focus:border-[#2b7eff]/50 focus:outline-none"
              >
                <option value="">—</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            {(objective === 'comfort' || objective === 'sleep' || objective === 'custom') && (
              <>
                <label>
                  <span className="mb-1 block text-[11px] text-[#6c7a90]">
                    {t.adaptive.constraints.temperature_min}
                  </span>
                  <input
                    type="number"
                    value={tempMin}
                    onChange={(e) => setTempMin(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-3 py-2 text-[12px] text-white focus:border-[#2b7eff]/50 focus:outline-none"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] text-[#6c7a90]">
                    {t.adaptive.constraints.temperature_max}
                  </span>
                  <input
                    type="number"
                    value={tempMax}
                    onChange={(e) => setTempMax(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-3 py-2 text-[12px] text-white focus:border-[#2b7eff]/50 focus:outline-none"
                  />
                </label>
              </>
            )}

            <label>
              <span className="mb-1 block text-[11px] text-[#6c7a90]">{t.adaptive.window}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={activeFrom}
                  onChange={(e) => setActiveFrom(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-2 py-2 text-[12px] text-white focus:border-[#2b7eff]/50 focus:outline-none"
                />
                <input
                  type="time"
                  value={activeTo}
                  onChange={(e) => setActiveTo(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-2 py-2 text-[12px] text-white focus:border-[#2b7eff]/50 focus:outline-none"
                />
              </div>
            </label>

            <label>
              <span className="mb-1 block text-[11px] text-[#6c7a90]">{t.adaptive.priority}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-white/[0.07] bg-[#070c15] px-3 py-2 text-[12px] text-white focus:border-[#2b7eff]/50 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={createGoal}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#2b7eff] px-4 py-2 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t.adaptive.create}
            </button>
            <button
              onClick={() => setComposing(false)}
              className="rounded-lg px-4 py-2 text-[12px] font-semibold text-[#8b98ab] transition hover:text-white"
            >
              {t.adaptive.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 px-4 pb-4">
        {loading && (
          <div className="flex items-center gap-2 px-1 py-6 text-[12px] text-[#6c7a90]">
            <Loader2 size={14} className="animate-spin" />
            {t.shell.loading}
          </div>
        )}

        {!loading && error && <p className="px-1 py-4 text-[12px] text-[#ef4444]">{error}</p>}

        {!loading && !error && goals.length === 0 && (
          <p className="px-1 py-6 text-[12px] leading-relaxed text-[#6c7a90]">{t.adaptive.noGoals}</p>
        )}

        {goals.map((goal) => (
          <article
            key={goal.id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0d131d] p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold text-white">
                  {goal.name || t.adaptive.objectives[goal.objective]}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${STATUS_TINT[goal.status]}`}>
                  {t.adaptive.status[goal.status]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#6c7a90]">
                <span>{t.adaptive.objectives[goal.objective]}</span>
                <span>· {roomName(goal.roomId)}</span>
                <span>
                  ·{' '}
                  {goal.activeFrom && goal.activeTo
                    ? `${goal.activeFrom}–${goal.activeTo}`
                    : t.adaptive.allDay}
                </span>
                {goal.priority > 0 && (
                  <span>
                    · {t.adaptive.priority} {goal.priority}
                  </span>
                )}
              </div>
              {goal.constraints.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {goal.constraints.map((c, i) => (
                    <span
                      key={`${c.type}-${i}`}
                      className="rounded border border-white/[0.07] px-1.5 py-0.5 text-[9px] text-[#9fb6d6]"
                    >
                      {t.adaptive.constraints[c.type as keyof typeof t.adaptive.constraints] ?? c.type}
                      {typeof c.value === 'boolean' ? '' : `: ${c.value}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => toggleGoal(goal)}
              title={goal.status === 'active' ? t.adaptive.pause : t.adaptive.resume}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] text-[#9fb6d6] transition hover:border-[#2b7eff]/40 hover:text-[#4c8dff]"
            >
              {goal.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </article>
        ))}

        {!loading && goals.length > 0 && (
          <p className="px-1 pt-1 text-[10px] text-[#4a566b]">{t.adaptive.reconciling}</p>
        )}
      </div>
    </section>
  );
}
