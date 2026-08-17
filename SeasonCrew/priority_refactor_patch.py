from pathlib import Path
import re


def sub_once(text, pattern, replacement, label, flags=re.S):
    out, n = re.subn(pattern, lambda _m: replacement, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'{label}: replacement count {n}')
    return out

# -----------------------------------------------------------------------------
# app.js — assignment editing, private payment status, canonical pricing
# -----------------------------------------------------------------------------
p = Path('SeasonCrew/app.js')
s = p.read_text(encoding='utf-8')

marker = "function noteMap(){return new Map(notes.map(n=>[n.fixture_id,n]))}\n"
addition = marker + "function isOwnAllocation(a){if(!a)return false;const username=String(profile?.username||'').trim().toLowerCase();return a.attendee_user_id===user?.id||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===username)}\n"
if marker not in s:
    raise SystemExit('app own-allocation marker missing')
s = s.replace(marker, addition, 1)

s = sub_once(s, r"function renderStats\(\)\{.*?\n\}\n\nfunction renderGames", r'''function renderStats(){
  const relevant=fixtures.filter(relevantFixture),ids=new Set(relevant.map(m=>m.id)),relevantAlloc=allocations.filter(a=>ids.has(a.fixture_id));
  const adminView=isAdmin();
  const paymentAlloc=adminView?relevantAlloc:relevantAlloc.filter(isOwnAllocation);
  const unpaid=paymentAlloc.filter(a=>a.paid===false),unknownPrices=unpaid.filter(a=>a.amount==null).length,open=Math.max(0,relevant.length*tickets.length-relevantAlloc.length);
  $('statFixtures').textContent=relevant.length;$('statTickets').textContent=tickets.length;$('statAssigned').textContent=relevantAlloc.length;$('statOpen').textContent=open;
  const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=adminView?'Zahlungen offen':'Deine offenen Zahlungen';
  $('statUnpaid').textContent=money(unpaid.reduce((sum,a)=>sum+(a.amount==null?0:Number(a.amount)),0));
  $('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}${unknownPrices?` · ${unknownPrices} Preis${unknownPrices===1?'':'e'} offen`:''}`;
}

function renderGames''', 'renderStats')

s = sub_once(s, r"function renderTicket\(m,t,a\)\{.*?\n\}\n\nfunction bindGameEvents", r'''function renderTicket(m,t,a){
  const label=ticketLabel(t);
  if(!a)return `<div class="ticketCard unassigned" data-assign-fixture="${m.id}" data-ticket-id="${t.id}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${[t.block&&`Block ${esc(t.block)}`,t.row_label&&`Reihe ${esc(t.row_label)}`,t.seat&&`Sitz ${esc(t.seat)}`].filter(Boolean).join(' · ')}</small></div><span>+</span></div><div style="padding:8px 10px;color:#8994a3;font-size:9px">Karte vergeben</div></div>`;
  const own=isOwnAllocation(a),paymentVisible=isAdmin()||own,paid=a.paid===true,unpaid=a.paid===false;
  const cardState=paymentVisible?(paid?'paid':unpaid?'unpaid':''):'paymentPrivate';
  const status=paymentVisible?(paid?'bezahlt':unpaid?'Zahlung offen':'Zahlstatus offen'):'zugewiesen';
  const adminActions=isAdmin()?`<button class="changeAssignmentBtn" type="button" data-change-assignment="${m.id}" data-ticket-id="${t.id}">Zuweisung ändern</button><button class="releaseAssignmentBtn" type="button" data-release-fixture="${m.id}" data-ticket-id="${t.id}" title="Zuweisung aufheben">Zuweisung aufheben</button>${unpaid&&a.amount!=null?`<button type="button" data-paypal-fixture="${m.id}" data-ticket-id="${t.id}">PayPal</button>`:''}<label class="paidToggle"><input type="checkbox" data-paid-fixture="${m.id}" data-ticket-id="${t.id}" ${paid?'checked':''}> bezahlt</label>`:'';
  return `<div class="ticketCard assigned ${cardState} ${own?'ownTicket':''}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${status}</small></div></div><div class="attendeeDisplay">${esc(a.attendee_name||'Ticket-Gast')}</div>${isAdmin()?`<div class="ticketActions">${adminActions}</div>`:''}</div>`;
}

function bindGameEvents''', 'renderTicket')

s = sub_once(s, r"function bindGameEvents\(\)\{.*?\n\}\n\nasync function readAllocation", r'''function bindGameEvents(){
  document.querySelectorAll('[data-assign-fixture]').forEach(el=>el.addEventListener('click',()=>openAssignTicket(el.dataset.assignFixture,el.dataset.ticketId)));
  document.querySelectorAll('[data-change-assignment]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();openAssignTicket(el.dataset.changeAssignment,el.dataset.ticketId,'',true)}));
  document.querySelectorAll('[data-release-fixture]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();releaseTicket(el.dataset.releaseFixture,el.dataset.ticketId)}));
  document.querySelectorAll('[data-paid-fixture]').forEach(input=>input.addEventListener('change',()=>savePaid(input.dataset.paidFixture,input.dataset.ticketId,input.checked)));
  document.querySelectorAll('[data-paypal-fixture]').forEach(btn=>btn.addEventListener('click',()=>openPayment(btn.dataset.paypalFixture,btn.dataset.ticketId)));
  document.querySelectorAll('[data-note-fixture]').forEach(t=>t.addEventListener('change',()=>saveNote(t.dataset.noteFixture,t.value)));
}

async function readAllocation''', 'bindGameEvents')

s = sub_once(s, r"function updateAssignTicketSeatMeta\(\)\{.*?\nasync function releaseTicket", r'''function updateAssignTicketSeatMeta(){
  if(!assignmentContext)return;const m=fixtureById(assignmentContext.fixtureId),t=ticketById(assignmentContext.ticketId);if(!m||!t)return;
  $('assignTicketTitle').textContent=`${ticketLabel(t)} · ${m.o}`;
  $('assignTicketMeta').textContent=`${gameDate(m)[0]}${gameDate(m)[1]?` · ${gameDate(m)[1]}`:''} · ${[t.block&&`Block ${t.block}`,t.row_label&&`Reihe ${t.row_label}`,t.seat&&`Sitz ${t.seat}`].filter(Boolean).join(' · ')}`;
}
function openAssignTicket(fixtureId,ticketId,preselectUserId='',editExisting=false){
  if(!isAdmin())return;const m=fixtureById(fixtureId),t=ticketById(ticketId);if(!m||!t)return;
  const current=editExisting?allocationByIds(fixtureId,ticketId):null;
  assignmentContext={fixtureId,ticketId,fromTicketId:current?.ticket_id||null,mode:current?'edit':'create'};
  const availableTickets=tickets.filter(x=>x.id===ticketId||!allocationByIds(fixtureId,x.id));
  $('assignTicketSeat').innerHTML=availableTickets.map(x=>`<option value="${x.id}">${esc(ticketLabel(x))} · ${esc([x.block&&`Block ${x.block}`,x.row_label&&`Reihe ${x.row_label}`,x.seat&&`Sitz ${x.seat}`].filter(Boolean).join(' · '))}</option>`).join('');
  $('assignTicketSeat').value=ticketId;updateAssignTicketSeatMeta();
  const assignedMemberIds=new Set(allocations.filter(a=>a.fixture_id===fixtureId&&a.attendee_user_id&&(!current||a.ticket_id!==current.ticket_id)).map(a=>a.attendee_user_id));
  $('assignTicketMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+members.map(x=>{const used=assignedMemberIds.has(x.user_id);return `<option value="${x.user_id}" ${used?'disabled':''}>${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}${used?' · bereits Ticket':''}</option>`}).join('');
  const memberValue=current?.attendee_user_id||preselectUserId;
  $('assignTicketMember').value=memberValue&&members.some(x=>x.user_id===memberValue)&&!assignedMemberIds.has(memberValue)?memberValue:'';
  $('assignTicketGuest').value=current&&!current.attendee_user_id?(current.attendee_name||''):'';
  $('assignTicketModeLabel').textContent=current?'Zuweisung ändern':'Karte vergeben';
  $('assignTicketSave').textContent=current?'Zuweisung speichern':'Karte vergeben';
  setStatus($('assignTicketStatus'),'');$('assignTicketDialog').showModal();
}
window.SeasonCrewAssignment={open:(fixtureId,ticketId,userId='')=>openAssignTicket(fixtureId,ticketId,userId,false)};
async function saveAssignment(context,attendeeUserId,attendeeName){
  if(!isAdmin()||!context)return false;
  const {error}=await sb.rpc('sc_save_allocation',{p_group:currentGroup.id,p_fixture:context.fixtureId,p_ticket:context.ticketId,p_attendee_user:attendeeUserId||null,p_attendee_name:String(attendeeName||'').trim(),p_from_ticket:context.fromTicketId||null});
  if(error){
    let msg=error.message||'Zuweisung konnte nicht gespeichert werden';
    if(error.code==='23505')msg=String(error.message||'').includes('sc_allocations_unique_member_per_fixture')?'Dieses Mitglied hat für dieses Spiel bereits ein Ticket.':'Dieser Sitzplatz wurde inzwischen vergeben.';
    setStatus($('assignTicketStatus'),msg);console.error(error);return false;
  }
  const {data,error:refreshError}=await sb.rpc('sc_get_allocations',{p_group:currentGroup.id});
  if(!refreshError)allocations=data||[];
  if(attendeeUserId)window.dispatchEvent(new CustomEvent('seasoncrew:ticket-wish-changed',{detail:{fixtureId:context.fixtureId,userId:attendeeUserId,active:false}}));
  render();return true;
}
$('assignTicketSeat').addEventListener('change',()=>{if(!assignmentContext)return;assignmentContext.ticketId=$('assignTicketSeat').value;updateAssignTicketSeatMeta()});
$('assignTicketMember').addEventListener('change',()=>{if($('assignTicketMember').value)$('assignTicketGuest').value=''});
$('assignTicketGuest').addEventListener('input',()=>{if($('assignTicketGuest').value.trim())$('assignTicketMember').value=''});
function closeAssignTicketDialog(){
  $('assignTicketDialog').close();assignmentContext=null;setStatus($('assignTicketStatus'),'');$('assignTicketModeLabel').textContent='Karte vergeben';$('assignTicketSave').textContent='Karte vergeben';
}
$('assignTicketCancel').addEventListener('click',closeAssignTicketDialog);
$('assignTicketCancelBottom').addEventListener('click',closeAssignTicketDialog);
$('assignTicketForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!assignmentContext||!isAdmin())return;
  const memberId=$('assignTicketMember').value,guest=$('assignTicketGuest').value.trim();
  const chosen=memberId?members.find(x=>x.user_id===memberId):null;
  if(!chosen&&!guest){setStatus($('assignTicketStatus'),'Bitte ein Crew-Mitglied auswählen oder einen Ticket-Gast eintragen.');return}
  const guestKey=guest.replace(/^@+/,'').trim().toLowerCase(),matchingMember=guest?members.find(x=>String(x.username||'').trim().toLowerCase()===guestKey):null;
  if(matchingMember){setStatus($('assignTicketStatus'),`${matchingMember.username} ist Crew-Mitglied. Bitte oben aus der Mitgliederliste auswählen.`);return}
  if(chosen&&allocations.some(a=>a.fixture_id===assignmentContext.fixtureId&&a.attendee_user_id===chosen.user_id&&a.ticket_id!==assignmentContext.fromTicketId)){setStatus($('assignTicketStatus'),'Dieses Mitglied hat für dieses Spiel bereits ein Ticket.');return}
  const mode=assignmentContext.mode,context={...assignmentContext};
  const saveBtn=$('assignTicketSave');saveBtn.disabled=true;saveBtn.textContent='Wird gespeichert …';
  const ok=await saveAssignment(context,guest?null:chosen.user_id,guest||chosen.username);
  saveBtn.disabled=false;saveBtn.textContent=mode==='edit'?'Zuweisung speichern':'Karte vergeben';
  if(!ok)return;
  $('assignTicketDialog').close();assignmentContext=null;showToast(mode==='edit'?'Zuweisung geändert':'Karte vergeben');
});
async function releaseTicket''', 'assignment block')

# Remove the obsolete free-form attendee update path entirely.
s = re.sub(r"\nasync function saveAttendee\(fixtureId,ticketId,name\)\{.*?\n\}", "", s, count=1, flags=re.S)

s = sub_once(s, r"function openPayment\(fixtureId,ticketId\)\{.*?\n\}", r'''function openPayment(fixtureId,ticketId){
  const a=allocationByIds(fixtureId,ticketId),m=fixtureById(fixtureId),t=ticketById(ticketId);if(!a||!m||!t)return;
  paymentContext={a,m,t};$('paymentPerson').textContent=`${a.attendee_name||'Ticket-Gast'} · ${ticketLabel(t)}`;$('paymentMatch').textContent=`${m.l} · ${m.o} · ${gameDate(m)[0]}`;
  const known=a.amount!=null;$('paymentAmount').readOnly=true;$('paymentAmount').value=known?Number(a.amount).toFixed(2).replace('.',','):'';
  $('copyPaymentBtn').disabled=!known;$('sharePaymentBtn').disabled=!known;setStatus($('paymentStatus'),known?'':'Preis noch nicht bekannt');updatePaymentPreview();els.paymentDialog.showModal();
}''', 'openPayment')

old_payment_preview = """function updatePaymentPreview(){const d=paymentData();$('paymentPreview').textContent=d?`${money(d.amount)}\\n${d.match}${d.link?`\\n${d.link}`:'\\nPayPal.Me ist für diese Crew noch nicht hinterlegt.'}`:'Bitte gültigen Betrag eingeben.'}"""
new_payment_preview = """function updatePaymentPreview(){
  if(paymentContext?.a?.amount==null){$('paymentPreview').textContent='Preis noch nicht bekannt. Hinterlege zuerst den Spielpreis in den Crew-Einstellungen.';return}
  const d=paymentData();$('paymentPreview').textContent=d?`${money(d.amount)}\\n${d.match}${d.link?`\\n${d.link}`:'\\nPayPal.Me ist für diese Crew noch nicht hinterlegt.'}`:'Preis konnte nicht geladen werden.';
}"""
if old_payment_preview not in s:
    raise SystemExit('payment preview exact source missing')
s=s.replace(old_payment_preview,new_payment_preview,1)

# PayPal allocation write cleanup is handled by priority_refactor_post.py

# Notify the price decorator whenever crew price/default settings are saved.
old = "setStatus($('settingsStatus'),'Crew gespeichert ✓',true);render()});"
new = "setStatus($('settingsStatus'),'Crew gespeichert ✓',true);render();window.dispatchEvent(new CustomEvent('seasoncrew:prices-updated',{detail:{groupId:currentGroup.id}}))});"
if old not in s:
    raise SystemExit('saveGroup price event marker missing')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# pricing-runtime-v2.js — UI consumes database pricing, no duplicate rule engine
# -----------------------------------------------------------------------------
pricing_runtime = r'''(()=>{
  if(window.__seasonCrewPricingRuntimeV2)return;
  window.__seasonCrewPricingRuntimeV2=true;
  window.__seasonCrewPricingRuntime=true;

  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let client=null,priceMap=new Map(),ticketMap=new Map(),loadTimer=null,statsTimer=null,loading=false,lastGroup='';

  function sb(){if(client)return client;if(!window.supabase?.createClient)return null;client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}
  function groupId(){return $('groupSelect')?.value||''}
  function money(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)}
  function fixtureIds(){return [...document.querySelectorAll('.gameCard[id^="game-"]')].map(card=>card.id.replace(/^game-/,'')).filter(Boolean)}
  function ticketIdFromCard(card){return card.dataset.ticketId||card.querySelector('[data-ticket-id]')?.dataset.ticketId||''}
  function seatText(ticket){if(!ticket)return '';return [ticket.block&&`Block ${ticket.block}`,ticket.row_label&&`Reihe ${ticket.row_label}`,ticket.seat&&`Sitz ${ticket.seat}`].filter(Boolean).join(' · ')}
  function compactSeatText(ticket){if(!ticket)return '';return [ticket.block,ticket.row_label,ticket.seat].filter(Boolean).join('/')}
  function priceInfo(id){return priceMap.get(id)||{price:null,known:false}}

  function decorateTicket(card){
    const id=ticketIdFromCard(card),ticket=ticketMap.get(id),text=seatText(ticket);if(!text)return;
    const copy=card.querySelector('.ticketHead > div');if(!copy)return;const title=copy.querySelector('b');let badge=copy.querySelector('.ticketSeatBadge');
    if(!badge){badge=document.createElement('span');badge.className='ticketSeatBadge';if(title)title.insertAdjacentElement('afterend',badge);else copy.prepend(badge)}
    badge.textContent=text;const compact=compactSeatText(ticket);
    if(title){const shown=title.textContent.trim(),stored=String(ticket.label||'').trim();if(shown===compact||(stored===compact&&shown===stored))title.remove()}
    const legacy=[...copy.querySelectorAll(':scope > small')].find(el=>/^Block\s/i.test(el.textContent.trim()));legacy?.remove();
  }

  function decorateGame(card){
    const id=card.id.replace(/^game-/,'');if(!id)return;const meta=card.querySelector('.fixtureMeta');if(!meta)return;
    let badge=meta.querySelector('.fixturePriceV2');if(!badge){badge=document.createElement('span');badge.className='fixturePriceV2';const comp=meta.querySelector('.competition');comp?.insertAdjacentElement('afterend',badge)}
    const info=priceInfo(id);
    if(!info.known||info.price==null){badge.textContent='Preis noch nicht bekannt';badge.removeAttribute('data-price')}
    else{badge.textContent=`${money(info.price)} / Karte`;badge.dataset.price=String(info.price)}
    card.querySelectorAll('.ticketCard').forEach(decorateTicket);
  }
  function decorateAll(){document.querySelectorAll('.gameCard[id^="game-"]').forEach(decorateGame)}

  async function refreshUnpaidStats(){
    const c=sb(),gid=groupId();if(!c||!gid)return;
    const [{data,error},{data:{session}}]=await Promise.all([c.rpc('sc_get_allocations',{p_group:gid}),c.auth.getSession()]);if(error)return;
    const member=String($('memberRole')?.textContent||'').trim()==='Mitglied',uid=session?.user?.id||'',username=String($('helloUser')?.textContent||'').replace(/^Hallo\s+/i,'').trim().toLowerCase();
    const visible=member?(data||[]).filter(row=>row.attendee_user_id===uid||(!row.attendee_user_id&&String(row.attendee_name||'').trim().toLowerCase()===username)):(data||[]);
    const unpaid=visible.filter(x=>x.paid===false),unknown=unpaid.filter(x=>x.amount==null).length,total=unpaid.reduce((sum,row)=>sum+(row.amount==null?0:Number(row.amount)),0);
    const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=member?'Deine offenen Zahlungen':'Zahlungen offen';
    if($('statUnpaid'))$('statUnpaid').textContent=money(total);
    if($('statUnpaidCount'))$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}${unknown?` · ${unknown} Preis${unknown===1?'':'e'} offen`:''}`;
  }

  function applyPaymentPrice(fixtureId){
    const input=$('paymentAmount');if(!input)return;input.readOnly=true;let hint=$('paymentRulePriceHint');
    if(!hint){hint=document.createElement('small');hint.id='paymentRulePriceHint';hint.className='paymentRulePriceHint';$('paymentMatch')?.insertAdjacentElement('afterend',hint)}
    const info=priceInfo(fixtureId);
    if(!info.known||info.price==null){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));hint.textContent='Preis noch nicht bekannt';return}
    input.value=Number(info.price).toFixed(2).replace('.',',');input.dispatchEvent(new Event('input',{bubbles:true}));hint.textContent=`Aktueller Spielpreis: ${money(info.price)}`;
  }

  async function loadPricing(){
    const c=sb(),gid=groupId(),ids=fixtureIds();if(!c||!gid||!ids.length||loading)return;loading=true;
    try{
      const [{data:prices,error:pe},{data:tickets,error:te}]=await Promise.all([
        c.rpc('sc_get_fixture_prices',{p_group:gid,p_fixture_ids:ids}),
        c.from('sc_tickets').select('id,label,block,row_label,seat').eq('group_id',gid).eq('active',true)
      ]);
      if(pe)return;lastGroup=gid;priceMap=new Map((prices||[]).map(row=>[row.fixture_id,{price:row.price==null?null:Number(row.price),known:!!row.known}]));
      if(!te)ticketMap=new Map((tickets||[]).map(t=>[t.id,t]));decorateAll();await refreshUnpaidStats();
    }finally{loading=false}
  }
  function scheduleLoad(delay=60){clearTimeout(loadTimer);loadTimer=setTimeout(loadPricing,delay)}
  function scheduleStats(delay=180){clearTimeout(statsTimer);statsTimer=setTimeout(refreshUnpaidStats,delay)}

  window.SeasonCrewPricing={priceFor:id=>priceInfo(id).price,known:id=>priceInfo(id).known,reload:()=>scheduleLoad(0)};
  document.addEventListener('click',event=>{const btn=event.target.closest?.('[data-paypal-fixture]');if(!btn)return;setTimeout(()=>applyPaymentPrice(btn.dataset.paypalFixture),0)},true);
  $('groupSelect')?.addEventListener('change',()=>{priceMap=new Map();ticketMap=new Map();lastGroup='';scheduleLoad(80)});
  window.addEventListener('seasoncrew:prices-updated',()=>scheduleLoad(0));
  window.addEventListener('seasoncrew:games-rendered',()=>scheduleLoad(20));
  window.addEventListener('seasoncrew:rendered',()=>{if(lastGroup===groupId()){decorateAll();scheduleStats(120)}else scheduleLoad(20)});
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>scheduleLoad(250),{once:true});else scheduleLoad(20);
})();
'''
Path('SeasonCrew/pricing-runtime-v2.js').write_text(pricing_runtime,encoding='utf-8')

# -----------------------------------------------------------------------------
# product-v2.js — unknown prices stay unknown, personal payment privacy stays exact
# -----------------------------------------------------------------------------
p = Path('SeasonCrew/product-v2.js')
s = p.read_text(encoding='utf-8')

s = sub_once(s, r"  function renderMyTickets\(\)\{.*?\n  function renderSeasonTools\(\)\{", r'''  function amountValue(a){return a?.amount==null?null:Number(a.amount)}
  function amountLabel(a){const value=amountValue(a);return value==null?'Preis noch nicht bekannt':money(value)}
  function renderMyTickets(){
    const body=$('myTicketsBody');if(!body||!state||!session)return;const uid=session.user.id;
    const ownName=String(state.profile?.username||'').trim().toLowerCase();
    const mine=state.allocs.filter(a=>a.attendee_user_id===uid||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===ownName)).sort((a,b)=>(fixture(a.fixture_id)?.s||'9999').localeCompare(fixture(b.fixture_id)?.s||'9999'));
    const wishes=state.wishes.filter(w=>w.user_id===uid).sort((a,b)=>(fixture(a.fixture_id)?.s||'9999').localeCompare(fixture(b.fixture_id)?.s||'9999'));
    const open=mine.filter(a=>a.paid===false),unknownOpen=open.filter(a=>amountValue(a)==null).length,openSum=open.reduce((sum,a)=>sum+(amountValue(a)??0),0),future=mine.filter(a=>upcoming(fixture(a.fixture_id))),past=mine.filter(a=>!upcoming(fixture(a.fixture_id)));
    const card=a=>{const f=fixture(a.fixture_id);return `<div class="myTicketCard ${a.paid===true?'paid':'unpaid'}"><div><small>${esc(f?.l||'Spiel')}</small><b>FC Bayern – ${esc(f?.o||a.fixture_id)}</b><span>${esc(dateLabel(f))} · ${esc(ticketLabel(a.ticket_id))}</span></div><div class="myTicketPay"><strong>${esc(amountLabel(a))}</strong><span>${a.paid===true?'bezahlt':'offen'}</span></div></div>`};
    const paypal=cleanPaypal(state.group.paypal_me),payLink=paypal&&open.length&&unknownOpen===0&&openSum>0?`https://paypal.me/${encodeURIComponent(paypal)}/${openSum.toFixed(2)}`:'';
    body.innerHTML=`<div class="personalSummary"><div><small>Offene Zahlungen</small><strong>${money(openSum)}</strong><span>${open.length} Ticket${open.length===1?'':'s'}${unknownOpen?` · ${unknownOpen} Preis${unknownOpen===1?'':'e'} offen`:''}</span></div><div><small>Nächste Tickets</small><strong>${future.length}</strong><span>zugeteilt</span></div><div><small>Ticketwünsche</small><strong>${wishes.length}</strong><span>gemerkt</span></div>${payLink?`<a class="primaryButton payAllButton" href="${payLink}" target="_blank" rel="noopener">Offenen Betrag via PayPal</a>`:''}</div><section class="productSection"><h4>Meine nächsten Spiele</h4>${future.length?future.map(card).join(''):'<div class="productEmpty">Noch keine kommenden Karten zugeteilt.</div>'}</section><section class="productSection"><h4>Meine Ticketwünsche</h4>${wishes.length?wishes.map(w=>{const f=fixture(w.fixture_id);return `<div class="wishOverviewRow"><span>🎟</span><div><b>FC Bayern – ${esc(f?.o||w.fixture_id)}</b><small>${esc(dateLabel(f))}</small></div></div>`}).join(''):'<div class="productEmpty">Keine offenen Ticketwünsche.</div>'}</section>${past.length?`<details class="pastTickets"><summary>Vergangene Tickets (${past.length})</summary>${past.map(card).join('')}</details>`:''}`;
  }

  function renderCockpit(){
    const existing=$('crewCockpit');if(!admin()){existing?.remove();return}const stats=document.querySelector('.statsGrid');if(!stats||!state)return;
    let box=existing;if(!box){box=document.createElement('section');box.id='crewCockpit';box.className='crewCockpit';stats.insertAdjacentElement('afterend',box)}
    const relevant=[...fixtureMap.values()].filter(relevantFixture),ids=new Set(relevant.map(x=>x.id)),allocs=state.allocs.filter(a=>ids.has(a.fixture_id)),capacity=relevant.length*state.tickets.length,unassigned=Math.max(0,capacity-allocs.length),unpaid=allocs.filter(a=>a.paid===false),unknown=unpaid.filter(a=>amountValue(a)==null).length,openSum=unpaid.reduce((sum,a)=>sum+(amountValue(a)??0),0),wishCount=state.wishes.filter(w=>ids.has(w.fixture_id)).length;
    box.innerHTML=`<div class="cockpitHead"><div><small>Crew-Cockpit</small><h3>Was braucht Aufmerksamkeit?</h3></div><button type="button" class="secondaryButton compact" id="openPayments">Zahlungen ansehen</button></div><div class="cockpitGrid"><div class="cockpitMetric ${unassigned?'warn':''}"><b>${unassigned}</b><span>Karten unvergeben</span></div><div class="cockpitMetric ${unpaid.length?'warn':''}"><b>${money(openSum)}</b><span>${unpaid.length} Zahlungen offen${unknown?` · ${unknown} Preis${unknown===1?'':'e'} offen`:''}</span></div><div class="cockpitMetric ${wishCount?'active':''}"><b>${wishCount}</b><span>Ticketwünsche</span></div><div class="cockpitMetric ${state.pending.length?'active':''}"><b>${state.pending.length}</b><span>Bewerbungen offen</span></div></div>`;
    $('openPayments')?.addEventListener('click',()=>{renderPayments();$('paymentsDialog')?.showModal()});
  }

  function paymentGroups(){
    const map=new Map();
    for(const a of state.allocs){
      const key=a.attendee_user_id||`name:${String(a.attendee_name||'Ticket-Gast').toLowerCase()}`;
      if(!map.has(key))map.set(key,{name:a.attendee_user_id?memberName(a.attendee_user_id):(a.attendee_name||'Ticket-Gast'),items:[],paid:0,open:0,unknownPaid:0,unknownOpen:0});
      const p=map.get(key),amount=amountValue(a);p.items.push(a);
      if(a.paid===true){if(amount==null)p.unknownPaid++;else p.paid+=amount}
      else if(a.paid===false){if(amount==null)p.unknownOpen++;else p.open+=amount}
    }
    return [...map.values()].sort((a,b)=>Number(b.open>0||b.unknownOpen>0)-Number(a.open>0||a.unknownOpen>0)||b.open-a.open||a.name.localeCompare(b.name,'de'));
  }
  function renderPayments(){
    const body=$('paymentsBody');if(!body||!state)return;
    if(!admin()){
      const uid=session?.user?.id||'',ownName=String(state.profile?.username||'').trim().toLowerCase();
      const mine=state.allocs.filter(a=>a.attendee_user_id===uid||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===ownName));
      const unpaid=mine.filter(a=>a.paid===false),unknown=unpaid.filter(a=>amountValue(a)==null).length,openSum=unpaid.reduce((sum,a)=>sum+(amountValue(a)??0),0);
      body.innerHTML=`<div class="paymentsSummary"><div><small>Dein offener Betrag</small><strong>${money(openSum)}</strong></div><div><small>Deine offenen Tickets</small><strong>${unpaid.length}</strong></div>${unknown?`<div><small>Preis noch offen</small><strong>${unknown}</strong></div>`:''}</div><div class="paymentPeople">${unpaid.length?unpaid.map(a=>{const f=fixture(a.fixture_id);return `<div class="paymentPersonRow"><div><b>${esc(f?.o||a.fixture_id)}</b><small>${esc(dateLabel(f))} · ${esc(ticketLabel(a.ticket_id))}</small></div><div class="paymentPersonAmount open"><strong>${esc(amountLabel(a))}</strong><span>offen</span></div></div>`}).join(''):'<div class="productEmpty">Du hast aktuell keine offenen Zahlungen.</div>'}</div>`;
      return;
    }
    const groups=paymentGroups(),totalOpen=groups.reduce((sum,p)=>sum+p.open,0),totalUnknown=groups.reduce((sum,p)=>sum+p.unknownOpen,0),paypal=cleanPaypal(state.group.paypal_me),peopleOpen=groups.filter(p=>p.open>0||p.unknownOpen>0).length;
    body.innerHTML=`<div class="paymentsSummary"><div><small>Offener Gesamtbetrag</small><strong>${money(totalOpen)}</strong></div><div><small>Personen mit offenem Betrag</small><strong>${peopleOpen}</strong></div>${totalUnknown?`<div><small>Preise noch offen</small><strong>${totalUnknown}</strong></div>`:''}</div><div class="paymentPeople">${groups.length?groups.map((p,i)=>`<div class="paymentPersonRow"><div><b>@${esc(p.name)}</b><small>${p.items.length} Ticket${p.items.length===1?'':'s'} · ${money(p.paid)} bezahlt${p.unknownPaid?` · ${p.unknownPaid} Preis${p.unknownPaid===1?'':'e'} offen`:''}</small></div><div class="paymentPersonAmount ${p.open||p.unknownOpen?'open':''}"><strong>${p.open?money(p.open):(p.unknownOpen?'–':money(0))}</strong><span>${p.unknownOpen?`${p.unknownOpen} Preis${p.unknownOpen===1?'':'e'} offen`:'offen'}</span></div>${p.open||p.unknownOpen?`<button type="button" class="memberAction" data-copy-debt="${i}">Erinnerung kopieren</button>`:''}</div>`).join(''):'<div class="productEmpty">Noch keine Ticketverteilungen.</div>'}</div>`;
    body.querySelectorAll('[data-copy-debt]').forEach(b=>b.addEventListener('click',async()=>{
      const p=groups[Number(b.dataset.copyDebt)],openItems=p.items.filter(x=>x.paid===false),lines=openItems.map(a=>{const f=fixture(a.fixture_id);return `• ${f?.o||a.fixture_id} · ${dateLabel(f)} · ${amountLabel(a)}`});
      const link=paypal&&p.unknownOpen===0&&p.open>0?`https://paypal.me/${paypal}/${p.open.toFixed(2)}`:'';
      const headline=p.open>0?`${money(p.open)} offen`:'offene Tickets mit noch unbekanntem Preis';
      const text=`Hi ${p.name},\n\nbei SeasonCrew sind noch ${headline}:\n${lines.join('\n')}${link?`\n\nPayPal: ${link}`:''}`;await navigator.clipboard.writeText(text);toast(`Erinnerung für ${p.name} kopiert`)
    }));
  }

  function renderSeasonTools(){''', 'product payment block')

p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# demo.js — mirrors assignment editing and payment privacy
# -----------------------------------------------------------------------------
p = Path('SeasonCrew/demo.js')
s = p.read_text(encoding='utf-8')

s = sub_once(s, r"  function renderTicket\(m,t,a\)\{.*?\n  function updateDemoAssignSeat", r'''  function renderTicket(m,t,a){
    const meta=`Block ${esc(t.block)} · Reihe ${esc(t.row)} · Sitz ${esc(t.seat)}`;
    if(!a)return `<div class="ticketCard unassigned" data-action="assign" data-match="${m.id}" data-ticket="${t.id}" role="button" tabindex="0"><div class="ticketHead"><div><b>${esc(t.label)}</b><small>${meta}</small></div><b>+</b></div><div class="ticketPerson">Karte verfügbar</div><div class="ticketActions"><button type="button" data-action="assign" data-match="${m.id}" data-ticket="${t.id}">Karte vergeben</button></div></div>`;
    const own=a.memberId==='alex',paymentVisible=isAdmin()||own,paid=a.paid===true,canPaypal=paymentVisible&&!paid;
    const cardState=paymentVisible?(paid?'paid':'unpaid'):'paymentPrivate',status=paymentVisible?(paid?'bezahlt':'Zahlung offen'):'zugewiesen';
    return `<div class="ticketCard ${cardState} ${own?'ownTicket':''}"><div class="ticketHead"><div><b>${esc(t.label)}</b><small>${status}</small></div></div><div class="ticketMeta">${meta}</div><div class="ticketPerson">${esc(a.name)}${paymentVisible?` · ${money(a.amount)}`:''}</div><div class="ticketActions">${isAdmin()?`<button class="changeAssignmentBtn" data-action="change-assignment" data-match="${m.id}" data-ticket="${t.id}" type="button">Zuweisung ändern</button><button class="releaseAction" data-action="release" data-match="${m.id}" data-ticket="${t.id}" type="button">Zuweisung aufheben</button>`:''}${canPaypal?`<button class="paypalBtn" data-action="paypal" data-match="${m.id}" data-ticket="${t.id}" type="button">PayPal</button>`:''}${isAdmin()?`<label><input type="checkbox" data-action="paid-toggle" data-match="${m.id}" data-ticket="${t.id}" ${paid?'checked':''}> bezahlt</label>`:''}</div></div>`;
  }

  function updateDemoAssignSeat''', 'demo renderTicket')

s = sub_once(s, r"  function updateDemoAssignSeat\(\)\{.*?\n  function releaseTicket", r'''  function updateDemoAssignSeat(){if(!assignContext)return;const m=match(assignContext.matchId),t=ticket(assignContext.ticketId);if(m&&t)$('assignTitle').textContent=`${t.label} · ${m.opponent}`;}
  function openAssign(matchId,ticketId,editExisting=false){
    if(!isAdmin()){toast('In der Mitgliedsansicht können freie Karten nicht vergeben werden.');return}
    const current=editExisting?alloc(matchId,ticketId):null;assignContext={matchId,ticketId,fromTicketId:current?.ticketId||null,mode:current?'edit':'create'};
    const m=match(matchId),t=ticket(ticketId);if(!m||!t)return;const available=state.tickets.filter(x=>x.id===ticketId||!alloc(matchId,x.id));
    $('assignSeat').innerHTML=available.map(x=>`<option value="${x.id}">${esc(x.label)} · Block ${esc(x.block)} · Reihe ${esc(x.row)} · Sitz ${esc(x.seat)}</option>`).join('');$('assignSeat').value=ticketId;updateDemoAssignSeat();
    const assignedMemberIds=new Set(state.allocations.filter(a=>a.matchId===matchId&&a.memberId&&(!current||a.ticketId!==current.ticketId)).map(a=>a.memberId));
    $('assignMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+state.members.map(x=>{const used=assignedMemberIds.has(x.id);return `<option value="${x.id}" ${used?'disabled':''}>${esc(x.name)} · ${esc(x.role)}${used?' · bereits Ticket':''}</option>`}).join('');
    $('assignMember').value=current?.memberId&&!assignedMemberIds.has(current.memberId)?current.memberId:'';$('assignGuest').value=current&&!current.memberId?current.name:'';$('assignSaveBtn').textContent=current?'Zuweisung speichern':'Karte vergeben';openModal('assignDialog');
  }
  function releaseTicket''', 'demo assignment open')

# Add change-assignment event route.
old = "    if(action==='assign'){event.preventDefault();event.stopPropagation();openAssign(matchId,ticketId);return}\n    if(action==='release')"
new = "    if(action==='assign'){event.preventDefault();event.stopPropagation();openAssign(matchId,ticketId);return}\n    if(action==='change-assignment'){event.preventDefault();event.stopPropagation();openAssign(matchId,ticketId,true);return}\n    if(action==='release')"
if old not in s:
    raise SystemExit('demo change-assignment action marker missing')
s = s.replace(old, new, 1)

s = sub_once(s, r"  \$\('assignForm'\)\?\.addEventListener\('submit',event=>\{.*?\n  \}\);", r'''  $('assignForm')?.addEventListener('submit',event=>{
    event.preventDefault();if(event.submitter?.value==='cancel'){closeModal('assignDialog');assignContext=null;$('assignSaveBtn').textContent='Karte vergeben';return}if(!assignContext)return;
    const memberId=$('assignMember').value,guest=$('assignGuest').value.trim();if(!memberId&&!guest){toast('Bitte Person oder Ticket-Gast wählen');return}
    const guestKey=guest.replace(/^@+/,'').trim().toLowerCase(),existingMember=guest?state.members.find(x=>x.name.trim().toLowerCase()===guestKey):null;
    if(existingMember){toast(`${existingMember.name} ist Crew-Mitglied. Bitte aus der Mitgliederliste auswählen.`);return}
    if(memberId&&state.allocations.some(a=>a.matchId===assignContext.matchId&&a.memberId===memberId&&a.ticketId!==assignContext.fromTicketId)){toast('Dieses Mitglied hat für dieses Spiel bereits ein Ticket.');return}
    const selectedTicketId=$('assignSeat')?.value||assignContext.ticketId,memberRow=memberId?member(memberId):null,m=match(assignContext.matchId),t=ticket(selectedTicketId);if(!m||!t)return;const name=guest||(memberRow?.name||'Mitglied');
    if(assignContext.mode==='edit'){
      const index=state.allocations.findIndex(a=>a.matchId===assignContext.matchId&&a.ticketId===assignContext.fromTicketId);if(index<0){toast('Zuweisung existiert nicht mehr.');return}
      if(selectedTicketId!==assignContext.fromTicketId&&alloc(assignContext.matchId,selectedTicketId)){toast('Dieser Sitzplatz wurde inzwischen vergeben.');return}
      const old=state.allocations[index],samePerson=old.memberId||memberId?old.memberId===memberId:old.name.trim().toLowerCase()===name.trim().toLowerCase();
      state.allocations[index]={...old,ticketId:selectedTicketId,memberId:guest?null:memberRow?.id||null,name,paid:samePerson?old.paid:false,amount:m.price};addHistory(`${t.label} gegen ${m.opponent}: Zuweisung auf ${name} geändert`);toast('Zuweisung geändert');
    }else{
      state.allocations.push({matchId:m.id,ticketId:t.id,memberId:guest?null:memberRow?.id||null,name,paid:false,amount:m.price});addHistory(`${t.label} gegen ${m.opponent} an ${name} vergeben`);toast('Karte vergeben');
    }
    save();closeModal('assignDialog');assignContext=null;$('assignSaveBtn').textContent='Karte vergeben';render();
  });''', 'demo submit')

p.write_text(s, encoding='utf-8')

# Demo guide terminology.
p = Path('SeasonCrew/demo.html')
s = p.read_text(encoding='utf-8')
s = s.replace('zwischen Admin und Gast wechseln. Gäste sehen nur ihre eigenen offenen Zahlungen.','zwischen Admin und Mitglied wechseln. Mitglieder sehen nur ihre eigenen offenen Zahlungen.')
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# Small styling/cache wiring
# -----------------------------------------------------------------------------
p = Path('SeasonCrew/assignment-dialog.css')
s = p.read_text(encoding='utf-8')
extra = '''\n.attendeeDisplay{padding:10px 11px;margin:3px 0 2px;border-radius:10px;background:rgba(255,255,255,.16);font:800 10px/1.3 Manrope,system-ui,sans-serif}.ticketCard.paymentPrivate{background:#fff!important;border-color:#dfe4e7!important;color:#1f2a30!important}.ticketCard.paymentPrivate .ticketHead,.ticketCard.paymentPrivate .ticketHead b,.ticketCard.paymentPrivate .ticketHead small,.ticketCard.paymentPrivate .attendeeDisplay{color:#1f2a30!important}.ticketCard.paymentPrivate .attendeeDisplay{background:#f4f6f7!important}.ticketActions .changeAssignmentBtn{white-space:nowrap;font-size:8px!important;font-weight:800!important;padding-left:7px!important;padding-right:7px!important}\n'''
if '.attendeeDisplay{' not in s:
    s += extra
p.write_text(s, encoding='utf-8')

p = Path('SeasonCrew/index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('<small>Karte vergeben</small><h3 id="assignTicketTitle">','<small id="assignTicketModeLabel">Karte vergeben</small><h3 id="assignTicketTitle">',1)
s = s.replace('<input id="paymentAmount" inputmode="decimal">','<input id="paymentAmount" inputmode="decimal" readonly>',1)
s = re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User', 'Pilot V1 · Build priorities-1 · Multi-User', s)
s = re.sub(r'app\.bundle\.js\?v=[^\"]+', 'app.bundle.js?v=20260817-priorities1', s)
s = re.sub(r'pricing-runtime-v2\.js\?v=[^\"]+', 'pricing-runtime-v2.js?v=20260817-priorities1', s)
s = re.sub(r'assignment-dialog\.css\?v=[^\"]+', 'assignment-dialog.css?v=20260817-priorities1', s)
s = re.sub(r'ui-v2\.js\?v=[^\"]+', 'ui-v2.js?v=20260817-priorities1', s)
p.write_text(s, encoding='utf-8')

# Cache chain for product-v2.js (ui-v2 -> crew-delete -> product-v2).
p = Path('SeasonCrew/ui-v2.js')
s = p.read_text(encoding='utf-8').replace("script.src='./crew-delete.js?v=6'", "script.src='./crew-delete.js?v=7'", 1)
p.write_text(s, encoding='utf-8')

p = Path('SeasonCrew/crew-delete.js')
s = p.read_text(encoding='utf-8').replace("script.src='./product-v2.js?v=8'", "script.src='./product-v2.js?v=9'", 1)
p.write_text(s, encoding='utf-8')

p = Path('SeasonCrew/demo.html')
s = p.read_text(encoding='utf-8')
s = re.sub(r'demo\.js\?v=[^\"]+', 'demo.js?v=6', s)
p.write_text(s, encoding='utf-8')
