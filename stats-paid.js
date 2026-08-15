const root=document.getElementById("app");
const patrick=document.getElementById("spPatrick");
const reini=document.getElementById("spReini");
const guests=document.getElementById("spGuests");

function updatePaidStats(){
  let p=0,r=0,g=0;
  root.querySelectorAll('input[data-pay]:checked').forEach(input=>{
    const person=input.dataset.person;
    if(person==="p1")p++;
    else if(person==="p2")r++;
    else if(person==="g1"||person==="g2")g++;
  });
  patrick.textContent=p;
  reini.textContent=r;
  guests.textContent=g;
}

new MutationObserver(updatePaidStats).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["checked"]});
root.addEventListener("change",updatePaidStats);
document.addEventListener("DOMContentLoaded",updatePaidStats);
updatePaidStats();