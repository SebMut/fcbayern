# SeasonCrew V1

Pilot-App für die Multi-User-/Multi-Group-Version der bisherigen Jahreskartenverwaltung.

## Aktueller Stand

- eigener E-Mail-/Passwort-Account pro Nutzer
- mehrere Crews pro Account
- Owner/Admin/Member-Rollen
- Beitritt per Crew-Code
- mehrere Dauerkarten je Crew
- Block / Reihe / Sitz
- Kartenbelegung pro Heimspiel
- frei editierbarer Besuchername
- Bezahlstatus und Standardpreis
- PayPal.Me-Zahlungsaufforderung mit Spielkontext
- Notizen pro Spiel
- gruppengetrennte History
- Realtime-Updates und Presence
- Supabase Row Level Security
- Spielplandaten über OpenLigaDB
- automatischer Sync alle 3 Stunden (Europe/Berlin)

## Spielplandaten

SeasonCrew bezieht Spielplandaten über die öffentliche JSON-API von OpenLigaDB. Die von OpenLigaDB bereitgestellten Daten stehen unter der Open Database License (ODbL) 1.0.

Der Sync verwendet derzeit:

- `bl1` für die 1. Bundesliga
- `dfb` für den DFB-Pokal
- `ucl` für die UEFA Champions League, sofern für die Saison Daten verfügbar sind

Noch nicht final terminierte Bundesliga-Spiele werden nicht blind als exakter Samstag-15:30-Termin übernommen. Bis 21 Tage vor dem bei OpenLigaDB hinterlegten Termin bleiben die vorhandenen Spieltagsfenster bestehen; danach wird der OpenLigaDB-Termin als exakt übernommen.

Quelle: https://www.openligadb.de/
Lizenz: Open Database License (ODbL) 1.0

## Pilot-Einschränkung

Die Datenstruktur der Crews ist bereits mandantenfähig; weitere Vereine und Sportarten können später über zusätzliche Fixture-Provider ergänzt werden.

Die bisherigen Ordner `FcBayern_Ober` und `FcBayern_Tom` bleiben unverändert und dienen weiterhin als Rückfall-/Vergleichsbasis.
