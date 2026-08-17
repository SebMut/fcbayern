from pathlib import Path
p=Path('SeasonCrew/app.js')
s=p.read_text(encoding='utf-8')
start=s.find('async function savePaymentAmountAndLog(d,action){')
end=s.find('\n\nfunction renderSettings',start)
if start<0 or end<0:
    raise SystemExit('savePaymentAmountAndLog section not found')
new="""async function savePaymentAmountAndLog(d,action){
  await sb.from('sc_history').insert({group_id:currentGroup.id,actor_user_id:user.id,actor_name:profile.username,entity_type:'paypal',entity_id:d.m.id,action,before_data:{},after_data:{person:d.a.attendee_name,ticket:ticketLabel(d.t),opponent:d.m.o,match_label:d.match,amount:d.amount,paypal_me:cleanPaypal(currentGroup.paypal_me)}});
}"""
s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')
