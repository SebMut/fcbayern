(()=>{
  if(window.__seasonCrewPricingRuntime)return;
  window.__seasonCrewPricingRuntime=true;

  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let client=null;
  let pricing=null;
  let loadTimer=null;
  let loading=false;

  function sb(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }

  function groupId(){return $('groupSelect')?.value||''}
  function numberOrNull(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function formatPrice(value){
    return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
  }

  function rulePath(fixtureId){
    if(/^bl\d+$/i.test(fixtureId))return null;
    if(fixtureId==='dfb01')return ['dfb','r1'];
    if(fixtureId==='dfb02')return ['dfb','r2'];
    if(fixtureId==='dfb03')return ['dfb','r16'];
    if(['dfb04a','dfb04b'].includes(fixtureId))return ['dfb','qf'];
    if(fixtureId==='dfb05')return ['dfb','sf'];
    if(fixtureId==='dfb06')return ['dfb','final'];
    if(/^cl0[1-8]$/.test(fixtureId))return ['cl','league'];
    if(/^clpo[12]$/.test(fixtureId))return ['cl','playoff'];
    if(/^clr16[12]$/.test(fixtureId))return ['cl','r16'];
    if(/^clqf[12]$/.test(fixtureId))return ['cl','qf'];
    if(/^clsf[12]$/.test(fixtureId))return ['cl','sf'];
    if(fixtureId==='clfinal')return ['cl','final'];
    return null;
  }

  function nested(obj,path){
    return path?.reduce((acc,key)=>acc&&acc[key]!==undefined?acc[key]:undefined,obj);
  }

  function effectivePrice(fixtureId){
    if(!pricing)return null;
    const override=numberOrNull(pricing.rules?.overrides?.[fixtureId]);
    if(override!==null)return override;
    const path=rulePath(fixtureId);
    const rule=numberOrNull(nested(pricing.rules,path));
    if(rule!==null)return rule;
    return numberOrNull(pricing.defaultPrice)??0;
  }

  function ensurePricePill(card,fixtureId){
    const price=effectivePrice(fixtureId);if(price===null)return;
    const meta=card.querySelector('.fixtureMeta');if(!meta)return;
    let pill=meta.querySelector('.fixturePrice');
    if(!pill){
      pill=document.createElement('span');
      pill.className='fixturePrice';
      const competition=meta.querySelector('.competition');
      if(competition)competition.insertAdjacentElement('afterend',pill);else meta.prepend(pill);
    }
    pill.textContent=`${formatPrice(price)} / Karte`;
    pill.dataset.fixturePrice=String(price);
  }

  function renderCardPrices(){
    if(!pricing)return;
    document.querySelectorAll('.gameCard[id^="game-"]').forEach(card=>{
      const fixtureId=card.id.slice(5);
      ensurePricePill(card,fixtureId);
    });
  }

  async function refreshOpenPaymentStats(){
    const c=sb(),gid=groupId();if(!c||!gid||!pricing)return;
    const {data,error}=await c.from('sc_allocations').select('fixture_id,paid').eq('group_id',gid);
    if(error)return;
    const unpaid=(data||[]).filter(row=>!row.paid);
    const total=unpaid.reduce((sum,row)=>sum+(effectivePrice(row.fixture_id)??0),0);
    if($('statUnpaid'))$('statUnpaid').textContent=formatPrice(total);
    if($('statUnpaidCount'))$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
  }

  function applyPaymentPrice(fixtureId){
    const price=effectivePrice(fixtureId);if(price===null)return;
    const input=$('paymentAmount');if(!input)return;
    input.value=price.toFixed(2).replace('.',',');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    const match=$('paymentMatch');
    if(match){
      let hint=$('paymentRulePriceHint');
      if(!hint){hint=document.createElement('small');hint.id='paymentRulePriceHint';hint.className='paymentRulePriceHint';match.insertAdjacentElement('afterend',hint)}
      hint.textContent=`Aktueller Spielpreis: ${formatPrice(price)}`;
    }
  }

  async function loadPricing(){
    const c=sb(),gid=groupId();
    if(!c||!gid||loading)return;
    loading=true;
    try{
      const {data,error}=await c.from('sc_groups').select('id,default_price,price_rules').eq('id',gid).maybeSingle();
      if(error||!data)return;
      pricing={groupId:gid,defaultPrice:Number(data.default_price)||0,rules:data.price_rules||{}};
      renderCardPrices();
      await refreshOpenPaymentStats();
    }finally{loading=false}
  }

  function scheduleLoad(delay=80){clearTimeout(loadTimer);loadTimer=setTimeout(loadPricing,delay)}

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-paypal-fixture]');
    if(!btn)return;
    const fixtureId=btn.dataset.paypalFixture;
    setTimeout(()=>applyPaymentPrice(fixtureId),0);
  },true);

  $('groupSelect')?.addEventListener('change',()=>{pricing=null;scheduleLoad(120)});
  window.addEventListener('seasoncrew:prices-updated',()=>scheduleLoad(0));
  window.addEventListener('seasoncrew:games-rendered',()=>{
    if(pricing?.groupId===groupId())renderCardPrices();
    else scheduleLoad(50);
  });
  window.addEventListener('seasoncrew:rendered',()=>{
    if(pricing?.groupId===groupId()){renderCardPrices();refreshOpenPaymentStats()}
    else scheduleLoad(50);
  });

  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>scheduleLoad(500),{once:true});
  else scheduleLoad(100);
  setTimeout(()=>scheduleLoad(0),900);
})();