from pathlib import Path
import re

# Production dialog
p=Path('SeasonCrew/index.html')
s=p.read_text(encoding='utf-8')
a='<div class="assignTicketMeta" id="assignTicketMeta"></div>\n      <label>Crew-Mitglied<select id="assignTicketMember"><option value="">Crew-Mitglied wählen …</option></select></label>'
b='<div class="assignTicketMeta" id="assignTicketMeta"></div>\n      <label>Sitzplatz / Dauerkarte<select id="assignTicketSeat"></select></label>\n      <label>Crew-Mitglied<select id="assignTicketMember"><option value="">Crew-Mitglied wählen …</option></select></label>'
if a not in s: raise SystemExit('index marker missing')
p.write_text(s.replace(a,b,1),encoding='utf-8')

# Production logic
p=Path('SeasonCrew/app.js')
s=p.read_text(encoding='utf-8')
old=re.search(r"function openAssignTicket\(fixtureId,ticketId,preselectUserId=''\)\{.*?\n\}",s,re.S)
if not old: raise SystemExit('openAssignTicket missing')
new=("function updateAssignTicketSeatMeta(){\n"
     "  if(!assignmentContext)return;const m=fixtureById(assignmentContext.fixtureId),t=ticketById(assignmentContext.ticketId);if(!m||!t)return;\n"
     "  $('assignTicketTitle').textContent=`${ticketLabel(t)} · ${m.o}`;\n"
     "  $('assignTicketMeta').textContent=`${gameDate(m)[0]}${gameDate(m)[1]?` · ${gameDate(m)[1]}`:''} · ${[t.block&&`Block ${t.block}`,t.row_label&&`Reihe ${t.row_label}`,t.seat&&`Sitz ${t.seat}`].filter(Boolean).join(' · ')}`;\n"
     "}\n"
     "function openAssignTicket(fixtureId,ticketId,preselectUserId=''){\n"
     "  if(!isAdmin())return;const m=fixtureById(fixtureId),t=ticketById(ticketId);if(!m||!t)return;assignmentContext={fixtureId,ticketId};\n"
     "  const availableTickets=tickets.filter(x=>x.id===ticketId||!allocationByIds(fixtureId,x.id));\n"
     "  $('assignTicketSeat').innerHTML=availableTickets.map(x=>`<option value=\"${x.id}\">${esc(ticketLabel(x))} · ${esc([x.block&&`Block ${x.block}`,x.row_label&&`Reihe ${x.row_label}`,x.seat&&`Sitz ${x.seat}`].filter(Boolean).join(' · '))}</option>`).join('');\n"
     "  $('assignTicketSeat').value=ticketId;updateAssignTicketSeatMeta();\n"
     "  $('assignTicketMember').innerHTML='<option value=\"\">Crew-Mitglied wählen …</option>'+members.map(x=>`<option value=\"${x.user_id}\">${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}</option>`).join('');\n"
     "  $('assignTicketMember').value=preselectUserId&&members.some(x=>x.user_id===preselectUserId)?preselectUserId:'';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');$('assignTicketDialog').showModal();\n"
     "}")
s=s[:old.start()]+new+s[old.end():]
marker="$('assignTicketMember').addEventListener('change',()=>{if($('assignTicketMember').value)$('assignTicketGuest').value=''});"
if marker not in s: raise SystemExit('production listener marker missing')
s=s.replace(marker,"$('assignTicketSeat').addEventListener('change',()=>{if(!assignmentContext)return;assignmentContext.ticketId=$('assignTicketSeat').value;updateAssignTicketSeatMeta()});\n"+marker,1)
p.write_text(s,encoding='utf-8')

# Demo dialog
p=Path('SeasonCrew/demo.html')
s=p.read_text(encoding='utf-8')
a='<label>Person<select id="assignMember"></select></label>'
b='<label>Sitzplatz / Dauerkarte<select id="assignSeat"></select></label>\n      '+a
if a not in s: raise SystemExit('demo html marker missing')
p.write_text(s.replace(a,b,1),encoding='utf-8')

# Demo logic
p=Path('SeasonCrew/demo.js')
s=p.read_text(encoding='utf-8')
old=re.search(r"  function openAssign\(matchId,ticketId\)\{.*?\n  \}",s,re.S)
if not old: raise SystemExit('demo openAssign missing')
new=("  function updateDemoAssignSeat(){if(!assignContext)return;const m=match(assignContext.matchId),t=ticket(assignContext.ticketId);if(m&&t)$('assignTitle').textContent=`${t.label} · ${m.opponent}`;}\n"
     "  function openAssign(matchId,ticketId){\n"
     "    if(!isAdmin()){toast('In der Mitgliedsansicht können freie Karten nicht vergeben werden.');return}\n"
     "    assignContext={matchId,ticketId};const m=match(matchId),t=ticket(ticketId);if(!m||!t)return;const available=state.tickets.filter(x=>x.id===ticketId||!alloc(matchId,x.id));\n"
     "    $('assignSeat').innerHTML=available.map(x=>`<option value=\"${x.id}\">${esc(x.label)} · Block ${esc(x.block)} · Reihe ${esc(x.row)} · Sitz ${esc(x.seat)}</option>`).join('');$('assignSeat').value=ticketId;updateDemoAssignSeat();\n"
     "    $('assignMember').innerHTML='<option value=\"\">Crew-Mitglied wählen …</option>'+state.members.map(x=>`<option value=\"${x.id}\">${esc(x.name)} · ${esc(x.role)}</option>`).join('');$('assignMember').value='';$('assignGuest').value='';openModal('assignDialog');\n"
     "  }")
s=s[:old.start()]+new+s[old.end():]
a="const p=memberId?member(memberId):null,m=match(assignContext.matchId),t=ticket(assignContext.ticketId);if(!m||!t)return;const name=guest||(p?.name||'Gast');"
b="const selectedTicketId=$('assignSeat')?.value||assignContext.ticketId;assignContext.ticketId=selectedTicketId;const p=memberId?member(memberId):null,m=match(assignContext.matchId),t=ticket(selectedTicketId);if(!m||!t)return;const name=guest||(p?.name||'Mitglied');"
if a not in s: raise SystemExit('demo submit marker missing')
s=s.replace(a,b,1)
marker="  $('filters')?.addEventListener('click',event=>{"
if marker not in s: raise SystemExit('demo listener marker missing')
s=s.replace(marker,"  $('assignSeat')?.addEventListener('change',()=>{if(!assignContext)return;assignContext.ticketId=$('assignSeat').value;updateDemoAssignSeat()});\n"+marker,1)
p.write_text(s,encoding='utf-8')
