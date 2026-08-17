from pathlib import Path
import re

p=Path('SeasonCrew/index.html')
s=p.read_text(encoding='utf-8')

script='  <script src="demo-entry.js?v=1"></script>\n'
if 'demo-entry.js' not in s:
    marker='  <script src="role-switcher.js'
    if marker not in s:
        raise SystemExit('role-switcher marker not found')
    s=s.replace(marker,script+marker,1)

s=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build demo-1 · Multi-User',s)
p.write_text(s,encoding='utf-8')
