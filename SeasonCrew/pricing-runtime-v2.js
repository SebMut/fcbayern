(()=>{
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
