'use client';

export const dynamic = 'force-dynamic';

import { Fragment, useEffect, useState } from 'react';
import Image from 'next/image';
import { apiFetch, clearToken } from '@/lib/api';
import {
  Home, Lightbulb, Wind, Blinds, Lock, Camera, Sparkles, Cpu, BarChart3, Bell, Settings,
  Search, MessageSquare, Play, Plus, ArrowLeft, Thermometer, Leaf, Zap, ShieldCheck,
  Sun, Moon, Clapperboard, Plane, CloudSun, Video, Car, Droplets, Tv, LogOut, Sparkle,
} from 'lucide-react';
import HouseMap from './HouseMap';
import AdaptivePanel from './AdaptivePanel';
import { LocaleToggle, useI18n } from '@/components/locale-provider';
import type { Dict } from '@/lib/i18n';

/* ── Shell primitives ─────────────────────────────────────────────────── */

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/[0.07] bg-[#0b1018] ${className}`}>
      {children}
    </section>
  );
}

function PanelHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 pb-3 pt-4">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
        <span className="h-4 w-1 rounded-full bg-[#2b7eff]" />
        {title}
      </h2>
      {action}
    </header>
  );
}

/** iOS-style pill switch used across every device card. */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-[#2b7eff]' : 'bg-[#2a3243]'}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'right-0.5' : 'right-[22px]'}`}
      />
    </button>
  );
}

function Slider({ value }: { value: number }) {
  return (
    <div className="relative h-1.5 w-full rounded-full bg-[#1c2434]">
      <div className="absolute inset-y-0 start-0 rounded-full bg-[#2b7eff]" style={{ width: `${value}%` }} />
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#2b7eff] bg-white"
        style={{ insetInlineStart: `${value}%`, marginInlineStart: '-7px' }}
      />
    </div>
  );
}

function DeviceShell({
  icon, title, subtitle, control, children,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  control?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-[#0d131d] p-4 transition hover:border-white/15">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-[#9fb6d6]">{icon}</span>
          <div>
            <div className="text-[13px] font-bold leading-tight text-white">{title}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-[#6c7a90]">{subtitle}</div>
          </div>
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

/* ── Static content ───────────────────────────────────────────────────── */

const NAV = [
  { id: 'home', Icon: Home },
  { id: 'light', Icon: Lightbulb },
  { id: 'climate', Icon: Wind },
  { id: 'blinds', Icon: Blinds },
  { id: 'locks', Icon: Lock },
  { id: 'cameras', Icon: Camera },
  { id: 'scenes', Icon: Sparkles },
  { id: 'adaptive', Icon: Sparkle },
  { id: 'devices', Icon: Cpu },
  { id: 'usage', Icon: BarChart3 },
  { id: 'alerts', Icon: Bell },
  { id: 'settings', Icon: Settings },
] as const;

const statusPills = (t: Dict) => [
  { label: t.status.temperature, value: '23°C', Icon: Thermometer, tint: 'text-[#4c8dff]' },
  { label: t.status.airQuality, value: t.status.airQualityValue, Icon: Leaf, tint: 'text-[#22c55e]' },
  { label: t.status.power, value: '2.45 kW', Icon: Zap, tint: 'text-[#f59e0b]' },
  { label: t.status.security, value: t.status.securityValue, Icon: ShieldCheck, tint: 'text-[#4c8dff]' },
];

const sceneList = (t: Dict) => [
  { id: 's1', name: t.scenes.morning, desc: t.scenes.morningDesc, Icon: Sun, tint: 'text-[#f59e0b]' },
  { id: 's2', name: t.scenes.night, desc: t.scenes.nightDesc, Icon: Moon, tint: 'text-[#8b9dff]' },
  { id: 's3', name: t.scenes.movie, desc: t.scenes.movieDesc, Icon: Clapperboard, tint: 'text-[#e879f9]' },
  { id: 's4', name: t.scenes.away, desc: t.scenes.awayDesc, Icon: Plane, tint: 'text-[#38bdf8]' },
];

const alertList = (t: Dict) => [
  { id: 'a1', text: t.alerts.doorLocked, time: t.alerts.now, Icon: Lock, tint: 'text-[#f59e0b]' },
  { id: 'a2', text: t.alerts.motion, time: t.alerts.minutes2, Icon: Video, tint: 'text-[#ef4444]' },
  { id: 'a3', text: t.alerts.highPower, time: t.alerts.minutes15, Icon: Zap, tint: 'text-[#f59e0b]' },
];



/** 24 sampled readings → the sparkline in the power card. */
const POWER = [1.7, 1.9, 1.8, 2.2, 2.6, 2.3, 2.1, 2.5, 2.9, 3.2, 2.8, 2.4, 2.2, 2.6, 3.0, 3.4, 3.1, 2.7, 2.5, 2.9, 3.3, 2.8, 2.5, 2.45];

function Sparkline() {
  const w = 200;
  const h = 46;
  const min = Math.min(...POWER);
  const max = Math.max(...POWER);
  const pts = POWER.map((v, i) => {
    const x = (i / (POWER.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b7eff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#2b7eff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="url(#spark)" />
      <polyline points={pts.join(' ')} fill="none" stroke="#4c8dff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('home');
  const [livingLight, setLivingLight] = useState(true);
  const [ac, setAc] = useState(true);
  const [acTemp, setAcTemp] = useState(22);
  const [curtains, setCurtains] = useState(true);
  const [cameras, setCameras] = useState(true);
  const [leak, setLeak] = useState(true);
  const [locked, setLocked] = useState(true);
  const [garage, setGarage] = useState(false);
  const [listening, setListening] = useState(false);
  const [orgId, setOrgId] = useState('');

  useEffect(() => {
    apiFetch<{ id: string }[]>('/v1/organizations')
      .then((orgs) => setOrgId(orgs[0]?.id ?? ''))
      .catch((err) => console.error('Failed to load organizations:', err))
      .finally(() => setLoading(false));
  }, []);

  const STATUS = statusPills(t);
  const SCENES = sceneList(t);
  const ALERTS = alertList(t);
  const SHORTCUTS = [
    { id: 'q1', label: t.shortcuts.closeBlinds, Icon: Blinds, run: () => setCurtains(false) },
    { id: 'q2', label: t.shortcuts.lightsOff, Icon: Lightbulb, run: () => setLivingLight(false) },
    { id: 'q3', label: t.shortcuts.acOff, Icon: Wind, run: () => setAc(false) },
    { id: 'q4', label: t.shortcuts.lockDoors, Icon: Lock, run: () => setLocked(true) },
  ];

  function handleLogout() {
    clearToken();
    window.location.href = '/';
  }

  /* Each sidebar entry maps to a slice of the same device set — the cards are
     defined once and filtered, so a device behaves identically wherever it is
     shown. Values are local state for now; wiring them to /v1/.../devices is
     the next step. */
  const deviceCards: { id: string; cat: string; el: React.ReactNode }[] = [
  {
    cat: 'light',
    el: (
                    <DeviceShell
                      icon={<Lightbulb size={18} />}
                      title={t.devices.livingLight}
                      subtitle={t.devices.livingLightSub}
                      control={<Toggle on={livingLight} onChange={() => setLivingLight((v) => !v)} />}
                    >
                      <div className="mt-auto space-y-2 pt-3">
                        <Slider value={livingLight ? 70 : 0} />
                        <div className="text-[11px] text-[#6c7a90]">{livingLight ? '70%' : '0%'}</div>
                      </div>
                    </DeviceShell>
    ),
  },
  {
    cat: 'climate',
    el: (
                    <DeviceShell
                      icon={<Wind size={18} />}
                      title={t.devices.mainAc}
                      subtitle={t.devices.mainAcSub}
                      control={<Toggle on={ac} onChange={() => setAc((v) => !v)} />}
                    >
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <button
                          onClick={() => setAcTemp((t) => Math.max(16, t - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a2333] text-[#9fb6d6] transition hover:bg-[#22304a] hover:text-white"
                        >
                          −
                        </button>
                        <div className="text-center">
                          <div className="text-[26px] font-bold leading-none">{acTemp}°C</div>
                          <div className="mt-1 text-[10px] text-[#6c7a90]">{t.devices.cooling}</div>
                        </div>
                        <button
                          onClick={() => setAcTemp((t) => Math.min(30, t + 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a2333] text-[#9fb6d6] transition hover:bg-[#22304a] hover:text-white"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </DeviceShell>
    ),
  },
  {
    cat: 'blinds',
    el: (
                    <DeviceShell
                      icon={<Blinds size={18} />}
                      title={t.devices.livingBlinds}
                      subtitle={t.devices.livingBlindsSub}
                      control={<Toggle on={curtains} onChange={() => setCurtains((v) => !v)} />}
                    >
                      <div className="mt-auto space-y-2 pt-3">
                        <Slider value={curtains ? 60 : 0} />
                        <div className="text-[11px] text-[#6c7a90]">{curtains ? '60%' : t.devices.blindsClosed}</div>
                      </div>
                    </DeviceShell>
    ),
  },
  {
    cat: 'locks',
    el: (
                    <DeviceShell
                      icon={<Lock size={18} />}
                      title={t.devices.frontDoor}
                      subtitle={locked ? t.devices.locked : t.devices.unlocked}
                    >
                      <button
                        onClick={() => setLocked((v) => !v)}
                        className="mt-auto w-full rounded-lg border border-[#2b7eff]/40 bg-[#2b7eff]/10 py-2 text-[12px] font-semibold text-[#4c8dff] transition hover:bg-[#2b7eff]/20"
                      >
                        {locked ? t.devices.unlock : t.devices.lock}
                      </button>
                    </DeviceShell>
    ),
  },
  {
    cat: 'cameras',
    el: (
                    <DeviceShell
                      icon={<Camera size={18} />}
                      title={t.devices.securityCameras}
                      subtitle={t.devices.cameraCount}
                      control={<Toggle on={cameras} onChange={() => setCameras((v) => !v)} />}
                    >
                      <div className="mt-auto space-y-2 pt-1">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-9 flex-1 rounded border border-white/10 bg-gradient-to-br from-[#16283e] to-[#0d1522]"
                            />
                          ))}
                        </div>
                        <button className="w-full rounded-lg bg-white/[0.05] py-1.5 text-[11px] font-semibold text-[#9fb6d6] transition hover:bg-white/10 hover:text-white">
                          {t.devices.viewAll}
                        </button>
                      </div>
                    </DeviceShell>
    ),
  },
  {
    cat: 'devices',
    el: (
                    <DeviceShell
                      icon={<Car size={18} />}
                      title={t.devices.garage}
                      subtitle={garage ? t.devices.garageOpen : t.devices.garageClosed}
                    >
                      <button
                        onClick={() => setGarage((v) => !v)}
                        className="mt-auto w-full rounded-lg border border-[#2b7eff]/40 bg-[#2b7eff]/10 py-2 text-[12px] font-semibold text-[#4c8dff] transition hover:bg-[#2b7eff]/20"
                      >
                        {garage ? t.devices.closeGarage : t.devices.openGarage}
                      </button>
                    </DeviceShell>
    ),
  },
  {
    cat: 'devices',
    el: (
                    <DeviceShell
                      icon={<Droplets size={18} />}
                      title={t.devices.leak}
                      subtitle={t.devices.leakSub}
                      control={<Toggle on={leak} onChange={() => setLeak((v) => !v)} />}
                    >
                      <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-[#22c55e]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                        {t.devices.leakOk}
                      </div>
                    </DeviceShell>
    ),
  },
  {
    cat: 'usage',
    el: (
                    <DeviceShell icon={<Zap size={18} />} title={t.devices.power} subtitle="2.45 kW">
                      <div className="mt-auto pt-1">
                        <Sparkline />
                        <div className="mt-1 text-[11px] text-[#6c7a90]">{t.devices.today}</div>
                      </div>
                    </DeviceShell>
    ),
  },
  ].map((c, i) => ({ ...c, id: `${c.cat}-${i}` }));

  const CARD_VIEWS = ['home', 'devices', 'light', 'climate', 'blinds', 'locks', 'cameras'];
  const visibleCards = !CARD_VIEWS.includes(active)
    ? []
    : active === 'home' || active === 'devices'
      ? deviceCards
      : deviceCards.filter((c) => c.cat === active);

  const VIEW_TITLE: Record<string, string> = {
    home: t.devices.title,
    devices: t.views.devices,
    light: t.views.lighting,
    climate: t.views.climate,
    blinds: t.views.blinds,
    locks: t.views.locks,
    cameras: t.views.cameras,
  };

  const activeCount = [livingLight, ac, curtains, cameras, leak, locked, garage].filter(Boolean).length;

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-screen items-center justify-center bg-[#05080f] text-[#7c8ba1]">
        {t.shell.loading}
      </div>
    );
  }

  return (
    /* The shell is LTR so the sidebar sits on the left exactly as in the
       reference design; every text-bearing block below re-enters RTL. */
    <div dir="ltr" className="ui-reset relative flex h-screen overflow-hidden bg-[#05080f] text-white">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside dir={dir} className="flex w-[236px] shrink-0 flex-col border-l border-white/[0.07] bg-[#0b1018] p-4">
        <div className="mb-6 px-1 pt-1">
          <Image
            src="/syltra-wordmark.png"
            alt="SYLTRA"
            width={1158}
            height={500}
            priority
            className="w-full"
          />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                active === id
                  ? 'border border-[#2b7eff]/40 bg-[#2b7eff]/10 text-[#4c8dff]'
                  : 'text-[#8b98ab] hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icon size={18} />
              {t.nav[id]}
            </button>
          ))}
        </nav>

        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <div className="flex items-center gap-2.5 px-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <div>
              <div className="text-[12px] font-bold leading-tight">{t.shell.hub}</div>
              <div className="text-[10px] leading-tight text-[#22c55e]">{t.shell.connected}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
            <CloudSun size={26} className="text-[#9fb6d6]" />
            <div>
              <div className="text-[10px] leading-tight text-[#6c7a90]">{t.shell.city}</div>
              <div className="text-[19px] font-bold leading-tight">23°C</div>
              <div className="text-[10px] leading-tight text-[#6c7a90]">{t.shell.weather}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="flex shrink-0 items-center gap-5 px-6 py-4">
          <div dir={dir} className="shrink-0">
            <h1 className="text-[21px] font-black leading-tight">{t.shell.greeting} 👋</h1>
            <p className="text-[12px] text-[#6c7a90]">{t.shell.tagline}</p>
          </div>

          <div dir={dir} className="flex flex-1 flex-wrap justify-center gap-2.5">
            {STATUS.map(({ label, value, Icon, tint }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0b1018] px-3.5 py-2"
              >
                <div className="text-right">
                  <div className="text-[10px] leading-tight text-[#6c7a90]">{label}</div>
                  <div className="text-[13px] font-bold leading-tight">{value}</div>
                </div>
                <Icon size={17} className={tint} />
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <LocaleToggle />
            <button className="rounded-lg p-2 text-[#8b98ab] transition hover:bg-white/[0.06] hover:text-white">
              <Search size={19} />
            </button>
            <button className="rounded-lg p-2 text-[#8b98ab] transition hover:bg-white/[0.06] hover:text-white">
              <MessageSquare size={19} />
            </button>
            <button className="relative rounded-lg p-2 text-[#8b98ab] transition hover:bg-white/[0.06] hover:text-white">
              <Bell size={19} />
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ef4444] text-[8px] font-bold text-white">
                3
              </span>
            </button>
            <button
              onClick={handleLogout}
              title={t.shell.signOut}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2b7eff] to-[#1a4fb0] transition hover:brightness-110"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* content grid */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_330px] gap-5 overflow-y-auto px-6 pb-28">
          {/* centre */}
          <div dir={dir} className="min-w-0 space-y-5">
            {active === 'home' && (
              <Panel>
                <PanelHead title={t.map.title} />
                <div className="px-4 pb-4">
                  <HouseMap />
                </div>
              </Panel>
            )}

            {active === 'scenes' && (
              <Panel className="pb-4">
                <PanelHead title={t.scenes.title} />
                <div className="grid grid-cols-1 gap-3 px-4 xl:grid-cols-2">
                  {SCENES.map(({ id, name, desc, Icon, tint }) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0d131d] p-4 transition hover:border-[#2b7eff]/40"
                    >
                      <Icon size={22} className={`shrink-0 ${tint}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold">{name}</div>
                        <div className="truncate text-[11px] text-[#6c7a90]">{desc}</div>
                      </div>
                      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b7eff] transition hover:brightness-110">
                        <Play size={14} className="fill-white text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {active === 'alerts' && (
              <Panel className="pb-4">
                <PanelHead title={t.alerts.title} />
                <div className="space-y-2 px-4">
                  {ALERTS.map(({ id, text, time, Icon, tint }) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0d131d] p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold leading-tight">{text}</div>
                        <div className="mt-0.5 text-[11px] leading-tight text-[#6c7a90]">{time}</div>
                      </div>
                      <Icon size={18} className={`shrink-0 ${tint}`} />
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {active === 'adaptive' && <AdaptivePanel organizationId={orgId} />}

            {active === 'usage' && (
              <Panel className="pb-5">
                <PanelHead title={t.views.usage} />
                <div className="px-5">
                  <div className="text-[34px] font-bold leading-none text-[#4c8dff]">2.45 kW</div>
                  <div className="mb-4 mt-1 text-[11px] text-[#6c7a90]">{t.devices.today}</div>
                  <Sparkline />
                </div>
              </Panel>
            )}

            {active === 'settings' && (
              <Panel className="pb-6">
                <PanelHead title={t.views.settings} />
                <p className="px-5 text-[12px] leading-relaxed text-[#6c7a90]">
                  {t.views.settingsSoon}
                </p>
              </Panel>
            )}

            {visibleCards.length > 0 && (
              <Panel>
                <PanelHead
                  title={VIEW_TITLE[active] ?? t.devices.title}
                  action={
                    <span className="text-[11px] text-[#6c7a90]">
                      {activeCount} {t.views.activeCount}
                    </span>
                  }
                />
                <div className="grid grid-cols-2 gap-3 px-4 pb-4 xl:grid-cols-4">
                  {visibleCards.map((card) => (
                    <Fragment key={card.id}>{card.el}</Fragment>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* right rail */}
          <div dir={dir} className="space-y-5">
            {active !== 'scenes' && (
            <Panel>
              <PanelHead
                title={t.scenes.title}
                action={
                  <button className="rounded-lg p-1 text-[#8b98ab] transition hover:bg-white/[0.06] hover:text-white">
                    <Plus size={17} />
                  </button>
                }
              />
              <div className="space-y-2 px-4 pb-2">
                {SCENES.map(({ id, name, desc, Icon, tint }) => (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0d131d] p-3 transition hover:border-[#2b7eff]/40"
                  >
                    <Icon size={20} className={`shrink-0 ${tint}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-bold leading-tight">{name}</div>
                      <div className="truncate text-[10px] leading-tight text-[#6c7a90]">{desc}</div>
                    </div>
                    <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2b7eff] transition hover:brightness-110">
                      <Play size={13} className="fill-white text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActive('scenes')}
                className="flex w-full items-center justify-between px-5 py-3 text-[12px] font-semibold text-[#8b98ab] transition hover:text-white"
              >
                {t.scenes.viewAll}
                <ArrowLeft size={15} className="rtl:rotate-180" />
              </button>
            </Panel>
            )}

            {active !== 'alerts' && (
            <Panel>
              <PanelHead title={t.alerts.title} />
              <div className="space-y-2 px-4 pb-2">
                {ALERTS.map(({ id, text, time, Icon, tint }) => (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0d131d] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold leading-tight">{text}</div>
                      <div className="mt-0.5 text-[10px] leading-tight text-[#6c7a90]">{time}</div>
                    </div>
                    <Icon size={17} className={`shrink-0 ${tint}`} />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActive('alerts')}
                className="flex w-full items-center justify-between px-5 py-3 text-[12px] font-semibold text-[#8b98ab] transition hover:text-white"
              >
                {t.alerts.viewAll}
                <ArrowLeft size={15} className="rtl:rotate-180" />
              </button>
            </Panel>
            )}

            <Panel className="pb-4">
              <PanelHead title={t.shortcuts.title} />
              <div className="grid grid-cols-2 gap-2.5 px-4">
                {SHORTCUTS.map(({ id, label, Icon, run }) => (
                  <button
                    key={id}
                    onClick={run}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#0d131d] px-3 py-3 text-[11px] font-semibold text-[#c7ccd3] transition hover:border-[#2b7eff]/40 hover:text-white"
                  >
                    <Icon size={16} className="shrink-0 text-[#9fb6d6]" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* ── Floating bottom bar ──────────────────────────────────── */}
      <div dir={dir} className="pointer-events-none absolute bottom-5 left-0 right-[236px] flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-[#0b1018]/95 px-3 py-2 shadow-2xl backdrop-blur">
          <button
            onClick={() => setActive('home')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
              active === 'home' ? 'bg-[#2b7eff]/15 text-[#4c8dff]' : 'text-[#8b98ab] hover:text-white'
            }`}
          >
            <Home size={18} />
            {t.nav.home}
          </button>
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold text-[#8b98ab] transition hover:text-white">
            <Tv size={18} />
            {t.shell.tv}
          </button>
          {/* SILA. The brand sheet defines four interaction states; idle and
              listening are wired here, thinking/responding land with the
              /v1/sila round trip. */}
          <button
            onClick={() => setListening((v) => !v)}
            title={t.shell.sila}
            aria-pressed={listening}
            className="group/sila mx-1 -translate-y-3 flex flex-col items-center"
          >
            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ring-4 ring-[#05080f] transition ${
                listening
                  ? 'shadow-lg shadow-[#4fd1e6]/50'
                  : 'shadow-lg shadow-[#2b7eff]/30 group-hover/sila:brightness-110'
              }`}
            >
              {listening && (
                <span className="absolute inset-0 animate-ping rounded-2xl bg-[#4fd1e6]/30" />
              )}
              <Image
                src="/sila-icon.png"
                alt="SILA"
                width={512}
                height={512}
                className="relative h-full w-full rounded-2xl"
              />
            </span>
            <span
              className={`mt-1 text-[9px] font-bold tracking-[0.18em] transition ${
                listening ? 'text-[#4fd1e6]' : 'text-[#4c8dff]'
              }`}
            >
              SILA
            </span>
          </button>
          <button
            onClick={() => setActive('alerts')}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition ${
              active === 'alerts' ? 'bg-[#2b7eff]/15 text-[#4c8dff]' : 'text-[#8b98ab] hover:text-white'
            }`}
          >
            <Bell size={18} />
            {t.nav.alerts}
            <span className="absolute right-2 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ef4444] text-[8px] font-bold text-white">
              3
            </span>
          </button>
          <button
            onClick={() => setActive('settings')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition ${
              active === 'settings' ? 'bg-[#2b7eff]/15 text-[#4c8dff]' : 'text-[#8b98ab] hover:text-white'
            }`}
          >
            <Settings size={18} />
            {t.nav.settings}
          </button>
        </div>
      </div>
    </div>
  );
}
