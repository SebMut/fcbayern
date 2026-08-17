(()=>{
  if(window.SeasonCrewCore)return;
  const runtime=window.SeasonCrewConfig||null;
  const status=document.getElementById('authStatus');
  if(!runtime?.supabaseUrl||!runtime?.publishableKey){
    if(status)status.textContent='SeasonCrew ist nicht vollständig konfiguriert. Bitte Seite neu laden.';
    throw new Error('SeasonCrew runtime configuration unavailable');
  }
  const SUPABASE_URL=String(runtime.supabaseUrl);
  const SUPABASE_KEY=String(runtime.publishableKey);
  const ENVIRONMENT=String(runtime.environment||'production');
  let sharedClient=null;

  function client(){
    if(sharedClient)return sharedClient;
    if(!window.supabase?.createClient)return null;
    sharedClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return sharedClient;
  }

  function appUrl(params={}){
    const url=new URL('./',location.href);
    url.search='';url.hash='';
    Object.entries(params).forEach(([key,value])=>{
      if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value));
    });
    return url.href;
  }

  window.SeasonCrewCore=Object.freeze({
    client,
    appUrl,
    config:Object.freeze({environment:ENVIRONMENT,supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY})
  });
})();
