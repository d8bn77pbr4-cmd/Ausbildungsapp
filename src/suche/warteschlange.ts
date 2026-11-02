/** Begrenzt gleichzeitige Abrufe; wartende Aufgaben mit kleinerer Priorität (z. B. Seite 1) kommen zuerst dran. */
export class Warteschlange {
  private laufend = 0;
  private zaehler = 0;
  private wartend: { prioritaet: number; nr: number; starte: () => void }[] = [];

  constructor(private readonly parallel: number) {}

  einreihen<T>(prioritaet: number, aufgabe: () => Promise<T>): Promise<T> {
    return new Promise<T>((erfuellt, abgelehnt) => {
      const starte = () => {
        this.laufend++;
        aufgabe()
          .then(erfuellt, abgelehnt)
          .finally(() => {
            this.laufend--;
            this.weiter();
          });
      };
      this.wartend.push({ prioritaet, nr: this.zaehler++, starte });
      this.weiter();
    });
  }

  private weiter() {
    while (this.laufend < this.parallel && this.wartend.length > 0) {
      this.wartend.sort((a, b) => a.prioritaet - b.prioritaet || a.nr - b.nr);
      this.wartend.shift()!.starte();
    }
  }
}
