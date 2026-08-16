(() => {
  const SUPABASE_URL = 'https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $ = id => document.getElementById(id);
  const status = $('authStatus');
  const loginForm = $('loginForm');
  const signupForm = $('signupForm');
  let client = null;

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
    if (!signupForm || $('signupInvite')) return;
    const label = document.createElement('label');
    label.className = 'signupInviteLabel';
    label.innerHTML = 'Einladungscode <span style="color:#ff7b8b">*</span><input id="signupInvite" autocomplete="off" required placeholder="Code oder Einladungslink">';
    const hint = document.createElement('small');
    hint.className = 'fieldHint';
    hint.textContent = 'Pflichtfeld · Du kannst auch den kompletten Einladungslink einfügen.';
    const firstLabel = signupForm.querySelector('label');
    signupForm.insertBefore(label, firstLabel || null);
    signupForm.insertBefore(hint, firstLabel || null);

    const urlCode = inviteToken(new URL(location.href).searchParams.get('invite'));
    const savedCode = inviteToken(localStorage.getItem('seasoncrew-pending-invite'));
    const code = urlCode || savedCode;
    if (code) $('signupInvite').value = code;
  }

  ensureInviteField();

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

    if (!token) {
      setStatus('Für die Registrierung brauchst du einen Einladungscode.');
      return;
    }
    if (!validUsername(username)) {
      setStatus('Nutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.');
      return;
    }
    if (!email || password.length < 8) {
      setStatus('Bitte alle Pflichtfelder ausfüllen. Das Passwort braucht mindestens 8 Zeichen.');
      return;
    }

    try {
      setStatus('Einladungscode wird geprüft …');
      const { data: inviteRows, error: inviteError } = await sb.rpc('sc_validate_invite', { p_token: token });
      if (inviteError) {
        setStatus('Einladung konnte nicht geprüft werden: ' + inviteError.message);
        return;
      }
      const invite = Array.isArray(inviteRows) ? inviteRows[0] : inviteRows;
      if (!invite?.valid) {
        setStatus('Dieser Einladungscode ist ungültig oder abgelaufen.');
        return;
      }

      setStatus(`Einladung für „${invite.group_name || 'Crew'}“ gültig. Nutzername wird geprüft …`);
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
      localStorage.setItem('seasoncrew-pending-invite', token);
      const redirectTo = new URL('./', location.href);
      redirectTo.search = '';
      redirectTo.hash = '';
      redirectTo.searchParams.set('invite', token);

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo.href,
          data: { username, invite_token: token }
        }
      });

      if (error) {
        setStatus('Account konnte nicht erstellt werden: ' + error.message);
        return;
      }

      if (data.session) await sb.auth.signOut();
      setTab('login');
      setStatus(`Account angelegt. Bitte bestätige deine E-Mail. Danach wird deine Bewerbung für „${invite.group_name || 'die Crew'}“ automatisch übermittelt.`, true);
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

    loginForm?.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = $('loginEmail')?.value.trim();
      const password = $('loginPassword')?.value || '';
      setStatus('Einloggen …');
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          setStatus('Login fehlgeschlagen: ' + error.message);
          return;
        }
        if (!data.user?.email_confirmed_at) {
          await sb.auth.signOut();
          setStatus('Bitte bestätige zuerst deine E-Mail-Adresse.');
          return;
        }
        setStatus('Login erfolgreich. App wird geladen …', true);
        setTimeout(() => location.reload(), 350);
      } catch (error) {
        setStatus('Login fehlgeschlagen: ' + (error?.message || String(error)));
      }
    }, true);

    if (!window.seasonCrewModuleFailed) setStatus('Login bereit.');
  }

  const bootFallback = () => setTimeout(startFallback, 5000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFallback, { once: true });
  else bootFallback();

  window.addEventListener('seasoncrew-module-failed', () => setTimeout(startFallback, 300), { once: true });
})();
