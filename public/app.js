const $=s=>document.querySelector(s);
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const d=await r.json();if(!r.ok)throw Error(d.error||"Ошибка");return d}
let skinsPromise,cratesPromise;
const SKINS_URL="https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const CRATES_URL="https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json";
function norm(s){return String(s||"").replace(/^★\s*/,"").replace(/^StatTrak™\s*/i,"").replace(/^Souvenir\s*/i,"").toLowerCase().replace(/\s+/g," ").trim()}
async function loadSkins(){if(!skinsPromise)skinsPromise=fetch(SKINS_URL).then(r=>r.json()).catch(()=>[]);return skinsPromise}
async function loadCrates(){if(!cratesPromise)cratesPromise=fetch(CRATES_URL).then(r=>r.json()).catch(()=>[]);return cratesPromise}
async function findSkin(name){const db=await loadSkins(),n=norm(name);return db.find(x=>norm(x.name)===n||norm(x.market_hash_name)===n)||db.find(x=>norm(x.name).replace(/\s*\|\s*/," | ")===n.replace(/\s*\|\s*/," | "))}
function fallback(parent,name){const el=document.createElement("div");el.className="image-fallback skin-fallback";const mark=document.createElement("span");mark.textContent="CS2";const label=document.createElement("b");label.textContent=name;el.append(mark,label);parent.replaceWith(el)}
async function setSkinImage(img,name){const x=await findSkin(name);if(x?.image){img.src=x.image;img.onerror=()=>fallback(img,name)}else fallback(img,name)}
async function hydrate(root=document){
 const caseImgs=[...root.querySelectorAll("img[data-case]")];
 if(caseImgs.length){const crates=(await loadCrates()).filter(x=>String(x.type||"").toLowerCase().includes("case")&&x.image);for(const im of caseImgs){const index=Number(im.dataset.case)||0;const c=crates.length?crates[(index*7+3)%crates.length]:null;if(c?.image){im.src=c.image;im.onerror=()=>fallback(im,im.alt||"CS2 Case")}else fallback(im,im.alt||"CS2 Case")}}
 for(const im of [...root.querySelectorAll("img[data-skin]")])await setSkinImage(im,im.dataset.skin);
}
hydrate();
function makeSkinCard(item){const el=document.createElement("div");el.className="upgrade-item";const im=document.createElement("img");im.alt=item.name;el.append(im);const name=document.createElement("b");name.textContent=item.name;const price=document.createElement("small");price.textContent=`${item.price} монет`;el.append(name,price);setSkinImage(im,item.name);return el}
function showPreview(id,item,empty){const root=$(id);root.innerHTML="";if(!item){root.textContent=empty;return}root.replaceWith(makeSkinCard(item));}
function card(x){const d=document.createElement("div");d.className="reel-item";const im=document.createElement("img");im.dataset.skin=x.name;d.append(im);const b=document.createElement("b");b.textContent=x.name;d.append(b);const p=document.createElement("small");p.textContent=x.price+" монет";d.append(p);return d}
async function spin(reel,items,winner){reel.innerHTML="";const arr=Array.from({length:38},()=>items[Math.floor(Math.random()*items.length)]);arr.push(winner);for(let i=0;i<6;i++)arr.push(items[Math.floor(Math.random()*items.length)]);arr.forEach(x=>reel.append(card(x)));await hydrate(reel);reel.style.transition="none";reel.style.transform="translateX(0)";void reel.offsetWidth;const x=38*166-reel.parentElement.clientWidth/2+83;reel.style.transition="transform 5.2s cubic-bezier(.08,.72,.12,1)";requestAnimationFrame(()=>reel.style.transform=`translateX(-${x}px)`);return new Promise(r=>setTimeout(r,5350))}
document.querySelectorAll(".open").forEach(b=>b.onclick=async()=>{b.disabled=true;try{const c=await api("/api/catalog"),caseData=c.find(x=>x.id===b.dataset.id),d=await api("/api/open/"+b.dataset.id,{method:"POST"});$("#modal").classList.remove("hide");await spin($("#reel"),caseData.items,d.item);$("#roll-title").textContent="ВЫПАЛ ПРЕДМЕТ";$("#item-name").textContent=d.item.name;$("#item-price").textContent=d.item.price+" виртуальных монет"}catch(e){alert(e.message)}finally{b.disabled=false}});
if($("#close"))$("#close").onclick=()=>$("#modal").classList.add("hide");
if($("#inventory"))(async()=>{try{const a=await api("/api/inventory"),root=$("#inventory");root.innerHTML="";if(!a.length){root.textContent="Инвентарь пуст";return}a.forEach(x=>{const el=document.createElement("article");el.className="drop-card";const fr=document.createElement("div");fr.className="skin-frame";const im=document.createElement("img");im.dataset.skin=x.name;fr.append(im);el.append(fr);const h=document.createElement("h3");h.textContent=x.name;el.append(h);const p=document.createElement("p");p.textContent=x.price+" виртуальных монет";el.append(p);const b=document.createElement("button");b.className="btn";b.textContent="ПРОДАТЬ";b.onclick=async()=>{try{await api("/api/sell/"+x.id,{method:"POST"});location.reload()}catch(e){alert(e.message)}};el.append(b);root.append(el)});await hydrate(root)}catch(e){$("#inventory").textContent=e.message}})();
if($("#source"))(async()=>{
 let inv=[],all=[],busy=false;
 try{
  inv=await api("/api/inventory");const cat=await api("/api/catalog");all=[...new Map(cat.flatMap(c=>c.items).map(x=>[x.name,x])).values()];
  $("#source").innerHTML=inv.map(x=>`<option value="${x.id}">${x.name} — ${x.price} монет</option>`).join("");
  $("#target").innerHTML=all.map(x=>`<option value="${x.name}">${x.name} — ${x.price} монет</option>`).join("");
  const source=()=>inv.find(x=>x.id===$("#source").value),target=()=>all.find(x=>x.name===$("#target").value);
  function update(){
   const a=source(),t=target(),chance=a&&t&&t.price>a.price?Math.min(.9,a.price/t.price*.9):0;
   $("#chance").textContent=(chance*100).toFixed(2)+"%";if($("#wheel-risk"))$("#wheel-risk").textContent=((1-chance)*100).toFixed(2)+"% РИСКА";
   $("#upgrade-wheel").style.background=`conic-gradient(#36d477 0deg ${chance*360}deg,#ed414b ${chance*360}deg 360deg)`;
   $("#do-upgrade").disabled=!a||!t||t.price<=a.price||busy;
   $("#source-preview").innerHTML="";$("#source-preview").append(a?makeSkinCard(a):document.createTextNode("Инвентарь пуст"));
   $("#target-preview").innerHTML="";$("#target-preview").append(t?makeSkinCard(t):document.createTextNode("Нет цели"));
  }
  $("#source").onchange=update;$("#target").onchange=update;
  document.querySelectorAll("[data-mult]").forEach(btn=>btn.onclick=()=>{const a=source();if(!a)return;const m=Number(btn.dataset.mult);const t=all.filter(x=>x.price>a.price).sort((x,y)=>Math.abs(x.price-a.price*m)-Math.abs(y.price-a.price*m))[0];if(t)$("#target").value=t.name;update()});
  document.querySelectorAll("[data-chance]").forEach(btn=>btn.onclick=()=>{const a=source();if(!a)return;const wanted=Number(btn.dataset.chance)/100;const desired=a.price*.9/wanted;const t=all.filter(x=>x.price>a.price).sort((x,y)=>Math.abs(x.price-desired)-Math.abs(y.price-desired))[0];if(t)$("#target").value=t.name;update()});
  update();
  $("#do-upgrade").onclick=async()=>{
   if(busy)return;busy=true;update();$("#result").textContent="Колесо вращается…";$("#upgrade-wheel").classList.remove("wheel-win","wheel-lose");
   try{
    const d=await api("/api/upgrade",{method:"POST",body:JSON.stringify({itemId:$("#source").value,targetName:$("#target").value})});
    const chance=d.chance,roll=Math.max(0,Math.min(.999999,d.roll??(d.won?chance/2:chance+(1-chance)/2))),finalAngle=(360-roll*360)+360*7;
    const wheel=$("#upgrade-wheel");wheel.style.transition="none";wheel.style.transform="rotate(0deg)";void wheel.offsetWidth;wheel.style.transition="transform 5s cubic-bezier(.12,.72,.12,1)";wheel.style.transform=`rotate(${finalAngle}deg)`;
    await new Promise(r=>setTimeout(r,5200));wheel.classList.add(d.won?"wheel-win":"wheel-lose");
    $("#result").textContent=d.won?`УСПЕХ! Получен ${d.item.name} · ${d.item.price} монет`:"НЕУДАЧА — предмет сгорел";
    if(d.won){inv=inv.filter(x=>x.id!==$("#source").value);inv.unshift(d.item)}else inv=inv.filter(x=>x.id!==$("#source").value);
    $("#source").innerHTML=inv.map(x=>`<option value="${x.id}">${x.name} — ${x.price} монет</option>`).join("");
    if(d.won)$("#target").value=d.item.name;
    busy=false;update();
   }catch(e){$("#result").textContent=e.message;busy=false;update()}
  };
 }catch(e){$("#result").textContent=e.message}
})();
