'use client';

export const dynamic = 'force-dynamic';

import { ChangeEvent, FormEvent, ReactNode, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Lightbulb, Wind, Lock, Camera, Blinds, Thermometer, Cpu, Wifi, Speaker,
} from 'lucide-react';
import { apiFetch, setToken } from '@/lib/api';
import { AnimatedForm, Ripple, TechOrbitDisplay } from '@/components/ui/modern-animated-sign-in';
import { LocaleToggle, useI18n } from '@/components/locale-provider';
import { isDemo } from '@/lib/demo';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

type OrbitIcon = {
  component: () => ReactNode;
  className: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
};

/* The orbit advertises what the hub actually controls, so the sign-in screen
   says something about the product rather than showing framework logos.
   Both size classes are written out in full — Tailwind only generates classes
   it can read as complete strings in the source. */
const SIZE = {
  sm: { px: 20, cls: 'size-[36px] border-none bg-transparent' },
  lg: { px: 30, cls: 'size-[46px] border-none bg-transparent' },
} as const;

const orbit = (
  Icon: typeof Lightbulb,
  size: keyof typeof SIZE,
  tint: string,
  o: Omit<OrbitIcon, 'component' | 'className'>
): OrbitIcon => ({
  component: () => <Icon size={SIZE[size].px} className={tint} strokeWidth={1.5} />,
  className: SIZE[size].cls,
  path: false,
  ...o,
});

const iconsArray: OrbitIcon[] = [
  orbit(Lightbulb, 'sm', 'text-amber-400', { radius: 100, duration: 20, delay: 20 }),
  orbit(Thermometer, 'sm', 'text-sky-400', { radius: 100, duration: 20, delay: 10 }),
  orbit(Wind, 'lg', 'text-cyan-400', { radius: 210, duration: 20 }),
  orbit(Lock, 'lg', 'text-emerald-400', { radius: 210, duration: 20, delay: 20 }),
  orbit(Blinds, 'sm', 'text-indigo-400', { radius: 150, duration: 20, delay: 20, reverse: true }),
  orbit(Speaker, 'sm', 'text-fuchsia-400', { radius: 150, duration: 20, delay: 10, reverse: true }),
  orbit(Camera, 'lg', 'text-rose-400', { radius: 270, duration: 20, reverse: true }),
  orbit(Wifi, 'lg', 'text-blue-400', { radius: 270, duration: 20, delay: 60, reverse: true }),
  orbit(Cpu, 'lg', 'text-slate-300', { radius: 320, duration: 20, delay: 20 }),
];

export default function LoginPage() {
  const router = useRouter();
  const { t, dir } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // No backend behind a demo deployment — accept the form and move on.
      if (isDemo()) {
        setToken('demo');
        router.push('/dashboard');
        return;
      }

      const path = mode === 'login' ? '/v1/auth/login' : '/v1/auth/register';
      const body =
        mode === 'login' ? { email, password } : { email, password, organizationName };
      const res = await apiFetch<AuthResponse>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.accessToken) {
        setToken(res.accessToken);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.failed);
    } finally {
      setBusy(false);
    }
  }

  const bind =
    (setter: (v: string) => void) => (event: ChangeEvent<HTMLInputElement>) =>
      setter(event.target.value);

  const fields = [
    {
      label: t.auth.email,
      required: true,
      type: 'email' as const,
      placeholder: t.auth.emailPlaceholder,
      onChange: bind(setEmail),
    },
    {
      label: t.auth.password,
      required: true,
      type: 'password' as const,
      placeholder: t.auth.passwordPlaceholder,
      onChange: bind(setPassword),
    },
    ...(mode === 'register'
      ? [
          {
            label: t.auth.orgName,
            required: true,
            type: 'text' as const,
            placeholder: t.auth.orgPlaceholder,
            onChange: bind(setOrganizationName),
          },
        ]
      : []),
  ];

  return (
    <main dir={dir} className='ui-reset relative flex min-h-[100dvh] bg-background'>
      <LocaleToggle className='absolute end-5 top-5 z-10' />

      {/* Orbiting capability display — hidden below lg */}
      <section className='relative hidden w-1/2 flex-col justify-center lg:flex'>
        <Ripple
          mainCircleSize={100}
          className='max-w-full bg-transparent dark:bg-transparent'
        />
        <TechOrbitDisplay iconsArray={iconsArray} text='' />
        <Image
          src='/syltra-wordmark.png'
          alt='SYLTRA'
          width={1158}
          height={500}
          priority
          className='pointer-events-none absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2'
        />
      </section>

      {/* Form */}
      <section className='flex w-full flex-col items-center justify-center px-[10%] lg:w-1/2'>
        <Image
          src='/syltra-icon.png'
          alt='SYLTRA'
          width={56}
          height={56}
          priority
          className='mb-6 rounded-xl lg:hidden'
        />
        <AnimatedForm
          key={`${mode}-${dir}`}
          header={mode === 'login' ? t.auth.signInHeader : t.auth.registerHeader}
          subHeader={mode === 'login' ? t.auth.signInSub : t.auth.registerSub}
          fields={fields}
          submitButton={mode === 'login' ? t.auth.signInButton : t.auth.registerButton}
          textVariantButton={mode === 'login' ? t.auth.toRegister : t.auth.toSignIn}
          errorField={error ?? undefined}
          busy={busy}
          labels={t.auth}
          onSubmit={handleSubmit}
          goTo={() => {
            setError(null);
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        />
      </section>
    </main>
  );
}
