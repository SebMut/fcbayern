(()=>{
  const BRAND_VERSION='20260817-lime1';
  const brandLink=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>String(link.getAttribute('href')||'').includes('brand-v2.css'));
  if(brandLink)brandLink.href=`brand-v2.css?v=${BRAND_VERSION}`;
  const theme=document.querySelector('meta[name="theme-color"]');
  if(theme)theme.content='#1F2A30';
  let favicon=document.querySelector('link[rel="icon"]');
  if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
  favicon.type='image/svg+xml';favicon.href=`seasoncrew-mark.svg?v=${BRAND_VERSION}`;

  const PROD_AUTH_REDIRECT='https://sebmut.github.io/fcbayern/SeasonCrew/';
  const nativeFetch=window.fetch?.bind(window);
  if(nativeFetch&&!window.__seasonCrewAuthRedirectFix){
    window.__seasonCrewAuthRedirectFix=true;
    window.fetch=(input,init)=>{
      try{
        const raw=typeof input==='string'?input:input instanceof URL?input.href:input?.url||'';
        if(raw.includes('kmhadzujovvxvpgblgkk.supabase.co/auth/v1/signup')){
          const target=new URL(raw,location.href);
          target.searchParams.set('redirect_to',PROD_AUTH_REDIRECT);
          if(typeof input==='string'||input instanceof URL)input=target.href;
          else if(typeof Request!=='undefined'&&input instanceof Request)input=new Request(target.href,input);
        }
      }catch(error){console.warn('SeasonCrew auth redirect fix',error)}
      return nativeFetch(input,init);
    };
  }

  const KEY='seasoncrew-superadmin-role-view';
  const VALUES=new Set(['superadmin','owner','admin','guest']);
  let settingsEnhancementsLoaded=false;

  function actualSuperadmin(){
    const badge=document.getElementById('superadminBadge');
    return !!badge&&!badge.classList.contains('hidden');
  }

  function current(){
    const value=localStorage.getItem(KEY)||'superadmin';
    return VALUES.has(value)?value:'superadmin';
  }

  function ensure(){
    const existing=document.getElementById('roleViewSwitcher');
    if(!actualSuperadmin()){
      existing?.remove();
      return false;
    }
    if(existing)return true;
    const actions=document.querySelector('.topActions');
    if(!actions)return false;
    const wrap=document.createElement('label');
    wrap.id='roleViewSwitcher';
    wrap.className='roleViewSwitcher';
    wrap.innerHTML=`<span>Ansicht als</span><select id="roleViewSelect" aria-label="Rolle für Testansicht"><option value="superadmin">Superadmin</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="guest">Gast</option></select>`;
    const badge=document.getElementById('superadminBadge');
    badge?.insertAdjacentElement('afterend',wrap);
    if(!wrap.parentNode)actions.insertAdjacentElement('afterbegin',wrap);
    const select=wrap.querySelector('select');
    select.value=current();
    select.addEventListener('change',()=>{
      const value=VALUES.has(select.value)?select.value:'superadmin';
      if(value==='superadmin')localStorage.removeItem(KEY);else localStorage.setItem(KEY,value);
      document.body.classList.add('roleViewReloading');
      location.reload();
    });
    return true;
  }

  function loadPriceManager(){
    if(document.querySelector('script[data-seasoncrew-prices]'))return;
    const script=document.createElement('script');
    script.src='price-management.js?v=20260817-savefix1';
    script.defer=true;
    script.dataset.seasoncrewPrices='1';
    document.body.appendChild(script);
  }

  function ensurePriceManagement(){
    if(!document.querySelector('link[data-seasoncrew-prices]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='price-management.css?v=20260817-tabs4';
      link.dataset.seasoncrewPrices='1';
      document.head.appendChild(link);
    }
    if(window.__seasonCrewPriceObserverFix){loadPriceManager();return}
    let fix=document.querySelector('script[data-seasoncrew-price-fix]');
    if(fix){fix.addEventListener('load',loadPriceManager,{once:true});return}
    fix=document.createElement('script');
    fix.src='price-observer-fix.js?v=20260817-1';
    fix.defer=true;
    fix.dataset.seasoncrewPriceFix='1';
    fix.addEventListener('load',loadPriceManager,{once:true});
    document.body.appendChild(fix);
  }

  function ensureGroupedSettings(){
    if(!document.querySelector('link[data-seasoncrew-tab-groups]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='settings-tab-groups.css?v=20260817-mobile2';
      link.dataset.seasoncrewTabGroups='1';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-seasoncrew-tab-groups]')){
      const script=document.createElement('script');
      script.src='settings-tab-groups.js?v=20260817-mobile2';
      script.defer=true;
      script.dataset.seasoncrewTabGroups='1';
      document.body.appendChild(script);
    }
  }

  function ensureSettingsEnhancements(){
    if(settingsEnhancementsLoaded)return;
    settingsEnhancementsLoaded=true;
    ensurePriceManagement();
    ensureGroupedSettings();
  }

  function bindLazySettings(){
    ['settingsBtn','groupMenuBtn','heroInviteBtn'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el||el.dataset.performanceLazyBound)return;
      el.dataset.performanceLazyBound='1';
      el.addEventListener('click',ensureSettingsEnhancements,{once:true,capture:true});
    });
  }

  function finishBranding(){
    const foot=document.querySelector('.authFoot');
    if(foot)foot.textContent='Pilot V1 · Build lime-cd-1 · Multi-User · Freigabe-Workflow';
  }

  window.SeasonCrewRoleView={
    key:KEY,
    get(isSuperadmin){
      if(!isSuperadmin)return null;
      return current();
    },
    reset(){localStorage.removeItem(KEY)}
  };

  window.addEventListener('DOMContentLoaded',()=>{finishBranding();ensure();bindLazySettings()});
  window.addEventListener('seasoncrew:rendered',()=>{ensure();bindLazySettings()});
  setTimeout(()=>{finishBranding();ensure();bindLazySettings()},700);
})();