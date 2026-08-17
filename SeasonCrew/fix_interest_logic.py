from pathlib import Path
import re


def replace_once(path, old, new, label):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: anchor not found in {path}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# Main assignment dialog: allow preselection from ticket interests and clear the wish after assignment.
replace_once(
    'SeasonCrew/app.js',
    "function openAssignTicket(fixtureId,ticketId){",
    "function openAssignTicket(fixtureId,ticketId,preselectUserId=''){",
    'assignment function signature'
)
replace_once(
    'SeasonCrew/app.js',
    "  $('assignTicketMember').value='';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');\n  $('assignTicketDialog').showModal();",
    "  $('assignTicketMember').value=preselectUserId&&members.some(x=>x.user_id===preselectUserId)?preselectUserId:'';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');\n  $('assignTicketDialog').showModal();",
    'assignment preselect'
)
replace_once(
    'SeasonCrew/app.js',
    "  const {error}=await sb.from('sc_allocations').insert(row);\n  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return false}\n  const saved=await readAllocation(fixtureId,ticketId);replaceAllocation(saved||row);render();return true;",
    "  const {error}=await sb.from('sc_allocations').insert(row);\n  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return false}\n  if(attendeeUserId){\n    const {error:wishError}=await sb.from('sc_ticket_wishes').delete().eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('user_id',attendeeUserId);\n    if(wishError)console.warn('Ticketinteresse konnte nach Zuteilung nicht entfernt werden',wishError);\n    else window.dispatchEvent(new CustomEvent('seasoncrew:ticket-wish-changed',{detail:{fixtureId,userId:attendeeUserId,active:false}}));\n  }\n  const saved=await readAllocation(fixtureId,ticketId);replaceAllocation(saved||row);render();return true;",
    'clear wish after assignment'
)
replace_once(
    'SeasonCrew/app.js',
    "async function assignTicket(fixtureId,ticketId,attendeeUserId,attendeeName){",
    "window.SeasonCrewAssignment={open:(fixtureId,ticketId,userId='')=>openAssignTicket(fixtureId,ticketId,userId)};\nasync function assignTicket(fixtureId,ticketId,attendeeUserId,attendeeName){",
    'expose assignment dialog'
)

# Ticket wish UI: restore explicit minus and use the same assignment dialog as normal ticket assignment.
p=Path('SeasonCrew/features-v1.js')
s=p.read_text(encoding='utf-8')
old="""      const chips=names.length?names.map(x=>allocator&&free.length?`<button class=\"wishPersonChip actionable\" type=\"button\" data-wish-assign-user=\"${esc(x.id)}\" title=\"${esc(x.name)} auf die nächste freie Karte setzen\"><span>@${esc(x.name)}</span><b>＋</b></button>`:`<span class=\"wishPersonChip\"><span>@${esc(x.name)}</span></span>`).join(''):'<span class=\"wishEmpty\">Noch niemand hat Interesse angemeldet.</span>';
      const button=assigned
        ? `<button class=\"wishToggle assigned\" type=\"button\" disabled>✓ Dir ist eine Karte zugeteilt</button>`
        : `<button class=\"wishToggle ${mine?'active':''}\" type=\"button\" data-toggle-wish=\"${esc(fixtureId)}\">${mine?'✓ Interesse gemerkt':'🎟 Interesse'}</button>`;
"""
new="""      const chips=names.length?names.map(x=>{
        if(!allocator)return `<span class=\"wishPersonChip\"><span>@${esc(x.name)}</span></span>`;
        const plus=free.length?`<button class=\"wishPersonChip actionable\" type=\"button\" data-wish-assign-user=\"${esc(x.id)}\" title=\"${esc(x.name)} auf die nächste freie Karte setzen\"><span>@${esc(x.name)}</span><b>＋</b></button>`:`<span class=\"wishPersonChip\"><span>@${esc(x.name)}</span></span>`;
        return `<span class=\"wishActionPair\">${plus}<button class=\"wishRejectBtn\" type=\"button\" data-wish-reject-user=\"${esc(x.id)}\" title=\"Interesse von @${esc(x.name)} entfernen\" aria-label=\"Interesse von ${esc(x.name)} entfernen\">−</button></span>`;
      }).join(''):'<span class=\"wishEmpty\">Noch niemand hat Interesse angemeldet.</span>';
      const button=assigned
        ? `<button class=\"wishToggle assigned\" type=\"button\" disabled>✓ Dir ist eine Karte zugeteilt</button>`
        : `<button class=\"wishToggle ${mine?'active':''}\" type=\"button\" data-toggle-wish=\"${esc(fixtureId)}\">${mine?'− Interesse zurücknehmen':'🎟 Interesse'}</button>`;
"""
if old not in s: raise SystemExit('wish chips/button anchor not found')
s=s.replace(old,new,1)
old="""      bar.querySelector('[data-toggle-wish]')?.addEventListener('click',()=>toggleWish(fixtureId,mine));
      bar.querySelectorAll('[data-wish-assign-user]').forEach(btn=>btn.addEventListener('click',()=>quickAssign(fixtureId,btn.dataset.wishAssignUser)));
"""
new="""      bar.querySelector('[data-toggle-wish]')?.addEventListener('click',()=>toggleWish(fixtureId,mine));
      bar.querySelectorAll('[data-wish-assign-user]').forEach(btn=>btn.addEventListener('click',()=>quickAssign(fixtureId,btn.dataset.wishAssignUser)));
      bar.querySelectorAll('[data-wish-reject-user]').forEach(btn=>btn.addEventListener('click',()=>rejectWish(fixtureId,btn.dataset.wishRejectUser,memberName(btn.dataset.wishRejectUser))));
"""
if old not in s: raise SystemExit('wish event anchor not found')
s=s.replace(old,new,1)
old="""  async function quickAssign(fixtureId,userId){
    if(!canAllocate()||!state)return;
    const ticket=freeTickets(fixtureId)[0];if(!ticket){toast('Keine freie Dauerkarte mehr');return}
    const name=memberName(userId);
    if(!confirm(`@${name} auf ${ticket.label||'die nächste freie Karte'} setzen?`))return;
    const c=client();
    const {error}=await c.from('sc_allocations').insert({group_id:state.gid,fixture_id:fixtureId,ticket_id:ticket.id,attendee_name:name,attendee_user_id:userId,paid:false,amount:Number(state.group.default_price)||50,updated_by:session.user.id});
    if(error){toast('Karte konnte nicht zugeteilt werden');console.error(error);return}
    await c.from('sc_ticket_wishes').delete().eq('group_id',state.gid).eq('fixture_id',fixtureId).eq('user_id',userId);
    toast(`@${name} wurde ${ticket.label||'eine Karte'} zugeteilt`);scheduleLoad(80);
  }
"""
new="""  async function quickAssign(fixtureId,userId){
    if(!canAllocate()||!state)return;
    const ticket=freeTickets(fixtureId)[0];if(!ticket){toast('Keine freie Dauerkarte mehr');return}
    const name=memberName(userId);
    if(window.SeasonCrewAssignment?.open){
      window.SeasonCrewAssignment.open(fixtureId,ticket.id,userId);
      return;
    }
    toast(`Kartenvergabe für @${name} ist noch nicht bereit. Bitte freie Karte direkt öffnen.`);
  }

  async function rejectWish(fixtureId,userId,name){
    if(!canAllocate()||!state)return;
    if(!confirm(`Interesse von @${name} für dieses Spiel entfernen?`))return;
    const {error}=await client().from('sc_ticket_wishes').delete().eq('group_id',state.gid).eq('fixture_id',fixtureId).eq('user_id',userId);
    if(error){toast('Interesse konnte nicht entfernt werden');console.error(error);return}
    state.wishes=state.wishes.filter(w=>!(w.fixture_id===fixtureId&&w.user_id===userId));
    renderWishBars();toast(`Interesse von @${name} entfernt`);
  }
"""
if old not in s: raise SystemExit('quick assign anchor not found')
s=s.replace(old,new,1)
# React immediately when the main assignment dialog consumes a wish.
s=s.replace("  window.addEventListener('seasoncrew:games-rendered',()=>{if(state)requestAnimationFrame(renderWishBars)});", "  window.addEventListener('seasoncrew:games-rendered',()=>{if(state)requestAnimationFrame(renderWishBars)});\n  window.addEventListener('seasoncrew:ticket-wish-changed',()=>scheduleLoad(40));",1)
p.write_text(s,encoding='utf-8')

# Fallback decorator: use a minus symbol if it ever has to decorate an older wish chip.
replace_once('SeasonCrew/wish-actions-v2.js',"reject.textContent='×';","reject.textContent='−';",'wish reject symbol')

# Role rename regression: payment privacy must treat visible "Mitglied" as the non-admin view.
replace_once(
    'SeasonCrew/pricing-runtime-v2.js',
    "const guest=String($('memberRole')?.textContent||'').trim()==='Gast'",
    "const guest=String($('memberRole')?.textContent||'').trim()==='Mitglied'",
    'member payment privacy role'
)

# Make sure feature loader gets the updated logic.
replace_once('SeasonCrew/crew-delete.js',"script.src='./features-v1.js?v=4'","script.src='./features-v1.js?v=5'",'features cache key')
replace_once('SeasonCrew/ui-v2.js',"script.src='./crew-delete.js?v=5'","script.src='./crew-delete.js?v=6'",'crew delete cache key')

# Visible cache keys/build marker.
idx=Path('SeasonCrew/index.html')
h=idx.read_text(encoding='utf-8')
h=re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User','Pilot V1 · Build interest-1 · Multi-User',h)
h=re.sub(r'app\.bundle\.js\?v=[^\"]+','app.bundle.js?v=20260817-interest1',h)
h=re.sub(r'ui-v2\.js\?v=[^\"]+','ui-v2.js?v=20260817-interest1',h)
h=re.sub(r'pricing-runtime-v2\.js\?v=[^\"]+','pricing-runtime-v2.js?v=20260817-interest1',h)
h=re.sub(r'wish-actions-v2\.js\?v=[^\"]+','wish-actions-v2.js?v=20260817-interest1',h)
idx.write_text(h,encoding='utf-8')

print('SeasonCrew interest logic fixed')
