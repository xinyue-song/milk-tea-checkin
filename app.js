const LS_BRANDS = "tea_brands_v2";
const LS_CHECKINS = "tea_checkins_v1";

/**
 * 按你 assets/logos 里的文件名配置（名字就用文件名去掉扩展）
 */
const DEFAULT_LOGO_FILES = [
  "1点点.png",
  "Coco都可.png",
  "霸王茶姬.jpeg",
  "茶百道.webp",
  "茶颜悦色.jpeg",
  "古茗.jpeg",
  "沪上阿姨.jpeg",
  "乐乐茶.png",
  "蜜雪冰城.jpg",
  "茉莉奶白.jpeg",
  "奈雪的茶.jpeg",
  "甜啦啦.jpeg",
  "喜茶.jpg",
  "益禾堂.png"
];

const els = {
  todayValue: document.getElementById("todayValue"),
  streakValue: document.getElementById("streakValue"),
  totalCountValue: document.getElementById("totalCountValue"),
  badges: document.getElementById("badges"),
  records: document.getElementById("records"),

  btnCheckin: document.getElementById("btnCheckin"),
  btnAddBrand: document.getElementById("btnAddBrand"),

  modalCheckin: document.getElementById("modalCheckin"),
  modalBrand: document.getElementById("modalBrand"),

  checkinForm: document.getElementById("checkinForm"),
  brandSelect: document.getElementById("brandSelect"),
  priceInput: document.getElementById("priceInput"),
  noteInput: document.getElementById("noteInput"),
  noteCounter: document.getElementById("noteCounter"),

  brandForm: document.getElementById("brandForm"),
  brandNameInput: document.getElementById("brandNameInput"),
  brandLogoInput: document.getElementById("brandLogoInput"),
  brandList: document.getElementById("brandList")
};

function uid() {
  return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function stripExt(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function fileToLogoPath(filename) {
  // 兼容中文/空格文件名
  return "assets/logos/" + encodeURIComponent(filename);
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadBrands() {
  return safeParse(localStorage.getItem(LS_BRANDS), []);
}
function saveBrands(brands) {
  localStorage.setItem(LS_BRANDS, JSON.stringify(brands));
}
function loadCheckins() {
  return safeParse(localStorage.getItem(LS_CHECKINS), []);
}
function saveCheckins(checkins) {
  localStorage.setItem(LS_CHECKINS, JSON.stringify(checkins));
}

function getDefaultBrands() {
  return DEFAULT_LOGO_FILES.map((file) => ({
    id: "builtin_" + file,
    name: stripExt(file),
    logoPath: fileToLogoPath(file),
    logoDataUrl: "",
    builtin: true,
    ts: Date.now()
  }));
}

function ensureDefaultBrands() {
  let brands = loadBrands();
  if (brands.length === 0) {
    brands = getDefaultBrands();
    saveBrands(brands);
  }
  return brands;
}

function getBrandMap(brands) {
  const m = new Map();
  for (const b of brands) m.set(b.id, b);
  return m;
}

function getUniqueDateSet(checkins) {
  const s = new Set();
  for (const c of checkins) s.add(c.date);
  return s;
}

function getStreakByDates(uniqueDateSet) {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 10000; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toYMD(d);
    if (uniqueDateSet.has(key)) streak++;
    else break;
  }
  return streak;
}

function getBrandImageSrc(brand) {
  if (!brand) return "";
  if (brand.logoDataUrl) return brand.logoDataUrl;
  if (brand.logoPath) return brand.logoPath;
  return "";
}

function getAvatarText(name) {
  const s = (name ?? "").trim();
  if (!s) return "?";
  return s.slice(0, 2);
}

function openModal(el) {
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
}
function closeModal(el) {
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
}

function percentProgress(current, target) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

function createBadge({ name, icon, desc, unlocked, progressPct }) {
  const wrap = document.createElement("div");
  wrap.className = "badge" + (unlocked ? "" : " locked");
  wrap.innerHTML = `
    <div class="top">
      <div class="icon">${icon}</div>
      <div>
        <div class="name">${name}</div>
        <div class="desc">${desc}</div>
      </div>
    </div>
    <div class="bar"><i style="width:${progressPct}%;"></i></div>
  `;
  return wrap;
}

function renderBadges({ streak, totalCount, totalDays }) {
  const rules = [
    { name: "今天不空杯", icon: "★", desc: "连击 1 天", unlocked: streak >= 1, progressPct: percentProgress(streak, 1) },
    { name: "小小连击", icon: "✦", desc: "连击 3 天", unlocked: streak >= 3, progressPct: percentProgress(streak, 3) },
    { name: "七日骑士", icon: "⛨", desc: "连击 7 天", unlocked: streak >= 7, progressPct: percentProgress(streak, 7) },
    { name: "十四天王", icon: "⚔", desc: "连击 14 天", unlocked: streak >= 14, progressPct: percentProgress(streak, 14) },
    { name: "十次练级", icon: "⌁", desc: "总次数 10", unlocked: totalCount >= 10, progressPct: percentProgress(totalCount, 10) },
    { name: "十天打卡", icon: "☷", desc: "总打卡天数 10", unlocked: totalDays >= 10, progressPct: percentProgress(totalDays, 10) },
    { name: "三十杯挑战", icon: "⚡", desc: "总次数 30", unlocked: totalCount >= 30, progressPct: percentProgress(totalCount, 30) },
    { name: "三十天旅者", icon: "☼", desc: "总打卡天数 30", unlocked: totalDays >= 30, progressPct: percentProgress(totalDays, 30) }
  ];
  els.badges.innerHTML = "";
  for (const b of rules) els.badges.appendChild(createBadge(b));
}

function renderBrandsSelect(brands) {
  els.brandSelect.innerHTML = "";
  for (const b of brands) {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    els.brandSelect.appendChild(opt);
  }
  if (brands.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "请先添加品牌";
    els.brandSelect.appendChild(opt);
    els.brandSelect.disabled = true;
  } else {
    els.brandSelect.disabled = false;
  }
}

function renderBrandList(brands) {
  els.brandList.innerHTML = "";
  if (brands.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "暂无品牌";
    els.brandList.appendChild(empty);
    return;
  }

  for (const b of brands) {
    const item = document.createElement("div");
    item.className = "brand-item";

    const imgSrc = getBrandImageSrc(b);
    item.innerHTML = `
      <div class="row">
        ${
          imgSrc
            ? `<img src="${imgSrc}" alt="${escapeHtml(b.name)}" />`
            : `<div class="brand-avatar"><div class="avatar-text">${escapeHtml(getAvatarText(b.name))}</div></div>`
        }
        <div class="name">${escapeHtml(b.name)}</div>
      </div>
      <button class="del" type="button" data-del="${b.id}">删除品牌</button>
    `;

    els.brandList.appendChild(item);
  }
}

function makeWidthClamper(inputEl, baseChar = "中", limitUnits = 20) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = getComputedStyle(inputEl).font;
  ctx.font = font;

  const unitW = ctx.measureText(baseChar).width;
  const maxPx = unitW * limitUnits;

  const segmenter =
    (typeof Intl !== "undefined" && Intl.Segmenter)
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;

  const toGraphemes = (s) => {
    const str = (s ?? "").toString();
    if (!segmenter) return Array.from(str);
    return Array.from(segmenter.segment(str), x => x.segment);
  };

  const widthOf = (s) => ctx.measureText(s).width;

  const clamp = (s) => {
    const gs = toGraphemes((s ?? "").toString().trim());
    let lo = 0, hi = gs.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const cand = gs.slice(0, mid).join("");
      if (widthOf(cand) <= maxPx) lo = mid;
      else hi = mid - 1;
    }
    return gs.slice(0, lo).join("");
  };

  const measureUnitsApprox = (s) => {
    const w = widthOf((s ?? "").toString());
    return unitW > 0 ? (w / unitW) : 0;
  };

  return { clamp, measureUnitsApprox };
}

function createNoteElement(noteText) {
  const note = (noteText ?? "").toString();
  if (!note) return null;

  const foldAt = 8;
  const preview = note.length > foldAt ? note.slice(0, foldAt) + "…" : note;

  const wrap = document.createElement("div");
  wrap.className = "note";

  const text = document.createElement("div");
  text.className = "note-text";
  text.textContent = preview;
  wrap.appendChild(text);

  if (note.length > foldAt) {
    let expanded = false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "展开";
    btn.addEventListener("click", () => {
      expanded = !expanded;
      text.textContent = expanded ? note : preview;
      btn.textContent = expanded ? "收起" : "展开";
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function renderRecords(checkins, brands) {
  const brandMap = getBrandMap(brands);
  const grouped = new Map();

  for (const c of checkins) {
    if (!grouped.has(c.date)) grouped.set(c.date, []);
    grouped.get(c.date).push(c);
  }

  const today = toYMD(new Date());
  const dates = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1));

  const todayCount = (grouped.get(today) || []).length;
  const totalCount = checkins.length;
  const uniqueDateSet = getUniqueDateSet(checkins);
  const totalDays = uniqueDateSet.size;
  const streak = getStreakByDates(uniqueDateSet);

  els.todayValue.textContent = `已打卡 ${todayCount} 次`;
  els.streakValue.textContent = `${streak} 天`;
  els.totalCountValue.textContent = `${totalCount}`;
  renderBadges({ streak, totalCount, totalDays });

  els.records.innerHTML = "";
  if (dates.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "暂无记录，点击“今天打卡”开始吧。";
    els.records.appendChild(empty);
    return;
  }

  for (const date of dates) {
    const list = grouped.get(date).sort((a, b) => b.ts - a.ts);

    const day = document.createElement("div");
    day.className = "record-day";
    day.innerHTML = `
      <div class="record-day-head">
        <div class="record-day-date">${fmtYMD(date)}</div>
        <div class="record-day-count">共 ${list.length} 次</div>
      </div>
    `;

    for (const item of list) {
      const brand = brandMap.get(item.brandId);
      const brandName = item.brandName || brand?.name || "未知品牌";
      const imgSrc = brand ? getBrandImageSrc(brand) : "";

      const row = document.createElement("div");
      row.className = "entry";
      row.innerHTML = `
        <div class="entry-row">
          <div class="entry-left">
            <div class="brand-avatar">
              ${
                imgSrc
                  ? `<img src="${imgSrc}" alt="${escapeHtml(brandName)}" />`
                  : `<div class="avatar-text">${escapeHtml(getAvatarText(brandName))}</div>`
              }
            </div>
            <div>
              <div class="entry-title">${escapeHtml(brandName)}</div>
              <div class="entry-meta">${new Date(item.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
          <div class="price-pill">${Number(item.price).toFixed(2).replace(/\.00$/, "")} 元</div>
        </div>
      `;

      if (item.note && item.note.trim()) {
        const noteEl = createNoteElement(item.note);
        if (noteEl) row.appendChild(noteEl);
      }

      day.appendChild(row);
    }

    els.records.appendChild(day);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Read file failed"));
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });
}

function wireModals() {
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(els.modalCheckin);
      closeModal(els.modalBrand);
    });
  });

  [els.modalCheckin, els.modalBrand].forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModal(m);
    });
  });
}

async function init() {
  wireModals();

  let brands = ensureDefaultBrands();
  let checkins = loadCheckins();

  renderBrandsSelect(brands);
  renderBrandList(brands);
  renderRecords(checkins, brands);

  const noteClamper = makeWidthClamper(els.noteInput, "中", 20);
  const refreshNoteUI = () => {
    const raw = els.noteInput.value || "";
    const clamped = noteClamper.clamp(raw);
    if (raw !== clamped) els.noteInput.value = clamped;

    const unitsInt = Math.min(20, Math.floor(noteClamper.measureUnitsApprox(clamped)));
    els.noteCounter.textContent = String(unitsInt);
  };

  els.noteInput.addEventListener("input", refreshNoteUI);
  refreshNoteUI();

  els.btnCheckin.addEventListener("click", () => {
    brands = loadBrands();
    if (brands.length === 0) {
      alert("请先添加品牌");
      openModal(els.modalBrand);
      return;
    }
    els.priceInput.value = "";
    els.noteInput.value = "";
    refreshNoteUI();
    openModal(els.modalCheckin);
  });

  els.btnAddBrand.addEventListener("click", () => openModal(els.modalBrand));

  els.checkinForm.addEventListener("submit", (e) => {
    e.preventDefault();

    brands = loadBrands();
    const brandId = els.brandSelect.value;
    const brand = brands.find((b) => b.id === brandId);
    if (!brand) return;

    const price = Number(els.priceInput.value);
    if (!Number.isFinite(price) || price < 0) {
      alert("价格必须是数字，且 >= 0");
      return;
    }

    const note = noteClamper.clamp(els.noteInput.value || "");

    checkins = loadCheckins();
    checkins.push({
      id: uid(),
      date: toYMD(new Date()),
      brandId,
      brandName: brand.name,
      price,
      note,
      ts: Date.now()
    });
    saveCheckins(checkins);

    closeModal(els.modalCheckin);
    renderRecords(checkins, brands);
  });

  els.brandForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (els.brandNameInput.value || "").trim();
    const file = els.brandLogoInput.files?.[0];
    if (!name || !file) return;

    const maxBytes = 1.2 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("图片太大，建议小于 1.2MB");
      return;
    }

    const logoDataUrl = await readFileAsDataUrl(file);

    brands = loadBrands();
    brands.push({
      id: uid(),
      name,
      logoDataUrl,
      logoPath: "",
      builtin: false,
      ts: Date.now()
    });
    saveBrands(brands);

    els.brandNameInput.value = "";
    els.brandLogoInput.value = "";

    closeModal(els.modalBrand);
    renderBrandsSelect(brands);
    renderBrandList(brands);
    renderRecords(loadCheckins(), brands);
  });

  els.brandList.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const delId = target.getAttribute("data-del");
    if (!delId) return;

    const ok = confirm("确定删除这个品牌吗？");
    if (!ok) return;

    brands = loadBrands().filter((b) => b.id !== delId);
    saveBrands(brands);
    renderBrandsSelect(brands);
    renderBrandList(brands);
    renderRecords(loadCheckins(), brands);
  });
}

init();