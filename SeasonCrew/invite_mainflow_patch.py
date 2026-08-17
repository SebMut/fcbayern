from pathlib import Path
import re

app_path = Path('SeasonCrew/app.js')
app = app_path.read_text(encoding='utf-8')

old_settab = """function setAuthTab(tab){
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
  els.loginForm.classList.toggle('hidden',tab!=='login');els.signupForm.classList.toggle('hidden',tab!=='signup');setStatus(els.authStatus,'');
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthTab(b.dataset.authTab)));
"""
new_settab = """function pendingInviteToken(){
  const urlToken=extractInviteToken(new URL(location.href).searchParams.get('invite'));
  const savedToken=extractInviteToken(localStorage.getItem('seasoncrew-pending-invite'));
  return urlToken||savedToken;
}
function syncSignupInvite(){
  const token=pendingInviteToken();
  const input=$('signupInvite');
  if(token){
    localStorage.setItem('seasoncrew-pending-invite',token);
    if(input&&!input.value.trim())input.value=token;
  }
  return token;
}
function setAuthTab(tab){
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
  els.loginForm.classList.toggle('hidden',tab!=='login');els.signupForm.classList.toggle('hidden',tab!=='signup');setStatus(els.authStatus,'');
  if(tab==='signup')syncSignupInvite();
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthTab(b.dataset.authTab)));
const initialInvite=syncSignupInvite();
if(initialInvite)setAuthTab('signup');
"""
if old_settab not in app:
    raise SystemExit('setAuthTab block not found')
app = app.replace(old_settab, new_settab, 1)

old_signup_start = """els.signupForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const username=$('signupUsername').value.trim(),email=$('signupEmail').value.trim();
  if(!validUsername(username)){setStatus(els.authStatus,'Nutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.');return}
  setStatus(els.authStatus,'Nutzername wird geprüft …');
"""
new_signup_start = """els.signupForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const token=extractInviteToken($('signupInvite')?.value)||pendingInviteToken();
  const username=$('signupUsername').value.trim(),email=$('signupEmail').value.trim();
  if(!validUsername(username)){setStatus(els.authStatus,'Nutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.');return}
  if(token){
    setStatus(els.authStatus,'Einladungscode wird geprüft …');
    const {data:inviteRows,error:inviteError}=await sb.rpc('sc_validate_invite',{p_token:token});
    const invite=Array.isArray(inviteRows)?inviteRows[0]:inviteRows;
    if(inviteError){setStatus(els.authStatus,'Einladung konnte nicht geprüft werden: '+inviteError.message);return}
    if(!invite?.valid){setStatus(els.authStatus,'Dieser Einladungscode ist ungültig oder abgelaufen.');return}
    localStorage.setItem('seasoncrew-pending-invite',token);
  }
  setStatus(els.authStatus,'Nutzername wird geprüft …');
"""
if old_signup_start not in app:
    raise SystemExit('signup start block not found')
app = app.replace(old_signup_start, new_signup_start, 1)

old_signup_call = """  setStatus(els.authStatus,'Account wird erstellt …');
  const redirectTo=new URL('./',location.href);redirectTo.search='';redirectTo.hash='';
  const {data,error}=await sb.auth.signUp({email,password:$('signupPassword').value,options:{emailRedirectTo:redirectTo.href,data:{username}}});
"""
new_signup_call = """  setStatus(els.authStatus,'Account wird erstellt …');
  const redirectTo=new URL('./',location.href);redirectTo.search='';redirectTo.hash='';
  if(token)redirectTo.searchParams.set('invite',token);
  const metadata={username};if(token)metadata.invite_token=token;
  const {data,error}=await sb.auth.signUp({email,password:$('signupPassword').value,options:{emailRedirectTo:redirectTo.href,data:metadata}});
"""
if old_signup_call not in app:
    raise SystemExit('signup call block not found')
app = app.replace(old_signup_call, new_signup_call, 1)

app_path.write_text(app, encoding='utf-8')

index_path = Path('SeasonCrew/index.html')
html = index_path.read_text(encoding='utf-8')
html = re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User', 'Pilot V1 · Build invite-1 · Multi-User', html, count=1)
index_path.write_text(html, encoding='utf-8')
