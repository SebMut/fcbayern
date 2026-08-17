from pathlib import Path
import re

ROOT=Path('SeasonCrew')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: source marker not found')
    return text.replace(old,new,1)

def regex_once(text, pattern, repl, label, flags=re.S):
    out,n=re.subn(pattern,lambda m:repl,text,count=1,flags=flags)
    if n!=1:
        raise SystemExit(f'{label}: replacement count {n}')
    return out

# -----------------------------------------------------------------------------
# Shared Supabase client / common browser core
# -----------------------------------------------------------------------------
(ROOT/'seasoncrew-core.js').write_text(r'''(()=>{
  if(window.SeasonCrewCore)return;
  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  let sharedClient=null;

  function client(){
    if(sharedClient)return sharedClient;
    if(!window.supabase?.createClient)return null;
    sharedClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return sharedClient;
  }

  function appUrl(params={}){
    const url=new URL('./',location.href);
    url.search='';url.hash='';
    Object.entries(params).forEach(([key,value])=>{
      if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value));
    });
    return url.href;
  }

  window.SeasonCrewCore=Object.freeze({
    client,
    appUrl,
    config:Object.freeze({supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY})
  });
})();
''',encoding='utf-8')

# -----------------------------------------------------------------------------
# Main app: one client + real password reset/recovery flow
# -----------------------------------------------------------------------------
p=ROOT/'app.js'; s=p.read_text(encoding='utf-8')
s=replace_once(s,"import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';\n\nconst SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\nconst SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\nconst sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});", "const sb=window.SeasonCrewCore?.client?.();\nif(!sb){const status=document.getElementById('authStatus');if(status)status.textContent='Die Login-Komponente konnte nicht geladen werden. Bitte Seite neu laden.';throw new Error('SeasonCrew Supabase core unavailable')}", 'app shared client')
s=replace_once(s,"  authScreen:$('authScreen'),authStatus:$('authStatus'),loginForm:$('loginForm'),signupForm:$('signupForm'),", "  authScreen:$('authScreen'),authStatus:$('authStatus'),authTabs:document.querySelector('.authTabs'),loginForm:$('loginForm'),signupForm:$('signupForm'),forgotForm:$('forgotForm'),recoveryForm:$('recoveryForm'),", 'app auth elements')

old_auth=r'''function setAuthTab(tab){
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
  els.loginForm.classList.toggle('hidden',tab!=='login');els.signupForm.classList.toggle('hidden',tab!=='signup');setStatus(els.authStatus,'');
  if(tab==='signup')syncSignupInvite();
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthTab(b.dataset.authTab)));
const initialInvite=syncSignupInvite();
if(initialInvite)setAuthTab('signup');

els.loginForm.addEventListener('submit',async e=>{'''
new_auth=r'''function showAuthView(view,{keepStatus=false}={}){
  const forms={login:els.loginForm,signup:els.signupForm,forgot:els.forgotForm,recovery:els.recoveryForm};
  Object.entries(forms).forEach(([name,form])=>form?.classList.toggle('hidden',name!==view));
  const tabbed=view==='login'||view==='signup';
  els.authTabs?.classList.toggle('hidden',!tabbed);
  if(tabbed)document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===view));
  if(view==='signup')syncSignupInvite();
  if(!keepStatus)setStatus(els.authStatus,'');
}
function setAuthTab(tab){showAuthView(tab)}
function recoveryRequested(){const u=new URL(location.href);return u.searchParams.get('recovery')==='1'||/type=recovery/i.test(location.hash)}
function clearRecoveryUrl(){const u=new URL(location.href);u.searchParams.delete('recovery');u.hash='';history.replaceState({},'',u)}
function showRecoveryView(message='Lege jetzt ein neues Passwort für deinen SeasonCrew-Account fest.'){
  document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');showAuthView('recovery');setStatus(els.authStatus,message,true);
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthTab(b.dataset.authTab)));
$('forgotPasswordBtn')?.addEventListener('click',()=>{if($('forgotEmail')&&!$('forgotEmail').value)$('forgotEmail').value=$('loginEmail')?.value||'';showAuthView('forgot')});
$('forgotBackBtn')?.addEventListener('click',()=>showAuthView('login'));
$('recoveryCancelBtn')?.addEventListener('click',async()=>{await sb.auth.signOut();session=null;user=null;clearRecoveryUrl();showAuthView('login');setStatus(els.authStatus,'Passwortänderung abgebrochen. Du kannst dich normal einloggen.')});
const initialInvite=syncSignupInvite();
if(initialInvite)setAuthTab('signup');

els.forgotForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('forgotEmail')?.value.trim();if(!email)return;
  setStatus(els.authStatus,'Reset-Link wird angefordert …');
  const redirectTo=window.SeasonCrewCore.appUrl({recovery:'1'});
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  if(error){setStatus(els.authStatus,/rate limit/i.test(error.message||'')?'Zu viele Anfragen. Bitte versuche es etwas später erneut.':'Der Reset-Link konnte gerade nicht versendet werden. Bitte versuche es erneut.');return}
  setStatus(els.authStatus,'Falls zu dieser E-Mail ein SeasonCrew-Account existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.',true);
});

els.recoveryForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const password=$('recoveryPassword')?.value||'',confirmPassword=$('recoveryPasswordConfirm')?.value||'';
  if(password.length<8){setStatus(els.authStatus,'Das neue Passwort muss mindestens 8 Zeichen lang sein.');return}
  if(password!==confirmPassword){setStatus(els.authStatus,'Die beiden Passwörter stimmen nicht überein.');return}
  setStatus(els.authStatus,'Passwort wird geändert …');
  const {data:{session:activeSession}}=await sb.auth.getSession();
  if(!activeSession){setStatus(els.authStatus,'Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');return}
  const {error}=await sb.auth.updateUser({password});
  if(error){setStatus(els.authStatus,'Passwort konnte nicht geändert werden: '+error.message);return}
  await sb.auth.signOut();session=null;user=null;clearRecoveryUrl();$('recoveryPassword').value='';$('recoveryPasswordConfirm').value='';showAuthView('login');setStatus(els.authStatus,'Passwort geändert. Du kannst dich jetzt mit dem neuen Passwort einloggen.',true);
});

sb.auth.onAuthStateChange((event,nextSession)=>{
  if(event!=='PASSWORD_RECOVERY')return;
  session=nextSession||null;user=nextSession?.user||null;showRecoveryView();
});

els.loginForm.addEventListener('submit',async e=>{'''
s=replace_once(s,old_auth,new_auth,'app auth flow')

old_boot=r'''async function boot(){
  const invite=extractInviteToken(new URL(location.href).searchParams.get('invite'));if(invite)localStorage.setItem('seasoncrew-pending-invite',invite);
  const {data:{session:s}}=await sb.auth.getSession();session=s;user=s?.user||null;
  if(!user){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');if(invite){setAuthTab('signup');setStatus(els.authStatus,'Du wurdest eingeladen. Erstelle einen Account oder logge dich ein; danach wird die Beitrittsanfrage automatisch gestellt.',true)}else{setStatus(els.authStatus,'')}return}
  await enterApp();
}
boot();'''
new_boot=r'''async function boot(){
  const invite=extractInviteToken(new URL(location.href).searchParams.get('invite'));if(invite)localStorage.setItem('seasoncrew-pending-invite',invite);
  const isRecovery=recoveryRequested();
  const {data:{session:s}}=await sb.auth.getSession();session=s;user=s?.user||null;
  if(isRecovery){
    showRecoveryView(user?'Reset-Link bestätigt. Bitte wähle jetzt dein neues Passwort.':'Reset-Link wird geprüft …');
    return;
  }
  if(!user){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');if(invite){setAuthTab('signup');setStatus(els.authStatus,'Du wurdest eingeladen. Erstelle einen Account oder logge dich ein; danach wird die Beitrittsanfrage automatisch gestellt.',true)}else{showAuthView('login');setStatus(els.authStatus,'')}return}
  await enterApp();
}
boot();'''
s=replace_once(s,old_boot,new_boot,'app boot recovery')
p.write_text(s,encoding='utf-8')

# -----------------------------------------------------------------------------
# HTML auth UI + simpler loader
# -----------------------------------------------------------------------------
p=ROOT/'index.html'; s=p.read_text(encoding='utf-8')
s=replace_once(s,'        <button class="primaryButton" type="submit">Einloggen</button>\n      </form>', '        <button class="primaryButton" type="submit">Einloggen</button>\n        <button class="authTextButton" id="forgotPasswordBtn" type="button">Passwort vergessen?</button>\n      </form>','forgot link')
marker='      <div class="authStatus" id="authStatus" aria-live="polite"></div>'
forms=r'''      <form class="authForm hidden" id="forgotForm">
        <h1>Passwort vergessen?</h1>
        <p>Gib deine E-Mail-Adresse ein. Wenn ein Account existiert, schicken wir dir einen sicheren Link zum Zurücksetzen.</p>
        <label>E-Mail<input id="forgotEmail" type="email" autocomplete="email" required placeholder="du@example.de"></label>
        <button class="primaryButton" type="submit">Reset-Link senden</button>
        <button class="authTextButton" id="forgotBackBtn" type="button">← Zurück zum Login</button>
      </form>
      <form class="authForm hidden" id="recoveryForm">
        <h1>Neues Passwort.</h1>
        <p>Der Reset-Link ist nur für diese Passwortänderung gedacht.</p>
        <label>Neues Passwort<input id="recoveryPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="mindestens 8 Zeichen"></label>
        <label>Passwort wiederholen<input id="recoveryPasswordConfirm" type="password" minlength="8" autocomplete="new-password" required placeholder="noch einmal eingeben"></label>
        <button class="primaryButton" type="submit">Passwort speichern</button>
        <button class="authTextButton" id="recoveryCancelBtn" type="button">Abbrechen & zum Login</button>
      </form>
'''
s=replace_once(s,marker,forms+marker,'auth extra forms')

scripts=r'''  <script src="demo-entry.js?v=2"></script>
  <script src="role-switcher.js?v=20260817-authcore1"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0" onerror="document.getElementById('authStatus').textContent='Die Login-Komponente konnte nicht geladen werden. Bitte Seite neu laden.'"></script>
  <script src="seasoncrew-core.js?v=20260817-core1"></script>
  <script src="ui-v2.js?v=20260817-core1"></script>
  <script src="pricing-runtime-v2.js?v=20260817-core1"></script>
  <script src="wish-actions-v2.js?v=20260817-core1"></script>
  <script src="app.bundle.js?v=20260817-authcore1"></script>
  <script type="module" src="club-kits.js?v=20260817-authcore1"></script>'''
s=regex_once(s,r'  <script src="demo-entry\.js\?v=2"></script>.*?<!-- SEASONCREW_APP_LOADER_END -->',scripts,'index script stack')
s=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build auth-core-ci-1 · Multi-User',s)
p.write_text(s,encoding='utf-8')

# CSS for secondary auth actions.
p=ROOT/'styles.css'; s=p.read_text(encoding='utf-8')
needle='.authForm .primaryButton{width:100%;margin-top:8px}'
addition=needle+".authTextButton{display:block;width:100%;border:0;background:transparent;color:#667286;padding:10px 6px 2px;font-size:11px;font-weight:800;text-align:center}.authTextButton:hover{color:var(--ink);text-decoration:underline}.authTabs.hidden{display:none!important}"
if '.authTextButton{' not in s:s=replace_once(s,needle,addition,'auth css')
p.write_text(s,encoding='utf-8')

# -----------------------------------------------------------------------------
# Remove auth monkeypatch and route all modules through shared core client.
# -----------------------------------------------------------------------------
p=ROOT/'role-switcher.js'; s=p.read_text(encoding='utf-8')
s=regex_once(s,r"  const PROD_AUTH_REDIRECT='https://sebmut\.github\.io/fcbayern/SeasonCrew/';\n  const nativeFetch=window\.fetch\?\.bind\(window\);\n  if\(nativeFetch&&!window\.__seasonCrewAuthRedirectFix\)\{.*?\n  \}\n", "  const nativeFetch=window.fetch?.bind(window);\n", 'role auth fetch monkeypatch')
p.write_text(s,encoding='utf-8')

# ui-v2
p=ROOT/'ui-v2.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n  const $=id=>document.getElementById(id);\n  let noteClient=null;", "  const $=id=>document.getElementById(id);", 'ui client constants')
s=regex_once(s,r'''  function getNoteClient\(\)\{.*?\n  \}\n''',"  function getNoteClient(){return window.SeasonCrewCore?.client?.()||null}\n",'ui shared client')
s=s.replace("script.src='./crew-delete.js?v=8'","script.src='./crew-delete.js?v=9'",1)
p.write_text(s,encoding='utf-8')

# crew-delete
p=ROOT/'crew-delete.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n  let sb=null;\n  const $=id=>document.getElementById(id);", "  const $=id=>document.getElementById(id);",'crew client constants')
s=regex_once(s,r'''  function client\(\)\{.*?\n  \}\n''',"  function client(){return window.SeasonCrewCore?.client?.()||null}\n",'crew shared client')
s=s.replace("script.src='./features-v1.js?v=6'","script.src='./features-v1.js?v=7'",1).replace("script.src='./product-v2.js?v=10'","script.src='./product-v2.js?v=11'",1)
p.write_text(s,encoding='utf-8')

# features-v1
p=ROOT/'features-v1.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n  const $=id=>document.getElementById(id);\n  let sb=null,session=null,state=null,channel=null,loadTimer=null,loading=false,lastGroupId='';", "  const $=id=>document.getElementById(id);\n  let session=null,state=null,channel=null,loadTimer=null,loading=false,lastGroupId='';",'features constants')
s=regex_once(s,r'''  function client\(\)\{.*?\n  \}\n''',"  function client(){return window.SeasonCrewCore?.client?.()||null}\n",'features shared client')
p.write_text(s,encoding='utf-8')

# product-v2
p=ROOT/'product-v2.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n  const $=id=>document.getElementById(id);\n  let sb=null,session=null,state=null,channel=null,timer=null,loading=false,fixtureMap=new Map();", "  const $=id=>document.getElementById(id);\n  let session=null,state=null,channel=null,timer=null,loading=false,fixtureMap=new Map();",'product constants')
s=replace_once(s,"  function client(){if(sb)return sb;if(!window.supabase?.createClient)return null;sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}","  function client(){return window.SeasonCrewCore?.client?.()||null}",'product shared client')
p.write_text(s,encoding='utf-8')

# pricing runtime
p=ROOT/'pricing-runtime-v2.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n  const $=id=>document.getElementById(id);\n  let client=null,priceMap=new Map(),ticketMap=new Map(),loadTimer=null,statsTimer=null,loading=false,lastGroup='';", "  const $=id=>document.getElementById(id);\n  let priceMap=new Map(),ticketMap=new Map(),loadTimer=null,statsTimer=null,loading=false,lastGroup='';",'pricing constants')
s=replace_once(s,"  function sb(){if(client)return client;if(!window.supabase?.createClient)return null;client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}","  function sb(){return window.SeasonCrewCore?.client?.()||null}",'pricing shared client')
p.write_text(s,encoding='utf-8')

# wish actions
p=ROOT/'wish-actions-v2.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n  let sb=null,decorateTimer=null;\n  const $=id=>document.getElementById(id);", "  let decorateTimer=null;\n  const $=id=>document.getElementById(id);",'wish constants')
s=regex_once(s,r'''  function client\(\)\{.*?\n  \}\n''',"  function client(){return window.SeasonCrewCore?.client?.()||null}\n",'wish shared client')
p.write_text(s,encoding='utf-8')

# price management
p=ROOT/'price-management.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';\n  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';\n",'', 'price constants')
s=replace_once(s,"  let client=null,groupData=null,fixtures=[],activeTab='profile';","  let groupData=null,fixtures=[],activeTab='profile';",'price client var')
s=regex_once(s,r'''  async function ensureClient\(\)\{.*?\n  \}\n''',"  async function ensureClient(){const client=window.SeasonCrewCore?.client?.();if(!client)throw new Error('Supabase ist noch nicht geladen.');return client}\n",'price shared client')
p.write_text(s,encoding='utf-8')

# History uses same client as app.
p=ROOT/'history.js';s=p.read_text(encoding='utf-8')
s=replace_once(s,"import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';\nconst sb=createClient('https://kmhadzujovvxvpgblgkk.supabase.co','sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y',{auth:{persistSession:true,autoRefreshToken:true}});","const sb=window.SeasonCrewCore?.client?.();\nif(!sb)throw new Error('SeasonCrew Supabase core unavailable');",'history shared client')
p.write_text(s,encoding='utf-8')

p=ROOT/'history.html';s=p.read_text(encoding='utf-8')
s=replace_once(s,'<script type="module" src="history.js?v=20260817-audit1"></script>','<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0"></script>\n<script src="seasoncrew-core.js?v=20260817-core1"></script>\n<script type="module" src="history.js?v=20260817-core1"></script>','history scripts')
p.write_text(s,encoding='utf-8')

# Old fallback is deliberately removed; the main bundle is now the only auth implementation.
fallback=ROOT/'auth-fallback-v6.js'
if fallback.exists():fallback.unlink()

# -----------------------------------------------------------------------------
# Stable bundle workflow: no auth fallback / no createClient source rewriting.
# -----------------------------------------------------------------------------
workflow=Path('.github/workflows/seasoncrew-bundle.yml')
workflow.write_text(r'''name: SeasonCrew browser bundle

on:
  push:
    branches: [main]
    paths:
      - 'SeasonCrew/app.js'
      - 'SeasonCrew/schedule.js'
      - 'SeasonCrew/seasoncrew-core.js'
      - '.github/workflows/seasoncrew-bundle.yml'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Build Safari-compatible bundle
        working-directory: SeasonCrew
        run: npx --yes esbuild@0.25.9 app.js --bundle --format=iife --target=safari15 --outfile=app.bundle.js
      - name: Install simple app loader and cache bust
        env:
          SOURCE_SHA: ${{ github.sha }}
        run: |
          python - <<'PY'
          from pathlib import Path
          import os,re
          p=Path('SeasonCrew/index.html');s=p.read_text();short=os.environ.get('SOURCE_SHA','build')[:7]
          s=re.sub(r'app\.bundle\.js\?v=[^\"]+',f'app.bundle.js?v={short}',s)
          s=re.sub(r'club-kits\.js\?v=[^\"]+',f'club-kits.js?v={short}',s)
          if 'auth-fallback' in s:raise SystemExit('Legacy auth fallback reference remains')
          p.write_text(s)
          PY
      - name: Verify generated JavaScript
        run: |
          node --check SeasonCrew/app.bundle.js
          node --check SeasonCrew/seasoncrew-core.js
          node --check SeasonCrew/product-v2.js
          node --check SeasonCrew/features-v1.js
          node --check SeasonCrew/pricing-runtime-v2.js
          node --check SeasonCrew/wish-actions-v2.js
      - name: Commit generated browser bundle
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add SeasonCrew/app.bundle.js SeasonCrew/index.html
          if git diff --cached --quiet; then exit 0; fi
          git commit -m "[skip ci] Build SeasonCrew Safari bundle"
          git push
''',encoding='utf-8')

# -----------------------------------------------------------------------------
# Playwright regression suite + permanent CI
# -----------------------------------------------------------------------------
(ROOT/'package.json').write_text(r'''{
  "name":"seasoncrew-tests",
  "private":true,
  "type":"module",
  "scripts":{
    "build":"esbuild app.js --bundle --format=iife --target=safari15 --outfile=app.bundle.js",
    "test:e2e":"playwright test"
  },
  "devDependencies":{
    "@playwright/test":"1.55.0",
    "esbuild":"0.25.9"
  }
}
''',encoding='utf-8')
(ROOT/'playwright.config.js').write_text(r'''import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  timeout:30000,
  retries:1,
  workers:1,
  use:{baseURL:'http://127.0.0.1:4173',headless:true,trace:'retain-on-failure'},
  webServer:{command:'python3 -m http.server 4173 --directory ..',url:'http://127.0.0.1:4173/SeasonCrew/index.html',reuseExistingServer:true,timeout:15000}
});
''',encoding='utf-8')
(ROOT/'tests/e2e').mkdir(parents=True,exist_ok=True)
(ROOT/'tests/e2e/auth.spec.js').write_text(r'''import { test, expect } from '@playwright/test';

async function stubPublicServices(page){
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0',route=>route.fulfill({
    contentType:'application/javascript',
    body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null}),resetPasswordForEmail:async()=>({data:{},error:null}),updateUser:async()=>({data:{user:{}},error:null})}})}`
  }));
  await page.route('https://api.github.com/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
}

test('login exposes a password reset flow without duplicate auth implementation',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#loginForm')).toBeVisible();
  await page.getByRole('button',{name:'Passwort vergessen?'}).click();
  await expect(page.locator('#forgotForm')).toBeVisible();
  await expect(page.locator('#signupForm')).toBeHidden();
  await page.locator('#forgotEmail').fill('test@example.de');
  await page.getByRole('button',{name:'← Zurück zum Login'}).click();
  await expect(page.locator('#loginForm')).toBeVisible();
});

test('recovery callback opens the new-password form',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html?recovery=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#recoveryForm')).toBeVisible();
  await expect(page.locator('#recoveryPassword')).toBeVisible();
  await expect(page.locator('#recoveryPasswordConfirm')).toBeVisible();
});
''',encoding='utf-8')
(ROOT/'tests/e2e/demo.spec.js').write_text(r'''import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.removeItem('seasoncrew-customer-demo-v2'));
  await page.goto('/SeasonCrew/demo.html',{waitUntil:'domcontentloaded'});
});

test('admin can move an allocation and duplicate members stay blocked',async({page})=>{
  await page.locator('[data-action="change-assignment"][data-match="m2"][data-ticket="t1"]').click();
  await expect(page.locator('#assignDialog')).toHaveAttribute('open','');
  await page.locator('#assignSeat').selectOption('t3');
  await page.locator('#assignSaveBtn').click();
  await expect(page.locator('#toast')).toContainText('Zuweisung geändert');
  await expect(page.locator('.ticketCard').filter({has:page.locator('[data-action="change-assignment"][data-match="m2"][data-ticket="t3"]')})).toContainText('Alex');

  await page.locator('[data-action="assign"][data-match="m2"][data-ticket="t1"]').first().click();
  await expect(page.locator('#assignMember option[value="lea"]')).toBeDisabled();
  await page.locator('#assignGuest').fill('Lea');
  await page.locator('#assignSaveBtn').click();
  await expect(page.locator('#toast')).toContainText('ist Crew-Mitglied');
});

test('member view hides other peoples payment state',async({page})=>{
  await page.locator('#roleView').selectOption('guest');
  const chris=page.locator('.ticketCard').filter({hasText:'Chris'}).first();
  await expect(chris).toContainText('zugewiesen');
  await expect(chris).not.toContainText('Zahlung offen');
  await expect(chris).not.toContainText('55,00');
  const alex=page.locator('.ticketCard').filter({hasText:'Alex'}).first();
  await expect(alex).toContainText('bezahlt');
});
''',encoding='utf-8')

Path('.github/workflows/seasoncrew-ci.yml').write_text(r'''name: SeasonCrew CI

on:
  push:
    branches: [main]
    paths:
      - 'SeasonCrew/**'
      - '.github/workflows/seasoncrew-ci.yml'
  pull_request:
    paths:
      - 'SeasonCrew/**'
      - '.github/workflows/seasoncrew-ci.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: SeasonCrew/package-lock.json
      - name: Install dependencies
        working-directory: SeasonCrew
        run: npm ci
      - name: Install Chromium
        working-directory: SeasonCrew
        run: npx playwright install --with-deps chromium
      - name: Rebuild app bundle
        working-directory: SeasonCrew
        run: npm run build
      - name: Verify shared client architecture
        run: |
          node --check SeasonCrew/app.bundle.js
          node --check SeasonCrew/seasoncrew-core.js
          node --check SeasonCrew/product-v2.js
          node --check SeasonCrew/features-v1.js
          node --check SeasonCrew/pricing-runtime-v2.js
          node --check SeasonCrew/wish-actions-v2.js
          test ! -e SeasonCrew/auth-fallback-v6.js
          if grep -R --include='*.js' -n "createClient(" SeasonCrew | grep -v 'SeasonCrew/seasoncrew-core.js'; then
            echo 'A second Supabase client implementation exists.'
            exit 1
          fi
          if grep -R -n 'auth-fallback' SeasonCrew/index.html .github/workflows/seasoncrew-bundle.yml; then
            echo 'Legacy auth fallback reference exists.'
            exit 1
          fi
      - name: Browser regression tests
        working-directory: SeasonCrew
        run: npm run test:e2e
''',encoding='utf-8')
