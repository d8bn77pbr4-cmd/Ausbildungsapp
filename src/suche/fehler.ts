import type { QuellenName } from './typen';

/** Eine Quelle hat nicht oder fehlerhaft geantwortet. */
export class QuelleFehler extends Error {
  constructor(
    public readonly quelle: QuellenName,
    nachricht: string,
  ) {
    super(nachricht);
    this.name = 'QuelleFehler';
  }
}
