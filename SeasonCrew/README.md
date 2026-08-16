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
- Pilot-Migrationen für `Ober Pilot` und `Tom Pilot`

## Pilot-Einschränkung

Der Spielplan verwendet in V1 noch den bestehenden FC-Bayern-Spielplan und dessen Sync-Daten. Die Datenstruktur der Crews ist bereits mandantenfähig; weitere Vereine/Sportarten werden später als eigene Fixture-Provider ergänzt.

Die bisherigen Ordner `FcBayern_Ober` und `FcBayern_Tom` bleiben unverändert und dienen weiterhin als Rückfall-/Vergleichsbasis.
