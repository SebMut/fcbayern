(()=>{
  const GROUPS=[
    {key:'crew',label:'Crew',tabs:['crew','members','tickets','prices']},
    {key:'access',label:'Zugang',tabs:['invites','applications']},
    {key:'account',label:'Konto',tabs:['profile']},
    {key:'security',label:'Sicherheit',tabs:['danger']}
  ];

  function syncGroupVisibility(root){
    root.querySelectorAll('.settingsTabGroup').forEach(group=>{
      const visible=[...group.querySelectorAll('[data-settings-tab]')].some(btn=>!btn.classList.contains('hidden'));
      group.classList.toggle('hidden',!visible);
    });
  }

  function arrange(){
    const tabs=document.getElementById('settingsTabs');
    if(!tabs)return false;
    if(tabs.dataset.grouped==='1'){
      syncGroupVisibility(tabs);
      return true;
    }

    const buttons=new Map([...tabs.querySelectorAll('[data-settings-tab]')].map(btn=>[btn.dataset.settingsTab,btn]));
    tabs.textContent='';
    tabs.classList.add('settingsTabsGrouped');

    GROUPS.forEach(group=>{
      const wrap=document.createElement('section');
      wrap.className=`settingsTabGroup settingsTabGroup-${group.key}`;
      wrap.dataset.settingsGroup=group.key;
      const title=document.createElement('div');
      title.className='settingsTabGroupTitle';
      title.textContent=group.label;
      const row=document.createElement('div');
      row.className='settingsTabGroupButtons';
      group.tabs.forEach(name=>{
        const button=buttons.get(name);
        if(button)row.appendChild(button);
      });
      wrap.append(title,row);
      tabs.appendChild(wrap);
    });

    buttons.forEach((button,name)=>{
      if(tabs.querySelector(`[data-settings-tab="${name}"]`))return;
      let extra=tabs.querySelector('.settingsTabGroup-extra');
      if(!extra){
        extra=document.createElement('section');
        extra.className='settingsTabGroup settingsTabGroup-extra';
        extra.innerHTML='<div class="settingsTabGroupTitle">Weitere</div><div class="settingsTabGroupButtons"></div>';
        tabs.appendChild(extra);
      }
      extra.querySelector('.settingsTabGroupButtons').appendChild(button);
    });

    tabs.dataset.grouped='1';
    syncGroupVisibility(tabs);
    new MutationObserver(()=>syncGroupVisibility(tabs)).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class']});
    return true;
  }

  function schedule(){
    if(arrange())return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(arrange()||tries>30)clearInterval(timer);
    },100);
  }

  window.addEventListener('DOMContentLoaded',schedule,{once:true});
  window.addEventListener('seasoncrew:settings-rendered',()=>requestAnimationFrame(arrange));
  window.addEventListener('seasoncrew:rendered',()=>requestAnimationFrame(arrange));
  if(document.readyState!=='loading')schedule();
})();