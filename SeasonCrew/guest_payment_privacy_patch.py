from pathlib import Path
import re

SAFE_REALTIME_COLS="['group_id','fixture_id','ticket_id','attendee_name','attendee_user_id','paid','updated_by','updated_at']"

# app.js: use masked server-side allocation reader and keep realtime payload financial-data-free.
app_path=Path('SeasonCrew/app.js')
app=app_path.read_text(encoding='utf-8')
old="sb.from('sc_allocations').select('*').eq('group_id',gid),"
new="sb.rpc('sc_get_allocations',{p_group:gid}),"
if old not in app:
    raise SystemExit('app allocation read not found')
app=app.replace(old,new,1)
app=app.replace("table:'sc_allocations',filter:`group_id=eq.${gid}`",f"table:'sc_allocations',select:{SAFE_REALTIME_COLS},filter:`group_id=eq.${{gid}}`")
# Admins may approve guests; only owner/superadmin may promote a new applicant directly to admin.
needle="async function renderInviteAdmin(){\n  if(!isAdmin())return;"
if needle not in app:
    raise SystemExit('renderInviteAdmin start not found')
app=app.replace(needle,needle+"\n  const canGrantAdmin=['superadmin','owner'].includes(effectiveRole());",1)
needle2="  document.querySelectorAll('[data-approve-guest]').forEach(b=>b.onclick=()=>decideRequest(b.dataset.approveGuest,true,'guest'));"
if needle2 not in app:
    raise SystemExit('request controls not found')
app=app.replace(needle2,"  if(!canGrantAdmin)document.querySelectorAll('[data-approve-admin]').forEach(b=>b.remove());\n"+needle2,1)
app_path.write_text(app,encoding='utf-8')

# features-v1.js: same masked reader + safe realtime columns.
features_path=Path('SeasonCrew/features-v1.js')
features=features_path.read_text(encoding='utf-8')
old="c.from('sc_allocations').select('group_id,fixture_id,ticket_id,attendee_name,attendee_user_id,paid,amount').eq('group_id',gid),"
if old not in features:
    raise SystemExit('features allocation read not found')
features=features.replace(old,"c.rpc('sc_get_allocations',{p_group:gid}),",1)
features=features.replace("table:'sc_allocations',filter:`group_id=eq.${gid}`",f"table:'sc_allocations',select:{SAFE_REALTIME_COLS},filter:`group_id=eq.${{gid}}`")
features_path.write_text(features,encoding='utf-8')

# product-v2.js: masked reader + safe realtime columns.
product_path=Path('SeasonCrew/product-v2.js')
product=product_path.read_text(encoding='utf-8')
old="c.from('sc_allocations').select('group_id,fixture_id,ticket_id,attendee_name,attendee_user_id,paid,amount').eq('group_id',group),"
if old not in product:
    raise SystemExit('product allocation read not found')
product=product.replace(old,"c.rpc('sc_get_allocations',{p_group:group}),",1)
product=product.replace("table:'sc_allocations',filter:`group_id=eq.${group}`",f"table:'sc_allocations',select:{SAFE_REALTIME_COLS},filter:`group_id=eq.${{group}}`")
product_path.write_text(product,encoding='utf-8')

# pricing-runtime-v2.js: masked reader; own amount is returned to guest, all amounts to admins.
pricing_path=Path('SeasonCrew/pricing-runtime-v2.js')
pricing=pricing_path.read_text(encoding='utf-8')
old="c.from('sc_allocations').select('fixture_id,paid,attendee_user_id,attendee_name').eq('group_id',gid),"
if old not in pricing:
    raise SystemExit('pricing allocation read not found')
pricing=pricing.replace(old,"c.rpc('sc_get_allocations',{p_group:gid}),",1)
pricing_path.write_text(pricing,encoding='utf-8')

# Dependency/cache chain.
crew_path=Path('SeasonCrew/crew-delete.js')
crew=crew_path.read_text(encoding='utf-8')
crew=re.sub(r"features-v1\.js\?v=\d+","features-v1.js?v=4",crew)
crew=re.sub(r"product-v2\.js\?v=\d+","product-v2.js?v=8",crew)
crew_path.write_text(crew,encoding='utf-8')

ui_path=Path('SeasonCrew/ui-v2.js')
ui=ui_path.read_text(encoding='utf-8')
ui=re.sub(r"crew-delete\.js\?v=\d+","crew-delete.js?v=5",ui)
ui_path.write_text(ui,encoding='utf-8')

index_path=Path('SeasonCrew/index.html')
html=index_path.read_text(encoding='utf-8')
html=re.sub(r'ui-v2\.js\?v=[^"\']+','ui-v2.js?v=9',html)
html=re.sub(r'pricing-runtime-v2\.js\?v=[^"\']+','pricing-runtime-v2.js?v=20260817-private2',html)
html=re.sub(r"import\('./app\.js\?v=[^'\"]+'\)","import('./app.js?v=20260817-private2')",html)
html=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build audit-3b · Multi-User',html)
index_path.write_text(html,encoding='utf-8')
