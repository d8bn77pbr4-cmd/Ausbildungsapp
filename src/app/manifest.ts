import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bewerbungsradar',
    short_name: 'Radar',
    description: 'Ausbildungen, Studiengänge und Jobs finden – und den Überblick über deine Bewerbungen behalten.',
    lang: 'de',
    start_url: '/heute',
    display: 'standalone',
    background_color: '#f2f2f7',
    theme_color: '#0071e3',
    icons: [
      { src: '/app-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
