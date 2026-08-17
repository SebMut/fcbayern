from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: anchor not found in {path}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')

# Main app: emit targeted UI lifecycle events instead of relying on global DOM observers.
replace_once(
    'SeasonCrew/app.js',
    "  renderStats();renderGames();renderSettings();\n}",
    "  renderStats();renderGames();renderSettings();\n  window.dispatchEvent(new CustomEvent('seasoncrew:rendered',{detail:{groupId:currentGroup.id,role:effectiveRole()}}));\n}",
    'main render event'
)
replace_once(
    'SeasonCrew/app.js',
    "  if(!list.length){els.games.innerHTML='<div class=\"noGames\">Keine Spiele für diesen Filter.</div>';return}",
    "  if(!list.length){els.games.innerHTML='<div class=\"noGames\">Keine Spiele für diesen Filter.</div>';window.dispatchEvent(new CustomEvent('seasoncrew:games-rendered',{detail:{groupId:currentGroup?.id||null}}));return}",
    'empty games event'
)
replace_once(
    'SeasonCrew/app.js',
    "  bindGameEvents();\n}\n\nfunction renderGame",
    "  bindGameEvents();\n  window.dispatchEvent(new CustomEvent('seasoncrew:games-rendered',{detail:{groupId:currentGroup?.id||null}}));\n}\n\nfunction renderGame",
    'games rendered event'
)
replace_once(
    'SeasonCrew/app.js',
    "  renderInviteAdmin();\n}\n\nasync function renderInviteAdmin",
    "  renderInviteAdmin();\n  window.dispatchEvent(new CustomEvent('seasoncrew:settings-rendered',{detail:{groupId:currentGroup?.id||null}}));\n}\n\nasync function renderInviteAdmin",
    'settings rendered event'
)

# UI module: stop observing the entire DOM; only react to actual app renders.
replace_once(
    'SeasonCrew/ui-v2.js',
    "    const name=username(),r=role(),initial=(name[0]||'P').toUpperCase();\n    btn.className='profileButton';",
    "    const name=username(),r=role(),initial=(name[0]||'P').toUpperCase();\n    const signature=`${name}|${r}`;\n    if(btn.dataset.profileSignature===signature)return;\n    btn.dataset.profileSignature=signature;\n    btn.className='profileButton';",
    'profile button memoization'
)
replace_once(
    'SeasonCrew/ui-v2.js',
    "    const script=document.createElement('script');script.src='./crew-delete.js?v=2';script.defer=true;script.dataset.seasoncrewCrewDelete='1';document.head.appendChild(script);",
    "    const script=document.createElement('script');script.src='./crew-delete.js?v=3';script.defer=true;script.dataset.seasoncrewCrewDelete='1';document.head.appendChild(script);",
    'crew delete cache bump'
)
replace_once(
    'SeasonCrew/ui-v2.js',
    "  const observer=new MutationObserver(()=>requestAnimationFrame(sync));\n  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});\n  window.addEventListener('DOMContentLoaded',sync);\n  setTimeout(sync,250);",
    "  window.addEventListener('seasoncrew:games-rendered',()=>requestAnimationFrame(syncGuestUi));\n  window.addEventListener('seasoncrew:rendered',()=>requestAnimationFrame(sync));\n  window.addEventListener('DOMContentLoaded',sync);\n  setTimeout(sync,350);",
    'remove ui global observer'
)

# Crew-delete module: no global DOM observer. Also bump feature/product modules.
replace_once(
    'SeasonCrew/crew-delete.js',
    "script.src='./features-v1.js?v=2'",
    "script.src='./features-v1.js?v=3'",
    'features cache bump'
)
replace_once(
    'SeasonCrew/crew-delete.js',
    "script.src='./product-v2.js?v=3'",
    "script.src='./product-v2.js?v=4'",
    'product cache bump'
)
replace_once(
    'SeasonCrew/crew-delete.js',
    "  const observer=new MutationObserver(()=>requestAnimationFrame(sync));\n  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});\n  window.addEventListener('DOMContentLoaded',sync);\n  setTimeout(sync,300);",
    "  window.addEventListener('seasoncrew:settings-rendered',()=>requestAnimationFrame(sync));\n  window.addEventListener('seasoncrew:rendered',()=>requestAnimationFrame(sync));\n  window.addEventListener('DOMContentLoaded',sync);\n  setTimeout(sync,400);",
    'remove crew delete global observer'
)

# Ticket wishes / member controls: target only the areas that were actually rerendered.
replace_once(
    'SeasonCrew/features-v1.js',
    "  $('groupSelect')?.addEventListener('change',()=>scheduleLoad(100));\n  const observer=new MutationObserver(muts=>{\n    let relevant=false;\n    for(const m of muts){\n      if(m.target?.id==='games'||m.target?.id==='memberList'||m.target?.closest?.('#games,#memberList')){relevant=true;break}\n    }\n    if(relevant&&state)requestAnimationFrame(render);\n  });\n  observer.observe(document.documentElement,{subtree:true,childList:true});\n  window.addEventListener('DOMContentLoaded',()=>scheduleLoad(700));",
    "  $('groupSelect')?.addEventListener('change',()=>scheduleLoad(100));\n  window.addEventListener('seasoncrew:games-rendered',()=>{if(state)requestAnimationFrame(renderWishBars)});\n  window.addEventListener('seasoncrew:settings-rendered',()=>{if(state)requestAnimationFrame(renderMemberControls)});\n  window.addEventListener('DOMContentLoaded',()=>scheduleLoad(700));",
    'remove features observer'
)
# Clean up the escaped HTML introduced by the member-removal patch.
features = Path('SeasonCrew/features-v1.js')
fs = features.read_text(encoding='utf-8')
fs = fs.replace("actions.innerHTML='<button class=\\\"memberAction danger\\\" type=\\\"button\\\" data-remove-member>Entfernen</button>';", "actions.innerHTML='<button class=\"memberAction danger\" type=\"button\" data-remove-member>Entfernen</button>';", 1)
features.write_text(fs, encoding='utf-8')

# Product module: replace its broad observer with lifecycle events.
replace_once(
    'SeasonCrew/product-v2.js',
    "  $('groupSelect')?.addEventListener('change',()=>schedule(100));\n  const observer=new MutationObserver(muts=>{for(const m of muts){if(m.target?.id==='settingsForm'||m.target?.closest?.('#settingsForm,.topActions,.statsGrid')){if(state)requestAnimationFrame(()=>{ensureUi();renderSeasonTools();renderCockpit()});break}}});observer.observe(document.documentElement,{subtree:true,childList:true});\n  window.addEventListener('DOMContentLoaded',()=>schedule(900));setTimeout(()=>schedule(0),1300);",
    "  $('groupSelect')?.addEventListener('change',()=>schedule(100));\n  window.addEventListener('seasoncrew:settings-rendered',()=>{if(state)requestAnimationFrame(renderSeasonTools)});\n  window.addEventListener('seasoncrew:rendered',()=>{if(state)requestAnimationFrame(()=>{ensureUi();renderCockpit()})});\n  window.addEventListener('DOMContentLoaded',()=>schedule(900));setTimeout(()=>schedule(0),1300);",
    'remove product observer'
)

# Superadmin role switcher: remove the 250 ms polling loop.
replace_once(
    'SeasonCrew/role-switcher.js',
    "  const VALUES=new Set(['superadmin','owner','admin','guest']);\n  let timer=null;",
    "  const VALUES=new Set(['superadmin','owner','admin','guest']);",
    'remove role timer variable'
)
replace_once(
    'SeasonCrew/role-switcher.js',
    "  window.addEventListener('DOMContentLoaded',()=>{\n    ensure();\n    timer=setInterval(()=>{if(ensure()){clearInterval(timer);timer=null}},250);\n    setTimeout(()=>{if(timer){clearInterval(timer);timer=null}},12000);\n  });",
    "  window.addEventListener('DOMContentLoaded',ensure);\n  window.addEventListener('seasoncrew:rendered',ensure);\n  setTimeout(ensure,700);",
    'remove role polling'
)

# Cache bust + visible build marker.
index = Path('SeasonCrew/index.html')
s = index.read_text(encoding='utf-8')
s = s.replace('role-switcher.js?v=1','role-switcher.js?v=2')
s = s.replace('ui-v2.js?v=4','ui-v2.js?v=5')
s = s.replace("app.js?v=20260817-roleview1", "app.js?v=20260817-perf1")
s = s.replace('Build product-v2-4','Build product-v2-5')
index.write_text(s, encoding='utf-8')

print('SeasonCrew performance patch applied')
