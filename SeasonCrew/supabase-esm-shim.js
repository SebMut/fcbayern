if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase-Bibliothek wurde nicht geladen');
}

export const createClient = (...args) => window.supabase.createClient(...args);
