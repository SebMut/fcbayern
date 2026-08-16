from pathlib import Path

app = Path('SeasonCrew/app.js')
s = app.read_text()

replacements = [
    ("const username=$('signupUsername').value.trim(),display_name=$('signupName').value.trim(),email=$('signupEmail').value.trim();", "const username=$('signupUsername').value.trim(),email=$('signupEmail').value.trim();"),
    ("data:{display_name,username}", "data:{username}"),
    (".select('id,display_name,username,is_superadmin')", ".select('id,username,is_superadmin')"),
    ("profile=data||{id:user.id,display_name:user.email?.split('@')[0]||'Fan',username:user.email?.split('@')[0]||'fan',is_superadmin:false};", "profile=data||{id:user.id,username:user.email?.split('@')[0]||'fan',is_superadmin:false};"),
    (".select('id,display_name,username').in('id',ids)", ".select('id,username').in('id',ids)"),
    ("{display_name:'Mitglied',username:'mitglied'}", "{username:'mitglied'}"),
    ("{display_name:'Bewerber',username:'bewerber'}", "{username:'bewerber'}"),
    ("profile?.username||profile?.display_name||'Fan'", "profile?.username||'Fan'"),
    ("profile?.display_name||profile?.username||''", "profile?.username||''"),
    ("actor_name:profile.display_name", "actor_name:profile.username"),
    ("$('settingsTitle').textContent=currentGroup.name;$('profileUsername').value=profile?.username||'';$('profileName').value=profile?.display_name||'';$('profileEmail').value=user?.email||'';", "$('settingsTitle').textContent=currentGroup.name;$('profileUsername').value=profile?.username||'';$('profileEmail').value=user?.email||'';"),
    ("<b>${esc(m.display_name||m.username||'Mitglied')}</b><small>@${esc(m.username||'mitglied')}</small>", "<b>@${esc(m.username||'mitglied')}</b>"),
    ("<b>${esc(r.display_name||r.username||'Bewerber')}</b><small>@${esc(r.username||'bewerber')} · Anfrage", "<b>@${esc(r.username||'bewerber')}</b><small>Anfrage"),
    ("const person=request?.display_name||request?.username||'Person';", "const person=request?.username||'Person';"),
    ("name:profile.username||profile.display_name", "name:profile.username"),
]
for old,new in replacements:
    s = s.replace(old,new)

old_profile = """$('saveProfileBtn').addEventListener('click',async()=>{
  const name=$('profileName').value.trim(),username=$('profileUsername').value.trim();if(!name||!validUsername(username)){setStatus($('settingsStatus'),'Bitte gültigen Anzeigenamen und Nutzernamen eingeben.');return}
  if(username.toLowerCase()!==String(profile.username||'').toLowerCase()){
    const {data:available,error:checkError}=await sb.rpc('sc_username_available',{p_username:username});if(checkError||!available){setStatus($('settingsStatus'),checkError?.message||'Dieser Nutzername ist bereits vergeben.');return}
  }
  const {error}=await sb.from('sc_profiles').update({display_name:name,username,updated_at:new Date().toISOString()}).eq('id',user.id);if(error){setStatus($('settingsStatus'),error.message);return}
  await sb.auth.updateUser({data:{display_name:name,username}});profile.display_name=name;profile.username=username;setStatus($('settingsStatus'),'Profil gespeichert ✓',true);render();
});"""
new_profile = """$('saveProfileBtn').addEventListener('click',async()=>{
  const username=$('profileUsername').value.trim();if(!validUsername(username)){setStatus($('settingsStatus'),'Bitte einen gültigen Nutzernamen eingeben.');return}
  if(username.toLowerCase()!==String(profile.username||'').toLowerCase()){
    const {data:available,error:checkError}=await sb.rpc('sc_username_available',{p_username:username});if(checkError||!available){setStatus($('settingsStatus'),checkError?.message||'Dieser Nutzername ist bereits vergeben.');return}
  }
  const {error}=await sb.from('sc_profiles').update({username,updated_at:new Date().toISOString()}).eq('id',user.id);if(error){setStatus($('settingsStatus'),error.message);return}
  await sb.auth.updateUser({data:{username}});profile.username=username;setStatus($('settingsStatus'),'Profil gespeichert ✓',true);render();
});"""
if old_profile not in s:
    raise SystemExit('saveProfile block not found')
s = s.replace(old_profile,new_profile,1)

if 'display_name' in s or 'signupName' in s or 'profileName' in s:
    raise SystemExit('app.js still contains display-name references')
app.write_text(s)

fallback = Path('SeasonCrew/auth-fallback-v5.js')
f = fallback.read_text()
f = f.replace("    const display_name = $('signupName')?.value.trim() || '';\n", '')
f = f.replace("    if (!display_name || !email || password.length < 8) {", "    if (!email || password.length < 8) {")
f = f.replace("data: { display_name, username, invite_token: token }", "data: { username, invite_token: token }")
if 'display_name' in f or 'signupName' in f:
    raise SystemExit('auth fallback still contains display-name references')
fallback.write_text(f)

html = Path('SeasonCrew/index.html')
h = html.read_text()
h = h.replace('        <label>Anzeigename<input id="signupName" autocomplete="name" required placeholder="z. B. Mika"></label>\n','')
h = h.replace('          <label>Anzeigename<input id="profileName"></label>\n','')
h = h.replace('Pilot V1 · Build crew-settings-1', 'Pilot V1 · Build username-only-1')
h = h.replace('auth-fallback-v5.js?v=4', 'auth-fallback-v5.js?v=5')
h = h.replace("./app.js?v=20260816-approvalfix2", "./app.js?v=20260816-usernameonly1")
if 'signupName' in h or 'profileName' in h or '>Anzeigename<' in h:
    raise SystemExit('index.html still contains Anzeigename')
html.write_text(h)

history = Path('SeasonCrew/history.js')
hs = history.read_text()
hs = hs.replace("${b.name||'Bewerber'} freigegeben", "@${b.username||b.name||'Bewerber'} freigegeben")
hs = hs.replace("${b.name||'Bewerber'} abgelehnt", "@${b.username||b.name||'Bewerber'} abgelehnt")
history.write_text(hs)
