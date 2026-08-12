import type { Config } from 'tailwindcss';

/* Tailwind drives the dashboard's layout and one-off shades. The long-lived
   brand values stay in globals.css as CSS custom properties (they are shared
   with the marketing site and the Syltra Home app) and are surfaced here so
   `bg-void`, `text-chrome`, `border-hairline` etc. resolve to the same colours
   the rest of the product uses. */
const config: Config = {
  // The product is dark-only; `dark` is set statically on <html> in layout.tsx
  // so the `dark:` variants shipped with shadcn-style components resolve.
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        'void-2': 'var(--void-2)',
        graphite: 'var(--graphite)',
        'graphite-2': 'var(--graphite-2)',
        slate: 'var(--slate)',
        'chrome-dim': 'var(--chrome-dim)',
        chrome: 'var(--chrome)',
        platinum: 'var(--platinum)',
        ion: 'var(--ion)',
        'ion-dim': 'var(--ion-dim)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        // shadcn-style semantic tokens
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        skeleton: 'var(--skeleton)',
        border: 'var(--btn-border)',
        input: 'var(--input)',
      },
      borderColor: {
        hairline: 'var(--hairline)',
        'hairline-strong': 'var(--hairline-strong)',
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        input: [
          '0px 2px 3px -1px rgba(0, 0, 0, 0.1)',
          '0px 1px 0px 0px rgba(25, 28, 33, 0.02)',
          '0px 0px 0px 1px rgba(25, 28, 33, 0.08)',
        ].join(', '),
      },
      animation: {
        ripple: 'ripple 2s ease calc(var(--i, 0) * 0.2s) infinite',
        orbit: 'orbit calc(var(--duration) * 1s) linear infinite',
      },
      keyframes: {
        ripple: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
          '50%': { transform: 'translate(-50%, -50%) scale(0.9)' },
        },
        orbit: {
          '0%': {
            transform: 'rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
