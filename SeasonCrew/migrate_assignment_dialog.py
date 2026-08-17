from pathlib import Path

app=Path('SeasonCrew/app.js')
s=app.read_text(encoding='utf-8')

old="let presenceChannel=null,realtimeChannel=null,paymentContext=null,reloadTimer=null;"
new="let presenceChannel=null,realtimeChannel=null,paymentContext=null,assignmentContext=null,reloadTimer=null;"
if old not in s: raise SystemExit('state declaration not found')
s=s.replace(old,new,1)

old="document.querySelectorAll('[data-assign-fixture]').forEach(el=>el.addEventListener('click',()=>assignTicket(el.dataset.assignFixture,el.dataset.ticketId)));"
new="document.querySelectorAll('[data-assign-fixture]').forEach(el=>el.addEventListener('click',()=>openAssignTicket(el.dataset.assignFixture,el.dataset.ticketId)));"
if old not in s: raise SystemExit('assignment click binding not found')
s=s.replace(old,new,1)

old="""async function assignTicket(fixtureId,ticketId){
  const row={group_id:currentGroup.id,fixture_id:fixtureId,ticket_id:ticketId,attendee_name:profile?.username||'',attendee_user_id:user.id,paid:false,amount:Number(currentGroup.default_price)||50,updated_by:user.id};
  const {error}=await sb.from('sc_allocations').insert(row);
  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return}
  const saved=await readAllocation(fixtureId,ticketId);replaceAllocation(saved||row);render();
}
"""
new="""function openAssignTicket(fixtureId,ticketId){
  if(!isAdmin())return;
  const m=fixtureById(fixtureId),t=ticketById(ticketId);if(!m||!t)return;
  assignmentContext={fixtureId,ticketId};
  $('assignTicketTitle').textContent=`${ticketLabel(t)} · ${m.o}`;
  $('assignTicketMeta').textContent=`${gameDate(m)[0]}${gameDate(m)[1]?` · ${gameDate(m)[1]}`:''} · ${[t.block&&`Block ${t.block}`,t.row_label&&`Reihe ${t.row_label}`,t.seat&&`Sitz ${t.seat}`].filter(Boolean).join(' · ')}`;
  $('assignTicketMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+members.map(x=>`<option value="${x.user_id}">${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}</option>`).join('');
  $('assignTicketMember').value='';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');
  $('assignTicketDialog').showModal();
}
async function assignTicket(fixtureId,ticketId,attendeeUserId,attendeeName){
  if(!isAdmin())return false;
  const row={group_id:currentGroup.id,fixture_id:fixtureId,ticket_id:ticketId,attendee_name:String(attendeeName||'').trim(),attendee_user_id:attendeeUserId||null,paid:false,amount:Number(currentGroup.default_price)||50,updated_by:user.id};
  const {error}=await sb.from('sc_allocations').insert(row);
  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return false}
  const saved=await readAllocation(fixtureId,ticketId);replaceAllocation(saved||row);render();return true;
}
$('assignTicketMember').addEventListener('change',()=>{if($('assignTicketMember').value)$('assignTicketGuest').value=''});
$('assignTicketGuest').addEventListener('input',()=>{if($('assignTicketGuest').value.trim())$('assignTicketMember').value=''});
function closeAssignTicketDialog(){$('assignTicketDialog').close();assignmentContext=null;setStatus($('assignTicketStatus'),'')}
$('assignTicketCancel').addEventListener('click',closeAssignTicketDialog);
$('assignTicketCancelBottom').addEventListener('click',closeAssignTicketDialog);
$('assignTicketForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!assignmentContext||!isAdmin())return;
  const memberId=$('assignTicketMember').value,guest=$('assignTicketGuest').value.trim();
  const chosen=memberId?members.find(x=>x.user_id===memberId):null;
  if(!chosen&&!guest){setStatus($('assignTicketStatus'),'Bitte ein Crew-Mitglied auswählen oder einen Ticket-Gast eintragen.');return}
  const saveBtn=$('assignTicketSave');saveBtn.disabled=true;saveBtn.textContent='Wird vergeben …';
  const ok=await assignTicket(assignmentContext.fixtureId,assignmentContext.ticketId,guest?null:chosen.user_id,guest||chosen.username);
  saveBtn.disabled=false;saveBtn.textContent='Karte vergeben';
  if(!ok)return;
  $('assignTicketDialog').close();assignmentContext=null;showToast('Karte vergeben');
});
"""
if old not in s: raise SystemExit('assignTicket function not found')
s=s.replace(old,new,1)
app.write_text(s,encoding='utf-8')

index=Path('SeasonCrew/index.html')
h=index.read_text(encoding='utf-8')
marker='  <dialog id="paymentDialog" class="dialog">'
dialog='''  <dialog id="assignTicketDialog" class="dialog assignTicketDialog">
    <form class="dialogCard small" id="assignTicketForm">
      <div class="dialogHead"><div><small>Karte vergeben</small><h3 id="assignTicketTitle">Ticket auswählen</h3></div><button id="assignTicketCancel" type="button" class="closeButton" aria-label="Schließen">×</button></div>
      <div class="assignTicketMeta" id="assignTicketMeta"></div>
      <label>Crew-Mitglied<select id="assignTicketMember"><option value="">Crew-Mitglied wählen …</option></select></label>
      <div class="assignTicketOr"><span>oder</span></div>
      <label>Ticket-Gast<input id="assignTicketGuest" autocomplete="off" maxlength="80" placeholder="z. B. Max Mustermann"></label>
      <small class="fieldHint">Für Personen ohne SeasonCrew-Account.</small>
      <div class="dialogStatus" id="assignTicketStatus"></div>
      <div class="dialogActions"><button class="secondaryButton" id="assignTicketCancelBottom" type="button">Abbrechen</button><button class="primaryButton" id="assignTicketSave" type="submit">Karte vergeben</button></div>
    </form>
  </dialog>

'''
if 'id="assignTicketDialog"' not in h:
    if marker not in h: raise SystemExit('payment dialog marker not found')
    h=h.replace(marker,dialog+marker,1)
brand='<link rel="stylesheet" href="brand-v2.css?v=20260817-paidgreen2">'
if 'assignment-dialog.css' not in h:
    if brand not in h: raise SystemExit('brand css marker not found')
    h=h.replace(brand,brand+'\n  <link rel="stylesheet" href="assignment-dialog.css?v=1">',1)
index.write_text(h,encoding='utf-8')

Path('SeasonCrew/assignment-dialog.css').write_text('''.assignTicketDialog .dialogCard{width:min(460px,calc(100vw - 28px))}.assignTicketMeta{margin:-4px 0 14px;padding:10px 12px;border:1px solid #DFE0E5;border-radius:11px;background:#F8F8FA;color:#686B76;font:700 10px/1.45 Manrope,system-ui,sans-serif}.assignTicketDialog select{appearance:auto}.assignTicketOr{display:flex;align-items:center;gap:9px;margin:3px 0;color:#92949C;font:800 8px Manrope,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}.assignTicketOr:before,.assignTicketOr:after{content:"";height:1px;flex:1;background:#E5E6EA}.assignTicketDialog .dialogActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.assignTicketDialog .dialogActions button{width:100%}.assignTicketDialog #assignTicketSave:disabled{opacity:.62;cursor:wait}@media(max-width:560px){.assignTicketDialog .dialogCard{width:100%}.assignTicketDialog .dialogActions{grid-template-columns:1fr}}
''',encoding='utf-8')
