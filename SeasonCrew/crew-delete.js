(()=>{
  const URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  let sb=null;
  const $=id=>document.getElementById(id);

  if(!document.querySelector('link[data-seasoncrew-features-v1]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='./features-v1.css?v=1';link.dataset.seasoncrewFeaturesV1='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-seasoncrew-features-v1]')){
    const script=document.createElement('script');script.src='./features-v1.js?v=2';script.defer=true;script.dataset.seasoncrewFeaturesV1='1';document.head.appendChild(script);
  }
  if(!document.querySelector('link[data-seasoncrew-product-v2]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='./product-v2.css?v=2';link.dataset.seasoncrewProductV2='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-seasoncrew-product-v2]')){
    const script=document.createElement('script');script.src='./product-v2.js?v=3';script.defer=true;script.dataset.seasoncrewProductV2='1';document.head.appendChild(script);
  }

  const role=()=>String($('memberRole')?.textContent||'').trim();
  const canDelete=()=>['Owner','Superadmin'].includes(role());
  const crewName=()=>String($('groupSelect')?.selectedOptions?.[0]?.textContent||$('groupTitle')?.textContent||'').trim();
  const crewId=()=>String($('groupSelect')?.value||'').trim();

  function client(){
    if(sb)return sb;
    if(!window.supabase?.createClient)return null;
    sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  function ensureZone(){
    const settings=$('settingsForm');
    if(!settings||$('crewDangerZone'))return;
    const status=settings.querySelector('#settingsStatus');
    const zone=document.createElement('section');
    zone.id='crewDangerZone';
    zone.className='crewDangerZone hidden';
    zone.innerHTML=`
      <div class="crewDangerHead">
        <div><h4>Gefahrenzone</h4><p>Die Crew inklusive Dauerkarten, Verteilungen, Zahlstatus, Notizen, Mitglieder, Einladungen und Crew-History dauerhaft löschen.</p></div>
        <button type="button" class="dangerButton" id="openCrewDelete">Crew löschen</button>
      </div>
      <div class="dangerConfirm" id="crewDeleteConfirm">
        <label>Zur Bestätigung <span class="dangerPhrase" id="crewDeletePhrase"></span> eingeben
          <input id="crewDeleteName" autocomplete="off" spellcheck="false" placeholder="Crew-Name">
        </label>
        <div class="dangerConfirmActions">
          <button type="button" class="dangerCancel" id="cancelCrewDelete">Abbrechen</button>
          <button type="button" class="dangerDeleteFinal" id="confirmCrewDelete" disabled>Endgültig löschen</button>
        </div>
        <div class="dangerStatus" id="crewDeleteStatus"></div>
      </div>`;
    if(status)settings.insertBefore(zone,status);else settings.appendChild(zone);

    $('openCrewDelete')?.addEventListener('click',()=>{
      const name=crewName();
      $('crewDeletePhrase').textContent=`„${name}“`;
      $('crewDeleteName').value='';
      $('confirmCrewDelete').disabled=true;
      $('crewDeleteStatus').textContent='';
      $('crewDeleteConfirm').classList.add('open');
      setTimeout(()=>$('crewDeleteName')?.focus(),50);
    });
    $('cancelCrewDelete')?.addEventListener('click',()=>$('crewDeleteConfirm')?.classList.remove('open'));
    $('crewDeleteName')?.addEventListener('input',e=>{
      $('confirmCrewDelete').disabled=String(e.target.value).trim()!==crewName();
    });
    $('confirmCrewDelete')?.addEventListener('click',deleteCrew);
  }

  function sync(){
    ensureZone();
    const zone=$('crewDangerZone');
    if(!zone)return;
    zone.classList.toggle('hidden',!canDelete()||!crewId());
    if(!canDelete())$('crewDeleteConfirm')?.classList.remove('open');
  }

  async function deleteCrew(){
    const c=client(),gid=crewId(),name=crewName(),status=$('crewDeleteStatus'),btn=$('confirmCrewDelete');
    if(!c||!gid||!canDelete())return;
    if(String($('crewDeleteName')?.value||'').trim()!==name)return;
    btn.disabled=true;status.textContent='Crew wird gelöscht …';
    const {data,error}=await c.from('sc_groups').delete().eq('id',gid).select('id').maybeSingle();
    if(error||!data){status.textContent='Crew konnte nicht gelöscht werden'+(error?.message?`: ${error.message}`:'.');btn.disabled=false;return;}
    localStorage.removeItem('seasoncrew-group');
    status.textContent='Crew gelöscht. SeasonCrew wird neu geladen …';
    setTimeout(()=>location.reload(),450);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('DOMContentLoaded',sync);
  setTimeout(sync,300);
})();