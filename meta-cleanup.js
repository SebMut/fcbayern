(() => {
  const clean = () => {
    document.querySelectorAll('.game .meta').forEach(el => {
      const original = el.textContent;
      const parts = original.split('·').map(x => x.trim()).filter(Boolean);
      if (!parts.length) return;
      const competition = parts[0];
      let round = parts[1] || '';
      if (round === competition) round = parts[2] || '';
      const next = round ? `${competition} · ${round}` : competition;
      if (original !== next) el.textContent = next;
    });
  };
  const app = document.getElementById('app');
  if (app) new MutationObserver(clean).observe(app, { childList: true, subtree: true });
  clean();
})();