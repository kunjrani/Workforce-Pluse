import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Workforce Pluse — Operational Intelligence',
  description: 'Identify time & cost leakage across teams. Prioritize automation with data-driven insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
