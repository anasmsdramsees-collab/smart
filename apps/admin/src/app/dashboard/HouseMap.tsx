'use client';

import { useState } from 'react';
import { Bed, UtensilsCrossed, DoorOpen, Sofa, Trees, Video, Plus, Minus } from 'lucide-react';
import { useI18n } from '@/components/locale-provider';

/* ── Isometric projection ──────────────────────────────────────────────
   Plan coordinates (x → right/down-right, y → left/down-left) are projected
   into the 640×400 viewBox. Everything below — floors, walls, furniture and
   the room chips — is placed with these same three numbers so the overlay
   never drifts away from the geometry underneath it. */
const S = 30;
const OX = 281;
const OY = 45;

const px = (x: number, y: number) => (x - y) * 0.866 * S + OX;
const py = (x: number, y: number, z = 0) => ((x + y) * 0.5 - z) * S + OY;
const pt = (x: number, y: number, z = 0) => `${px(x, y)},${py(x, y, z)}`;

/** Top + two visible side faces of an extruded box. */
function Box({
  x, y, w, h, z0 = 0, z1 = 0.35, top, side,
}: {
  x: number; y: number; w: number; h: number;
  z0?: number; z1?: number; top: string; side: string;
}) {
  return (
    <g>
      {/* south face (+y) */}
      <polygon
        points={`${pt(x, y + h, z1)} ${pt(x + w, y + h, z1)} ${pt(x + w, y + h, z0)} ${pt(x, y + h, z0)}`}
        fill={side}
      />
      {/* east face (+x) */}
      <polygon
        points={`${pt(x + w, y, z1)} ${pt(x + w, y + h, z1)} ${pt(x + w, y + h, z0)} ${pt(x + w, y, z0)}`}
        fill={side}
        opacity={0.72}
      />
      {/* top */}
      <polygon
        points={`${pt(x, y, z1)} ${pt(x + w, y, z1)} ${pt(x + w, y + h, z1)} ${pt(x, y + h, z1)}`}
        fill={top}
      />
    </g>
  );
}

type Room = {
  id: string;
  labelKey: 'bedroom' | 'kitchen' | 'entrance' | 'living' | 'camerasRoom' | 'garden';
  /** Either a literal reading or a key looked up in the map dictionary. */
  value: string | 'closed' | 'cameraCount' | 'lightCount';
  Icon: typeof Bed;
  x: number; y: number; w: number; h: number;
  lit: boolean;
};

const ROOMS: Room[] = [
  { id: 'bedroom',  labelKey: 'bedroom',     value: '22°C',       Icon: Bed,             x: 0,   y: 0,   w: 4.5, h: 4,   lit: true },
  { id: 'kitchen',  labelKey: 'kitchen',     value: '23°C',       Icon: UtensilsCrossed, x: 4.5, y: 0,   w: 4,   h: 3.5, lit: true },
  { id: 'entrance', labelKey: 'entrance',    value: 'closed',     Icon: DoorOpen,        x: 8.5, y: 0,   w: 3.5, h: 3.5, lit: false },
  { id: 'living',   labelKey: 'living',      value: '22°C',       Icon: Sofa,            x: 0,   y: 4,   w: 4.5, h: 5,   lit: true },
  { id: 'hall',     labelKey: 'camerasRoom', value: 'cameraCount', Icon: Video,          x: 4.5, y: 3.5, w: 4,   h: 5.5, lit: false },
  { id: 'garden',   labelKey: 'garden',      value: 'lightCount',  Icon: Trees,          x: 8.5, y: 3.5, w: 3.5, h: 5.5, lit: true },
];

const INSET = 0.14;

export default function HouseMap() {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const reading = (v: Room['value']) =>
    v === 'closed' || v === 'cameraCount' || v === 'lightCount' ? t.map[v] : v;
  const [mode, setMode] = useState<'2D' | '3D'>('3D');

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#070c15]">
      {/* soft ambient wash behind the villa */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(43,126,255,0.20),transparent_62%)]" />

      <div
        className="relative mx-auto transition-transform duration-300"
        style={{ aspectRatio: '640 / 400', transform: `scale(${zoom})` }}
      >
        <svg viewBox="0 0 640 400" className="h-full w-full">
          <defs>
            <linearGradient id="hm-floor-lit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c3557" />
              <stop offset="100%" stopColor="#12233c" />
            </linearGradient>
            <linearGradient id="hm-floor-dim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#131c2c" />
              <stop offset="100%" stopColor="#0d1522" />
            </linearGradient>
            <linearGradient id="hm-pool" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ea9d8" />
              <stop offset="100%" stopColor="#1a6f9e" />
            </linearGradient>
            <filter id="hm-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ground slab, extruded downward so the villa has visible thickness */}
          <polygon
            points={`${pt(0, 9, -0.45)} ${pt(12, 9, -0.45)} ${pt(12, 9, 0)} ${pt(0, 9, 0)}`}
            fill="#070b12"
          />
          <polygon
            points={`${pt(12, 0, -0.45)} ${pt(12, 9, -0.45)} ${pt(12, 9, 0)} ${pt(12, 0, 0)}`}
            fill="#050810"
          />
          <polygon
            points={`${pt(0, 0)} ${pt(12, 0)} ${pt(12, 9)} ${pt(0, 9)}`}
            fill="#0a1120"
          />

          {ROOMS.map((r) => {
            const x = r.x + INSET;
            const y = r.y + INSET;
            const w = r.w - INSET * 2;
            const h = r.h - INSET * 2;
            const wallH = mode === '3D' ? 0.9 : 0.06;
            return (
              <g key={r.id}>
                {/* floor */}
                <polygon
                  points={`${pt(x, y)} ${pt(x + w, y)} ${pt(x + w, y + h)} ${pt(x, y + h)}`}
                  fill={r.lit ? 'url(#hm-floor-lit)' : 'url(#hm-floor-dim)'}
                />
                {/* north + west walls, drawn low so the interior stays readable */}
                <polygon
                  points={`${pt(x, y, wallH)} ${pt(x + w, y, wallH)} ${pt(x + w, y)} ${pt(x, y)}`}
                  fill="#0f1a2b"
                />
                <polygon
                  points={`${pt(x, y, wallH)} ${pt(x, y + h, wallH)} ${pt(x, y + h)} ${pt(x, y)}`}
                  fill="#0b1422"
                />
                {/* lit rim along the front edges */}
                <polyline
                  points={`${pt(x, y + h)} ${pt(x + w, y + h)} ${pt(x + w, y)}`}
                  fill="none"
                  stroke={r.lit ? '#4c8dff' : '#2b3a52'}
                  strokeOpacity={r.lit ? 0.85 : 0.35}
                  strokeWidth={1.4}
                  filter={r.lit ? 'url(#hm-glow)' : undefined}
                />
              </g>
            );
          })}

          {/* furniture hints */}
          <Box x={0.7} y={0.7} w={2.4} h={1.7} z1={0.5} top="#24415f" side="#16283e" />
          <Box x={0.7} y={4.9} w={2.6} h={1.2} z1={0.45} top="#22405e" side="#152538" />
          <Box x={5.1} y={0.6} w={2.6} h={0.9} z1={0.55} top="#1d3350" side="#122036" />
          <Box x={5.4} y={4.6} w={2.2} h={2.4} z1={0.2} top="#101d2f" side="#0b1524" />
          {/* pool */}
          <polygon
            points={`${pt(9.2, 4.6)} ${pt(11.4, 4.6)} ${pt(11.4, 7.9)} ${pt(9.2, 7.9)}`}
            fill="url(#hm-pool)"
            opacity={0.9}
            filter="url(#hm-glow)"
          />
        </svg>

        {/* room chips — positioned with the same projection as the geometry */}
        {ROOMS.map((r) => {
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          return (
            <button
              key={r.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-[#0b1220]/85 px-2.5 py-1.5 text-center backdrop-blur transition hover:border-[#4c8dff]/60 hover:bg-[#0e1a2e]/95"
              style={{
                left: `${(px(cx, cy) / 640) * 100}%`,
                top: `${(py(cx, cy, 1.5) / 400) * 100}%`,
              }}
            >
              <r.Icon size={15} className="mx-auto mb-0.5 text-[#9fb6d6] group-hover:text-[#4c8dff]" />
              <div className="whitespace-nowrap text-[10px] font-semibold leading-tight text-white">
                {t.map[r.labelKey]}
              </div>
              <div className="whitespace-nowrap text-[9px] leading-tight text-[#7c8ba1]">
                {reading(r.value)}
              </div>
            </button>
          );
        })}
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 left-4 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0b1220]/85 backdrop-blur">
        <button
          onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}
          className="p-2 text-[#9fb6d6] transition hover:bg-white/5 hover:text-white"
        >
          <Plus size={15} />
        </button>
        <div className="h-px bg-white/10" />
        <button
          onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))}
          className="p-2 text-[#9fb6d6] transition hover:bg-white/5 hover:text-white"
        >
          <Minus size={15} />
        </button>
      </div>

      {/* 2D / 3D toggle */}
      <div className="absolute bottom-4 right-4 flex overflow-hidden rounded-lg border border-white/10 bg-[#0b1220]/85 backdrop-blur">
        {(['2D', '3D'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 text-xs font-semibold transition ${
              mode === m ? 'bg-[#2b7eff] text-white' : 'text-[#9fb6d6] hover:bg-white/5'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
