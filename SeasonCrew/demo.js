(()=>{
  const STORAGE='seasoncrew-customer-demo-v1';
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateText=iso=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(`${iso}T12:00:00`));
  const monthText=iso=>new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(`${iso}T12:00:00`));
  const nowText=()=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date());

  const seed=()=>({
    version:1,
    role:'admin',
    filter:'all',
    members:[
      {id:'miriam',name:'Miriam',role:'Admin',online:true},
      {id:'alex',name:'Alex',role:'Gast',online:true},
      {id:'lea',name:'Lea',role:'Gast',online:true},
      {id:'chris',name:'Chris',role:'Gast',online:false},
      {id:'dana',name:'Dana',role:'Gast',online:false}
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
      {matchId:'m3',ticketId:'t3',memberId:null,name:'Gast Felix',paid:false,amount:72},
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

  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE));
      if(parsed?.version===1)return parsed;
    }catch{}
    const fresh=seed();localStorage.setItem(STORAGE,JSON.stringify(fresh));return fresh;
  }
  function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
  function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
  function addHistory(text,actor=null){state.history.unshift({time:nowText(),actor:actor||(state.role==='guest'?'Alex':'Miriam'),text});state.history=state.history.slice(0,40);save()}
  function member(id){return state.members.find(m=>m.id===id)}
  function match(id){return state.matches.find(m=>m.id===id)}
  function ticket(id){return state.tickets.find(t=>t.id===id)}
  function alloc(matchId,ticketId){return state.allocations.find(a=>a.matchId===matchId&&a.ticketId===ticketId)}
  function isAdmin(){return state.role==='admin'}
  function visiblePayments(){return state.allocations.filter(a=>!a.paid&&(isAdmin()||a.memberId==='alex'))}
  function compName(c){return c==='liga'?'Liga':c==='pokal'?'Pokal':'Europa'}

  function render(){
    document.body.classList.toggle('guestMode',!isAdmin());
    $('roleView').value=state.role;
    $('viewerName').textContent=isAdmin()?'Miriam':'Alex';
    $('viewerRole').textContent=isAdmin()?'Admin':'Gast';
    $('inviteBtn').style.display=isAdmin()?'inline-flex':'none';
    renderStats();renderGames();renderNotifications();
  }

  function renderStats(){
    const total=state.matches.length*state.tickets.length,assigned=state.allocations.length,unpaid=visiblePayments();
    $('statFixtures').textContent=state.matches.length;
    $('statTickets').textContent=state.tickets.length;
    $('statAssigned').textContent=assigned;
    $('statOpen').textContent=total-assigned;
    $('paymentLabel').textContent=isAdmin()?'Zahlungen offen':'Deine offenen Zahlungen';
    $('statUnpaid').textContent=money(unpaid.reduce((s,a)=>s+a.amount,0));
    $('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
    $('paymentsBtn').textContent=isAdmin()?'Zahlungen ansehen':'Meine Zahlungen';
  }

  function filteredMatches(){
    const q=$('searchInput').value.trim().toLowerCase();
    return state.matches.filter(m=>{
      const free=state.tickets.some(t=>!alloc(m.id,t.id));
      const filterOk=state.filter==='all'||state.filter===m.comp||(state.filter==='open'&&free);
      return filterOk&&(!q||`${m.opponent} ${m.label} ${compName(m.comp)}`.toLowerCase().includes(q));
    });
  }

  function renderGames(){
    const groups=new Map();
    filteredMatches().forEach(m=>{const k=monthText(m.date);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)});
    if(!groups.size){$('games').innerHTML='<div class="demoFeatureNote">Keine Spiele für diesen Filter.</div>';return}
    const nextId=filteredMatches()[0]?.id;
    $('games').innerHTML=[...groups].map(([month,matches])=>`<div class="monthTitle">${esc(month)}</div>${matches.map(m=>renderGame(m,m.id===nextId)).join('')}`).join('');
    bindGameEvents();
  }

  function renderGame(m,isNext){
    const assigned=state.tickets.map(t=>alloc(m.id,t.id)).filter(Boolean),allPaid=assigned.length===state.tickets.length&&assigned.every(a=>a.paid);
    return `<article class="gameCard ${isNext?'nextGame':''} ${allPaid?'allPaid':''}" id="game-${m.id}">
      <div class="gameTop">
        <div class="gameDate"><strong>${dateText(m.date)}</strong><span>${esc(m.time)} Uhr</span></div>
        <div class="fixtureMeta"><span class="competition">${esc(compName(m.comp))}</span><h3>Musterstadt 1908 – ${esc(m.opponent)}</h3><p>${esc(m.label)}</p></div>
        <div class="fixtureCount">${assigned.length}/${state.tickets.length}</div>
      </div>
      <div class="ticketGrid">${state.tickets.map(t=>renderTicket(m,t,alloc(m.id,t.id))).join('')}</div>
      <div class="gameNoteWrap"><textarea data-note="${m.id}" ${isAdmin()?'':'readonly'} placeholder="Notiz zum Spiel">${esc(m.note||'')}</textarea><button class="saveNote" data-save-note="${m.id}" type="button">Notiz speichern</button></div>
    </article>`;
  }

  function renderTicket(m,t,a){
    const meta=`Block ${esc(t.block)} · Reihe ${esc(t.row)} · Sitz ${esc(t.seat)}`;
    if(!a)return `<div class="ticketCard unassigned" data-assign="${m.id}|${t.id}"><div class="ticketHead"><div><b>${esc(t.label)}</b><small>${meta}</small></div><b>+</b></div><div class="ticketPerson">Karte verfügbar</div><div class="ticketActions"><button type="button">Karte vergeben</button></div></div>`;
    return `<div class="ticketCard ${a.paid?'paid':'unpaid'}"><div class="ticketHead"><div><b>${esc(t.label)}</b><small>${a.paid?'bezahlt':'Zahlung offen'}</small></div></div><div class="ticketMeta">${meta}</div><div class="ticketPerson">${esc(a.name)}</div><div class="ticketActions"><button class="releaseAction" data-release="${m.id}|${t.id}" type="button">Freigeben</button><label><input type="checkbox" data-paid="${m.id}|${t.id}" ${a.paid?'checked':''}> bezahlt</label></div></div>`;
  }

  function bindGameEvents(){
    document.querySelectorAll('[data-assign]').forEach(el=>el.addEventListener('click',()=>{if(!isAdmin())return;const [matchId,ticketId]=el.dataset.assign.split('|');openAssign(matchId,ticketId)}));
    document.querySelectorAll('[data-release]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();if(!isAdmin())return;const [matchId,ticketId]=btn.dataset.release.split('|');releaseTicket(matchId,ticketId)}));
    document.querySelectorAll('[data-paid]').forEach(input=>input.addEventListener('change',()=>{if(!isAdmin()){input.checked=!input.checked;return}const [matchId,ticketId]=input.dataset.paid.split('|');setPaid(matchId,ticketId,input.checked)}));
    document.querySelectorAll('[data-save-note]').forEach(btn=>btn.addEventListener('click',()=>{if(!isAdmin())return;const id=btn.dataset.saveNote,m=match(id),area=document.querySelector(`[data-note="${id}"]`);m.note=area.value.trim();addHistory(`Notiz für ${m.opponent} aktualisiert`);save();toast('Notiz gespeichert')}));
  }

  function openAssign(matchId,ticketId){
    assignContext={matchId,ticketId};const m=match(matchId),t=ticket(ticketId);
    $('assignTitle').textContent=`${t.label} · ${m.opponent}`;
    $('assignMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+state.members.map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.role)}</option>`).join('');
    $('assignGuest').value='';$('assignDialog').showModal();
  }

  function releaseTicket(matchId,ticketId){
    const a=alloc(matchId,ticketId);if(!a)return;
    state.allocations=state.allocations.filter(x=>!(x.matchId===matchId&&x.ticketId===ticketId));
    addHistory(`${ticket(ticketId).label} gegen ${match(matchId).opponent} von ${a.name} freigegeben`);save();render();toast('Karte freigegeben');
  }

  function setPaid(matchId,ticketId,paid){
    const a=alloc(matchId,ticketId);if(!a)return;a.paid=paid;
    addHistory(`${a.name}: ${ticket(ticketId).label} gegen ${match(matchId).opponent} ${paid?'als bezahlt markiert':'wieder auf offen gesetzt'}`);save();render();toast(paid?'Zahlung erledigt':'Zahlung wieder offen');
  }

  function renderPayments(){
    const list=visiblePayments();$('paymentsTitle').textContent=isAdmin()?'Offene Zahlungen':'Deine offenen Zahlungen';
    $('paymentsList').innerHTML=list.length?list.map(a=>{const m=match(a.matchId),t=ticket(a.ticketId);return `<div class="paymentRow"><div><strong>${esc(a.name)} · ${esc(t.label)}</strong><small>${dateText(m.date)} · ${esc(m.opponent)}</small></div><div class="paymentAmount">${money(a.amount)}</div>${isAdmin()?`<button class="payDone" data-pay-done="${a.matchId}|${a.ticketId}" type="button">Als bezahlt markieren</button>`:''}</div>`}).join(''):'<div class="demoFeatureNote">Aktuell sind keine Zahlungen offen.</div>';
    document.querySelectorAll('[data-pay-done]').forEach(btn=>btn.addEventListener('click',()=>{const [m,t]=btn.dataset.payDone.split('|');setPaid(m,t,true);renderPayments()}));
  }

  function renderHistory(){
    $('historyList').innerHTML=state.history.map(h=>`<div class="historyRow"><time>${esc(h.time)}</time><div><b>${esc(h.actor)}</b><small>${esc(h.text)}</small></div></div>`).join('');
  }

  function renderMembers(){
    $('membersList').innerHTML=state.members.map(m=>`<div class="memberRow"><span class="memberAvatar">${esc(m.name[0])}</span><div><strong>${esc(m.name)}</strong><small>${m.online?'● online':'○ offline'}</small></div><span class="rolePill">${esc(m.role)}</span></div>`).join('');
  }

  function renderNotifications(){
    const unread=state.notifications.filter(n=>!n.read).length;$('notificationCount').textContent=unread;$('notificationCount').style.display=unread?'inline':'none';
    $('notificationsList').innerHTML=state.notifications.length?state.notifications.map(n=>`<div class="notificationRow"><div><strong>${n.read?'':'🔔 '}${esc(n.title)}</strong><small>${esc(n.text)}</small></div></div>`).join(''):'<div class="demoFeatureNote">Keine Benachrichtigungen.</div>';
  }

  $('roleView').addEventListener('change',e=>{state.role=e.target.value;save();render();toast(state.role==='admin'?'Admin-Ansicht aktiv':'Gast-Ansicht von Alex aktiv')});
  $('searchInput').addEventListener('input',renderGames);
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.filter=btn.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===btn));save();renderGames()}));
  $('nextMatchBtn').addEventListener('click',()=>document.querySelector('.gameCard')?.scrollIntoView({behavior:'smooth',block:'start'}));
  $('paymentsBtn').addEventListener('click',()=>{renderPayments();$('paymentsDialog').showModal()});
  $('historyBtn').addEventListener('click',()=>{renderHistory();$('historyDialog').showModal()});
  $('membersBtn').addEventListener('click',()=>{renderMembers();$('membersDialog').showModal()});
  $('inviteBtn').addEventListener('click',()=>{$('inviteRequestPreview').innerHTML=state.joinRequest?requestMarkup():'';$('inviteDialog').showModal()});
  $('notificationBtn').addEventListener('click',()=>{state.notifications.forEach(n=>n.read=true);save();renderNotifications();$('notificationsDialog').showModal()});
  $('demoHelpBtn').addEventListener('click',()=>$('helpDialog').showModal());
  $('resetBtn').addEventListener('click',()=>{if(!confirm('Demoversion wirklich auf den Ausgangszustand zurücksetzen?'))return;localStorage.removeItem(STORAGE);state=load();document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));render();toast('Demo zurückgesetzt')});
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.close)?.close()));

  $('assignForm').addEventListener('submit',e=>{
    e.preventDefault();if(!assignContext)return;
    const memberId=$('assignMember').value,guest=$('assignGuest').value.trim();
    if(!memberId&&!guest){toast('Bitte Person oder Gastname wählen');return}
    const p=memberId?member(memberId):null,m=match(assignContext.matchId),t=ticket(assignContext.ticketId),name=guest||p.name;
    state.allocations.push({matchId:m.id,ticketId:t.id,memberId:guest?null:p.id,name,paid:false,amount:m.price});
    addHistory(`${t.label} gegen ${m.opponent} an ${name} vergeben`);save();$('assignDialog').close();assignContext=null;render();toast('Karte vergeben');
  });

  $('copyInviteBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('DEMO-7K4P-26');toast('Demo-Code kopiert')}catch{toast('Demo-Code: DEMO-7K4P-26')}});
  $('simulateRequestBtn').addEventListener('click',()=>{state.joinRequest={name:'Jonas',requestedAt:nowText()};addHistory('Neue Beitrittsanfrage von Jonas erhalten');save();$('inviteRequestPreview').innerHTML=requestMarkup();toast('Bewerbung simuliert')});

  function requestMarkup(){return `<div class="memberRow" style="margin-top:12px"><span class="memberAvatar">J</span><div><strong>Jonas</strong><small>möchte der Crew beitreten</small></div>${isAdmin()?'<button class="payDone" id="approveDemoRequest" type="button">Als Gast freigeben</button>':'<span class="rolePill">wartet</span>'}</div>`}
  $('inviteRequestPreview').addEventListener('click',e=>{if(e.target.id!=='approveDemoRequest')return;state.members.push({id:'jonas',name:'Jonas',role:'Gast',online:false});state.joinRequest=null;addHistory('Jonas als Gast freigegeben');save();$('inviteRequestPreview').innerHTML='<div class="demoFeatureNote">Jonas wurde als Gast zur Crew hinzugefügt.</div>';toast('Jonas freigegeben')});

  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
  render();
})();