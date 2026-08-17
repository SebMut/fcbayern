(()=>{
  if(window.SeasonCrewCore)return;
  // Stable shared client core · auth/core/CI/club-independent baseline · dependency audit clean
  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
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
    config:Object.freeze({supabaseUrl:SUPABASE_URL,publishableKey:SUPABASE_KEY})
  });
})();
