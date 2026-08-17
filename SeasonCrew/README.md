# SeasonCrew V1

Multi-User-/Multi-Crew-App zur gemeinsamen Verwaltung von Dauerkarten und Heimspielen.

## Aktueller Stand

- eigener E-Mail-/Passwort-Account pro Nutzer
- E-Mail-Bestätigung und Passwort-Reset über Supabase Auth
- mehrere Crews pro Account
- Owner/Admin/Member-Rollen
- Beitritt per Einladungslink oder Crew-Code mit Admin-Freigabe
- frei wählbarer Verein / Club pro Crew
- gruppenspezifischer Spielplan für eigene Heimspiele
- Wettbewerb, Gegner, Spielort, Datum, Uhrzeit und optionaler Einzelpreis je Spiel
- mehrere Dauerkarten je Crew
- Block / Reihe / Sitz
- Kartenbelegung pro Heimspiel
- registrierte Nutzer oder Gäste als Besucher
- Bezahlstatus, Standardpreis und spielbezogener Preis
- PayPal.Me-Zahlungsaufforderung mit Spielkontext
- Notizen pro Spiel
- gruppengetrennte History
- Realtime-Updates und Presence
- Supabase Row Level Security und rollenbasierte RPCs

## Vereins- und Spielplanlogik

SeasonCrew ist nicht mehr fest an den FC Bayern gebunden. Neue Crews können einen eigenen Verein angeben und ihren Heimspielplan selbst verwalten.

Für bestehende FC-Bayern-Crews bleibt der bisherige Saisonspielplan als Legacy-/Pilot-Provider erhalten. Zusätzliche oder abweichende Termine können gruppenspezifisch ergänzt werden. Für andere Vereine basiert der Spielplan vollständig auf den Daten der jeweiligen Crew.

Die vorhandene OpenLigaDB-Anbindung für den FC-Bayern-Pilot verwendet die öffentliche JSON-API. Die dort bereitgestellten Daten stehen unter der Open Database License (ODbL) 1.0.

Quelle: https://www.openligadb.de/
Lizenz: Open Database License (ODbL) 1.0

## Runtime-Konfiguration

Umgebungsabhängige Browser-Konfiguration liegt in `seasoncrew-config.js`. `seasoncrew-core.js` enthält keine fest verdrahtete Supabase-Projekt-URL mehr und liest URL, Publishable Key und Umgebungsname aus `window.SeasonCrewConfig`.

Dadurch kann eine spätere Entwicklungs-/Preview-Umgebung auf ein separates Supabase-Projekt oder einen Supabase-Branch zeigen, ohne die App-Logik zu ändern.

## Production Build

`npm run build:site` erzeugt `SeasonCrew/dist/` als bereinigtes statisches Produktionsartefakt. Entwicklungsdateien wie `app.js`, `package*.json`, Playwright-Konfiguration, Tests und Hilfsskripte werden nicht in `dist/` übernommen.

Der vorbereitete Workflow `.github/workflows/pages-production.yml` baut zusätzlich ein Repository-weites Pages-Artefakt: bestehende öffentliche Seiten bleiben erhalten, während der öffentliche `SeasonCrew/`-Ordner durch den Inhalt aus `SeasonCrew/dist/` ersetzt wird.

## Rückfallbasis

Die bisherigen Ordner `FcBayern_Ober` und `FcBayern_Tom` bleiben unverändert und dienen weiterhin als Rückfall-/Vergleichsbasis.
