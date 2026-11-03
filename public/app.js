const $=s=>document.querySelector(s);
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const d=await r.json();if(!r.ok)throw Error(d.error||"Ошибка");return d}
let skinsPromise,cratesPromise;
const SKINS_URL="https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const CRATES_URL="https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json";
function norm(s){return String(s||"").replace(/^★\s*/,"").replace(/\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i,"").toLowerCase().replace(/\s+/g," ").trim()}
async function loadSkins(){if(!skinsPromise)skinsPromise=fetch(SKINS_URL).then(r=>r.json()).catch(()=>[]);return skinsPromise}
async function loadCrates(){if(!cratesPromise)cratesPromise=fetch(CRATES_URL).then(r=>r.json()).catch(()=>[]);return cratesPromise}
async function findSkin(name){const db=await loadSkins(),n=norm(name);return db.find(x=>norm(x.name)===n||norm(x.market_hash_name)===n)||db.find(x=>norm(x.name).includes(n)||n.includes(norm(x.name)))}
function fallback(parent,name){const el=document.createElement("div");el.className="image-fallback";el.textContent=name;parent.replaceWith(el)}
async function setSkinImage(img,name){const x=await findSkin(name);if(x?.image){img.src=x.image;img.onerror=()=>fallback(img,name)}else fallback(img,name)}
async function hydrate(root=document){
 for(const el of [...root.querySelectorAll("[data-art]")]){
  const art=el.dataset.art;
  if(["ice","inferno","toxic","royal"].includes(art))el.style.backgroundImage=`linear-gradient(180deg,#07101b22,#07101bcc),url('/images/case-${art}.webp')`;
 }
 for(const im of [...root.querySelectorAll("img[data-skin]")])await setSkinImage(im,im.dataset.skin);
}
hydrate();
function makeSkinCard(item){const el=document.createElement("div");el.className="upgrade-item";const im=document.createElement("img");im.alt=item.name;el.append(im);const name=document.createElement("b");name.textContent=item.name;const price=document.createElement("small");price.textContent=`${item.price} токенов`;el.append(name,price);setSkinImage(im,item.name);return el}
function showPreview(id,item,empty){const root=$(id);root.innerHTML="";if(!item){root.textContent=empty;return}root.replaceWith(makeSkinCard(item));}
function card(x){const d=document.createElement("div");d.className="reel-item";const im=document.createElement("img");im.dataset.skin=x.name;d.append(im);const b=document.createElement("b");b.textContent=x.name;d.append(b);const p=document.createElement("small");p.textContent=x.price+" токенов";d.append(p);return d}
async function spin(reel,items,winner){reel.innerHTML="";const arr=Array.from({length:38},()=>items[Math.floor(Math.random()*items.length)]);arr.push(winner);for(let i=0;i<6;i++)arr.push(items[Math.floor(Math.random()*items.length)]);arr.forEach(x=>reel.append(card(x)));await hydrate(reel);reel.style.transition="none";reel.style.transform="translateX(0)";void reel.offsetWidth;const x=38*166-reel.parentElement.clientWidth/2+83;reel.style.transition="transform 5.2s cubic-bezier(.08,.72,.12,1)";requestAnimationFrame(()=>reel.style.transform=`translateX(-${x}px)`);return new Promise(r=>setTimeout(r,5350))}
document.addEventListener("click",async event=>{
 const b=event.target.closest(".open");
 if(!b||b.disabled)return;
 event.preventDefault();
 b.disabled=true;
 const originalText=b.textContent;
 b.textContent="ОТКРЫВАЕМ…";
 try{
  // One request is enough: the opening endpoint returns both the winning item and the reel catalogue.
  const d=await api("/api/open/"+encodeURIComponent(b.dataset.id),{method:"POST"});
  if(!d.caseData?.items?.length||!d.item)throw Error("Сервер не вернул результат открытия. Обновите страницу и попробуйте снова.");
  const modal=$("#modal"),reel=$("#reel");
  if(!modal||!reel)throw Error("Не найдено окно открытия кейса. Обновите страницу.");
  $("#roll-title").textContent="ОТКРЫТИЕ КЕЙСА";
  $("#item-name").textContent="";
  $("#item-price").textContent="";
  modal.classList.remove("hide");
  await spin(reel,d.caseData.items,d.item);
  $("#roll-title").textContent="ВЫПАЛ ПРЕДМЕТ";
  $("#item-name").textContent=d.item.name;
  $("#item-price").textContent=d.item.price+" токенов";
 }catch(e){
  alert(e.message||"Не удалось открыть кейс");
 }finally{
  b.disabled=false;
  b.textContent=originalText;
 }
});
if($("#close"))$("#close").onclick=()=>$("#modal").classList.add("hide");
if($("#inventory"))(async()=>{try{const a=await api("/api/inventory"),root=$("#inventory");root.innerHTML="";if(!a.length){root.textContent="Инвентарь пуст";return}a.forEach(x=>{const el=document.createElement("article");el.className="drop-card";const fr=document.createElement("div");fr.className="skin-frame";const im=document.createElement("img");im.dataset.skin=x.name;fr.append(im);el.append(fr);const h=document.createElement("h3");h.textContent=x.name;el.append(h);const p=document.createElement("p");p.textContent=x.price+" токенов";el.append(p);const b=document.createElement("button");b.className="btn";b.textContent="ПРОДАТЬ";b.onclick=async()=>{try{await api("/api/sell/"+x.id,{method:"POST"});location.reload()}catch(e){alert(e.message)}};el.append(b);root.append(el)});await hydrate(root)}catch(e){$("#inventory").textContent=e.message}})();
if($("#source"))(async()=>{
 let inv=[],all=[],busy=false;
 try{
  inv=await api("/api/inventory");const cat=await api("/api/catalog");all=[...new Map(cat.flatMap(c=>c.items).map(x=>[x.name,x])).values()];
  $("#source").innerHTML=inv.map(x=>`<option value="${x.id}">${x.name} — ${x.price} токенов</option>`).join("");
  $("#target").innerHTML=all.map(x=>`<option value="${x.name}">${x.name} — ${x.price} токенов</option>`).join("");
  const source=()=>inv.find(x=>x.id===$("#source").value),target=()=>all.find(x=>x.name===$("#target").value);
  function update(){
   const a=source(),t=target(),chance=a&&t&&t.price>a.price?Math.min(.9,a.price/t.price*.9):0;
   $("#chance").textContent=(chance*100).toFixed(2)+"%";
   $("#upgrade-wheel").style.background=`conic-gradient(#36d477 0deg ${chance*360}deg,#ed414b ${chance*360}deg 360deg)`;
   $("#do-upgrade").disabled=!a||!t||t.price<=a.price||busy;
   $("#source-preview").innerHTML="";$("#source-preview").append(a?makeSkinCard(a):document.createTextNode("Инвентарь пуст"));
   $("#target-preview").innerHTML="";$("#target-preview").append(t?makeSkinCard(t):document.createTextNode("Нет цели"));
  }
  $("#source").onchange=update;$("#target").onchange=update;update();
  $("#do-upgrade").onclick=async()=>{
   if(busy)return;busy=true;update();$("#result").textContent="Колесо вращается…";$("#upgrade-wheel").classList.remove("wheel-win","wheel-lose");
   try{
    const d=await api("/api/upgrade",{method:"POST",body:JSON.stringify({itemId:$("#source").value,targetName:$("#target").value})});
    const chance=d.chance,successAngle=360-(chance*360)/2,failAngle=360-(chance*360+(360-chance*360)/2),finalAngle=(d.won?successAngle:failAngle)+360*7;
    const wheel=$("#upgrade-wheel");wheel.style.transition="none";wheel.style.transform="rotate(0deg)";void wheel.offsetWidth;wheel.style.transition="transform 5s cubic-bezier(.12,.72,.12,1)";wheel.style.transform=`rotate(${finalAngle}deg)`;
    await new Promise(r=>setTimeout(r,5200));wheel.classList.add(d.won?"wheel-win":"wheel-lose");
    $("#result").textContent=d.won?`УСПЕХ! Получен ${d.item.name} · ${d.item.price} токенов`:"НЕУДАЧА — предмет сгорел";
    if(d.won){inv=inv.filter(x=>x.id!==$("#source").value);inv.unshift(d.item)}else inv=inv.filter(x=>x.id!==$("#source").value);
    $("#source").innerHTML=inv.map(x=>`<option value="${x.id}">${x.name} — ${x.price} токенов</option>`).join("");
    if(d.won)$("#target").value=d.item.name;
    busy=false;update();
   }catch(e){$("#result").textContent=e.message;busy=false;update()}
  };
 }catch(e){$("#result").textContent=e.message}
})();
