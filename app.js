const $=s=>document.querySelector(s);
async function api(url,opts={}){
 const r=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});
 const raw=await r.text();let d;
 try{d=raw?JSON.parse(raw):{}}catch{throw Error(`Сервер вернул не JSON (HTTP ${r.status}). Проверьте адрес API и деплой.`)}
 if(!r.ok)throw Error(d.error||`Ошибка сервера: HTTP ${r.status}`);
 return d;
}
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
async function openCaseButton(b){
 if(!b||b.disabled)return;
 b.disabled=true;
 const originalText=b.textContent;
 b.textContent="ОТКРЫВАЕМ…";
 try{
  const caseId=b.dataset.id;
  if(!caseId)throw Error("У кнопки не указан ID кейса. Перезагрузите страницу.");
  const d=await api("/api/open/"+encodeURIComponent(caseId),{method:"POST"});
  if(!d.caseData?.items?.length||!d.item)throw Error("Сервер не вернул предмет. Обновите страницу и попробуйте снова.");
  const modal=$("#modal"),reel=$("#reel");
  if(!modal||!reel)throw Error("Не найдено окно открытия. Перезагрузите страницу.");
  $("#roll-title").textContent="ОТКРЫТИЕ КЕЙСА";
  $("#item-name").textContent="";
  $("#item-price").textContent="";
  modal.classList.remove("hide");
  await spin(reel,d.caseData.items,d.item);
  $("#roll-title").textContent="ВЫПАЛ ПРЕДМЕТ";
  $("#item-name").textContent=d.item.name;
  $("#item-price").textContent=d.item.price+" токенов";
  const balance=document.querySelector(".header-user");
  if(balance&&typeof d.balance==="number"){
   const tokenText=[...balance.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.includes("токен"));
   if(tokenText)tokenText.textContent=tokenText.textContent.replace(/[0-9][0-9\s]*/,d.balance);
  }
 }catch(e){
  alert(e.message||"Не удалось открыть кейс");
 }finally{
  b.disabled=false;
  b.textContent=originalText;
 }
}
// Delegated capture listener: works even if the case content is re-rendered.
document.addEventListener("click",event=>{
 const b=event.target instanceof Element?event.target.closest("button.open[data-id]"):null;
 if(!b)return;
 event.preventDefault();
 event.stopPropagation();
 openCaseButton(b);
},true);
window.CostikBattle=window.CostikBattle||{};
window.CostikBattle.openCase=openCaseButton;

if($("#close"))$("#close").onclick=()=>$("#modal").classList.add("hide");
if($("#inventory"))(async()=>{try{const a=await api("/api/inventory"),root=$("#inventory");root.innerHTML="";if(!a.length){root.textContent="Инвентарь пуст";return}a.forEach(x=>{const el=document.createElement("article");el.className="drop-card";const fr=document.createElement("div");fr.className="skin-frame";const im=document.createElement("img");im.dataset.skin=x.name;fr.append(im);el.append(fr);const h=document.createElement("h3");h.textContent=x.name;el.append(h);const p=document.createElement("p");p.textContent=x.price+" токенов";el.append(p);const b=document.createElement("button");b.className="btn";b.textContent="ПРОДАТЬ";b.onclick=async()=>{try{await api("/api/sell/"+x.id,{method:"POST"});location.reload()}catch(e){alert(e.message)}};el.append(b);root.append(el)});await hydrate(root)}catch(e){$("#inventory").textContent=e.message}})();

if($("#source"))(async()=>{
 let inv=[],all=[],busy=false;
 let selectedSource="",selectedTarget="";
 const pageSize=24;
 const $id=id=>document.getElementById(id);

 function priceSort(items,mode){
  return [...items].sort((a,b)=>{
   if(mode==="price-asc")return a.price-b.price;
   if(mode==="name")return a.name.localeCompare(b.name);
   return b.price-a.price;
  });
 }

 function preview(root,item,empty){
  root.innerHTML="";
  if(!item){root.textContent=empty;return}
  root.append(makeSkinCard(item));
 }

 function renderSource(){
  const q=$id("source-search").value.toLowerCase().trim();
  const items=priceSort(inv.filter(x=>x.name.toLowerCase().includes(q)),$id("source-sort").value);
  $id("source-count").textContent=`${items.length} предметов`;
  const root=$id("source-grid");
  root.innerHTML="";
  if(!items.length){root.innerHTML='<p class="upgrade-loading">В инвентаре ничего не найдено</p>';return}
  items.forEach(x=>{
   const b=document.createElement("button");
   b.type="button";
   b.className="upgrade-skin-card"+(String(x.id)===String(selectedSource)?" selected":"");
   b.dataset.id=x.id;
   const im=document.createElement("img");
   im.dataset.skin=x.name;im.alt=x.name;
   const name=document.createElement("b");name.textContent=x.name;
   const price=document.createElement("small");price.textContent=x.price+" токенов";
   b.append(im,name,price);
   root.append(b);
  });
  hydrate(root);
 }

 function renderTarget(){
  const q=$id("target-search").value.toLowerCase().trim();
  const min=Number($id("target-min").value)||0;
  const max=Number($id("target-max").value)||Infinity;
  const a=inv.find(x=>String(x.id)===String(selectedSource));
  let items=all.filter(x=>
   x.name.toLowerCase().includes(q)&&
   x.price>=min&&x.price<=max&&
   (!a||x.price>a.price)
  );
  items=priceSort(items,$id("target-sort").value);
  $id("target-count").textContent=`${items.length} предметов`;
  const root=$id("target-grid");
  root.innerHTML="";
  if(!items.length){root.innerHTML='<p class="upgrade-loading">Нет подходящих предметов</p>';return}
  items.forEach(x=>{
   const b=document.createElement("button");
   b.type="button";
   b.className="upgrade-skin-card"+(x.name===selectedTarget?" selected":"");
   b.dataset.name=x.name;
   const im=document.createElement("img");
   im.dataset.skin=x.name;im.alt=x.name;
   const name=document.createElement("b");name.textContent=x.name;
   const price=document.createElement("small");price.textContent=x.price+" токенов";
   b.append(im,name,price);
   root.append(b);
  });
  hydrate(root);
 }

 function update(){
  const a=inv.find(x=>String(x.id)===String(selectedSource));
  const t=all.find(x=>x.name===selectedTarget);
  const chance=a&&t&&t.price>a.price?Math.min(.9,a.price/t.price*.9):0;
  $id("source").value=a?a.id:"";
  $id("target").value=t?t.name:"";
  $id("chance").textContent=(chance*100).toFixed(2)+"%";
  $id("upgrade-wheel").style.background=
   `conic-gradient(#36d477 0deg ${chance*360}deg,#ed414b ${chance*360}deg 360deg)`;
  $id("do-upgrade").disabled=!a||!t||t.price<=a.price||busy;
  preview($id("source-preview"),a,"Инвентарь пуст");
  preview($id("target-preview"),t,"Выбери желаемый предмет");
  renderSource();
  renderTarget();
 }

 try{
  inv=await api("/api/inventory");
  const cat=await api("/api/catalog");
  all=[...new Map(cat.flatMap(c=>c.items).map(x=>[x.name,x])).values()];
  selectedSource=inv.length?String(inv[0].id):"";
  renderSource();
  renderTarget();
  update();

  $id("source-grid").addEventListener("click",e=>{
   const b=e.target.closest(".upgrade-skin-card");
   if(!b)return;
   selectedSource=b.dataset.id;
   selectedTarget="";
   update();
  });

  $id("target-grid").addEventListener("click",e=>{
   const b=e.target.closest(".upgrade-skin-card");
   if(!b)return;
   selectedTarget=b.dataset.name;
   update();
  });

  ["source-search","source-sort"].forEach(id=>
   $id(id).addEventListener("input",renderSource)
  );
  ["target-search","target-sort","target-min","target-max"].forEach(id=>
   $id(id).addEventListener("input",renderTarget)
  );

  $id("do-upgrade").onclick=async()=>{
   if(busy)return;
   const a=inv.find(x=>String(x.id)===String(selectedSource));
   const t=all.find(x=>x.name===selectedTarget);
   if(!a||!t||t.price<=a.price)return;
   busy=true;update();
   $id("result").textContent="Колесо вращается…";
   const wheel=$id("upgrade-wheel");
   wheel.classList.remove("wheel-win","wheel-lose");

   try{
    const d=await api("/api/upgrade",{
     method:"POST",
     body:JSON.stringify({itemId:selectedSource,targetName:selectedTarget})
    });
    const chance=d.chance;
    const successAngle=360-(chance*360)/2;
    const failAngle=360-(chance*360+(360-chance*360)/2);
    const finalAngle=(d.won?successAngle:failAngle)+360*7;
    wheel.style.transition="none";
    wheel.style.transform="rotate(0deg)";
    void wheel.offsetWidth;
    wheel.style.transition="transform 5s cubic-bezier(.12,.72,.12,1)";
    wheel.style.transform=`rotate(${finalAngle}deg)`;
    await new Promise(r=>setTimeout(r,5200));
    wheel.classList.add(d.won?"wheel-win":"wheel-lose");

    $id("result").textContent=d.won
     ?`УСПЕХ! Получен ${d.item.name} · ${d.item.price} токенов`
     :"НЕУДАЧА — предмет сгорел";

    inv=inv.filter(x=>String(x.id)!==String(selectedSource));
    if(d.won){
     inv.unshift(d.item);
     selectedSource=String(d.item.id);
     selectedTarget="";
    }else{
     selectedSource=inv.length?String(inv[0].id):"";
     selectedTarget="";
    }
    busy=false;
    update();
   }catch(e){
    $id("result").textContent=e.message;
    busy=false;
    update();
   }
  };
 }catch(e){
  $id("result").textContent=e.message;
 }
})();
