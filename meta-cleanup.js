(() => {
  const clean = () => {
    document.querySelectorAll('.game .meta').forEach(el => {
      const parts = el.textContent.split('·').map(x => x.trim()).filter(Boolean);
      if (!parts.length) return;
      const competition = parts[0];
      let round = parts[1] || '';
      if (round === competition) round = parts[2] || '';
      // Venue/location is intentionally omitted; it is clear these are Bayern home fixtures.
      el.textContent = round ? `${competition} · ${round}` : competition;
    });
  };
  const app = document.getElementById('app');
  if (app) new MutationObserver(clean).observe(app, { childList: true, subtree: true });
  clean();
})();