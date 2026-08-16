(() => {
  const SUPABASE_URL = 'https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $ = id => document.getElementById(id);
  const status = $('authStatus');
  const loginForm = $('loginForm');
  const signupForm = $('signupForm');

  function setStatus(text, ok = false) {
    if (!status) return;
    status.textContent = text || '';
    status.classList.toggle('ok', !!ok);
  }

  function setTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b.dataset.authTab === tab));
    loginForm?.classList.toggle('hidden', tab !== 'login');
    signupForm?.classList.toggle('hidden', tab !== 'signup');
    setStatus('');
  }

  function validUsername(value) {
    return /^[A-Za-z0-9._-]{3,24}$/.test(String(value || '').trim());
  }

  async function startFallback() {
    if (window.seasonCrewModuleLoaded) return;

    if (!window.supabase?.createClient) {
      setStatus('Die Login-Komponente konnte nicht geladen werden. Bitte Seite einmal neu laden.');
      return;
    }

    window.seasonCrewAuthFallbackActive = true;
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    document.querySelectorAll('[data-auth-tab]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setTab(button.dataset.authTab);
      }, true);
    });

    loginForm?.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = $('loginEmail')?.value.trim();
      const password = $('loginPassword')?.value || '';
      setStatus('Einloggen …');
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          setStatus('Login fehlgeschlagen: ' + error.message);
          return;
        }
        if (!data.user?.email_confirmed_at) {
          await client.auth.signOut();
          setStatus('Bitte bestätige zuerst deine E-Mail-Adresse.');
          return;
        }
        setStatus('Login erfolgreich. App wird geladen …', true);
        setTimeout(() => location.reload(), 250);
      } catch (error) {
        setStatus('Login fehlgeschlagen: ' + (error?.message || String(error)));
      }
    }, true);

    signupForm?.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const username = $('signupUsername')?.value.trim() || '';
      const display_name = $('signupName')?.value.trim() || '';
      const email = $('signupEmail')?.value.trim() || '';
      const password = $('signupPassword')?.value || '';

      if (!validUsername(username)) {
        setStatus('Nutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.');
        return;
      }
      if (!display_name || !email || password.length < 8) {
        setStatus('Bitte alle Felder vollständig ausfüllen. Das Passwort braucht mindestens 8 Zeichen.');
        return;
      }

      try {
        setStatus('Nutzername wird geprüft …');
        const { data: available, error: checkError } = await client.rpc('sc_username_available', { p_username: username });
        if (checkError) {
          setStatus('Nutzername konnte nicht geprüft werden: ' + checkError.message);
          return;
        }
        if (!available) {
          setStatus('Dieser Nutzername ist bereits vergeben.');
          return;
        }

        setStatus('Account wird erstellt …');
        const redirectTo = new URL('./', location.href);
        redirectTo.search = '';
        redirectTo.hash = '';
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo.href,
            data: { display_name, username }
          }
        });
        if (error) {
          setStatus('Account konnte nicht erstellt werden: ' + error.message);
          return;
        }

        if (data.session) await client.auth.signOut();
        setTab('login');
        setStatus('Account angelegt. Bitte bestätige jetzt die E-Mail und logge dich danach ein.', true);
      } catch (error) {
        setStatus('Account konnte nicht erstellt werden: ' + (error?.message || String(error)));
      }
    }, true);

    setStatus('Login bereit.');
  }

  const bootFallback = () => setTimeout(startFallback, 1200);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFallback, { once: true });
  else bootFallback();

  window.addEventListener('seasoncrew-module-failed', () => setTimeout(startFallback, 0), { once: true });
})();
