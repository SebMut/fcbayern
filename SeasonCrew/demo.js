(()=>{
  'use strict';

  const STORAGE='seasoncrew-customer-demo-v2';
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateText=iso=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(`${iso}T12:00:00`));
  const monthText=iso=>new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(`${iso}T12:00:00`));
  const nowText=()=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date());

  const seed=()=>({
    version:2,
    role:'admin',
    filter:'all',
    paypalMe:'SeasonCrewDemo',
    members:[
      {id:'miriam',name:'Miriam',role:'Admin',online:true},
      {id:'alex',name:'Alex',role:'Mitglied',online:true},
      {id:'lea',name:'Lea',role:'Mitglied',online:true},
      {id:'chris',name:'Chris',role:'Mitglied',online:false},
      {id:'dana',name:'Dana',role:'Mitglied',online:false}
    ],
    tickets:[
      {id:'t1',label:'Dauerkarte 1',block:'112',row:'8',seat:'14'},
      {id:'t2',label:'Dauerkarte 2',block:'112',row:'8',seat:'15'},
      {id:'t3',label:'Dauerkarte 3',block:'113',row:'6',seat:'22'},
      {id:'t4',label:'Dauerkarte 4',block:'113',row:'6',seat:'23'}
    ],
    matches:[
      {id:'m1',date:'2026-08-22',time:'18:30',comp:'liga',label:'Liga · 1. Spieltag',opponent:'Rheinland 04',price:55,note:'Treffpunkt 17:15 Uhr am Eingang Nord.'},
      {id:'m2',date:'2026-09-12',time:'15:30',comp:'liga',label:'Liga · 3. Spieltag',opponent:'Hafenstadt 96',price:55,note:''},
      {id:'m3',date:'2026-09-23',time:'20:45',comp:'europa',label:'Europa · Ligaphase',opponent:'Sporting Lisboa',price:72,note:'Champions-Abend – Karten bitte früh verteilen.'},
      {id:'m4',date:'2026-10-03',time:'18:30',comp:'liga',label:'Liga · 6. Spieltag',opponent:'Borussia West',price:55,note:''},
      {id:'m5',date:'2026-10-28',time:'20:45',comp:'pokal',label:'Pokal · 2. Runde',opponent:'Union Süd',price:48,note:''},
      {id:'m6',date:'2026-11-07',time:'15:30',comp:'liga',label:'Liga · 10. Spieltag',opponent:'Athletik Köln',price:55,note:''}
    ],
    allocations:[
      {matchId:'m1',ticketId:'t1',memberId:'alex',name:'Alex',paid:true,amount:55},
      {matchId:'m1',ticketId:'t2',memberId:'lea',name:'Lea',paid:true,amount:55},
      {matchId:'m1',ticketId:'t3',memberId:'chris',name:'Chris',paid:false,amount:55},
      {matchId:'m1',ticketId:'t4',memberId:'dana',name:'Dana',paid:false,amount:55},
      {matchId:'m2',ticketId:'t1',memberId:'alex',name:'Alex',paid:false,amount:55},
      {matchId:'m2',ticketId:'t2',memberId:'lea',name:'Lea',paid:false,amount:55},
      {matchId:'m3',ticketId:'t1',memberId:'alex',name:'Alex',paid:false,amount:72},
      {matchId:'m3',ticketId:'t3',memberId:null,name:'Ticket-Gast Felix',paid:false,amount:72},
      {matchId:'m4',ticketId:'t2',memberId:'chris',name:'Chris',paid:true,amount:55}
    ],
    history:[
      {time:'17.08., 17:42',actor:'Miriam',text:'Spielplan synchronisiert'},
      {time:'17.08., 17:30',actor:'Miriam',text:'Alex für Sporting Lisboa eingetragen'},
      {time:'17.08., 16:55',actor:'Lea',text:'Zahlung für Rheinland 04 als bezahlt markiert'},
      {time:'16.08., 21:11',actor:'Miriam',text:'Neue Einladung für die Crew erstellt'}
    ],
    notifications:[
      {id:'n1',title:'Zahlung noch offen',text:'Chris hat das Ticket gegen Rheinland 04 noch nicht bezahlt.',read:false},
      {id:'n2',title:'Karten verfügbar',text:'Für Hafenstadt 96 sind noch zwei Dauerkarten frei.',read:false}
    ],
    joinRequest:null
  });

  let state=load();
  let assignContext=null;
  let paypalContext=null;

  function load(){
    try{const parsed=JSON.parse(localStorage.getItem(STORAGE));if(parsed?.version===2)return parsed}catch{}
    const fresh=seed();localStorage.setItem(STORAGE,JSON.stringify(fresh));return fresh;
  }
  function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
  function member(id){return state.members.find(x=>x.id===id)}
  function match(id){return state.matches.find(x=>x.id===id)}
  function ticket(id){return state.tickets.find(x=>x.id===id)}
  function alloc(matchId,ticketId){return state.allocations.find(x=>x.matchId===matchId&&x.ticketId===ticketId)}
  function isAdmin(){return state.role==='admin'}
  function compName(c){return c==='liga'?'Liga':c==='pokal'?'Pokal':'Europa'}
  function visiblePayments(){return state.allocations.filter(a=>!a.paid&&(isAdmin()||a.memberId==='alex'))}
  function toast(text){const el=$('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
  function addHistory(text,actor=null){state.history.unshift({time:nowText(),actor:actor||(isAdmin()?'Miriam':'Alex'),text});state.history=state.history.slice(0,50);save()}
  function openModal(id){const el=$(id);if(!el)return;try{if(typeof el.showModal==='function'){if(!el.open)el.showModal()}else{el.setAttribute('open','');el.style.display='block'}}catch{el.setAttribute('open','');el.style.display='block'}}
  function closeModal(id){const el=$(id);if(!el)return;try{if(typeof el.close==='function'&&el.open)el.close();else el.removeAttribute('open')}catch{el.removeAttribute('open')}if(typeof el.showModal!=='function')el.style.display='none'}
  async function copyText(text){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}}catch{}try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return true}catch{return false}}

  function ensurePaypalDialog(){
    if($('paypalDemoDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='paypalDemoDialog';dialog.className='dialog';
    dialog.innerHTML=`<div class="dialogCard"><div class="dialogHead"><div><small>PayPal.Me · Demo</small><h3>Zahlung anfordern</h3></div><button class="iconClose" type="button" data-close="paypalDemoDialog" aria-label="Schließen">×</button></div><div class="demoPaypalPerson" id="demoPaypalPerson"></div><div class="demoPaypalAmount" id="demoPaypalAmount"></div><div class="demoPaypalLink" id="demoPaypalLink"></div><div class="demoFeatureNote">Dies ist nur eine Simulation. Es wird keine echte PayPal-Zahlung ausgelöst.</div><div class="dialogActions"><button class="secondaryBtn" type="button" data-action="copy-paypal">Nachricht kopieren</button><button class="primaryBtn" type="button" data-action="simulate-paypal">PayPal öffnen · Demo</button></div></div>`;
    document.body.appendChild(dialog);
    const style=document.createElement('style');
    style.textContent=`.demoPaypalPerson{font:800 11px Manrope;margin:2px 0 3px}.demoPaypalAmount{font:800 28px Space Grotesk;color:#e14975;margin:8px 0}.demoPaypalLink{background:#f4f6f7;border:1px solid #dfe4e7;border-radius:10px;padding:10px;font:800 10px Manrope;word-break:break-all}.paypalBtn{background:rgba(255,255,255,.2)!important;color:#fff!important;border:1px solid rgba(255,255,255,.32)!important}.paymentPaypal{border:0;background:#1f2a30;color:#b7ff00;border-radius:8px;padding:7px 9px;font:800 8px Manrope;cursor:pointer}.guestMode .ticketCard.unpaid:not(.ownTicket) .paypalBtn{display:none!important}`;
    document.head.appendChild(style);
  }

  function render(){
    document.body.classList.toggle('guestMode',!isAdmin());
    if($('roleView'))$('roleView').value=state.role;
    if($('viewerName'))$('viewerName').textContent=isAdmin()?'Miriam':'Alex';
    if($('viewerRole'))$('viewerRole').textContent=isAdmin()?'Admin':'Mitglied';
    if($('inviteBtn'))$('inviteBtn').style.display=isAdmin()?'inline-flex':'none';
    renderStats();renderGames();renderNotifications();
    document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter===state.filter));
  }

  function renderStats(){
    const total=state.matches.length*state.tickets.length,unpaid=visiblePayments();
    $('statFixtures').textContent=state.matches.length;$('statTickets').textContent=state.tickets.length;$('statAssigned').textContent=state.allocations.length;$('statOpen').textContent=total-state.allocations.length;
    $('paymentLabel').textContent=isAdmin()?'Zahlungen offen':'Deine offenen Zahlungen';$('statUnpaid').textContent=money(unpaid.reduce((s,a)=>s+Number(a.amount||0),0));$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;$('paymentsBtn').textContent=isAdmin()?'Zahlungen ansehen':'Meine Zahlungen';
  }

  function filteredMatches(){
    const q=($('searchInput')?.value||'').trim().toLowerCase();
    return state.matches.filter(m=>{const free=state.tickets.some(t=>!alloc(m.id,t.id));const ok=state.filter==='all'||state.filter===m.comp||(state.filter==='open'&&free);return ok&&(!q||`${m.opponent} ${m.label} ${compName(m.comp)}`.toLowerCase().includes(q))});
  }

  function renderGames(){
    const list=filteredMatches();if(!list.length){$('games').innerHTML='<div class="demoFeatureNote">Keine Spiele für diesen Filter.</div>';return}
    const groups=new Map();list.forEach(m=>{const key=monthText(m.date);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)});const nextId=list[0]?.id;
    $('games').innerHTML=[...groups].map(([month,items])=>`<div class="monthTitle">${esc(month)}</div>${items.map(m=>renderGame(m,m.id===nextId)).join('')}`).join('');
  }

  function renderGame(m,isNext){
    const assigned=state.tickets.map(t=>alloc(m.id,t.id)).filter(Boolean),allPaid=assigned.length===state.tickets.length&&assigned.every(a=>a.paid);
    return `<article class="gameCard ${isNext?'nextGame':''} ${allPaid?'allPaid':''}" id="game-${m.id}"><div class="gameTop"><div class="gameDate"><strong>${dateText(m.date)}</strong><span>${esc(m.time)} Uhr</span></div><div class="fixtureMeta"><span class="competition">${esc(compName(m.comp))}</span><h3>Musterstadt 1908 – ${esc(m.opponent)}</h3><p>${esc(m.label)}</p></div><div class="fixtureCount">${assigned.length}/${state.tickets.length}</div></div><div class="ticketGrid">${state.tickets.map(t=>renderTicket(m,t,alloc(m.id,t.id))).join('')}</div><div class="gameNoteWrap"><textarea data-note="${m.id}" ${isAdmin()?'':'readonly'} placeholder="Notiz zum Spiel">${esc(m.note||'')}</textarea>${isAdmin()?`<button class="saveNote" data-action="save-note" data-match="${m.id}" type="button">Notiz speichern</button>`:''}</div></article>`;
  }

  function renderTicket(m,t,a){
    const meta=`Block ${esc(t.block)} · Reihe ${esc(t.row)} · Sitz ${esc(t.seat)}`;
    if(!a)return `<div class="ticketCard unassigned" data-action="assign" data-match="${m.id}" data-ticket="${t.id}" role="button" tabindex="0"><div class="ticketHead"><div><b>${esc(t.label)}</b><small>${meta}</small></div><b>+</b></div><div class="ticketPerson">Karte verfügbar</div><div class="ticketActions"><button type="button" data-action="assign" data-match="${m.id}" data-ticket="${t.id}">Karte vergeben</button></div></div>`;
    const own=a.memberId==='alex',canPaypal=!a.paid&&(isAdmin()||own);
    return `<div class="ticketCard ${a.paid?'paid':'unpaid'} ${own?'ownTicket':''}"><div class="ticketHead"><div><b>${esc(t.label)}</b><small>${a.paid?'bezahlt':'Zahlung offen'}</small></div></div><div class="ticketMeta">${meta}</div><div class="ticketPerson">${esc(a.name)} · ${money(a.amount)}</div><div class="ticketActions">${isAdmin()?`<button class="releaseAction" data-action="release" data-match="${m.id}" data-ticket="${t.id}" type="button">Zuweisung aufheben</button>`:''}${canPaypal?`<button class="paypalBtn" data-action="paypal" data-match="${m.id}" data-ticket="${t.id}" type="button">PayPal</button>`:''}${isAdmin()?`<label><input type="checkbox" data-action="paid-toggle" data-match="${m.id}" data-ticket="${t.id}" ${a.paid?'checked':''}> bezahlt</label>`:''}</div></div>`;
  }

  function updateDemoAssignSeat(){if(!assignContext)return;const m=match(assignContext.matchId),t=ticket(assignContext.ticketId);if(m&&t)$('assignTitle').textContent=`${t.label} · ${m.opponent}`;}
  function openAssign(matchId,ticketId){
    if(!isAdmin()){toast('In der Mitgliedsansicht können freie Karten nicht vergeben werden.');return}
    assignContext={matchId,ticketId};const m=match(matchId),t=ticket(ticketId);if(!m||!t)return;const available=state.tickets.filter(x=>x.id===ticketId||!alloc(matchId,x.id));
    $('assignSeat').innerHTML=available.map(x=>`<option value="${x.id}">${esc(x.label)} · Block ${esc(x.block)} · Reihe ${esc(x.row)} · Sitz ${esc(x.seat)}</option>`).join('');$('assignSeat').value=ticketId;updateDemoAssignSeat();
    $('assignMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+state.members.map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.role)}</option>`).join('');$('assignMember').value='';$('assignGuest').value='';openModal('assignDialog');
  }
  function releaseTicket(matchId,ticketId){if(!isAdmin())return;const a=alloc(matchId,ticketId);if(!a)return;state.allocations=state.allocations.filter(x=>!(x.matchId===matchId&&x.ticketId===ticketId));addHistory(`${ticket(ticketId).label} gegen ${match(matchId).opponent} von ${a.name}: Zuweisung aufgehoben`);render();toast('Zuweisung aufgehoben')}
  function setPaid(matchId,ticketId,paid){if(!isAdmin())return;const a=alloc(matchId,ticketId);if(!a)return;a.paid=paid;addHistory(`${a.name}: ${ticket(ticketId).label} gegen ${match(matchId).opponent} ${paid?'als bezahlt markiert':'wieder auf offen gesetzt'}`);render();toast(paid?'Zahlung erledigt':'Zahlung wieder offen')}

  function renderPayments(){
    const list=visiblePayments();$('paymentsTitle').textContent=isAdmin()?'Offene Zahlungen':'Deine offenen Zahlungen';
    $('paymentsList').innerHTML=list.length?list.map(a=>{const m=match(a.matchId),t=ticket(a.ticketId);return `<div class="paymentRow"><div><strong>${esc(a.name)} · ${esc(t.label)}</strong><small>${dateText(m.date)} · ${esc(m.opponent)}</small></div><div class="paymentAmount">${money(a.amount)}</div><button class="paymentPaypal" data-action="paypal" data-match="${a.matchId}" data-ticket="${a.ticketId}" type="button">PayPal</button>${isAdmin()?`<button class="payDone" data-action="pay-done" data-match="${a.matchId}" data-ticket="${a.ticketId}" type="button">Bezahlt</button>`:''}</div>`}).join(''):'<div class="demoFeatureNote">Aktuell sind keine Zahlungen offen.</div>';
  }

  function openPaypal(matchId,ticketId){
    const a=alloc(matchId,ticketId),m=match(matchId),t=ticket(ticketId);if(!a||!m||!t)return;if(!isAdmin()&&a.memberId!=='alex'){toast('Als Mitglied siehst du nur deine eigenen Zahlungen.');return}
    paypalContext={a,m,t};const demoLink=`paypal.me/${state.paypalMe}/${Number(a.amount).toFixed(2)}EUR`;$('demoPaypalPerson').textContent=`${a.name} · ${t.label} · ${m.opponent}`;$('demoPaypalAmount').textContent=money(a.amount);$('demoPaypalLink').textContent=demoLink;openModal('paypalDemoDialog');
  }
  function paypalMessage(){if(!paypalContext)return '';const {a,m,t}=paypalContext;return `Hi ${a.name}, für ${t.label} gegen ${m.opponent} sind noch ${money(a.amount)} offen. Demo-PayPal-Link: paypal.me/${state.paypalMe}/${Number(a.amount).toFixed(2)}EUR`}

  function renderHistory(){$('historyList').innerHTML=state.history.map(h=>`<div class="historyRow"><time>${esc(h.time)}</time><div><b>${esc(h.actor)}</b><small>${esc(h.text)}</small></div></div>`).join('')}
  function renderMembers(){$('membersList').innerHTML=state.members.map(m=>`<div class="memberRow"><span class="memberAvatar">${esc(m.name[0])}</span><div><strong>${esc(m.name)}</strong><small>${m.online?'● online':'○ offline'}</small></div><span class="rolePill">${esc(m.role)}</span></div>`).join('')}
  function renderNotifications(){const unread=state.notifications.filter(n=>!n.read).length;$('notificationCount').textContent=unread;$('notificationCount').style.display=unread?'inline':'none';$('notificationsList').innerHTML=state.notifications.length?state.notifications.map(n=>`<div class="notificationRow"><div><strong>${n.read?'':'🔔 '}${esc(n.title)}</strong><small>${esc(n.text)}</small></div></div>`).join(''):'<div class="demoFeatureNote">Keine Benachrichtigungen.</div>'}
  function requestMarkup(){return `<div class="memberRow" style="margin-top:12px"><span class="memberAvatar">J</span><div><strong>Jonas</strong><small>möchte der Crew beitreten</small></div>${isAdmin()?'<button class="payDone" data-action="approve-request" type="button">Als Mitglied freigeben</button>':'<span class="rolePill">wartet</span>'}</div>`}

  function handleAction(action,el,event){
    const matchId=el.dataset.match,ticketId=el.dataset.ticket;
    if(action==='assign'){event.preventDefault();event.stopPropagation();openAssign(matchId,ticketId);return}
    if(action==='release'){event.preventDefault();event.stopPropagation();releaseTicket(matchId,ticketId);return}
    if(action==='paypal'){event.preventDefault();event.stopPropagation();openPaypal(matchId,ticketId);return}
    if(action==='pay-done'){event.preventDefault();setPaid(matchId,ticketId,true);renderPayments();return}
    if(action==='save-note'){event.preventDefault();if(!isAdmin())return;const m=match(matchId),area=document.querySelector(`[data-note="${matchId}"]`);if(!m||!area)return;m.note=area.value.trim();addHistory(`Notiz für ${m.opponent} aktualisiert`);render();toast('Notiz gespeichert');return}
    if(action==='copy-paypal'){event.preventDefault();copyText(paypalMessage()).then(ok=>toast(ok?'PayPal-Nachricht kopiert':'Kopieren nicht möglich'));return}
    if(action==='simulate-paypal'){event.preventDefault();toast('Demo: PayPal.Me würde jetzt geöffnet.');return}
    if(action==='approve-request'){event.preventDefault();if(!state.members.some(x=>x.id==='jonas'))state.members.push({id:'jonas',name:'Jonas',role:'Mitglied',online:false});state.joinRequest=null;addHistory('Jonas als Mitglied freigegeben');$('inviteRequestPreview').innerHTML='<div class="demoFeatureNote">Jonas wurde als Mitglied zur Crew hinzugefügt.</div>';toast('Jonas freigegeben')}
  }

  document.addEventListener('click',event=>{
    const actionEl=event.target.closest('[data-action]');if(actionEl){handleAction(actionEl.dataset.action,actionEl,event);return}
    const closeEl=event.target.closest('[data-close]');if(closeEl){event.preventDefault();closeModal(closeEl.dataset.close);return}
    const button=event.target.closest('button,a');if(!button)return;const id=button.id;
    if(id==='paymentsBtn'){event.preventDefault();renderPayments();openModal('paymentsDialog')}
    else if(id==='historyBtn'){event.preventDefault();renderHistory();openModal('historyDialog')}
    else if(id==='membersBtn'){event.preventDefault();renderMembers();openModal('membersDialog')}
    else if(id==='inviteBtn'){event.preventDefault();$('inviteRequestPreview').innerHTML=state.joinRequest?requestMarkup():'';openModal('inviteDialog')}
    else if(id==='notificationBtn'){event.preventDefault();state.notifications.forEach(n=>n.read=true);save();renderNotifications();openModal('notificationsDialog')}
    else if(id==='demoHelpBtn'){event.preventDefault();openModal('helpDialog')}
    else if(id==='nextMatchBtn'){event.preventDefault();document.querySelector('.gameCard')?.scrollIntoView({behavior:'smooth',block:'start'})}
    else if(id==='resetBtn'){event.preventDefault();if(!window.confirm('Demoversion wirklich auf den Ausgangszustand zurücksetzen?'))return;localStorage.removeItem(STORAGE);state=load();render();toast('Demo zurückgesetzt')}
    else if(id==='copyInviteBtn'){event.preventDefault();copyText('DEMO-7K4P-26').then(ok=>toast(ok?'Demo-Code kopiert':'Demo-Code: DEMO-7K4P-26'))}
    else if(id==='simulateRequestBtn'){event.preventDefault();state.joinRequest={name:'Jonas',requestedAt:nowText()};addHistory('Neue Beitrittsanfrage von Jonas erhalten');$('inviteRequestPreview').innerHTML=requestMarkup();toast('Bewerbung simuliert')}
  });

  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='roleView'){state.role=el.value==='guest'?'guest':'admin';save();render();toast(isAdmin()?'Admin-Ansicht aktiv':'Mitglied-Ansicht von Alex aktiv');return}
    if(el.matches('[data-action="paid-toggle"]')){if(!isAdmin()){el.checked=!el.checked;return}setPaid(el.dataset.match,el.dataset.ticket,el.checked)}
  });
  document.addEventListener('input',event=>{if(event.target.id==='searchInput')renderGames()});
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('.ticketCard.unassigned[data-action="assign"]')){event.preventDefault();openAssign(event.target.dataset.match,event.target.dataset.ticket)}});

  $('assignSeat')?.addEventListener('change',()=>{if(!assignContext)return;assignContext.ticketId=$('assignSeat').value;updateDemoAssignSeat()});
  $('filters')?.addEventListener('click',event=>{const btn=event.target.closest('[data-filter]');if(!btn)return;event.preventDefault();state.filter=btn.dataset.filter||'all';save();renderGames();document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter===state.filter))});
  $('assignForm')?.addEventListener('submit',event=>{
    event.preventDefault();if(event.submitter?.value==='cancel'){closeModal('assignDialog');assignContext=null;return}if(!assignContext)return;
    const memberId=$('assignMember').value,guest=$('assignGuest').value.trim();if(!memberId&&!guest){toast('Bitte Person oder Ticket-Gast wählen');return}
    const selectedTicketId=$('assignSeat')?.value||assignContext.ticketId;assignContext.ticketId=selectedTicketId;const p=memberId?member(memberId):null,m=match(assignContext.matchId),t=ticket(selectedTicketId);if(!m||!t)return;const name=guest||(p?.name||'Mitglied');
    state.allocations.push({matchId:m.id,ticketId:t.id,memberId:guest?null:p?.id||null,name,paid:false,amount:m.price});addHistory(`${t.label} gegen ${m.opponent} an ${name} vergeben`);closeModal('assignDialog');assignContext=null;render();toast('Karte vergeben');
  });

  ensurePaypalDialog();render();
})();
