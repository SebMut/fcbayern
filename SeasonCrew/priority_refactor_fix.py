from pathlib import Path
p=Path('SeasonCrew/priority_refactor_patch.py')
s=p.read_text(encoding='utf-8')

# Treat replacement code as literal text. re.sub's normal replacement parser would
# otherwise turn JavaScript escape sequences such as \n into real newlines.
old_helper='out, n = re.subn(pattern, replacement, text, count=1, flags=flags)'
new_helper='out, n = re.subn(pattern, lambda _m: replacement, text, count=1, flags=flags)'
if old_helper not in s:
    raise SystemExit('sub_once helper marker not found')
s=s.replace(old_helper,new_helper,1)

# The legacy payment preview is a one-line JS function. Replace the patch block
# with an exact string replacement so it cannot consume later handlers/functions.
start=s.find('s = sub_once(s, r"function updatePaymentPreview')
end=s.find('\n\ns = sub_once(s, r"async function savePaymentAmountAndLog',start)
if start<0 or end<0:
    raise SystemExit('payment preview patch block not found')
preview_patch=r'''old_payment_preview = """function updatePaymentPreview(){const d=paymentData();$('paymentPreview').textContent=d?`${money(d.amount)}\\n${d.match}${d.link?`\\n${d.link}`:'\\nPayPal.Me ist für diese Crew noch nicht hinterlegt.'}`:'Bitte gültigen Betrag eingeben.'}"""
new_payment_preview = """function updatePaymentPreview(){
  if(paymentContext?.a?.amount==null){$('paymentPreview').textContent='Preis noch nicht bekannt. Hinterlege zuerst den Spielpreis in den Crew-Einstellungen.';return}
  const d=paymentData();$('paymentPreview').textContent=d?`${money(d.amount)}\\n${d.match}${d.link?`\\n${d.link}`:'\\nPayPal.Me ist für diese Crew noch nicht hinterlegt.'}`:'Preis konnte nicht geladen werden.';
}"""
if old_payment_preview not in s:
    raise SystemExit('payment preview exact source missing')
s=s.replace(old_payment_preview,new_payment_preview,1)'''
s=s[:start]+preview_patch+s[end:]

# Leave the legacy allocation amount write intact during the main transformation;
# priority_refactor_post.py removes only that function afterwards.
start=s.find('s = sub_once(s, r"async function savePaymentAmountAndLog')
end=s.find('\n\n# Notify the price decorator',start)
if start<0 or end<0:
    raise SystemExit('payment log patch block not found')
s=s[:start]+"# PayPal allocation write cleanup is handled by priority_refactor_post.py"+s[end:]

p.write_text(s,encoding='utf-8')
