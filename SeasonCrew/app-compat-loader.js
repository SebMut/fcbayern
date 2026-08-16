(() => {
  const status = document.getElementById('authStatus');
  const setStatus = text => { if (status) status.textContent = text || ''; };

  async function loadText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} konnte nicht geladen werden (${response.status})`);
    return response.text();
  }

  async function start() {
    try {
      if (!window.supabase?.createClient) throw new Error('Supabase-Bibliothek fehlt');

      const [scheduleSource, appSource] = await Promise.all([
        loadText('../FcBayern_Tom/schedule.js?v=20260816-compat1'),
        loadText('./app.js?v=20260816-compat1')
      ]);

      let scheduleCode = scheduleSource
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/export\s*\{[^}]*\}\s*;?/g, '');
      scheduleCode += '\nwindow.SeasonCrewSchedule = { BASE_M, D, MON };';
      new Function(scheduleCode + '\n//# sourceURL=SeasonCrew/schedule-compat-runtime.js')();

      if (!window.SeasonCrewSchedule?.BASE_M) throw new Error('Spielplan konnte nicht initialisiert werden');

      let appCode = appSource
        .replace(/^import\s+\{\s*BASE_M\s*,\s*D\s*,\s*MON\s*\}\s+from\s+['"]\.\/schedule\.js['"]\s*;?\s*/m, '')
        .replace(/^import\s+\{\s*createClient\s*\}\s+from\s+['"][^'"]+['"]\s*;?\s*/m, '');

      appCode = `const { BASE_M, D, MON } = window.SeasonCrewSchedule;\nconst createClient = (...args) => window.supabase.createClient(...args);\n${appCode}`;

      new Function(appCode + '\n//# sourceURL=SeasonCrew/app-compat-runtime.js')();
      window.seasonCrewModuleLoaded = true;
      window.seasonCrewModuleFailed = false;
    } catch (error) {
      window.seasonCrewModuleFailed = true;
      console.error('SeasonCrew compatibility start failed', error);
      setStatus('App-Start fehlgeschlagen: ' + (error?.message || String(error)));
      window.dispatchEvent(new Event('seasoncrew-module-failed'));
    }
  }

  start();
})();
