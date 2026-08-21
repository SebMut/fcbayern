const personas={
  friends:{kicker:"2–10 Karten",title:"„Wer nimmt die zweite Karte?“ ist in 10 Sekunden geklärt.",text:"Für Freunde, Familien und kleine Gruppen, die ihre Dauerkarten fair verteilen und Zahlungen sauber nachhalten wollen.",list:["Flexible Namen pro Spiel","PayPal.Me-Zahlungsaufforderung","Gemeinsamer Live-Stand"],metric:"1 Chat weniger",sub:"pro Spieltag. Mindestens."},
  fanclub:{kicker:"10–100+ Karten",title:"Viele Karten. Viele Mitglieder. Trotzdem nur ein Stand.",text:"Für Fanclubs mit mehreren Dauerkarten, Verantwortlichen und wechselnden Mitgliedern – inklusive Rollen, Warteliste und nachvollziehbarer Historie.",list:["Mehrere Administratoren","Mitglieder & Warteliste","Auswertungen & Export"],metric:"100 % Überblick",sub:"auch wenn mehrere Personen organisieren."},
  business:{kicker:"Hospitality & Unternehmen",title:"Kundenplätze vergeben, ohne Excel und E-Mail-Pingpong.",text:"Für Firmen, die Stadionplätze intern an Mitarbeitende, Kunden oder Partner vergeben und jederzeit wissen müssen, wer welchen Platz nutzt.",list:["Interne Vergabe","Gastnamen pro Platz","Nachvollziehbare Änderungen"],metric:"0 offene Fragen",sub:"wenn am Spieltag jemand nachfragt."}
};

const header=document.querySelector('.site-header');
const menuBtn=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('.mobile-nav');
const reveals=[...document.querySelectorAll('.reveal')];
const tabs=[...document.querySelectorAll('.persona-tab')];

function onScroll(){header?.classList.toggle('scrolled',window.scrollY>18)}
window.addEventListener('scroll',onScroll,{passive:true});onScroll();

menuBtn?.addEventListener('click',()=>{
  const open=menuBtn.getAttribute('aria-expanded')==='true';
  menuBtn.setAttribute('aria-expanded',String(!open));
  mobileNav.hidden=false;
  mobileNav.classList.toggle('open',!open);
  if(open)setTimeout(()=>{mobileNav.hidden=true},180);
});
mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menuBtn.setAttribute('aria-expanded','false');mobileNav.classList.remove('open');mobileNav.hidden=true}));

if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}}),{threshold:.12});
  reveals.forEach(el=>io.observe(el));
}else reveals.forEach(el=>el.classList.add('visible'));

function setPersona(key){
  const data=personas[key]; if(!data)return;
  tabs.forEach(btn=>{const active=btn.dataset.persona===key;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active))});
  const map={personaKicker:data.kicker,personaTitle:data.title,personaText:data.text,personaMetric:data.metric,personaMetricSub:data.sub};
  Object.entries(map).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value});
  const list=document.getElementById('personaList');if(list)list.innerHTML=data.list.map(item=>`<li>${item}</li>`).join('');
}
tabs.forEach(btn=>btn.addEventListener('click',()=>setPersona(btn.dataset.persona)));

const form=document.getElementById('earlyForm');
const formStatus=document.getElementById('formStatus');
form?.addEventListener('submit',e=>{
  e.preventDefault();
  const email=document.getElementById('email')?.value.trim();
  if(!email)return;
  formStatus.textContent=`Danke – ${email} ist für die Demo vorgemerkt.`;
  form.reset();
});

// These are not redraws: the frames load static demo pages that use the exact CSS
// and DOM classes of the current FC Bayern app. Only the example data is fictional.
function appFrame(src,title,baseWidth,baseHeight){
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative;width:100%;overflow:hidden;background:#f5f6f8;border-radius:18px';
  const frame=document.createElement('iframe');
  frame.src=src;frame.title=title;frame.loading='lazy';frame.tabIndex=-1;
  frame.setAttribute('aria-hidden','false');
  frame.style.cssText=`position:absolute;left:0;top:0;width:${baseWidth}px;height:${baseHeight}px;border:0;transform-origin:0 0;pointer-events:none;background:#f5f6f8`;
  wrap.append(frame);
  const resize=()=>{
    const scale=wrap.clientWidth/baseWidth;
    wrap.style.height=`${Math.ceil(baseHeight*scale)}px`;
    frame.style.transform=`scale(${scale})`;
  };
  new ResizeObserver(resize).observe(wrap);requestAnimationFrame(resize);
  return wrap;
}

const heroDemo=document.querySelector('.app-demo');
if(heroDemo){
  heroDemo.innerHTML='';
  heroDemo.style.cssText='display:block;min-height:0;background:#f5f6f8;overflow:hidden';
  const frame=appFrame('demo-overview.html?v=1','SeasonCrew Saisonübersicht im Original-App-Design',1080,620);
  frame.style.borderRadius='0';heroDemo.append(frame);
}

const miniBoard=document.querySelector('.mini-board');
if(miniBoard){
  const frame=appFrame('demo-schedule.html?v=1','SeasonCrew Spieltag und Kartenverteilung im Original-App-Design',1080,690);
  frame.style.boxShadow='0 20px 50px rgba(10,15,31,.16)';
  miniBoard.replaceWith(frame);
}

const paymentMessage=document.querySelector('.payment-message');
if(paymentMessage){
  const frame=appFrame('demo-paypal.html?v=1','SeasonCrew PayPal-Zahlungsaufforderung im Original-App-Design',900,620);
  frame.style.marginTop='18px';frame.style.boxShadow='0 18px 44px rgba(0,0,0,.28)';
  paymentMessage.replaceWith(frame);
}
