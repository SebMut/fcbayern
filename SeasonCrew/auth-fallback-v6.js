(() => {
  const SUPABASE_URL = 'https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $ = id => document.getElementById(id);
  const status = $('authStatus');
  const loginForm = $('loginForm');
  const signupForm = $('signupForm');
  let client = null;

  function markPilotConfirmed(data) {
    const stamp = new Date().toISOString();
    const directUser = data?.user;
    const sessionUser = data?.session?.user;
    if (directUser && !directUser.email_confirmed_at) directUser.email_confirmed_at = stamp;
    if (sessionUser && !sessionUser.email_confirmed_at) sessionUser.email_confirmed_at = stamp;
    return data;
  }

  const nativeCreateClient = window.supabase?.createClient?.bind(window.supabase);
  if (nativeCreateClient && !window.__seasonCrewNoConfirmClientPatch) {
    window.__seasonCrewNoConfirmClientPatch = true;
    window.supabase.createClient = (...args) => {
      const created = nativeCreateClient(...args);
      const auth = created?.auth;
      if (auth && !auth.__seasonCrewNoConfirmWrapped) {
        auth.__seasonCrewNoConfirmWrapped = true;

        const nativeGetSession = auth.getSession?.bind(auth);
        if (nativeGetSession) auth.getSession = async (...callArgs) => {
          const result = await nativeGetSession(...callArgs);
          markPilotConfirmed(result?.data);
          return result;
        };

        const nativeSignIn = auth.signInWithPassword?.bind(auth);
        if (nativeSignIn) auth.signInWithPassword = async (...callArgs) => {
          const result = await nativeSignIn(...callArgs);
          markPilotConfirmed(result?.data);
          return result;
        };

        const nativeSignUp = auth.signUp?.bind(auth);
        if (nativeSignUp) auth.signUp = async (...callArgs) => {
          const result = await nativeSignUp(...callArgs);
          markPilotConfirmed(result?.data);
          return result;
        };
      }
      return created;
    };
  }

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

  function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient) return null;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  function validUsername(value) {
    return /^[A-Za-z0-9._-]{3,24}$/.test(String(value || '').trim());
  }

  function inviteToken(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      const fromUrl = url.searchParams.get('invite');
      if (fromUrl) return fromUrl.trim().toUpperCase();
    } catch {}
    const match = raw.match(/[?&]invite=([^&#]+)/i);
    if (match) return decodeURIComponent(match[1]).trim().toUpperCase();
    return raw.replace(/\s/g, '').toUpperCase();
  }

  function ensureInviteField() {
    if (!signupForm) return;

    let input = $('signupInvite');
    let label = input?.closest('label') || null;
    let hint = label?.nextElementSibling?.classList?.contains('fieldHint') ? label.nextElementSibling : null;

    if (!input) {
      label = document.createElement('label');
      label.className = 'signupInviteLabel';
      label.innerHTML = 'Einladungscode <span style="color:#8c96a4">(optional)</span><input id="signupInvite" autocomplete="off" placeholder="Code oder Einladungslink">';
      hint = document.createElement('small');
      hint.className = 'fieldHint';
      hint.textContent = 'Optional · Mit Einladung stellst du nach der Registrierung automatisch eine Beitrittsanfrage. Ohne Einladung kannst du eine eigene Crew erstellen.';
      const firstLabel = signupForm.querySelector('label');
      signupForm.insertBefore(label, firstLabel || null);
      signupForm.insertBefore(hint, firstLabel || null);
      input = $('signupInvite');
    } else {
      input.required = false;
      input.removeAttribute('required');
      label?.querySelector('span')?.remove();
      if (label?.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.nodeValue = 'Einladungscode (optional) ';
      if (hint) hint.textContent = 'Optional · Mit Einladung stellst du nach der Registrierung automatisch eine Beitrittsanfrage. Ohne Einladung kannst du eine eigene Crew erstellen.';
    }

    const intro = signupForm.querySelector('p');
    if (intro) intro.textContent = 'Erstelle deinen Account. Mit Einladung kannst du einer bestehenden Crew beitreten – ohne Einladung kannst du danach deine eigene Crew anlegen.';
    const loginIntro = loginForm?.querySelector('p');
    if (loginIntro) loginIntro.textContent = 'Login mit deiner E-Mail-Adresse und deinem Passwort.';

    const urlCode = inviteToken(new URL(location.href).searchParams.get('invite'));
    const savedCode = inviteToken(localStorage.getItem('seasoncrew-pending-invite'));
    const code = urlCode || savedCode;
    if (code && input) input.value = code;
  }

  ensureInviteField();

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const sb = getClient();
    if (!sb) {
      setStatus('Die Login-Komponente konnte nicht geladen werden. Bitte Seite neu laden.');
      return;
    }

    const email = $('loginEmail')?.value.trim();
    const password = $('loginPassword')?.value || '';
    setStatus('Einloggen …');

    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('Login fehlgeschlagen: ' + error.message);
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

    if (!signupForm.checkValidity()) {
      signupForm.reportValidity();
      return;
    }

    const sb = getClient();
    if (!sb) {
      setStatus('Die Registrierung konnte nicht geladen werden. Bitte Seite neu laden.');
      return;
    }

    const token = inviteToken($('signupInvite')?.value);
    const username = $('signupUsername')?.value.trim() || '';
    const email = $('signupEmail')?.value.trim() || '';
    const password = $('signupPassword')?.value || '';

    if (!validUsername(username)) {
      setStatus('Nutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.');
      return;
    }
    if (!email || password.length < 8) {
      setStatus('Bitte Nutzername, E-Mail und Passwort ausfüllen. Das Passwort braucht mindestens 8 Zeichen.');
      return;
    }

    try {
      let invite = null;
      if (token) {
        setStatus('Einladungscode wird geprüft …');
        const { data: inviteRows, error: inviteError } = await sb.rpc('sc_validate_invite', { p_token: token });
        if (inviteError) {
          setStatus('Einladung konnte nicht geprüft werden: ' + inviteError.message);
          return;
        }
        invite = Array.isArray(inviteRows) ? inviteRows[0] : inviteRows;
        if (!invite?.valid) {
          setStatus('Dieser Einladungscode ist ungültig oder abgelaufen.');
          return;
        }
        setStatus(`Einladung für „${invite.group_name || 'Crew'}“ gültig. Nutzername wird geprüft …`);
      } else {
        setStatus('Nutzername wird geprüft …');
      }

      const { data: available, error: checkError } = await sb.rpc('sc_username_available', { p_username: username });
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

      const metadata = { username };
      if (token) {
        metadata.invite_token = token;
        localStorage.setItem('seasoncrew-pending-invite', token);
        redirectTo.searchParams.set('invite', token);
      } else {
        localStorage.removeItem('seasoncrew-pending-invite');
      }

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo.href,
          data: metadata
        }
      });

      if (error) {
        setStatus('Account konnte nicht erstellt werden: ' + error.message);
        return;
      }

      if (!data.session) {
        setTab('login');
        setStatus('Account erstellt. Bitte bestätige deine E-Mail-Adresse über die Nachricht, die wir dir geschickt haben. Danach kannst du dich einloggen.', true);
        return;
      }

      setStatus(invite ? `Account erstellt. Bewerbung für „${invite.group_name || 'die Crew'}“ wird vorbereitet …` : 'Account erstellt. App wird geladen …', true);
      setTimeout(() => location.reload(), 300);
    } catch (error) {
      setStatus('Account konnte nicht erstellt werden: ' + (error?.message || String(error)));
    }
  }, true);

  async function startFallback() {
    if (window.seasonCrewModuleLoaded) return;

    const sb = getClient();
    if (!sb) {
      setStatus('Die Login-Komponente konnte nicht geladen werden. Bitte Seite einmal neu laden.');
      return;
    }

    window.seasonCrewAuthFallbackActive = true;

    document.querySelectorAll('[data-auth-tab]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setTab(button.dataset.authTab);
      }, true);
    });

    if (!window.seasonCrewModuleFailed) setStatus('Login bereit.');
  }

  const bootFallback = () => setTimeout(startFallback, 5000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFallback, { once: true });
  else bootFallback();

  window.addEventListener('seasoncrew-module-failed', () => setTimeout(startFallback, 300), { once: true });
})();
