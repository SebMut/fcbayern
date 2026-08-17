from pathlib import Path
import re


def require_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} not found')
    return text.replace(old, new, 1)

# Core app: real login audit + escape ticket metadata rendered via innerHTML.
app_path=Path('SeasonCrew/app.js')
app=app_path.read_text(encoding='utf-8')
if "sc_log_login" not in app:
    old="""    session=data.session;user=data.user;
    if(!session||!user){setStatus(els.authStatus,'Login fehlgeschlagen. Bitte erneut versuchen.');return}
    await enterApp();"""
    new="""    session=data.session;user=data.user;
    if(!session||!user){setStatus(els.authStatus,'Login fehlgeschlagen. Bitte erneut versuchen.');return}
    const {error:loginAuditError}=await sb.rpc('sc_log_login');if(loginAuditError)console.warn('Login-Audit',loginAuditError);
    await enterApp();"""
    app=require_replace(app,old,new,'app login audit')

raw="[t.block&&`Block ${t.block}`,t.row_label&&`Reihe ${t.row_label}`,t.seat&&`Sitz ${t.seat}`].filter(Boolean).join(' · ')"
safe="[t.block&&`Block ${esc(t.block)}`,t.row_label&&`Reihe ${esc(t.row_label)}`,t.seat&&`Sitz ${esc(t.seat)}`].filter(Boolean).join(' · ')"
if raw in app:
    app=app.replace(raw,safe)
app_path.write_text(app,encoding='utf-8')

# Active auth fallback intercepts login in capture phase, so audit there too.
auth_path=Path('SeasonCrew/auth-fallback-v6.js')
auth=auth_path.read_text(encoding='utf-8')
if "Login-Audit" not in auth:
    old="""      setStatus('Login erfolgreich. App wird geladen …', true);
      setTimeout(() => location.reload(), 250);"""
    new="""      const { error: loginAuditError } = await sb.rpc('sc_log_login');
      if (loginAuditError) console.warn('Login-Audit', loginAuditError);
      setStatus('Login erfolgreich. App wird geladen …', true);
      setTimeout(() => location.reload(), 250);"""
    auth=require_replace(auth,old,new,'fallback login audit')
auth_path.write_text(auth,encoding='utf-8')

# Role switcher: don't overwrite real build marker and state clearly that this is UI-only.
role_path=Path('SeasonCrew/role-switcher.js')
role=role_path.read_text(encoding='utf-8')
role=role.replace('<span>Ansicht als</span><select id="roleViewSelect" aria-label="Rolle für Testansicht">','<span>UI-Testansicht als</span><select id="roleViewSelect" aria-label="Rolle für UI-Testansicht" title="Nur Darstellung: Supabase-Rechte bleiben Superadmin">')
role=re.sub(r"  function finishBranding\(\)\{.*?\n  \}","  function finishBranding(){\n    // Build marker is owned by index.html. Never overwrite it from a helper script.\n  }",role,flags=re.S)
role_path.write_text(role,encoding='utf-8')

# Archives are management data; backend is admin-only now, UI must match that rule.
product_path=Path('SeasonCrew/product-v2.js')
product=product_path.read_text(encoding='utf-8')
old="""  function renderSeasonTools(){
    const form=$('settingsForm');if(!form||!state)return;let section=$('seasonManagement');"""
new="""  function renderSeasonTools(){
    const existing=$('seasonManagement');if(!admin()){existing?.remove();return}
    const form=$('settingsForm');if(!form||!state)return;let section=existing;"""
if old in product:
    product=product.replace(old,new,1)
product_path.write_text(product,encoding='utf-8')

# History: make login entries actually selectable/renderable.
history_path=Path('SeasonCrew/history.js')
history=history_path.read_text(encoding='utf-8')
history=history.replace("if(log.entity_type==='allocations')return'Belegung';","if(log.entity_type==='auth')return'Login';if(log.entity_type==='allocations')return'Belegung';",1)
needle="function summary(log){const a=log.before_data||{},b=log.after_data||{};"
if "log.entity_type==='auth'" not in history.split('function summary',1)[1].split("if(log.entity_type==='paypal')",1)[0]:
    history=history.replace(needle,needle+"\n if(log.entity_type==='auth'&&log.action==='login')return{title:'Login',sub:'Bei SeasonCrew angemeldet'};",1)
history_path.write_text(history,encoding='utf-8')

history_html_path=Path('SeasonCrew/history.html')
history_html=history_html_path.read_text(encoding='utf-8')
history_html=history_html.replace('<option value="login">Logins</option>','<option value="auth">Logins</option>')
history_html=re.sub(r'history\.js\?v=[^"\']+','history.js?v=20260817-audit1',history_html)
history_html_path.write_text(history_html,encoding='utf-8')

# Cache bust dependency chain.
ui_path=Path('SeasonCrew/ui-v2.js')
ui=ui_path.read_text(encoding='utf-8').replace("./crew-delete.js?v=3","./crew-delete.js?v=4")
ui_path.write_text(ui,encoding='utf-8')
crew_path=Path('SeasonCrew/crew-delete.js')
crew=crew_path.read_text(encoding='utf-8').replace("./product-v2.js?v=6","./product-v2.js?v=7")
crew_path.write_text(crew,encoding='utf-8')

index_path=Path('SeasonCrew/index.html')
html=index_path.read_text(encoding='utf-8')
html=re.sub(r'role-switcher\.js\?v=[^"\']+','role-switcher.js?v=20260817-audit1',html)
html=re.sub(r'ui-v2\.js\?v=[^"\']+','ui-v2.js?v=8',html)
html=re.sub(r'auth-fallback-v6\.js\?v=[^"\']+','auth-fallback-v6.js?v=20260817-audit1',html)
html=re.sub(r"import\('./app\.js\?v=[^'\"]+'\)","import('./app.js?v=20260817-audit1')",html)
html=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build audit-3a · Multi-User',html)
index_path.write_text(html,encoding='utf-8')
