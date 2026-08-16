// SeasonCrew local bridge for the already loaded Supabase browser bundle.
if (!window.supabase?.createClient) {
  throw new Error('Supabase-Bibliothek wurde nicht geladen');
}

export const createClient = (...args) => window.supabase.createClient(...args);
