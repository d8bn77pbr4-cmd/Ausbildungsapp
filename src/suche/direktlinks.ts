import { BUNDESLAENDER } from './bundeslaender';
import type { SuchAnfrage } from './typen';

export interface DirektLink {
  name: 'Indeed' | 'StepStone' | 'Azubiyo';
  url: string;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Dieselbe Suche bei anderen Portalen – nur als Link, es werden keine Daten von dort abgerufen. */
export function direktLinks(a: SuchAnfrage): DirektLink[] {
  const nurAusbildung = a.arten.length === 1 && a.arten[0] === 'ausbildung';
  const begriff = nurAusbildung ? `${a.was} Ausbildung` : a.was;
  const ort = a.orte[0]
    ? { name: a.orte[0].ort, km: a.orte[0].umkreisKm }
    : a.bundeslaender[0]
      ? { name: BUNDESLAENDER[a.bundeslaender[0]], km: undefined }
      : undefined;

  const indeed = new URLSearchParams({ q: begriff });
  if (ort) indeed.set('l', ort.name);
  if (ort?.km) indeed.set('radius', String(ort.km));

  let stepstone = `https://www.stepstone.de/jobs/${slug(begriff)}`;
  if (ort) stepstone += `/in-${slug(ort.name)}`;
  if (ort?.km) stepstone += `?radius=${ort.km}`;

  return [
    { name: 'Indeed', url: `https://de.indeed.com/jobs?${indeed}` },
    { name: 'StepStone', url: stepstone },
    { name: 'Azubiyo', url: `https://www.azubiyo.de/stellenmarkt/?${new URLSearchParams({ q: a.was })}` },
  ];
}
