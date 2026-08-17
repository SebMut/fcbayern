from pathlib import Path
p=Path('SeasonCrew/priority_refactor_patch.py')
s=p.read_text(encoding='utf-8')
start=s.find('s = sub_once(s, r"async function savePaymentAmountAndLog')
end=s.find('\n\n# Notify the price decorator', start)
if start<0 or end<0:
    raise SystemExit('payment log patch block not found')
s=s[:start]+"# PayPal allocation write cleanup is handled by priority_refactor_post.py"+s[end:]
p.write_text(s,encoding='utf-8')
