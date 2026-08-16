import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm";

const sb=createClient(
  "https://kmhadzujovvxvpgblgkk.supabase.co",
  "sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y",
  {auth:{persistSession:true,autoRefreshToken:true}}
);

let activeRequest=null;

function actor(){
  return sessionStorage.getItem("fcb-current-actor")||"Admin";
}

function amountNumber(){
  const raw=(document.getElementById("paypalAmount")?.value||"").trim().replace(/\s/g,"").replace(",",".");
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?Math.round(n*100)/100:null;
}

function opponentFromGame(game){
  if(!game)return"";
  const teams=[...game.querySelectorAll(".duel .club span")].map(x=>x.textContent.trim()).filter(Boolean);
  return teams.find(x=>!/^FC Bayern$/i.test(x))||"";
}

function personFromButton(button){
  const game=button.closest(".game");
  const cell=button.closest(".pickcell");
  const guest=cell?.querySelector(".guestname")?.value?.trim();
  const choose=cell?.querySelector(".choose")?.textContent?.trim();
  return guest||choose||button.dataset.paypalPerson||"Gast";
}

async function writePaypalHistory(action){
  if(!activeRequest)return;
  const amount=amountNumber();
  if(!amount)return;
  const {error}=await sb.from("history_log").insert({
    actor_name:actor(),
    entity_type:"paypal",
    entity_id:activeRequest.gameId,
    before_data:{},
    after_data:{
      action,
      person:activeRequest.person,
      opponent:activeRequest.opponent,
      amount,
      currency:"EUR",
      paypal_me:"ChristianReinheimer"
    }
  });
  if(error)console.error("PayPal-History konnte nicht gespeichert werden:",error);
}

document.addEventListener("click",event=>{
  const request=event.target.closest?.("[data-paypal-id]");
  if(request){
    const game=request.closest(".game");
    activeRequest={
      gameId:request.dataset.paypalId,
      person:personFromButton(request),
      opponent:opponentFromGame(game)
    };
    return;
  }

  if(event.target.closest?.("#paypalCopy")){
    setTimeout(()=>writePaypalHistory("link_copied"),150);
  }
  if(event.target.closest?.("#paypalShare")){
    setTimeout(()=>writePaypalHistory("share_opened"),150);
  }
});

document.getElementById("paypalDialog")?.addEventListener("close",()=>{activeRequest=null;});
