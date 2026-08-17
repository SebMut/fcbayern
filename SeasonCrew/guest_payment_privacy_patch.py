from pathlib import Path
import re

app_path=Path('SeasonCrew/app.js')
app=app_path.read_text(encoding='utf-8')
old="const {error}=await sb.from('sc_allocations').upsert(row,{onConflict:'group_id,fixture_id,ticket_id'});"
new="const {error}=await sb.from('sc_allocations').insert(row);"
if old not in app:
    raise SystemExit('assignment upsert not found')
app=app.replace(old,new,1)
app_path.write_text(app,encoding='utf-8')

index_path=Path('SeasonCrew/index.html')
html=index_path.read_text(encoding='utf-8')
html=re.sub(r"import\('./app\.js\?v=[^'\"]+'\)","import('./app.js?v=20260817-private4')",html)
html=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build audit-3d · Multi-User',html)
index_path.write_text(html,encoding='utf-8')
