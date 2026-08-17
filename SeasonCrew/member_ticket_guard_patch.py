from pathlib import Path

# Production app
p=Path('SeasonCrew/app.js')
s=p.read_text(encoding='utf-8')
old="""  $('assignTicketMember').innerHTML='<option value=\"\">Crew-Mitglied wählen …</option>'+members.map(x=>`<option value=\"${x.user_id}\">${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}</option>`).join('');
  $('assignTicketMember').value=preselectUserId&&members.some(x=>x.user_id===preselectUserId)?preselectUserId:'';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');$('assignTicketDialog').showModal();
"""
new="""  const assignedMemberIds=new Set(allocations.filter(a=>a.fixture_id===fixtureId&&a.attendee_user_id).map(a=>a.attendee_user_id));
  $('assignTicketMember').innerHTML='<option value=\"\">Crew-Mitglied wählen …</option>'+members.map(x=>{const used=assignedMemberIds.has(x.user_id);return `<option value=\"${x.user_id}\" ${used?'disabled':''}>${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}${used?' · bereits Ticket':''}</option>`}).join('');
  $('assignTicketMember').value=preselectUserId&&members.some(x=>x.user_id===preselectUserId)&&!assignedMemberIds.has(preselectUserId)?preselectUserId:'';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');$('assignTicketDialog').showModal();
"""
if old not in s: raise SystemExit('production member select marker missing')
s=s.replace(old,new,1)
old="""  if(!chosen&&!guest){setStatus($('assignTicketStatus'),'Bitte ein Crew-Mitglied auswählen oder einen Ticket-Gast eintragen.');return}
  const saveBtn=$('assignTicketSave');saveBtn.disabled=true;saveBtn.textContent='Wird vergeben …';
"""
new="""  if(!chosen&&!guest){setStatus($('assignTicketStatus'),'Bitte ein Crew-Mitglied auswählen oder einen Ticket-Gast eintragen.');return}
  if(chosen&&allocations.some(a=>a.fixture_id===assignmentContext.fixtureId&&a.attendee_user_id===chosen.user_id)){setStatus($('assignTicketStatus'),'Dieses Mitglied hat für dieses Spiel bereits ein Ticket.');return}
  const saveBtn=$('assignTicketSave');saveBtn.disabled=true;saveBtn.textContent='Wird vergeben …';
"""
if old not in s: raise SystemExit('production submit marker missing')
s=s.replace(old,new,1)
old="""  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return false}
"""
new="""  if(error){if(error.code==='23505'&&String(error.message||'').includes('sc_allocations_unique_member_per_fixture')){setStatus($('assignTicketStatus'),'Dieses Mitglied hat für dieses Spiel bereits ein Ticket.');showToast('Mitglied hat bereits ein Ticket')}else{showToast('Karte konnte nicht vergeben werden')}console.error(error);return false}
"""
if old not in s: raise SystemExit('production error marker missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Demo app
p=Path('SeasonCrew/demo.js')
s=p.read_text(encoding='utf-8')
old="""    $('assignMember').innerHTML='<option value=\"\">Crew-Mitglied wählen …</option>'+state.members.map(x=>`<option value=\"${x.id}\">${esc(x.name)} · ${esc(x.role)}</option>`).join('');$('assignMember').value='';$('assignGuest').value='';openModal('assignDialog');
"""
new="""    const assignedMemberIds=new Set(state.allocations.filter(a=>a.matchId===matchId&&a.memberId).map(a=>a.memberId));
    $('assignMember').innerHTML='<option value=\"\">Crew-Mitglied wählen …</option>'+state.members.map(x=>{const used=assignedMemberIds.has(x.id);return `<option value=\"${x.id}\" ${used?'disabled':''}>${esc(x.name)} · ${esc(x.role)}${used?' · bereits Ticket':''}</option>`}).join('');$('assignMember').value='';$('assignGuest').value='';openModal('assignDialog');
"""
if old not in s: raise SystemExit('demo member select marker missing')
s=s.replace(old,new,1)
old="""    const memberId=$('assignMember').value,guest=$('assignGuest').value.trim();if(!memberId&&!guest){toast('Bitte Person oder Ticket-Gast wählen');return}
"""
new="""    const memberId=$('assignMember').value,guest=$('assignGuest').value.trim();if(!memberId&&!guest){toast('Bitte Person oder Ticket-Gast wählen');return}
    if(memberId&&state.allocations.some(a=>a.matchId===assignContext.matchId&&a.memberId===memberId)){toast('Dieses Mitglied hat für dieses Spiel bereits ein Ticket.');return}
"""
if old not in s: raise SystemExit('demo submit guard marker missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
