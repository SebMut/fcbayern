import { BASE_M, MON } from '../FcBayern_Tom/schedule.js';

// SeasonCrew deliberately does not expose club logo domains.
// The app renders neutral two-colour jersey icons instead.
export const D=Object.freeze({});
export { BASE_M, MON };

// The jersey renderer is intentionally loaded asynchronously so a display-only
// enhancement can never block authentication or the core SeasonCrew app.
queueMicrotask(() => {
  import('./club-kits.js?v=20260817-loginfix1').catch(error => {
    console.warn('SeasonCrew jersey renderer could not be loaded', error);
  });
});
