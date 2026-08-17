from pathlib import Path
p=Path('SeasonCrew/priority_refactor_patch.py')
s=p.read_text(encoding='utf-8')
old='r"async function savePaymentAmountAndLog\\(d,action\\)\\{.*?\\n\\}"'
new='r"async function savePaymentAmountAndLog\\(d,action\\)\\{.*?\\n\\}(?=\\n\\nfunction renderSettings)"'
if old not in s:
    raise SystemExit('payment log matcher source not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
