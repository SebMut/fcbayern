(()=>{
  function mount(){
    const shell=document.querySelector('#authScreen .authShell');
    const foot=shell?.querySelector('.authFoot');
    if(!shell||!foot||shell.querySelector('.customerDemoEntry'))return;

    const style=document.createElement('style');
    style.textContent=`
      #authScreen .authShell{position:relative!important;z-index:5!important}
      #authScreen:before,#authScreen:after{pointer-events:none!important}
      .customerDemoEntry{position:relative;z-index:20;pointer-events:auto!important;margin:15px 0 5px;padding-top:14px;border-top:1px solid #e1e6e8;text-align:center}
      .customerDemoEntry *{pointer-events:auto}
      .customerDemoEntry .demoKicker{display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:5px;color:#7c878d;font:800 8px Manrope,sans-serif;text-transform:uppercase;letter-spacing:.1em}
      .customerDemoEntry .demoKicker:before,.customerDemoEntry .demoKicker:after{content:"";width:22px;height:1px;background:#d9dfe2}
      .customerDemoEntry h2{margin:0;color:#1f2a30;font:700 15px Space Grotesk,sans-serif}
      .customerDemoEntry p{max-width:340px;margin:5px auto 10px;color:#7c878d;font:600 9px/1.45 Manrope,sans-serif}
      .customerDemoEntry a{position:relative;z-index:30;min-height:42px;width:100%;border-radius:10px;background:#1f2a30;color:#b7ff00;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px;font:800 10px Manrope,sans-serif;transition:.16s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .customerDemoEntry a:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(31,42,48,.12)}
      .customerDemoEntry .demoMeta{display:flex;justify-content:center;gap:10px;margin-top:7px;color:#929ca1;font:700 7.5px Manrope,sans-serif;flex-wrap:wrap}
      .customerDemoEntry .demoMeta span:before{content:"✓";color:#2f8a62;margin-right:3px}
    `;
    document.head.appendChild(style);

    const box=document.createElement('div');
    box.className='customerDemoEntry';
    box.innerHTML=`<div class="demoKicker">Demoversion</div><h2>SeasonCrew einfach ausprobieren.</h2><p>Teste Kartenverteilung, Zahlungen, PayPal, Rollen und History mit vorbereiteten Beispieldaten – ohne Registrierung.</p><a id="seasoncrewDemoStart" href="./demo.html?v=2"><span>Demo starten</span><span aria-hidden="true">→</span></a><div class="demoMeta"><span>kein Account</span><span>keine echten Daten</span><span>jederzeit zurücksetzbar</span></div>`;
    foot.before(box);

    const link=document.getElementById('seasoncrewDemoStart');
    const go=event=>{
      if(event)event.preventDefault();
      const url=new URL('./demo.html?v=2',location.href);
      location.assign(url.href);
    };
    link?.addEventListener('click',go);
    link?.addEventListener('touchend',event=>{event.preventDefault();go();},{passive:false});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
