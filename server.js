require("dotenv").config();
const express=require("express"),session=require("express-session"),passport=require("passport"),SteamStrategy=require("passport-steam").Strategy,fs=require("fs"),path=require("path"),crypto=require("crypto");
const app=express(),PORT=process.env.PORT||3000,BASE=(process.env.BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,"");
const dir=path.join(__dirname,"data"),file=path.join(dir,"users.json");fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,"{}");
const read=()=>{try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return{}}},write=x=>{const t=file+".tmp";fs.writeFileSync(t,JSON.stringify(x,null,2));fs.renameSync(t,file)};
function change(id,fn){const all=read(),u=all[id];if(!u)throw Error("Пользователь не найден");fn(u);write(all);return u}
function save(p){const all=read(),old=all[p.id]||{};all[p.id]={steam_id:p.id,display_name:p.displayName||old.display_name||"Steam Player",avatar:p.photos?.[2]?.value||p.photos?.[0]?.value||old.avatar||"",balance:Number.isInteger(old.balance)?old.balance:1000,inventory:old.inventory||[]};write(all);return all[p.id]}

/* Market.CSGO public RUB price snapshot. Display currency is virtual tokens:
   1 token = 1 RUB for the site's demo economy. No payment or cash value. */
const MARKET_URL="https://market.csgo.com/api/v2/prices/RUB.json";
let marketPrices=new Map(),marketUpdatedAt=null,marketStatus="Загружаем Market.CSGO…",marketBusy=false;
function toRub(v){
  if(v===undefined||v===null)return 0;
  const s=String(v).trim();if(!s)return 0;
  const n=Number(s);if(!Number.isFinite(n)||n<=0)return 0;
  return s.includes(".")?n:n/100;
}
async function refreshMarketPrices(){
  if(marketBusy)return;marketBusy=true;
  try{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
    const response=await fetch(MARKET_URL,{signal:ctrl.signal,headers:{"Accept":"application/json","User-Agent":"CostikBattle/2.3"}});
    clearTimeout(timer);if(!response.ok)throw Error("Market.CSGO HTTP "+response.status);
    const payload=await response.json();if(!payload.success)throw Error("Market.CSGO не вернул success");
    const rows=Array.isArray(payload.items)?payload.items:Object.values(payload.items||{});
    const next=new Map();
    for(const row of rows){
      const name=row.market_hash_name||row.name||row[2];
      const raw=row.price??row[0];const price=toRub(raw);
      if(name&&price>0)next.set(name,{name,price:Math.max(1,Math.round(price)),source:"Market.CSGO"});
    }
    if(next.size<100)throw Error("В прайс-листе слишком мало предметов");
    marketPrices=next;marketUpdatedAt=new Date().toISOString();marketStatus=`Market.CSGO · ${next.size.toLocaleString("ru-RU")} предметов`;
    rebuildCases();
    console.log("[market] updated",next.size);
  }catch(e){marketStatus=marketPrices.size?`Market.CSGO · сохранённый прайс (${marketPrices.size})`:"Нет соединения с Market.CSGO — включены демонстрационные цены";console.warn("[market]",e.message)}
  finally{marketBusy=false}
}
refreshMarketPrices();setInterval(refreshMarketPrices,5*60*1000).unref();

/* Fallback catalogue is clearly marked as demo until a live Market.CSGO quote is available. */
const skinPool=[
["Glock-18 | High Beam",12],["MP9 | Sand Dashed",15],["P250 | Cassette",18],["Nova | Windblown",20],["MAC-10 | Candy Apple",24],["UMP-45 | Carbon Fiber",28],["Five-SeveN | Capillary",32],["Galil AR | Sage Spray",35],["P90 | Freight",38],["AUG | Amber Slipstream",42],
["FAMAS | Survivor Z",48],["XM1014 | Seasons",55],["USP-S | Night Ops",62],["M4A4 | Magnesium",70],["AK-47 | Uncharted",85],["AWP | Acheron",95],["Desert Eagle | Light Rail",110],["MP7 | Bloodsport",125],["AWP | Atheris",145],["AK-47 | Slate",165],
["M4A1-S | Decimator",190],["USP-S | Cyrex",220],["AK-47 | Redline",280],["M4A4 | Neo-Noir",340],["AWP | Neo-Noir",390],["AK-47 | Neon Rider",450],["Desert Eagle | Golden Koi",520],["M4A1-S | Golden Coil",650],["AWP | Asiimov",780],["AK-47 | Vulcan",950],
["M4A4 | The Emperor",1150],["AK-47 | Fire Serpent",1800],["AWP | Wildfire",2200],["M4A4 | Howl",6500],["AK-47 | Wild Lotus",9000],["AWP | Dragon Lore",12000],
["★ Navaja Knife | Doppler",1800],["★ Gut Knife | Autotronic",2300],["★ Huntsman Knife | Fade",3200],["★ Falchion Knife | Marble Fade",3600],["★ Karambit | Slaughter",6500],["★ M9 Bayonet | Doppler",8500],["★ Butterfly Knife | Fade",11000],["★ Talon Knife | Marble Fade",5800],["★ Karambit | Fade",15000],["★ Sport Gloves | Omega",7000],["★ Specialist Gloves | Fade",9000],["★ Sport Gloves | Vice",22000],["★ Sport Gloves | Pandora's Box",42000],["★ Butterfly Knife | Gamma Doppler",18000],
["SSG 08 | Dragonfire",520],["P2000 | Fire Elemental",460],["Glock-18 | Vogue",180],["M4A1-S | Printstream",1400],["USP-S | Printstream",1250],["AK-47 | Asiimov",1100],["AWP | Containment Breach",900],["Desert Eagle | Printstream",1350],["MP9 | Starlight Protector",360],["M4A4 | 龍王 (Dragon King)",780],["★ Karambit | Doppler (Factory New)",35000],["★ Butterfly Knife | Doppler (Factory New)",48000],["★ M9 Bayonet | Gamma Doppler (Factory New)",52000],["Souvenir AWP | Dragon Lore (Field-Tested)",72000],["AK-47 | Wild Lotus (Factory New)",98000],["★ Sport Gloves | Pandora Box (Field-Tested)",105000]
];
const exteriors=["Field-Tested","Minimal Wear","Factory New"];
function demoCatalogue(){return skinPool.map((x,i)=>({name:x[0],marketName:x[0]+" ("+exteriors[i%3]+")",price:x[1],source:"Демо-цена",imageName:x[0]}))}
function liveCatalogue(){
  if(!marketPrices.size)return demoCatalogue();
  const rows=[...marketPrices.values()].filter(x=>x.name.includes(" | ")&&!/Sticker|Graffiti|Souvenir Package|Music Kit|Case|Capsule|Patch|Agent|Pin|Spray/i.test(x.name));
  return rows.map(x=>({name:x.name.replace(/\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/,""),marketName:x.name,price:x.price,source:"Market.CSGO",imageName:x.name}));
}
const caseDefs=[
["starter","ПЕРВЫЙ ШАГ",25,"ice"],["budget","БЮДЖЕТ",50,"toxic"],["eco","ЭКО-РАУНД",75,"ice"],["blue","BLUE DREAM",100,"ice",true],["neon","NEON",150,"toxic"],["urban","URBAN",200,"inferno"],["sniper","СНАЙПЕР",300,"ice"],["red","RED ALERT",400,"inferno",true],["gold","GOLD RUSH",500,"royal"],["knife","KNIFE HUNT",650,"royal"],["gloves","GLOVE BOX",800,"toxic",true],["covert","COVERT",1000,"inferno"],["assassin","ASSASSIN",1250,"inferno"],["phoenix","PHOENIX",1500,"inferno",true],["royal","ROYAL",2000,"royal"],["mythic","MYTHIC",3000,"royal"],["elite","ELITE",4000,"toxic"],["dragon","DRAGON LORE",5500,"inferno"],["black","BLACK MARKET",7500,"toxic"],["jackpot","JACKPOT",10000,"royal",true]
];
const coldRatios=[...Array.from({length:25},(_,i)=>.33+i*(.57/24)),1,1.25,1.5,1.8,2.1,2.3,2.5,3,4,5,10];
const coldWeights=[...Array(25).fill(360),...Array(7).fill(120),...Array(3).fill(50),10];
const hotRatios=[...Array.from({length:20},(_,i)=>.33+i*(.57/19)),1,1.15,1.3,1.5,1.7,1.9,2.1,2.3,2.5,2.8,3,3.5,4,5,7,10];
const hotWeights=[...Array(20).fill(350),...Array(10).fill(200),...Array(4).fill(150),...Array(2).fill(200)];
function buildCases(){
  const catalogue=liveCatalogue();
  return caseDefs.map(([id,name,price,art,hot=false],caseIndex)=>{
    const ratios=hot?hotRatios:coldRatios,weights=hot?hotWeights:coldWeights;
    const eligible=catalogue.filter(x=>x.price>=price/3&&x.price<=price*10);
    const usedMarket=marketPrices.size>0&&eligible.length>=36;
    const source=usedMarket?eligible:demoCatalogue();
    const used=new Set(),drops=[];
    for(let i=0;i<36;i++){
      const target=price*ratios[i];
      let best=null,bestScore=Infinity;
      for(const item of source){if(used.has(item.marketName))continue;const score=Math.abs(Math.log(Math.max(1,item.price)/target));if(score<bestScore){best=item;bestScore=score}}
      if(!best)break;used.add(best.marketName);
      drops.push({...best,price:usedMarket?best.price:Math.max(1,Math.round(target)),source:usedMarket?"Market.CSGO":"Демо-цена",weight:weights[i],probability:weights[i]/100});
    }
    const total=drops.reduce((s,x)=>s+x.weight,0);
    drops.forEach(x=>x.probability=x.weight/total*100);
    const expectedValue=drops.reduce((s,x)=>s+x.price*x.weight,0)/total;
    const roi=expectedValue/price;
    return{id,name,price,art,items:drops,expectedValue:Math.round(expectedValue),roi,risk:roi>=1?"ПОТЕНЦИАЛЬНО ОКУПАЕМЫЙ":"НЕОКУП / ВЫСОКИЙ РИСК",profile:hot?"HIGH RETURN":"STANDARD",priceSource:usedMarket?"Market.CSGO":"ДЕМО"};
  });
}
let cases=buildCases();
function rebuildCases(){cases=buildCases()}
setInterval(rebuildCases,60*1000).unref();
function weightedPick(list){const total=list.reduce((n,x)=>n+x.weight,0);let r=crypto.randomInt(1,total+1);for(const x of list){r-=x.weight;if(r<=0)return x}return list[list.length-1]}
const items=[...new Map(cases.flatMap(c=>c.items).map(x=>[x.marketName,x])).values()];

function getAllItems() {
  const caseItems = cases.flatMap(c => c.items || []);

  let liveItems = [];
  try {
    liveItems = liveCatalogue() || [];
  } catch (e) {
    console.error("Ошибка загрузки дорогого каталога:", e.message);
  }

  const unique = new Map();

  for (const item of [...caseItems, ...liveItems]) {
    if (
      !item ||
      !item.name ||
      !Number.isFinite(Number(item.price)) ||
      Number(item.price) <= 0
    ) continue;

    const key = item.marketName || item.name;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const items = [...unique.values()];
  const regular = items
    .filter(x => Number(x.price) < 50000)
    .sort((a, b) => Number(b.price) - Number(a.price))
    .slice(0, 100);

  const ranges = [
    [50000, 100000],
    [100000, 150000],
    [150000, 200000],
    [200000, 250000],
    [250000, 300000],
    [300000, 400000],
    [400000, 500000],
    [500000, Infinity]
  ];

  const expensive = [];

  for (const [min, max] of ranges) {
    const group = items
      .filter(x => Number(x.price) >= min && Number(x.price) < max)
      .sort((a, b) => Number(b.price) - Number(a.price));

    expensive.push(...group.slice(0, 3));
  }

  return [...regular, ...expensive];
}

app.set("trust proxy",1);app.set("view engine","ejs");app.set("views",path.join(__dirname,"views"));app.use(express.static(path.join(__dirname,"public")));app.use(express.urlencoded({extended:false}));app.use(express.json());
app.use(session({secret:process.env.SESSION_SECRET||"change-this-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:604800000}}));app.use(passport.initialize());app.use(passport.session());
passport.serializeUser((u,d)=>d(null,u.steam_id));passport.deserializeUser((id,d)=>{try{d(null,read()[id]||false)}catch(e){d(e)}});
passport.use(new SteamStrategy({returnURL:`${BASE}/auth/steam/return`,realm:`${BASE}/`,apiKey:process.env.STEAM_API_KEY||"not-used"},(identifier,p,d)=>{try{d(null,save(p))}catch(e){d(e)}}));
app.get("/",(q,s)=>s.render("index",{user:q.user||null,cases,marketStatus,marketUpdatedAt}));
app.get("/case/:id",(q,s)=>{const c=cases.find(x=>x.id===q.params.id);if(!c)return s.status(404).send("Кейс не найден");s.render("case",{user:q.user||null,caseData:c,cases,marketStatus,marketUpdatedAt})});
app.get("/inventory",(q,s)=>q.user?s.render("inventory",{user:q.user}):s.redirect("/auth/steam"));app.get("/upgrade",(q,s)=>q.user?s.render("upgrade",{user:q.user}):s.redirect("/auth/steam"));
app.get("/auth/steam",passport.authenticate("steam",{failureRedirect:"/"}));app.get("/auth/steam/return",passport.authenticate("steam",{failureRedirect:"/?login=failed"}),(q,s)=>s.redirect("/"));
app.post("/logout",(q,s,n)=>q.logout(e=>e?n(e):q.session.destroy(()=>s.redirect("/"))));
app.get("/api/inventory",(q,s)=>q.user?s.json(read()[q.user.steam_id]?.inventory||[]):s.status(401).json({error:"Войдите через Steam"}));
app.get("/api/catalog",(q,s)=>s.json(cases));
app.get("/api/upgrade/catalog", (q, s) => {
  s.json(getAllItems());
});
/* ===== ADMIN PANEL ===== */

function safeSecretEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const A = Buffer.from(a);
  const B = Buffer.from(b);

  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

// Страница администратора
app.get("/admin", (q, s) => {
  s.render("admin");
});

// Вход администратора
app.post("/api/admin/login", (q, s) => {
  try {
    const secret = process.env.ADMIN_SECRET;

    if (!secret) {
      throw Error("ADMIN_SECRET не настроен на Render");
    }

    if (!safeSecretEqual(q.body.secret, secret)) {
      return s.status(403).json({ error: "Неверный пароль" });
    }

    q.session.admin = true;

    q.session.save(err => {
      if (err) return s.status(500).json({ error: "Ошибка сессии" });
      s.json({ success: true });
    });
  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});

// Начисление токенов — только после входа администратора
app.post("/api/admin/add-balance", (q, s) => {
  try {
    if (q.session.admin !== true) {
      return s.status(403).json({ error: "Нет доступа" });
    }

    const steamId = String(q.body.steamId || "");
    const amount = Number(q.body.amount);

    if (!/^\d{5,30}$/.test(steamId)) {
      throw Error("Проверь Steam ID");
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 100000000
    ) {
      throw Error("Некорректная сумма");
    }

    const u = change(steamId, user => {
      user.balance = (Number(user.balance) || 0) + amount;
    });

    s.json({
      success: true,
      balance: u.balance,
      message: `Начислено ${amount.toLocaleString("ru-RU")} токенов`
    });
  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});

// Выход из панели
app.post("/api/admin/logout", (q, s) => {
  q.session.admin = false;
  q.session.save(err => {
    if (err) return s.status(500).json({ error: "Ошибка сессии" });
    s.json({ success: true });
  });
});


app.get("/api/market-status",(q,s)=>s.json({status:marketStatus,updatedAt:marketUpdatedAt,source:"Market.CSGO",currency:"TOKENS",tokenPeg:"1 token = 1 RUB (virtual demo economy)",live:marketPrices.size>0}));
// Открытие одного или нескольких кейсов (до 10)
app.post("/api/open/:id/:count", (q, s) => {
  try {
    if (!q.user) throw Error("Войдите через Steam");

    const c = cases.find(x => x.id === q.params.id);
    if (!c) throw Error("Кейс не найден");

    const count = Number(q.params.count);

    if (!Number.isInteger(count) || count < 1 || count > 10) {
      throw Error("Можно открыть от 1 до 10 кейсов");
    }

    if (!c.items || !c.items.length) {
      throw Error("В этом кейсе пока нет предметов");
    }

    const totalPrice = c.price * count;
    let opened = [];

    const u = change(q.user.steam_id, u => {
      if (u.balance < totalPrice) {
        throw Error("Недостаточно токенов");
      }

      // Списываем общую стоимость
      u.balance -= totalPrice;

      // Выдаём все предметы
      for (let i = 0; i < count; i++) {
        const item = weightedPick(c.items);

        opened.push({
          ...item,
          id: crypto.randomUUID(),
          source: c.name
        });
      }

      u.inventory.unshift(...opened);
    });

    s.json({
      balance: u.balance,
      count,
      totalPrice,
      items: opened,
      item: opened[0],
      caseData: {
        price: c.price,
        items: c.items
      }
    });

  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});
app.post("/api/sell/:id",(q,s)=>{try{if(!q.user)throw Error("Войдите через Steam");let sold;const u=change(q.user.steam_id,u=>{const i=u.inventory.findIndex(x=>x.id===q.params.id);if(i<0)throw Error("Предмет не найден");sold=u.inventory.splice(i,1)[0];u.balance+=sold.price});s.json({balance:u.balance,sold})}catch(e){s.status(400).json({error:e.message})}});app.post("/api/upgrade",(q,s)=>{try{if(!q.user)throw Error("Войдите через Steam");const target=getAllItems().find(x=>x.marketName===q.body.targetName||x.name===q.body.targetName);if(!target)throw Error("Целевой предмет не найден");let won=false,chance=0,result=null;const u=change(q.user.steam_id,u=>{const i=u.inventory.findIndex(x=>x.id===q.body.itemId);if(i<0)throw Error("Предмет не найден");const src=u.inventory[i];if(target.price<=src.price)throw Error("Целевой предмет должен быть дороже");chance=Math.min(.90,(src.price/target.price)*.90);won=crypto.randomInt(1000000)<Math.floor(chance*1000000);u.inventory.splice(i,1);if(won){result={...target,id:crypto.randomUUID(),source:"Апгрейд"};u.inventory.unshift(result)}});s.json({won,chance,balance:u.balance,item:result,target,sourceName:q.body.itemId})}catch(e){s.status(400).json({error:e.message})}});

app.post("/api/upgrade", (q, s) => {
  try {
    if (!q.user) throw Error("Войдите через Steam");

    const itemId = String(q.body.itemId || "");
    const targetName = String(q.body.targetName || "");
    const extra = Number(q.body.extraBalance ?? 0);

    if (!Number.isSafeInteger(extra) || extra < 0 || extra > 100000000) {
      throw Error("Некорректная сумма доплаты");
    }

    const target = getAllItems().find(x =>
      (x.marketName || x.name) === targetName || x.name === targetName
    );

    if (!target) throw Error("Целевой предмет не найден");

    let won = false;
    let chance = 0;
    let result = null;

    const u = change(q.user.steam_id, user => {
      const index = user.inventory.findIndex(
        x => String(x.id) === itemId
      );

      if (index < 0) throw Error("Исходный предмет не найден");

      const source = user.inventory[index];
      const sourcePrice = Number(source.price);
      const targetPrice = Number(target.price);
      const balance = Number(user.balance);

      if (!Number.isFinite(sourcePrice) || sourcePrice <= 0) {
        throw Error("Некорректная цена исходного предмета");
      }

      if (!Number.isFinite(targetPrice) || targetPrice <= sourcePrice) {
        throw Error("Целевой предмет должен быть дороже");
      }

      if (!Number.isFinite(balance) || balance < extra) {
        throw Error("Недостаточно токенов для доплаты");
      }

      // Цена исходного скина + доплата увеличивают шанс.
      chance = Math.min(
        0.90,
        ((sourcePrice + extra) / targetPrice) * 0.90
      );

      // Списываем доплату.
      user.balance = balance - extra;

      // Исходный скин сгорает при любой попытке.
      user.inventory.splice(index, 1);

      // Сервер самостоятельно определяет результат.
      won = crypto.randomInt(1000000) <
        Math.floor(chance * 1000000);

      if (won) {
        result = {
          ...target,
          id: crypto.randomUUID(),
          source: "Апгрейд"
        };

        user.inventory.unshift(result);
      }
    });

    s.json({
      won,
      chance,
      balance: u.balance,
      item: result,
      target,
      extraBalance: extra
    });

  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});

app.listen(PORT,()=>console.log("Costik Battle: "+BASE));
