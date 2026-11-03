import type { Metadata } from 'next';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@xterm/xterm/css/xterm.css';
import './globals.css';
import { loadConfig } from '@/config/app-config';
import { ExposureAlert } from '@/web/components/exposure-alert';

export const metadata: Metadata = {
  title: 'Guia Vibes DLC',
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/favicon-32.png', type: 'image/png' }] },
};

// O endereço de escuta é lido a cada início, nunca fixado na compilação.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { exposed, host } = loadConfig();
  return (
    <html lang="pt-BR">
      <body>
        {exposed ? <ExposureAlert host={host} /> : null}
        {children}
      </body>
    </html>
  );
}
