# Mondphase

Diese Integration fügt Gladys ein Dashboard-Widget **„Mondphase“** hinzu: die Phase des Tages, Beleuchtung und Alter
des Mondes, seine beleuchtete Scheibe, Mondauf- und -untergang und die nächsten Mondereignisse. Szenen können auf
die Mondereignisse reagieren (Vollmond, Neumond, Finsternis …) und die Mondphase abfragen.

## Sofort einsatzbereit

**Nichts zu konfigurieren**: Alles wird lokal aus dem Standort deines Zuhauses berechnet, ohne Konto, ohne
Schlüssel und ohne Internetzugang.

Das Zuhause muss einen **Standort** haben: Lege ihn unter **Einstellungen → Zuhause** fest.

## Das Widget hinzufügen

Bearbeite ein Dashboard, wähle **Mondphase** unter den Integrations-Widgets und stelle dann ein:

| Einstellung                        | Wirkung                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zuhause**                        | Name des Zuhauses, dessen Standort verwendet wird. Leer lassen für das erste Zuhause mit Standort (der Fall eines einzigen Zuhauses).                                                 |
| **Details anzeigen**               | Zeigt die Liste unter dem Mond (Entfernung, Bahn, Sternbild, nächste Ereignisse). Deaktivieren, um nur die Phase, die Scheibe sowie Mondauf- und -untergang zu behalten.              |
| **Werte um Mitternacht berechnen** | Berechnet Beleuchtung, Entfernung, Alter und Countdowns um Mitternacht, wie Mondkalender, damit beide Zeile für Zeile verglichen werden können. Auf- und Untergang ändern sich nicht. |

## Was das Widget zeigt

![Das Widget „Mondphase“: ein zunehmender Dreiviertelmond, zu 79 % beleuchtet, Mondauf- und -untergang, dann Entfernung, Bahn, Sternbild und die nächsten Mondereignisse — generierte Illustration, kein Screenshot](https://raw.githubusercontent.com/William-De71/gladys-moon-phase/main/docs/assets/widgets.de.png)

- **Die Phase** (Neumond, Zunehmende Sichel, Erstes Viertel, Zunehmender Dreiviertelmond, Vollmond …), den
  **beleuchteten Anteil** und das **Alter** des Mondes (Tage seit dem letzten Neumond).
- **Die Mondscheibe** (ein NASA-Foto) mit ihrem beleuchteten Teil.
- **Mondauf- und -untergang** des Tages, in der Zeitzone von Gladys. `--:--`, wenn der Mond an diesem Tag nicht auf-
  oder untergeht (etwa einen Tag im Monat).
- **Heute**: Entfernung Erde-Mond, Bahn (aufsteigend oder absteigend), Sternbild (siderischer Tierkreis, wie in
  Mondkalendern) und der nächste Knoten.
- **Demnächst**: Vollmond, Neumond, Perigäum, Apogäum und nächste Mondfinsternis, mit der Zahl der Tage und dem
  Datum.

Das Widget wird alle 10 Minuten und kurz nach Mitternacht aktualisiert.

## Szenen

### Auslöser „Mond: Mondereignis“

Ausgelöst zur Minute des Ereignisses, in der Uhrzeit von Gladys:

| Ereignis            | Wann                                                     |
| ------------------- | -------------------------------------------------------- |
| **Neumond**         | der Mond steht zwischen Erde und Sonne                   |
| **Erstes Viertel**  | die Hälfte der Scheibe ist beleuchtet, der Mond nimmt zu |
| **Vollmond**        | die ganze Scheibe ist beleuchtet                         |
| **Letztes Viertel** | die Hälfte der Scheibe ist beleuchtet, der Mond nimmt ab |
| **Perigäum**        | der Mond ist der Erde am nächsten                        |
| **Apogäum**         | der Mond ist am weitesten von der Erde entfernt          |
| **Mondfinsternis**  | ein Vollmond, der durch den Erdschatten zieht            |

Wähle die Ereignisse, auf die reagiert werden soll (leer: alle). Die Szene erhält das Ereignis, seinen Namen, sein
Datum und seine Uhrzeit, die Beleuchtung, die Entfernung Erde-Mond und einen Satz **Zusammenfassung**, der direkt
verschickt werden kann: „Vollmond um 05:11: Der Mond ist zu 100 % beleuchtet, 368.600 km von der Erde entfernt.“

Ein Ereignis wird nur einmal ausgelöst, auch nach einem Neustart. War die Integration in dieser Minute gestoppt,
wird das Ereignis nicht später ausgelöst (eine Szene „Vollmond“ eine Stunde zu spät würde eher überraschen als
helfen).

Ideen: die Gartenbeleuchtung in eine „Vollmond“-Stimmung schalten, am Abend einer Mondfinsternis eine Nachricht
erhalten, eine Erinnerung zum Säen bei Neumond.

### Aktion „Mond: Mondphase“

Liefert den Mond eines Zuhauses jetzt (leer: das erste Zuhause mit Standort): Phase, beleuchteter Anteil, Alter,
zunehmend oder nicht, Mondauf- und -untergang, das Datum des nächsten Vollmonds und Neumonds mit der Zahl der Tage
und eine Zusammenfassung, zum Beispiel um in einer Nachricht auf „Welcher Mond ist heute Abend?“ zu antworten.

### Sprache der Szenentexte

Gladys übergibt die Sprache nur an die Widgets. Die Ereignisnamen und Zusammenfassungen der Szenen folgen der
Einstellung **Sprache der Szenentexte** der Integration: Englisch, Französisch, Deutsch, Spanisch oder automatisch
(die Sprache deines Dashboards, sobald das Widget angezeigt wurde).

## Häufige Fragen

**Das Widget meldet, dass kein Zuhause einen Standort hat.** Lege den Standort eines Zuhauses unter Einstellungen →
Zuhause fest.

**Das Widget meldet „Kein Zuhause namens …“.** Der in der Einstellung Zuhause eingegebene Name passt zu keinem
Zuhause: Die Meldung listet die zu verwendenden Namen.

**Die Uhrzeiten sind verschoben.** Prüfe die Zeitzone von Gladys (Einstellungen → System); die Integration
verwendet sie. Starte die Integration nach einer Änderung neu.

**Meine Sprache ist weder Englisch, Französisch, Deutsch noch Spanisch.** Das Widget wird dann auf Englisch
angezeigt.

**Die Szenentexte sind auf Englisch.** Stelle in den Einstellungen **Sprache der Szenentexte** ein oder zeige das
Widget einmal an.
