import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bewerbungsradar',
  description: 'Ausbildungen, Studiengänge und Jobs finden – und den Überblick über deine Bewerbungen behalten.',
  appleWebApp: { capable: true, title: 'Bewerbungsradar', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
