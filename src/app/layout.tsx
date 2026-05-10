import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NID · Planeta — Núcleo de Inovação Delp',
  description:
    'Petronius e a equipe do Núcleo de Inovação da Delp Engenharia. Um time desbravador e inovador construindo o futuro do canteiro.',
  openGraph: {
    title: 'NID · Planeta — Núcleo de Inovação Delp',
    description: 'Petronius é a IA companion do NID Delp. Sistema Solar, Pipeline e UniversiNID.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Barlow:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
