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

// Replace the early hand-built mockups with product shots based on the current app UI.
function productShot(src,alt,extra=''){
  const img=document.createElement('img');
  img.src=src;img.alt=alt;img.loading='lazy';img.decoding='async';
  img.style.cssText=`display:block;width:100%;height:auto;border-radius:18px;${extra}`;
  return img;
}

const heroDemo=document.querySelector('.app-demo');
if(heroDemo){
  heroDemo.innerHTML='';
  heroDemo.style.cssText='display:block;min-height:0;background:#f5f6f8;overflow:hidden';
  heroDemo.append(productShot('assets/app-overview.svg?v=2','SeasonCrew Saisonübersicht – Produktansicht mit fiktiven Beispieldaten','border-radius:0'));
}

const miniBoard=document.querySelector('.mini-board');
if(miniBoard){
  const shot=productShot('assets/app-schedule.svg?v=2','SeasonCrew Spieltag und Kartenverteilung – Produktansicht mit fiktiven Beispieldaten','box-shadow:0 20px 50px rgba(10,15,31,.16)');
  const wrap=document.createElement('div');
  wrap.style.cssText='padding:0;border-radius:20px;overflow:hidden;background:#f5f6f8';
  wrap.append(shot);miniBoard.replaceWith(wrap);
}

const paymentMessage=document.querySelector('.payment-message');
if(paymentMessage){
  const shot=productShot('assets/app-paypal.svg?v=2','SeasonCrew PayPal Zahlungsaufforderung – Produktansicht mit fiktiven Beispieldaten','margin-top:18px;box-shadow:0 18px 44px rgba(0,0,0,.28)');
  paymentMessage.replaceWith(shot);
}

// Small ambient interaction is only used when the legacy demo is still present.
const unpaid=document.querySelector('.seat.unpaid span');
if(unpaid && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const states=['50 € offen','PayPal angefordert','bezahlt ✓'];let i=0;
  setInterval(()=>{i=(i+1)%states.length;unpaid.textContent=states[i];unpaid.parentElement.classList.toggle('unpaid',i!==2)},3200);
}
