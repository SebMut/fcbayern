(()=>{
  if(window.__seasonCrewPricingRuntimeV2)return;
  window.__seasonCrewPricingRuntimeV2=true;
  window.__seasonCrewPricingRuntime=true;

  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let client=null,pricing=null,ticketMap=new Map(),opponentMap=new Map(),loadTimer=null,statsTimer=null,loading=false;

  function sb(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function groupId(){return $('groupSelect')?.value||''}
  function numeric(value){
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);return Number.isFinite(n)?n:null;
  }
  function money(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)}
  function nested(obj,path){return path?.reduce((acc,key)=>acc&&acc[key]!==undefined?acc[key]:undefined,obj)}
  function rulePath(id){
    if(id==='dfb01')return ['dfb','r1'];
    if(id==='dfb02')return ['dfb','r2'];
    if(id==='dfb03')return ['dfb','r16'];
    if(id==='dfb04a'||id==='dfb04b')return ['dfb','qf'];
    if(id==='dfb05')return ['dfb','sf'];
    if(id==='dfb06')return ['dfb','final'];
    if(/^cl0[1-8]$/.test(id))return ['cl','league'];
    if(/^clpo[12]$/.test(id))return ['cl','playoff'];
    if(/^clr16[12]$/.test(id))return ['cl','r16'];
    if(/^clqf[12]$/.test(id))return ['cl','qf'];
    if(/^clsf[12]$/.test(id))return ['cl','sf'];
    if(id==='clfinal')return ['cl','final'];
    return null;
  }
  function effectivePrice(id){
    if(!pricing)return null;
    const override=numeric(pricing.rules?.overrides?.[id]);
    if(override!==null)return override;
    const rule=numeric(nested(pricing.rules,rulePath(id)));
    if(rule!==null)return rule;
    return numeric(pricing.defaultPrice)??0;
  }
  function opponentKnown(id){
    if(/^bl\d+/i.test(id))return true;
    const opponent=String(opponentMap.get(id)||'').trim();
    return !!opponent&&!/(gegner\s*offen|offen|möglich|moeglich|tabellenplatz|termin|tbd|unknown|\?)/i.test(opponent);
  }
  function ticketIdFromCard(card){
    return card.dataset.ticketId||card.querySelector('[data-ticket-id]')?.dataset.ticketId||'';
  }
  function seatText(ticket){
    if(!ticket)return '';
    return [ticket.block&&`Block ${ticket.block}`,ticket.row_label&&`Reihe ${ticket.row_label}`,ticket.seat&&`Sitz ${ticket.seat}`].filter(Boolean).join(' · ');
  }
  function compactSeatText(ticket){
    if(!ticket)return '';
    return [ticket.block,ticket.row_label,ticket.seat].filter(Boolean).join('/');
  }

  function decorateTicket(card){
    const id=ticketIdFromCard(card),ticket=ticketMap.get(id),text=seatText(ticket);
    if(!text)return;
    const copy=card.querySelector('.ticketHead > div');if(!copy)return;
    const title=copy.querySelector('b');
    let badge=copy.querySelector('.ticketSeatBadge');
    if(!badge){badge=document.createElement('span');badge.className='ticketSeatBadge';if(title)title.insertAdjacentElement('afterend',badge);else copy.prepend(badge)}
    badge.textContent=text;

    const compact=compactSeatText(ticket);
    if(title){
      const shown=title.textContent.trim();
      const stored=String(ticket.label||'').trim();
      if(shown===compact||(stored===compact&&shown===stored))title.remove();
    }

    const legacy=[...copy.querySelectorAll(':scope > small')].find(el=>/^Block\s/i.test(el.textContent.trim()));
    legacy?.remove();
  }

  function decorateGame(card){
    const id=card.id.replace(/^game-/,'');if(!id)return;
    const meta=card.querySelector('.fixtureMeta');if(!meta)return;
    let badge=meta.querySelector('.fixturePriceV2');
    if(!badge){
      badge=document.createElement('span');badge.className='fixturePriceV2';
      const comp=meta.querySelector('.competition');
      comp?.insertAdjacentElement('afterend',badge);
    }
    if(!opponentKnown(id)){
      badge.textContent='Preis noch nicht bekannt';
      badge.removeAttribute('data-price');
    }else{
      const price=effectivePrice(id);if(price===null)return;
      badge.textContent=`${money(price)} / Karte`;
      badge.dataset.price=String(price);
    }
    card.querySelectorAll('.ticketCard').forEach(decorateTicket);
  }

  function decorateAll(){
    if(!pricing)return;
    document.querySelectorAll('.gameCard[id^="game-"]').forEach(decorateGame);
  }

  async function refreshUnpaidStats(){
    const c=sb(),gid=groupId();if(!c||!gid||!pricing)return;
    const [{data,error},{data:{session}}]=await Promise.all([
      c.rpc('sc_get_allocations',{p_group:gid}),
      c.auth.getSession()
    ]);
    if(error)return;
    const guest=String($('memberRole')?.textContent||'').trim()==='Gast',uid=session?.user?.id||'',username=String($('helloUser')?.textContent||'').replace(/^Hallo\s+/i,'').trim().toLowerCase();
    const visible=guest?(data||[]).filter(row=>row.attendee_user_id===uid||(!row.attendee_user_id&&String(row.attendee_name||'').trim().toLowerCase()===username)):(data||[]);
    const unpaid=visible.filter(x=>!x.paid);
    const total=unpaid.reduce((sum,row)=>sum+(opponentKnown(row.fixture_id)?(effectivePrice(row.fixture_id)??0):0),0);
    const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=guest?'Deine offenen Zahlungen':'Zahlungen offen';
    if($('statUnpaid'))$('statUnpaid').textContent=money(total);
    if($('statUnpaidCount'))$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
  }

  function applyPaymentPrice(fixtureId){
    const input=$('paymentAmount');if(!input)return;
    let hint=$('paymentRulePriceHint');
    if(!hint){hint=document.createElement('small');hint.id='paymentRulePriceHint';hint.className='paymentRulePriceHint';$('paymentMatch')?.insertAdjacentElement('afterend',hint)}
    if(!opponentKnown(fixtureId)){
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      if(hint)hint.textContent='Preis noch nicht bekannt';
      return;
    }
    const price=effectivePrice(fixtureId);if(price===null)return;
    input.value=price.toFixed(2).replace('.',',');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    if(hint)hint.textContent=`Aktueller Spielpreis: ${money(price)}`;
  }

  async function loadPricing(){
    const c=sb(),gid=groupId();if(!c||!gid||loading)return;
    loading=true;
    try{
      const [{data:group,error:ge},{data:tickets,error:te}]=await Promise.all([
        c.from('sc_groups').select('id,season,default_price,price_rules').eq('id',gid).maybeSingle(),
        c.from('sc_tickets').select('id,label,block,row_label,seat').eq('group_id',gid).eq('active',true)
      ]);
      if(ge||!group)return;
      pricing={groupId:gid,defaultPrice:numeric(group.default_price)??0,rules:group.price_rules||{}};
      if(!te)ticketMap=new Map((tickets||[]).map(t=>[t.id,t]));
      opponentMap=new Map();
      if(group.season){
        const {data:matches}=await c.from('match_overrides').select('id,opponent').eq('season',group.season);
        opponentMap=new Map((matches||[]).map(m=>[m.id,m.opponent]));
      }
      decorateAll();await refreshUnpaidStats();
    }finally{loading=false}
  }
  function scheduleLoad(delay=50){clearTimeout(loadTimer);loadTimer=setTimeout(loadPricing,delay)}
  function scheduleStats(delay=250){clearTimeout(statsTimer);statsTimer=setTimeout(refreshUnpaidStats,delay)}

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-paypal-fixture]');if(!btn)return;
    setTimeout(()=>applyPaymentPrice(btn.dataset.paypalFixture),0);
  },true);

  $('groupSelect')?.addEventListener('change',()=>{pricing=null;ticketMap=new Map();opponentMap=new Map();scheduleLoad(80)});
  window.addEventListener('seasoncrew:prices-updated',()=>scheduleLoad(0));
  window.addEventListener('seasoncrew:games-rendered',()=>pricing?.groupId===groupId()?decorateAll():scheduleLoad(30));
  window.addEventListener('seasoncrew:rendered',()=>pricing?.groupId===groupId()?(decorateAll(),scheduleStats(250)):scheduleLoad(30));

  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>scheduleLoad(250),{once:true});else scheduleLoad(20);
})();