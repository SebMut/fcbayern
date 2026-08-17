from pathlib import Path
import re

files=[Path('SeasonCrew/app.js'),Path('SeasonCrew/features-v1.js'),Path('SeasonCrew/product-v2.js')]
old="select:['group_id','fixture_id','ticket_id','attendee_name','attendee_user_id','paid','updated_by','updated_at']"
new="select:['group_id','fixture_id','ticket_id','attendee_name','attendee_user_id','updated_by','updated_at']"
for p in files:
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Realtime allocation selector not found in {p}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# Bump dynamic module cache chain.
p=Path('SeasonCrew/crew-delete.js')
s=p.read_text(encoding='utf-8')
s=s.replace("script.src='./features-v1.js?v=5'","script.src='./features-v1.js?v=6'",1)
s=s.replace("script.src='./product-v2.js?v=9'","script.src='./product-v2.js?v=10'",1)
p.write_text(s,encoding='utf-8')

p=Path('SeasonCrew/ui-v2.js')
s=p.read_text(encoding='utf-8').replace("script.src='./crew-delete.js?v=7'","script.src='./crew-delete.js?v=8'",1)
p.write_text(s,encoding='utf-8')

p=Path('SeasonCrew/index.html')
s=p.read_text(encoding='utf-8')
s=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build priorities-2 · Multi-User',s)
s=re.sub(r'app\.bundle\.js\?v=[^\"]+','app.bundle.js?v=20260817-priorities2',s)
s=re.sub(r'ui-v2\.js\?v=[^\"]+','ui-v2.js?v=20260817-priorities2',s)
p.write_text(s,encoding='utf-8')
