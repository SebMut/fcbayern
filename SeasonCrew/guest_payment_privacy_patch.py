from pathlib import Path
import re

app_path=Path('SeasonCrew/app.js')
app=app_path.read_text(encoding='utf-8')
old='''async function assignTicket(fixtureId,ticketId){
  const row={group_id:currentGroup.id,fixture_id:fixtureId,ticket_id:ticketId,attendee_name:profile?.username||'',attendee_user_id:user.id,paid:false,amount:Number(currentGroup.default_price)||50,updated_by:user.id};
  const {data,error}=await sb.from('sc_allocations').upsert(row,{onConflict:'group_id,fixture_id,ticket_id'}).select().single();
  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return}allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==allocationKey(fixtureId,ticketId));allocations.push(data);render();
}
async function releaseTicket(fixtureId,ticketId){
  const {error}=await sb.from('sc_allocations').delete().eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Karte konnte nicht freigegeben werden');return}
  allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==allocationKey(fixtureId,ticketId));render();
}
async function saveAttendee(fixtureId,ticketId,name){
  const {data,error}=await sb.from('sc_allocations').update({attendee_name:name.trim(),updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId).select().single();if(error){showToast('Name konnte nicht gespeichert werden');return}
  replaceAllocation(data);showToast('Name gespeichert');
}
async function savePaid(fixtureId,ticketId,paid){
  const {data,error}=await sb.from('sc_allocations').update({paid,updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId).select().single();if(error){showToast('Zahlstatus konnte nicht gespeichert werden');return}replaceAllocation(data);render();
}
function replaceAllocation(data){const key=allocationKey(data.fixture_id,data.ticket_id);allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==key);allocations.push(data)}'''
new='''async function readAllocation(fixtureId,ticketId){
  const {data,error}=await sb.rpc('sc_get_allocations',{p_group:currentGroup.id});
  if(error){console.warn('Allocation refresh',error);return null}
  return (data||[]).find(a=>a.fixture_id===fixtureId&&a.ticket_id===ticketId)||null;
}
async function assignTicket(fixtureId,ticketId){
  const row={group_id:currentGroup.id,fixture_id:fixtureId,ticket_id:ticketId,attendee_name:profile?.username||'',attendee_user_id:user.id,paid:false,amount:Number(currentGroup.default_price)||50,updated_by:user.id};
  const {error}=await sb.from('sc_allocations').upsert(row,{onConflict:'group_id,fixture_id,ticket_id'});
  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return}
  const saved=await readAllocation(fixtureId,ticketId);replaceAllocation(saved||row);render();
}
async function releaseTicket(fixtureId,ticketId){
  const {error}=await sb.from('sc_allocations').delete().eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Karte konnte nicht freigegeben werden');return}
  allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==allocationKey(fixtureId,ticketId));render();
}
async function saveAttendee(fixtureId,ticketId,name){
  const {error}=await sb.from('sc_allocations').update({attendee_name:name.trim(),updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Name konnte nicht gespeichert werden');return}
  const saved=await readAllocation(fixtureId,ticketId);if(saved)replaceAllocation(saved);showToast('Name gespeichert');
}
async function savePaid(fixtureId,ticketId,paid){
  const {error}=await sb.from('sc_allocations').update({paid,updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Zahlstatus konnte nicht gespeichert werden');return}
  const saved=await readAllocation(fixtureId,ticketId);if(saved)replaceAllocation(saved);render();
}
function replaceAllocation(data){if(!data)return;const key=allocationKey(data.fixture_id,data.ticket_id);allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==key);allocations.push(data)}'''
if old not in app:
    raise SystemExit('allocation write block not found')
app=app.replace(old,new,1)
app_path.write_text(app,encoding='utf-8')

index_path=Path('SeasonCrew/index.html')
html=index_path.read_text(encoding='utf-8')
html=re.sub(r"import\('./app\.js\?v=[^'\"]+'\)","import('./app.js?v=20260817-private3')",html)
html=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build audit-3c · Multi-User',html)
index_path.write_text(html,encoding='utf-8')
