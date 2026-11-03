
const $ = s => document.querySelector(s);

async function api(url, opts = {}) {
  const r = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    },
    ...opts
  });

  const raw = await r.text();
  let d;

  try {
    d = raw ? JSON.parse(raw) : {};
  } catch {
    throw Error(`Сервер вернул не JSON (HTTP ${r.status}).`);
  }

  if (!r.ok) throw Error(d.error || `Ошибка сервера: HTTP ${r.status}`);
  return d;
}

let skinsPromise;

const SKINS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

function norm(s) {
  return String(s || "")
    .replace(/^★\s*/, "")
    .replace(/\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function loadSkins() {
  if (!skinsPromise) {
    skinsPromise = fetch(SKINS_URL).then(r => r.json()).catch(() => []);
  }
  return skinsPromise;
}

async function findSkin(name) {
  const db = await loadSkins();
  const n = norm(name);

  return db.find(x =>
    norm(x.name) === n || norm(x.market_hash_name) === n
  ) || db.find(x =>
    norm(x.name).includes(n) || n.includes(norm(x.name))
  );
}

function fallback(parent, name) {
  const el = document.createElement("div");
  el.className = "image-fallback";
  el.textContent = name;
  parent.replaceWith(el);
}

async function setSkinImage(img, name) {
  const x = await findSkin(name);

  if (x?.image) {
    img.src = x.image;
    img.onerror = () => fallback(img, name);
  } else {
    fallback(img, name);
  }
}

async function hydrate(root = document) {
  for (const el of [...root.querySelectorAll("[data-art]")]) {
    const art = el.dataset.art;

    if (["ice", "inferno", "toxic", "royal"].includes(art)) {
      el.style.backgroundImage =
        `linear-gradient(180deg,#07101b22,#07101bcc),url('/images/case-${art}.webp')`;
    }
  }

  for (const im of [...root.querySelectorAll("img[data-skin]")]) {
    await setSkinImage(im, im.dataset.skin);
  }
}

hydrate();

const money = n => Number(n || 0).toLocaleString("ru-RU");

function makeSkinCard(item) {
  const el = document.createElement("div");
  el.className = "upgrade-item";

  const im = document.createElement("img");
  im.alt = item.name;

  const name = document.createElement("b");
  name.textContent = item.name;

  const price = document.createElement("small");
  price.textContent = money(item.price) + " токенов";

  el.append(im, name, price);
  setSkinImage(im, item.name);

  return el;
}

function reelCard(x) {
  const d = document.createElement("div");
  d.className = "reel-item";

  const im = document.createElement("img");
  im.dataset.skin = x.name;

  const b = document.createElement("b");
  b.textContent = x.name;

  const p = document.createElement("small");
  p.textContent = money(x.price) + " токенов";

  d.append(im, b, p);
  return d;
}

async function spin(reel, items, winner) {
  reel.innerHTML = "";

  const arr = Array.from(
    { length: 38 },
    () => items[Math.floor(Math.random() * items.length)]
  );

  arr.push(winner);

  for (let i = 0; i < 6; i++) {
    arr.push(items[Math.floor(Math.random() * items.length)]);
  }

  arr.forEach(x => reel.append(reelCard(x)));
  await hydrate(reel);

  reel.style.transition = "none";
  reel.style.transform = "translateX(0)";
  void reel.offsetWidth;

  const x = 38 * 166 - reel.parentElement.clientWidth / 2 + 83;

  reel.style.transition = "transform 5.2s cubic-bezier(.08,.72,.12,1)";
  requestAnimationFrame(() => {
    reel.style.transform = `translateX(-${x}px)`;
  });

  return new Promise(r => setTimeout(r, 5350));
}

// Открытие кейсов
async function openCaseButton(b) {
  if (!b || b.disabled) return;

  b.disabled = true;
  const originalText = b.textContent;
  b.textContent = "ОТКРЫВАЕМ…";

  try {
    const caseId = b.dataset.id;
    if (!caseId) throw Error("У кнопки не указан ID кейса.");

    const count = Math.min(
      10,
      Math.max(1, Number($("#case-count")?.value) || 1)
    );

    const d = await api(
      "/api/open/" + encodeURIComponent(caseId) + "/" + count,
      { method: "POST" }
    );

    if (!Array.isArray(d.items) || d.items.length !== count) {
      throw Error("Сервер вернул некорректный список предметов.");
    }

    const modal = $("#modal");
    const reel = $("#reel");

    if (!modal || !reel) throw Error("Не найдено окно открытия.");

    modal.classList.remove("hide");

    for (let i = 0; i < d.items.length; i++) {
      const item = d.items[i];

      $("#roll-title").textContent = `ОТКРЫТИЕ ${i + 1} ИЗ ${count}`;
      $("#item-name").textContent = "";
      $("#item-price").textContent = "";

      await spin(reel, d.caseData.items, item);

      $("#roll-title").textContent = `ВЫПАЛ ПРЕДМЕТ ${i + 1} ИЗ ${count}`;
      $("#item-name").textContent = item.name;
      $("#item-price").textContent = money(item.price) + " токенов";

      if (i < d.items.length - 1) {
        await new Promise(r => setTimeout(r, 900));
      }
    }

    if ($("#user-balance") && typeof d.balance === "number") {
      $("#user-balance").textContent = money(d.balance);
    }
  } catch (e) {
    alert(e.message || "Не удалось открыть кейс");
  } finally {
    b.disabled = false;
    b.textContent = originalText;
  }
}

document.addEventListener("click", event => {
  const b = event.target instanceof Element
    ? event.target.closest("button.open[data-id]")
    : null;

  if (!b) return;

  event.preventDefault();
  event.stopPropagation();
  openCaseButton(b);
}, true);

window.CostikBattle = window.CostikBattle || {};
window.CostikBattle.openCase = openCaseButton;

if ($("#close")) {
  $("#close").onclick = () => $("#modal").classList.add("hide");
}

// Инвентарь и продажа
if ($("#inventory")) {
  (async () => {
    try {
      const items = await api("/api/inventory");
      const root = $("#inventory");
      root.innerHTML = "";

      if (!items.length) {
        root.textContent = "Инвентарь пуст";
        return;
      }

      items.forEach(x => {
        const el = document.createElement("article");
        el.className = "drop-card";

        const frame = document.createElement("div");
        frame.className = "skin-frame";

        const im = document.createElement("img");
        im.dataset.skin = x.name;
        frame.append(im);
        el.append(frame);

        const h = document.createElement("h3");
        h.textContent = x.name;
        el.append(h);

        const p = document.createElement("p");
        p.textContent = money(x.price) + " токенов";
        el.append(p);

        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = "ПРОДАТЬ";

        b.onclick = async () => {
          try {
            await api("/api/sell/" + encodeURIComponent(x.id), {
              method: "POST"
            });
            location.reload();
          } catch (e) {
            alert(e.message);
          }
        };

        el.append(b);
        root.append(el);
      });

      await hydrate(root);
    } catch (e) {
      $("#inventory").textContent = e.message;
    }
  })();
}

// Апгрейд с доплатой
if ($("#source")) {
  (async () => {
    let inv = [];
    let all = [];
    let busy = false;
    let selectedSource = "";
    let selectedTarget = "";

    const byId = id => document.getElementById(id);

    function sourceItem() {
      return inv.find(x => String(x.id) === String(selectedSource));
    }

    function targetItem() {
      return all.find(x =>
        (x.marketName || x.name) === selectedTarget
      );
    }

    function extraValue() {
      const value = Number(byId("extra-balance").value || 0);

      if (!Number.isSafeInteger(value) || value < 0) return 0;
      return Math.min(value, 100000000);
    }

    function chanceFor(source, target, extra) {
      if (!source || !target || target.price <= source.price) return 0;

      return Math.min(
        0.9,
        ((source.price + extra) / target.price) * 0.9
      );
    }

    function sortItems(items, mode) {
      return [...items].sort((a, b) => {
        if (mode === "price-asc") return a.price - b.price;
        if (mode === "name") return a.name.localeCompare(b.name);
        return b.price - a.price;
      });
    }

    function preview(root, item, empty) {
      root.innerHTML = "";
      if (!item) {
        root.textContent = empty;
        return;
      }
      root.append(makeSkinCard(item));
    }

    function renderSource() {
      const query = byId("source-search").value.toLowerCase().trim();

      const items = sortItems(
        inv.filter(x => x.name.toLowerCase().includes(query)),
        byId("source-sort").value
      );

      byId("source-count").textContent = `${items.length} предметов`;

      const root = byId("source-grid");
      root.innerHTML = "";

      if (!items.length) {
        root.textContent = "В инвентаре ничего не найдено";
        return;
      }

      items.forEach(x => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "upgrade-skin-card" +
          (String(x.id) === String(selectedSource) ? " selected" : "");
        b.dataset.id = x.id;

        const im = document.createElement("img");
        im.dataset.skin = x.name;
        im.alt = x.name;

        const name = document.createElement("b");
        name.textContent = x.name;

        const price = document.createElement("small");
        price.textContent = money(x.price) + " токенов";

        b.append(im, name, price);
        root.append(b);
      });

      hydrate(root);
    }

    function renderTarget() {
      const query = byId("target-search").value.toLowerCase().trim();
      const min = Number(byId("target-min").value) || 0;
      const max = Number(byId("target-max").value) || Infinity;
      const source = sourceItem();

      let items = all.filter(x =>
        x.name.toLowerCase().includes(query) &&
        x.price >= min &&
        x.price <= max &&
        (!source || x.price > source.price)
      );

      items = sortItems(items, byId("target-sort").value);

      byId("target-count").textContent = `${items.length} предметов`;

      const root = byId("target-grid");
      root.innerHTML = "";

      if (!items.length) {
        root.textContent = "Нет подходящих предметов";
        return;
      }

      items.forEach(x => {
        const key = x.marketName || x.name;

        const b = document.createElement("button");
        b.type = "button";
        b.className = "upgrade-skin-card" +
          (key === selectedTarget ? " selected" : "");
        b.dataset.name = key;

        const im = document.createElement("img");
        im.dataset.skin = x.name;
        im.alt = x.name;

        const name = document.createElement("b");
        name.textContent = x.marketName || x.name;

        const price = document.createElement("small");
        price.textContent = money(x.price) + " токенов";

        b.append(im, name, price);
        root.append(b);
      });

      hydrate(root);
    }

    function update() {
      const source = sourceItem();
      const target = targetItem();
      const extra = extraValue();
      const chance = chanceFor(source, target, extra);

      byId("source").value = source ? source.id : "";
      byId("target").value = target
        ? (target.marketName || target.name)
        : "";

      byId("chance").textContent =
        (chance * 100).toFixed(2) + "%";

      byId("upgrade-wheel").style.background =
        `conic-gradient(#36d477 0deg ${chance * 360}deg,#ed414b ${chance * 360}deg 360deg)`;

      byId("upgrade-stake").textContent =
        money(source ? source.price + extra : extra) + " токенов";

      byId("upgrade-extra-value").textContent =
        money(extra) + " токенов";

      byId("do-upgrade").disabled =
        !source || !target ||
        target.price <= source.price || busy;

      preview(byId("source-preview"), source, "Инвентарь пуст");
      preview(byId("target-preview"), target, "Выбери желаемый предмет");

      renderSource();
      renderTarget();
    }

    try {
      inv = await api("/api/inventory");

      // Загружаем полный каталог, включая дорогие предметы.
      all = await api("/api/upgrade/catalog");

      selectedSource = inv.length ? String(inv[0].id) : "";

      renderSource();
      renderTarget();
      update();

      byId("source-grid").addEventListener("click", e => {
        const b = e.target.closest(".upgrade-skin-card");
        if (!b) return;

        selectedSource = b.dataset.id;
        selectedTarget = "";
        update();
      });

      byId("target-grid").addEventListener("click", e => {
        const b = e.target.closest(".upgrade-skin-card");
        if (!b) return;

        selectedTarget = b.dataset.name;
        update();
      });

      ["source-search", "source-sort"].forEach(id => {
        byId(id).addEventListener("input", renderSource);
      });

      ["target-search", "target-sort", "target-min", "target-max"].forEach(id => {
        byId(id).addEventListener("input", renderTarget);
      });

      byId("extra-balance").addEventListener("input", update);

      byId("do-upgrade").onclick = async () => {
        if (busy) return;

        const source = sourceItem();
        const target = targetItem();
        const extra = extraValue();

        if (!source || !target || target.price <= source.price) return;

        busy = true;
        update();

        byId("result").textContent = "Запускаем апгрейд…";

        const wheel = byId("upgrade-wheel");
        wheel.classList.remove("wheel-win", "wheel-lose");

        try {
          const d = await api("/api/upgrade", {
            method: "POST",
            body: JSON.stringify({
              itemId: selectedSource,
              targetName: selectedTarget,
              extraBalance: extra
            })
          });

          // Анимация показывает результат, уже определённый сервером.
          const chance = d.chance;
          const successAngle = 360 - chance * 180;
          const failAngle = 360 - (chance * 360 + (360 - chance * 360) / 2);
          const finalAngle =
            (d.won ? successAngle : failAngle) + 360 * 7;

          wheel.style.transition = "none";
          wheel.style.transform = "rotate(0deg)";
          void wheel.offsetWidth;

          wheel.style.transition = "transform 5s cubic-bezier(.12,.72,.12,1)";
          wheel.style.transform = `rotate(${finalAngle}deg)`;

          await new Promise(r => setTimeout(r, 5200));

          wheel.classList.add(d.won ? "wheel-win" : "wheel-lose");

          byId("result").textContent = d.won
            ? `УСПЕХ! Получен ${d.item.name} · ${money(d.item.price)} токенов`
            : `НЕУДАЧА! Скин и ${money(d.extraBalance)} токенов сгорели`;

          inv = inv.filter(x => String(x.id) !== String(selectedSource));

          if (d.won) {
            inv.unshift(d.item);
            selectedSource = String(d.item.id);
          } else {
            selectedSource = inv.length ? String(inv[0].id) : "";
          }

          selectedTarget = "";
          byId("extra-balance").value = "0";

          if ($("#user-balance")) {
            $("#user-balance").textContent = money(d.balance);
          }

          busy = false;
          update();

        } catch (e) {
          byId("result").textContent = e.message;
          busy = false;
          update();
        }
      };

    } catch (e) {
      byId("result").textContent = e.message;
    }
  })();
}
