(() => {
  const status = document.getElementById('authStatus');
  const setStatus = text => { if (status) status.textContent = text || ''; };

  async function loadText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} konnte nicht geladen werden (${response.status})`);
    return response.text();
  }

  async function start() {
    let blobUrl = null;
    try {
      if (!window.supabase?.createClient) throw new Error('Supabase-Bibliothek fehlt');

      // Den lokalen Spielplan als normales ES-Modul laden. Das funktioniert auf
      // iOS zuverlässig und vermeidet das frühere new-Function-Umschreiben.
      const schedule = await import('./schedule.js?v=20260816-loginfix4');
      if (!schedule?.BASE_M || !schedule?.D || !schedule?.MON) {
        throw new Error('Spielplan konnte nicht initialisiert werden');
      }
      window.SeasonCrewSchedule = schedule;

      // app.js verwendet normalerweise zwei statische Imports. Für den iPhone-
      // Fallback entfernen wir nur diese beiden Importzeilen und stellen die
      // gleichen Werte lokal bereit. Anschließend wird der Code wieder als
      // echtes ES-Modul geparst – nicht über new Function().
      const appSource = await loadText('./app.js?v=20260816-loginfix4');
      const appBody = appSource
        .split('\n')
        .filter(line => {
          const t = line.trim();
          return !t.startsWith("import { BASE_M, D, MON }") &&
                 !t.startsWith("import { createClient }");
        })
        .join('\n');

      const prefix = [
        'const { BASE_M, D, MON } = window.SeasonCrewSchedule;',
        'const createClient = (...args) => window.supabase.createClient(...args);'
      ].join('\n');

      const blob = new Blob([prefix, '\n', appBody], { type: 'text/javascript' });
      blobUrl = URL.createObjectURL(blob);
      await import(blobUrl);

      window.seasonCrewModuleLoaded = true;
      window.seasonCrewModuleFailed = false;
    } catch (error) {
      window.seasonCrewModuleFailed = true;
      console.error('SeasonCrew compatibility start failed', error);
      setStatus('App-Start fehlgeschlagen: ' + (error?.message || String(error)));
      window.dispatchEvent(new Event('seasoncrew-module-failed'));
    } finally {
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  }

  start();
})();
