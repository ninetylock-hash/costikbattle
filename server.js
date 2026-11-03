require("dotenv").config();
const express=require("express"),session=require("express-session"),passport=require("passport"),SteamStrategy=require("passport-steam").Strategy,fs=require("fs"),path=require("path"),crypto=require("crypto");
const app=express(),PORT=process.env.PORT||3000,BASE=(process.env.BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,"");
const dir=path.join(__dirname,"data"),file=path.join(dir,"users.json");fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,"{}");
const read=()=>{try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return{}}},write=x=>{const t=file+".tmp";fs.writeFileSync(t,JSON.stringify(x,null,2));fs.renameSync(t,file)};
function change(id,fn){const all=read(),u=all[id];if(!u)throw Error("Пользователь не найден");fn(u);write(all);return u}
function save(p){const all=read(),old=all[p.id]||{};all[p.id]={steam_id:p.id,display_name:p.displayName||old.display_name||"Steam Player",avatar:p.photos?.[2]?.value||p.photos?.[0]?.value||old.avatar||"",balance:Number.isInteger(old.balance)?old.balance:1000,inventory:old.inventory||[]};write(all);return all[p.id]}
const data=[
["starter","ПЕРВЫЙ ШАГ",25,"Glock-18 | High Beam;MP9 | Sand Dashed;P250 | Cassette;Nova | Windblown"],
["budget","БЮДЖЕТ",50,"Galil AR | Sage Spray;MAC-10 | Candy Apple;UMP-45 | Carbon Fiber;Five-SeveN | Capillary"],
["eco","ЭКО-РАУНД",75,"P90 | Freight;AUG | Amber Slipstream;FAMAS | Survivor Z;XM1014 | Seasons"],
["blue","BLUE DREAM",100,"USP-S | Night Ops;M4A4 | Magnesium;AK-47 | Uncharted;AWP | Acheron"],
["neon","NEON",150,"USP-S | Cyrex;M4A1-S | Decimator;AWP | Atheris;AK-47 | Neon Rider"],
["urban","URBAN",200,"Desert Eagle | Mecha Industries;MP7 | Bloodsport;M4A4 | Neo-Noir;AK-47 | Neon Revolution"],
["sniper","СНАЙПЕР",300,"AWP | Atheris;AWP | Neo-Noir;SSG 08 | Dragonfire;AWP | Asiimov"],
["red","RED ALERT",400,"AK-47 | Redline;M4A4 | The Emperor;P90 | Asiimov;AWP | Wildfire"],
["gold","GOLD RUSH",500,"Desert Eagle | Golden Koi;AK-47 | Gold Arabesque;M4A1-S | Golden Coil;USP-S | Kill Confirmed"],
["knife","KNIFE HUNT",650,"★ Navaja Knife | Doppler;★ Gut Knife | Autotronic;★ Huntsman Knife | Fade;★ Falchion Knife | Marble Fade"],
["gloves","GLOVE BOX",800,"★ Driver Gloves | King Snake;★ Hand Wraps | Slaughter;★ Sport Gloves | Omega;★ Specialist Gloves | Fade"],
["covert","COVERT",1000,"AK-47 | Fire Serpent;AWP | Dragon Lore;M4A4 | Howl;AK-47 | Wild Lotus"],
["assassin","ASSASSIN",1250,"★ Karambit | Slaughter;★ M9 Bayonet | Doppler;★ Butterfly Knife | Fade;★ Talon Knife | Marble Fade"],
["phoenix","PHOENIX",1500,"AWP | Asiimov;AK-47 | Vulcan;M4A4 | Asiimov;★ Bayonet | Doppler"],
["royal","ROYAL",2000,"★ Karambit | Doppler;★ Butterfly Knife | Lore;★ Sport Gloves | Vice;AWP | Dragon Lore"],
["mythic","MYTHIC",3000,"★ Butterfly Knife | Doppler;★ Karambit | Fade;★ Sport Gloves | Pandora's Box;AWP | Dragon Lore"],
["elite","ELITE",4000,"★ M9 Bayonet | Crimson Web;★ Butterfly Knife | Gamma Doppler;AK-47 | Wild Lotus;M4A4 | Howl"],
["dragon","DRAGON LORE",5500,"AWP | Dragon Lore;★ Karambit | Case Hardened;★ Butterfly Knife | Fade;★ Sport Gloves | Pandora's Box"],
["black","BLACK MARKET",7500,"★ Karambit | Doppler;★ Butterfly Knife | Marble Fade;★ M9 Bayonet | Lore;★ Sport Gloves | Vice"],
["jackpot","JACKPOT",10000,"AWP | Dragon Lore;★ Butterfly Knife | Gamma Doppler;★ Karambit | Fade;★ Sport Gloves | Pandora's Box"]];
const prices={"Glock-18 | High Beam":55,"MP9 | Sand Dashed":35,"P250 | Cassette":45,"Nova | Windblown":40,"Galil AR | Sage Spray":70,"MAC-10 | Candy Apple":65,"UMP-45 | Carbon Fiber":90,"Five-SeveN | Capillary":85,"P90 | Freight":90,"AUG | Amber Slipstream":110,"FAMAS | Survivor Z":100,"XM1014 | Seasons":115,"USP-S | Night Ops":130,"M4A4 | Magnesium":150,"AK-47 | Uncharted":175,"AWP | Acheron":160,"USP-S | Cyrex":250,"M4A1-S | Decimator":450,"AWP | Atheris":220,"AK-47 | Neon Rider":850,"AWP | Asiimov":2200,"AK-47 | Redline":600,"AWP | Dragon Lore":80000,"M4A4 | Howl":30000,"AK-47 | Wild Lotus":50000,"★ Karambit | Fade":50000,"★ Sport Gloves | Pandora's Box":90000,"★ Butterfly Knife | Fade":35000};
const cases=data.map(([id,name,price,list])=>({id,name,price,items:list.split(";").map(name=>({name,price:prices[name]||price*4}))}));
const items=[...new Map(cases.flatMap(c=>c.items).map(x=>[x.name,x])).values()];
app.set("trust proxy",1);app.set("view engine","ejs");app.set("views",path.join(__dirname,"views"));app.use(express.static(path.join(__dirname,"public")));app.use(express.urlencoded({extended:false}));app.use(express.json());
app.use(session({secret:process.env.SESSION_SECRET||"change-this-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:604800000}}));app.use(passport.initialize());app.use(passport.session());
passport.serializeUser((u,d)=>d(null,u.steam_id));passport.deserializeUser((id,d)=>{try{d(null,read()[id]||false)}catch(e){d(e)}});
passport.use(new SteamStrategy({returnURL:`${BASE}/auth/steam/return`,realm:`${BASE}/`,apiKey:process.env.STEAM_API_KEY||"not-used"},(identifier,p,d)=>{try{d(null,save(p))}catch(e){d(e)}}));
app.get("/",(q,s)=>s.render("index",{user:q.user||null,cases}));
app.get("/case/:id",(q,s)=>{const c=cases.find(x=>x.id===q.params.id);if(!c)return s.status(404).send("Кейс не найден");s.render("case",{user:q.user||null,caseData:c,cases})});app.get("/inventory",(q,s)=>q.user?s.render("inventory",{user:q.user}):s.redirect("/auth/steam"));app.get("/upgrade",(q,s)=>q.user?s.render("upgrade",{user:q.user}):s.redirect("/auth/steam"));
app.get("/auth/steam",passport.authenticate("steam",{failureRedirect:"/"}));app.get("/auth/steam/return",passport.authenticate("steam",{failureRedirect:"/?login=failed"}),(q,s)=>s.redirect("/"));
app.post("/logout",(q,s,n)=>q.logout(e=>e?n(e):q.session.destroy(()=>s.redirect("/"))));
app.get("/api/inventory",(q,s)=>q.user?s.json(read()[q.user.steam_id]?.inventory||[]):s.status(401).json({error:"Войдите через Steam"}));app.get("/api/catalog",(q,s)=>s.json(cases));
app.post("/api/open/:id",(q,s)=>{try{if(!q.user)throw Error("Войдите через Steam");const c=cases.find(x=>x.id===q.params.id);if(!c)throw Error("Кейс не найден");const u=change(q.user.steam_id,u=>{if(u.balance<c.price)throw Error("Недостаточно монет");u.balance-=c.price;const x=c.items[crypto.randomInt(c.items.length)];u.inventory.unshift({...x,id:crypto.randomUUID(),source:c.name})});s.json({balance:u.balance,item:u.inventory[0]})}catch(e){s.status(400).json({error:e.message})}});
app.post("/api/sell/:id",(q,s)=>{try{if(!q.user)throw Error("Войдите через Steam");let sold;const u=change(q.user.steam_id,u=>{const i=u.inventory.findIndex(x=>x.id===q.params.id);if(i<0)throw Error("Предмет не найден");sold=u.inventory.splice(i,1)[0];u.balance+=sold.price});s.json({balance:u.balance,sold})}catch(e){s.status(400).json({error:e.message})}});
app.post("/api/upgrade",(q,s)=>{try{if(!q.user)throw Error("Войдите через Steam");const target=items.find(x=>x.name===q.body.targetName);if(!target)throw Error("Целевой предмет не найден");let won=false,chance=0,result=null;const u=change(q.user.steam_id,u=>{const i=u.inventory.findIndex(x=>x.id===q.body.itemId);if(i<0)throw Error("Предмет не найден");const src=u.inventory[i];if(target.price<=src.price)throw Error("Целевой предмет должен быть дороже");chance=src.price/target.price;won=crypto.randomInt(1000000)<Math.floor(chance*1000000);u.inventory.splice(i,1);if(won){result={...target,id:crypto.randomUUID(),source:"Апгрейд"};u.inventory.unshift(result)}});s.json({won,chance,balance:u.balance,item:result})}catch(e){s.status(400).json({error:e.message})}});
app.listen(PORT,()=>console.log("Costik Battle: "+BASE));
