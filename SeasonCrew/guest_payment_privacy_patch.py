from pathlib import Path
import re

# 1) Main dashboard: guests only see their own open payment amount/count.
app_path = Path('SeasonCrew/app.js')
app = app_path.read_text(encoding='utf-8')
old_stats = """function renderStats(){
  const relevant=fixtures.filter(relevantFixture),ids=new Set(relevant.map(m=>m.id)),relevantAlloc=allocations.filter(a=>ids.has(a.fixture_id));
  const unpaid=relevantAlloc.filter(a=>!a.paid),open=Math.max(0,relevant.length*tickets.length-relevantAlloc.length);
  $('statFixtures').textContent=relevant.length;$('statTickets').textContent=tickets.length;$('statAssigned').textContent=relevantAlloc.length;$('statOpen').textContent=open;
  $('statUnpaid').textContent=money(unpaid.reduce((s,a)=>s+Number(a.amount||currentGroup.default_price||0),0));$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
}"""
new_stats = """function renderStats(){
  const relevant=fixtures.filter(relevantFixture),ids=new Set(relevant.map(m=>m.id)),relevantAlloc=allocations.filter(a=>ids.has(a.fixture_id));
  const adminView=isAdmin(),username=String(profile?.username||'').trim().toLowerCase();
  const paymentAlloc=adminView?relevantAlloc:relevantAlloc.filter(a=>a.attendee_user_id===user?.id||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===username));
  const unpaid=paymentAlloc.filter(a=>!a.paid),open=Math.max(0,relevant.length*tickets.length-relevantAlloc.length);
  $('statFixtures').textContent=relevant.length;$('statTickets').textContent=tickets.length;$('statAssigned').textContent=relevantAlloc.length;$('statOpen').textContent=open;
  const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=adminView?'Zahlungen offen':'Deine offenen Zahlungen';
  $('statUnpaid').textContent=money(unpaid.reduce((s,a)=>s+Number(a.amount||currentGroup.default_price||0),0));$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
}"""
if old_stats not in app:
    raise SystemExit('renderStats block not found')
app = app.replace(old_stats, new_stats)
app_path.write_text(app, encoding='utf-8')

# 2) Pricing runtime must not overwrite the guest-specific dashboard total.
pricing_path = Path('SeasonCrew/pricing-runtime-v2.js')
pricing = pricing_path.read_text(encoding='utf-8')
old_refresh = """  async function refreshUnpaidStats(){
    const c=sb(),gid=groupId();if(!c||!gid||!pricing)return;
    const {data,error}=await c.from('sc_allocations').select('fixture_id,paid').eq('group_id',gid);
    if(error)return;
    const unpaid=(data||[]).filter(x=>!x.paid);
    const total=unpaid.reduce((sum,row)=>sum+(opponentKnown(row.fixture_id)?(effectivePrice(row.fixture_id)??0):0),0);
    if($('statUnpaid'))$('statUnpaid').textContent=money(total);
    if($('statUnpaidCount'))$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
  }"""
new_refresh = """  async function refreshUnpaidStats(){
    const c=sb(),gid=groupId();if(!c||!gid||!pricing)return;
    const [{data,error},{data:{session}}]=await Promise.all([
      c.from('sc_allocations').select('fixture_id,paid,attendee_user_id,attendee_name').eq('group_id',gid),
      c.auth.getSession()
    ]);
    if(error)return;
    const guest=String($('memberRole')?.textContent||'').trim()==='Gast',uid=session?.user?.id||'',username=String($('helloUser')?.textContent||'').replace(/^Hallo\\s+/i,'').trim().toLowerCase();
    const visible=guest?(data||[]).filter(row=>row.attendee_user_id===uid||(!row.attendee_user_id&&String(row.attendee_name||'').trim().toLowerCase()===username)):(data||[]);
    const unpaid=visible.filter(x=>!x.paid);
    const total=unpaid.reduce((sum,row)=>sum+(opponentKnown(row.fixture_id)?(effectivePrice(row.fixture_id)??0):0),0);
    const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=guest?'Deine offenen Zahlungen':'Zahlungen offen';
    if($('statUnpaid'))$('statUnpaid').textContent=money(total);
    if($('statUnpaidCount'))$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
  }"""
if old_refresh not in pricing:
    raise SystemExit('refreshUnpaidStats block not found')
pricing = pricing.replace(old_refresh, new_refresh)
pricing_path.write_text(pricing, encoding='utf-8')

# 3) Personal area: make own-ticket matching robust for legacy assignments without attendee_user_id.
product_path = Path('SeasonCrew/product-v2.js')
product = product_path.read_text(encoding='utf-8')
old_mine = """    const mine=state.allocs.filter(a=>a.attendee_user_id===uid).sort((a,b)=>(fixture(a.fixture_id)?.s||'9999').localeCompare(fixture(b.fixture_id)?.s||'9999'));"""
new_mine = """    const ownName=String(state.profile?.username||'').trim().toLowerCase();
    const mine=state.allocs.filter(a=>a.attendee_user_id===uid||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===ownName)).sort((a,b)=>(fixture(a.fixture_id)?.s||'9999').localeCompare(fixture(b.fixture_id)?.s||'9999'));"""
if old_mine not in product:
    raise SystemExit('personal mine filter not found')
product = product.replace(old_mine, new_mine)

old_render_payments = """  function renderPayments(){
    const body=$('paymentsBody');if(!body||!state)return;const groups=paymentGroups(),totalOpen=groups.reduce((s,p)=>s+p.open,0),paypal=cleanPaypal(state.group.paypal_me);
    body.innerHTML=`<div class=\"paymentsSummary\"><div><small>Offener Gesamtbetrag</small><strong>${money(totalOpen)}</strong></div><div><small>Personen mit offenem Betrag</small><strong>${groups.filter(p=>p.open>0).length}</strong></div></div><div class=\"paymentPeople\">${groups.length?groups.map((p,i)=>`<div class=\"paymentPersonRow\"><div><b>@${esc(p.name)}</b><small>${p.items.length} Ticket${p.items.length===1?'':'s'} · ${money(p.paid)} bezahlt</small></div><div class=\"paymentPersonAmount ${p.open?'open':''}\"><strong>${money(p.open)}</strong><span>offen</span></div>${p.open?`<button type=\"button\" class=\"memberAction\" data-copy-debt=\"${i}\">Erinnerung kopieren</button>`:''}</div>`).join(''):'<div class=\"productEmpty\">Noch keine Ticketverteilungen.</div>'}</div>`;
    body.querySelectorAll('[data-copy-debt]').forEach(b=>b.addEventListener('click',async()=>{const p=groups[Number(b.dataset.copyDebt)],openItems=p.items.filter(x=>!x.paid);const lines=openItems.map(a=>{const f=fixture(a.fixture_id);return `• ${f?.o||a.fixture_id} · ${dateLabel(f)} · ${money(a.amount||state.group.default_price||0)}`});const link=paypal?`https://paypal.me/${paypal}/${p.open.toFixed(2)}`:'';const text=`Hi ${p.name},\\n\\nbei SeasonCrew sind noch ${money(p.open)} offen:\\n${lines.join('\\n')}${link?`\\n\\nPayPal: ${link}`:''}`;await navigator.clipboard.writeText(text);toast(`Erinnerung für ${p.name} kopiert`) }));
  }"""
new_render_payments = """  function renderPayments(){
    const body=$('paymentsBody');if(!body||!state)return;
    if(!admin()){
      const uid=session?.user?.id||'',ownName=String(state.profile?.username||'').trim().toLowerCase();
      const mine=state.allocs.filter(a=>a.attendee_user_id===uid||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===ownName));
      const unpaid=mine.filter(a=>!a.paid),openSum=unpaid.reduce((sum,a)=>sum+Number(a.amount||state.group.default_price||0),0);
      body.innerHTML=`<div class=\"paymentsSummary\"><div><small>Dein offener Betrag</small><strong>${money(openSum)}</strong></div><div><small>Deine offenen Tickets</small><strong>${unpaid.length}</strong></div></div><div class=\"paymentPeople\">${unpaid.length?unpaid.map(a=>{const f=fixture(a.fixture_id);return `<div class=\"paymentPersonRow\"><div><b>${esc(f?.o||a.fixture_id)}</b><small>${esc(dateLabel(f))} · ${esc(ticketLabel(a.ticket_id))}</small></div><div class=\"paymentPersonAmount open\"><strong>${money(a.amount||state.group.default_price||0)}</strong><span>offen</span></div></div>`}).join(''):'<div class=\"productEmpty\">Du hast aktuell keine offenen Zahlungen.</div>'}</div>`;
      return;
    }
    const groups=paymentGroups(),totalOpen=groups.reduce((s,p)=>s+p.open,0),paypal=cleanPaypal(state.group.paypal_me);
    body.innerHTML=`<div class=\"paymentsSummary\"><div><small>Offener Gesamtbetrag</small><strong>${money(totalOpen)}</strong></div><div><small>Personen mit offenem Betrag</small><strong>${groups.filter(p=>p.open>0).length}</strong></div></div><div class=\"paymentPeople\">${groups.length?groups.map((p,i)=>`<div class=\"paymentPersonRow\"><div><b>@${esc(p.name)}</b><small>${p.items.length} Ticket${p.items.length===1?'':'s'} · ${money(p.paid)} bezahlt</small></div><div class=\"paymentPersonAmount ${p.open?'open':''}\"><strong>${money(p.open)}</strong><span>offen</span></div>${p.open?`<button type=\"button\" class=\"memberAction\" data-copy-debt=\"${i}\">Erinnerung kopieren</button>`:''}</div>`).join(''):'<div class=\"productEmpty\">Noch keine Ticketverteilungen.</div>'}</div>`;
    body.querySelectorAll('[data-copy-debt]').forEach(b=>b.addEventListener('click',async()=>{const p=groups[Number(b.dataset.copyDebt)],openItems=p.items.filter(x=>!x.paid);const lines=openItems.map(a=>{const f=fixture(a.fixture_id);return `• ${f?.o||a.fixture_id} · ${dateLabel(f)} · ${money(a.amount||state.group.default_price||0)}`});const link=paypal?`https://paypal.me/${paypal}/${p.open.toFixed(2)}`:'';const text=`Hi ${p.name},\\n\\nbei SeasonCrew sind noch ${money(p.open)} offen:\\n${lines.join('\\n')}${link?`\\n\\nPayPal: ${link}`:''}`;await navigator.clipboard.writeText(text);toast(`Erinnerung für ${p.name} kopiert`) }));
  }"""
if old_render_payments not in product:
    raise SystemExit('renderPayments block not found')
product = product.replace(old_render_payments, new_render_payments)
product_path.write_text(product, encoding='utf-8')

# 4) Cache bust updated JS and show a new build marker.
index_path = Path('SeasonCrew/index.html')
html = index_path.read_text(encoding='utf-8')
html = re.sub(r'pricing-runtime-v2\.js\?v=[^"\']+', 'pricing-runtime-v2.js?v=20260817-guestpay1', html)
html = re.sub(r"import\('./app\.js\?v=[^'\"]+'\)", "import('./app.js?v=20260817-guestpay1')", html)
html = re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User', 'Pilot V1 · Build calm-saas-2e · Multi-User', html)
index_path.write_text(html, encoding='utf-8')

crew_path = Path('SeasonCrew/crew-delete.js')
crew = crew_path.read_text(encoding='utf-8')
crew = re.sub(r'product-v2\.js\?v=\d+', 'product-v2.js?v=6', crew)
crew_path.write_text(crew, encoding='utf-8')
