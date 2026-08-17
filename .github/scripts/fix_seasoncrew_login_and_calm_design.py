from pathlib import Path

root = Path(__file__).resolve().parents[2]
app = root / 'SeasonCrew' / 'app.js'
css = root / 'SeasonCrew' / 'brand-v2.css'
index = root / 'SeasonCrew' / 'index.html'
history = root / 'SeasonCrew' / 'history.html'

# --- Fix pilot login flow: no email-confirmation gate while pilot mode is active ---
s = app.read_text(encoding='utf-8')
old = """els.loginForm.addEventListener('submit',async e=>{\n  e.preventDefault();setStatus(els.authStatus,'Einloggen …');\n  const {data,error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});\n  if(error){setStatus(els.authStatus,'Login fehlgeschlagen: '+error.message);return}\n  if(!data.user?.email_confirmed_at){await sb.auth.signOut();setStatus(els.authStatus,'Bitte bestätige zuerst deine E-Mail-Adresse.');return}\n  session=data.session;user=data.user;await enterApp();\n});"""
new = """els.loginForm.addEventListener('submit',async e=>{\n  e.preventDefault();setStatus(els.authStatus,'Einloggen …');\n  try{\n    const {data,error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});\n    if(error){setStatus(els.authStatus,/invalid login credentials/i.test(error.message||'')?'E-Mail oder Passwort ist falsch.':'Login fehlgeschlagen: '+error.message);return}\n    session=data.session;user=data.user;\n    if(!session||!user){setStatus(els.authStatus,'Login fehlgeschlagen. Bitte erneut versuchen.');return}\n    await enterApp();\n  }catch(error){setStatus(els.authStatus,'Login fehlgeschlagen: '+(error?.message||String(error)))}\n});"""
if old not in s:
    raise SystemExit('Login snippet not found')
s = s.replace(old, new, 1)

old = """  setAuthTab('login');\n  if(!data.session){setStatus(els.authStatus,'Account angelegt. Bitte öffne jetzt die Bestätigungs-Mail und bestätige deine E-Mail-Adresse.',true);return}\n  await sb.auth.signOut();\n  setStatus(els.authStatus,'Account angelegt. Für den Live-Betrieb muss die E-Mail-Bestätigung im Supabase-Projekt aktiviert sein.',true);"""
new = """  if(data.session&&data.user){\n    session=data.session;user=data.user;setStatus(els.authStatus,'Account erstellt. App wird geladen …',true);await enterApp();return\n  }\n  setAuthTab('login');\n  setStatus(els.authStatus,'Account angelegt. Bitte logge dich jetzt ein.',true);"""
if old not in s:
    raise SystemExit('Signup confirmation snippet not found')
s = s.replace(old, new, 1)

old = """async function enterApp(){\n  if(!user?.email_confirmed_at){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');setStatus(els.authStatus,'Bitte bestätige zuerst deine E-Mail-Adresse.');return}\n  document.body.classList.remove('auth-locked');els.authScreen.classList.add('hidden');"""
new = """async function enterApp(){\n  if(!user){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');return}\n  document.body.classList.remove('auth-locked');els.authScreen.classList.add('hidden');"""
if old not in s:
    raise SystemExit('enterApp confirmation snippet not found')
s = s.replace(old, new, 1)
app.write_text(s, encoding='utf-8')

# --- Calm SaaS refinement: centered, smaller, lime as accent only ---
c = css.read_text(encoding='utf-8')
marker = '/* calm-saas-v2 */'
if marker in c:
    c = c[:c.index(marker)].rstrip() + '\n'
calm = r'''

/* calm-saas-v2 */
/* Less visual noise: compact, centered SaaS layout with lime used as an accent. */
main,.topbarInner{max-width:1120px!important}
.authScreen{
  justify-content:center!important;align-items:center!important;
  padding:28px 18px!important;
  background:linear-gradient(180deg,#fbfcfc 0%,#f4f7f6 100%)!important;
}
.authScreen:before{
  left:50%!important;top:42px!important;transform:translateX(-50%)!important;
  width:230px!important;height:112px!important;opacity:1!important;
  background:url('seasoncrew-logo.svg?v=20260817-2') center/contain no-repeat!important;
  pointer-events:none!important;
}
.authScreen:after{display:none!important;pointer-events:none!important}
.authShell{
  width:min(410px,calc(100vw - 32px))!important;
  margin:108px auto 0!important;padding:23px!important;
  border-radius:18px!important;border:1px solid #e3e8e8!important;
  box-shadow:0 16px 46px rgba(31,42,48,.09)!important;
}
.authForm h1{font-size:25px!important;text-align:center!important;letter-spacing:-.035em!important}
.authForm>p{text-align:center!important;max-width:330px;margin-left:auto!important;margin-right:auto!important}
.authTabs{margin-bottom:19px!important}
.authForm input{padding:10px 11px!important}
.authForm .primaryButton{margin-top:7px!important}
.primaryButton{padding:10px 14px!important;box-shadow:none!important;border-radius:9px!important}
.secondaryButton,.headerButton{padding:9px 11px!important;border-radius:9px!important}

.groupHero{
  padding:21px 23px!important;border-radius:18px!important;
  background:linear-gradient(135deg,#182126,#243036)!important;
  box-shadow:0 14px 38px rgba(31,42,48,.12)!important;
}
.groupHero:before{width:230px!important;height:230px!important;right:-125px!important;top:-145px!important;opacity:.16!important}
.groupHero:after{display:none!important}
.groupHero h1{font-size:clamp(31px,4vw,45px)!important;margin:9px 0 7px!important}
.seasonPill{background:rgba(183,255,0,.08)!important;border-color:rgba(183,255,0,.25)!important}
.statsGrid{gap:9px!important;margin:12px 0 18px!important}
.statCard{padding:13px 14px!important;border-radius:13px!important;box-shadow:0 4px 16px rgba(31,42,48,.03)!important}
.statCard.primary,.statCard.warn,.statCard.money{border-top-width:2px!important}
.scheduleShell{padding:18px!important;border-radius:18px!important;box-shadow:0 10px 34px rgba(31,42,48,.045)!important}
.gameCard{border-radius:13px!important}
.filterGroup button.active{color:#fff!important}
.filterGroup button.active:after{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--brand-lime);margin-left:6px;vertical-align:middle}

@media(max-width:900px){
  .authScreen{align-items:center!important;padding:20px!important}
  .authScreen:before{top:24px!important;width:190px!important;height:92px!important;opacity:1!important}
  .authShell{width:min(400px,100%)!important;margin:88px auto 0!important;padding:21px!important}
}
@media(max-width:760px){
  main{padding-left:12px!important;padding-right:12px!important}
  .authScreen{padding:14px!important}
  .authScreen:before{top:15px!important;width:165px!important;height:78px!important}
  .authShell{margin-top:72px!important;padding:19px!important;border-radius:16px!important}
  .authForm h1{font-size:23px!important}
  .groupHero{padding:18px!important;border-radius:16px!important}
  .scheduleShell{padding:14px!important;border-radius:16px!important}
}
'''
css.write_text(c.rstrip() + calm + '\n', encoding='utf-8')

# Cache-bust branding/app and use current logo as favicon/theme.
i = index.read_text(encoding='utf-8')
i = i.replace('<meta name="theme-color" content="#061a3a">','<meta name="theme-color" content="#1F2A30">')
import re
i = re.sub(r'<link rel="icon" href="[^"]+">', '<link rel="icon" href="seasoncrew-mark.svg?v=20260817-2" type="image/svg+xml">', i, count=1)
i = re.sub(r'brand-v2\.css\?v=[^"\']+', 'brand-v2.css?v=20260817-calm2', i)
i = re.sub(r"import\('\./app\.js\?v=[^']+'\)", "import('./app.js?v=20260817-loginfix4')", i)
i = i.replace('Build brand-v2-2','Build calm-saas-2')
index.write_text(i, encoding='utf-8')

h = history.read_text(encoding='utf-8')
h = h.replace('<meta name="theme-color" content="#061a3a">','<meta name="theme-color" content="#1F2A30">')
h = re.sub(r'brand-v2\.css\?v=[^"\']+', 'brand-v2.css?v=20260817-calm2', h)
history.write_text(h, encoding='utf-8')

print('SeasonCrew login + calm SaaS patch applied')
