require("dotenv").config();
const express = require("express"), session = require("express-session"), passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy, fs = require("fs"), path = require("path");
const app = express(), PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const DATA_DIR = path.join(__dirname, "data"), USERS_FILE = path.join(DATA_DIR, "users.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "{}", "utf8");
const readUsers = () => { try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch { return {}; } };
const writeUsers = users => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
const getUser = id => readUsers()[id] || null;
function saveSteamUser(profile) {
  const users = readUsers(), id = profile.id, old = users[id] || {};
  users[id] = { steam_id: id, display_name: profile.displayName || old.display_name || "Steam Player",
    avatar: profile.photos?.[2]?.value || profile.photos?.[0]?.value || old.avatar || "",
    balance: Number.isInteger(old.balance) ? old.balance : 1000, created_at: old.created_at || new Date().toISOString() };
  writeUsers(users); return users[id];
}
function changeBalance(id, amount) { const users = readUsers(); if (!users[id]) return null; users[id].balance += amount; writeUsers(users); return users[id]; }
app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public"))); app.use(express.urlencoded({ extended: false }));
app.set("trust proxy", 1);
app.use(session({ secret: process.env.SESSION_SECRET || "dev-only-change-me", resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 86400000 } }));
app.use(passport.initialize()); app.use(passport.session());
passport.serializeUser((u, done) => done(null, u.steam_id));
passport.deserializeUser((id, done) => { try { done(null, getUser(id) || false); } catch (e) { done(e); } });
passport.use(new SteamStrategy({ returnURL: `${BASE_URL}/auth/steam/return`, realm: `${BASE_URL}/`, apiKey: process.env.STEAM_API_KEY || "not-used-for-openid" },
  (identifier, profile, done) => { try { done(null, saveSteamUser(profile)); } catch (e) { done(e); } }));
app.use((req, res, next) => { res.locals.user = req.user || null; next(); });
app.get("/", (req, res) => res.render("index", { page: "home" }));
app.get("/auth/steam", passport.authenticate("steam", { failureRedirect: "/" }));
app.get("/auth/steam/return", passport.authenticate("steam", { failureRedirect: "/?login=failed" }), (req, res) => res.redirect("/"));
app.post("/logout", (req, res, next) => req.logout(err => err ? next(err) : req.session.destroy(() => res.redirect("/"))));
const cases = {
 starter:{price:50,items:["MP9 | Sand Dashed","Glock-18 | High Beam","P250 | Cassette","Nova | Windblown"]},
 neon:{price:150,items:["USP-S | Cyrex","M4A1-S | Decimator","AWP | Atheris","AK-47 | Neon Rider"]},
 legend:{price:400,items:["AK-47 | Redline","AWP | Asiimov","M4A4 | Howl","Karambit | Doppler"]}
};
app.get("/api/me",(req,res)=>res.json(req.user?{loggedIn:true,name:req.user.display_name,avatar:req.user.avatar,balance:req.user.balance,steamId:req.user.steam_id}:{loggedIn:false}));
app.post("/api/open/:caseId",(req,res)=>{
 if(!req.user)return res.status(401).json({error:"Сначала войдите через Steam"});
 const c=cases[req.params.caseId]; if(!c)return res.status(404).json({error:"Кейс не найден"});
 const u=getUser(req.user.steam_id); if(!u||u.balance<c.price)return res.status(400).json({error:"Недостаточно виртуальных монет"});
 const item=c.items[Math.floor(Math.random()*c.items.length)], updated=changeBalance(u.steam_id,-c.price);
 req.user=updated; res.json({item,balance:updated.balance});
});
app.post("/api/demo-credit",(req,res)=>{
 if(!req.user)return res.status(401).json({error:"Войдите через Steam"});
 const updated=changeBalance(req.user.steam_id,500); req.user=updated;
 res.json({balance:updated.balance,message:"Добавлено 500 тестовых монет"});
});
app.use((err,req,res,next)=>{console.error(err);res.status(500).send("Ошибка сервера. Проверьте настройки Steam OpenID и BASE_URL.");});
app.listen(PORT,()=>console.log(`Costik Battle запущен: ${BASE_URL}`));
