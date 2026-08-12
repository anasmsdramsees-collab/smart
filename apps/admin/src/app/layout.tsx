import type { Metadata } from 'next';
import { Manrope, Unbounded, IBM_Plex_Mono } from 'next/font/google';
import { LocaleProvider } from '@/components/locale-provider';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'SYLTRA Admin',
  description: 'SYLTRA Cloud admin dashboard',
  icons: { icon: '/syltra-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* lang/dir seed the Arabic default; LocaleProvider rewrites both on the
       client once the stored preference is known. */
    <html lang="ar" dir="rtl" className={`dark ${manrope.variable} ${unbounded.variable} ${plexMono.variable}`}>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
