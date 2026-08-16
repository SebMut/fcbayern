from pathlib import Path
import re
p=Path('SeasonCrew/index.html')
s=p.read_text()
s=re.sub(r'ui-v2\.css\?v=\d+', 'ui-v2.css?v=3', s)
s=re.sub(r'ui-v2\.js\?v=\d+', 'ui-v2.js?v=3', s)
s=s.replace('Pilot V1 · Build username-only-1', 'Pilot V1 · Build guest-notes-2')
p.write_text(s)
