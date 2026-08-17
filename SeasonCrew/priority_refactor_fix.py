from pathlib import Path
p=Path('SeasonCrew/priority_refactor_patch.py')
s=p.read_text(encoding='utf-8')
start=s.find('s = sub_once(s, r"async function savePaymentAmountAndLog')
end=s.find('\n\n# Notify the price decorator', start)
if start<0 or end<0:
    raise SystemExit('payment log patch block not found')
replacement=r'''old_payment_log = """async function savePaymentAmountAndLog(d,action){
  await sb.from('sc_allocations').update({amount:d.amount,updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',d.m.id).eq('ticket_id',d.t.id);
  await sb.from('sc_history').insert({group_id:currentGroup.id,actor_user_id:user.id,actor_name:profile.username,entity_type:'paypal',entity_id:d.m.id,action,before_data:{},after_data:{person:d.a.attendee_name,ticket:ticketLabel(d.t),opponent:d.m.o,match_label:d.match,amount:d.amount,paypal_me:cleanPaypal(currentGroup.paypal_me)}});
  const a=allocationByIds(d.m.id,d.t.id);if(a)a.amount=d.amount;renderStats();
}"""
new_payment_log = """async function savePaymentAmountAndLog(d,action){
  await sb.from('sc_history').insert({group_id:currentGroup.id,actor_user_id:user.id,actor_name:profile.username,entity_type:'paypal',entity_id:d.m.id,action,before_data:{},after_data:{person:d.a.attendee_name,ticket:ticketLabel(d.t),opponent:d.m.o,match_label:d.match,amount:d.amount,paypal_me:cleanPaypal(currentGroup.paypal_me)}});
}"""
if old_payment_log not in s:
    raise SystemExit('payment log exact source missing')
s = s.replace(old_payment_log,new_payment_log,1)'''
s=s[:start]+replacement+s[end:]
p.write_text(s,encoding='utf-8')
