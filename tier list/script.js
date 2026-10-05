const STORAGE_KEY = "tier-list-maker-v1";
const TILE_PX = 256;
const DEFAULT_TIERS = [
    ["S", "#ff7f7f"], ["A", "#ffbf7f"], ["B", "#ffdf7f"], ["C", "#bfff7f"],
    ["D", "#7fff7f"], ["E", "#7fbfff"], ["F", "#bf7fff"],
];
const PALETTE = [
    "#ff7f7f", "#ffbf7f", "#ffdf7f", "#ffff7f", "#bfff7f", "#7fff7f", "#7fffff", "#7fbfff",
    "#7f7fff", "#bf7fff", "#ff7fff", "#ff7fbf", "#cfcfcf", "#9e9e9e", "#f5f5f5", "#ffd27f",
];

const $ = (id) => document.getElementById(id);
const tiersEl = $("tiers");
const poolEl = $("pool");
const titleEl = $("title");
const menuEl = $("menu");
const toastEl = $("toast");

let state = defaultState();

function defaultState() {
    return { title: "", tiers: DEFAULT_TIERS.map(([label, color]) => ({ label, color, items: [] })), pool: [], items: {} };
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Persistence ---------- */

// Turns untrusted data (localStorage or an imported file) into a valid state, or null.
function normalize(data) {
    if (!data || !Array.isArray(data.tiers) || typeof data.items !== "object") return null;
    const items = {};
    for (const [id, it] of Object.entries(data.items)) {
        if (it && it.type === "text" && typeof it.text === "string") items[id] = { type: "text", text: it.text };
        else if (it && it.type === "image" && /^data:image\//.test(it.src)) items[id] = { type: "image", src: it.src };
    }
    const used = new Set();
    const take = (ids) => (Array.isArray(ids) ? ids : []).filter((id) => items[id] && !used.has(id) && used.add(id));
    const tiers = data.tiers.map((t) => ({
        label: String(t?.label ?? "").slice(0, 24),
        color: /^#[0-9a-f]{6}$/i.test(t?.color) ? t.color : "#cfcfcf",
        items: take(t?.items),
    }));
    const pool = take(data.pool).concat(Object.keys(items).filter((id) => !used.has(id)));
    return { title: String(data.title ?? "").slice(0, 80), tiers, pool, items };
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        toast("Could not autosave: browser storage is full or blocked.");
    }
}

function load() {
    try {
        const saved = normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
        if (saved) state = saved;
    } catch {}
}

function commit() {
    save();
    render();
}

/* ---------- Rendering ---------- */

function itemEl(id) {
    const item = state.items[id];
    const node = document.createElement("div");
    node.className = `item ${item.type}`;
    node.dataset.id = id;
    if (item.type === "image") node.style.backgroundImage = `url("${item.src}")`;
    else node.textContent = node.title = item.text;
    return node;
}

function render() {
    titleEl.value = state.title;
    tiersEl.replaceChildren(...state.tiers.map((tier, i) => {
        const row = document.createElement("div");
        row.className = "tier";
        const label = document.createElement("button");
        label.type = "button";
        label.className = "tier-label";
        label.textContent = tier.label;
        label.style.background = tier.color;
        label.addEventListener("click", () => openTierDialog(i));
        const zone = document.createElement("div");
        zone.className = "zone";
        zone.dataset.zone = `tier-${i}`;
        zone.append(...tier.items.map(itemEl));
        row.append(label, zone);
        return row;
    }));
    poolEl.replaceChildren(...state.pool.map(itemEl));
}

function toast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (toastEl.hidden = true), 2600);
}

/* ---------- Adding and removing items ---------- */

function addItem(item) {
    const id = uid();
    state.items[id] = item;
    state.pool.push(id);
}

function addText(text) {
    text = text.trim();
    if (!text) return;
    addItem({ type: "text", text });
    commit();
}

// Center-crops an image to a square and downscales it to at most TILE_PX.
function toTile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const size = Math.min(TILE_PX, side);
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            canvas.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
            URL.revokeObjectURL(url);
            const webp = canvas.toDataURL("image/webp", 0.85);
            resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("bad image"));
        };
        img.src = url;
    });
}

async function addImages(files) {
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    for (const file of images) {
        try {
            addItem({ type: "image", src: await toTile(file) });
        } catch {
            toast(`Could not read ${file.name || "image"}.`);
        }
    }
    if (images.length) commit();
}

function removeItem(id) {
    delete state.items[id];
    state.pool = state.pool.filter((x) => x !== id);
    state.tiers.forEach((t) => (t.items = t.items.filter((x) => x !== id)));
    commit();
}

/* ---------- Drag and drop (pointer events: mouse, pen and touch) ---------- */

let press = null; // { node, x, y, timer, ghost?, zone? }

function zoneAt(x, y) {
    return document.elementFromPoint(x, y)?.closest(".zone") ?? null;
}

// Moves the dragged node to where the pointer is inside a wrapping zone.
function placeIn(zone, node, x, y) {
    const before = [...zone.children].find((child) => {
        if (child === node) return false;
        const r = child.getBoundingClientRect();
        return y < r.top || (y < r.bottom && x < r.left + r.width / 2);
    });
    if (before ? node.nextSibling !== before : zone.lastElementChild !== node) zone.insertBefore(node, before ?? null);
}

function startDrag() {
    const { node } = press;
    const r = node.getBoundingClientRect();
    press.ghost = node.cloneNode(true);
    press.ghost.classList.add("ghost");
    Object.assign(press.ghost.style, { width: `${r.width}px`, height: `${r.height}px` });
    document.body.append(press.ghost);
    node.classList.add("placeholder");
    document.body.classList.add("dragging");
}

function onPointerMove(e) {
    if (!press) return;
    if (!press.ghost) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return;
        clearTimeout(press.timer);
        startDrag();
    }
    e.preventDefault();
    Object.assign(press.ghost.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
    const zone = zoneAt(e.clientX, e.clientY);
    if (zone !== press.zone) {
        press.zone?.classList.remove("over");
        zone?.classList.add("over");
        press.zone = zone;
    }
    if (zone && zone.dataset.zone !== "trash") placeIn(zone, press.node, e.clientX, e.clientY);
    if (e.clientY < 50) scrollBy(0, -12);
    else if (e.clientY > innerHeight - 50) scrollBy(0, 12);
}

function onPointerUp() {
    if (!press) return;
    clearTimeout(press.timer);
    const { node, ghost, zone } = press;
    press = null;
    if (!ghost) return;
    ghost.remove();
    zone?.classList.remove("over");
    document.body.classList.remove("dragging");
    const id = node.dataset.id;
    if (zone?.dataset.zone === "trash") return removeItem(id);
    // Read the new order back from the DOM.
    const ids = (el) => [...el.children].map((c) => c.dataset.id);
    state.tiers.forEach((t, i) => (t.items = ids(tiersEl.children[i].querySelector(".zone"))));
    state.pool = ids(poolEl);
    commit();
}

document.addEventListener("pointerdown", (e) => {
    if (!menuEl.contains(e.target)) menuEl.hidden = true;
    const node = e.target.closest(".item");
    if (!node || e.button !== 0 || press) return;
    press = { node, x: e.clientX, y: e.clientY };
    // Long-press on touch opens the item menu.
    if (e.pointerType === "touch") press.timer = setTimeout(() => {
        showMenu(node.dataset.id, press.x, press.y);
        press = null;
    }, 550);
});
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);

/* ---------- Item menu (right-click / long-press) ---------- */

function showMenu(id, x, y) {
    menuEl.dataset.id = id;
    menuEl.hidden = false;
    const { width, height } = menuEl.getBoundingClientRect();
    menuEl.style.left = `${Math.min(x, innerWidth - width - 8)}px`;
    menuEl.style.top = `${Math.min(y, innerHeight - height - 8)}px`;
}

document.addEventListener("contextmenu", (e) => {
    const node = e.target.closest(".item");
    if (!node) return;
    e.preventDefault();
    showMenu(node.dataset.id, e.clientX, e.clientY);
});

menuEl.addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove") removeItem(menuEl.dataset.id);
    menuEl.hidden = true;
});

addEventListener("scroll", () => (menuEl.hidden = true));
addEventListener("keydown", (e) => e.key === "Escape" && (menuEl.hidden = true));

/* ---------- Tier label dialog ---------- */

const dialog = $("tier-dialog");
const tierName = $("tier-name");
const tierColor = $("tier-color");
let editing = -1;

function markSwatch() {
    for (const s of $("swatches").children) s.classList.toggle("selected", s.dataset.color === tierColor.value);
}

$("swatches").append(...PALETTE.map((color) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.color = color;
    b.style.background = color;
    b.setAttribute("aria-label", color);
    b.addEventListener("click", () => {
        tierColor.value = color;
        markSwatch();
    });
    return b;
}));
tierColor.addEventListener("input", markSwatch);

function openTierDialog(i) {
    editing = i;
    tierName.value = state.tiers[i].label;
    tierColor.value = state.tiers[i].color;
    markSwatch();
    dialog.showModal();
    tierName.select();
}

dialog.querySelector("form").addEventListener("submit", (e) => {
    if (e.submitter?.value !== "ok") return;
    Object.assign(state.tiers[editing], { label: tierName.value.trim(), color: tierColor.value });
    commit();
});

/* ---------- Files: export, import, PNG ---------- */

function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fileName = (ext) => `${(state.title.trim() || "tier-list").replace(/[^\w-]+/g, "-").toLowerCase()}.${ext}`;

$("export").addEventListener("click", () => {
    download(new Blob([JSON.stringify(state)], { type: "application/json" }), fileName("json"));
});

$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
        const data = normalize(JSON.parse(await file.text()));
        if (!data) throw new Error("invalid");
        state = data;
        commit();
        toast("Tier list imported.");
    } catch {
        toast("That file is not a valid tier list.");
    }
});

function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else line = next;
    }
    return lines.concat(line);
}

function drawCentered(ctx, text, x, y, w, h, lineHeight) {
    const lines = wrapText(ctx, text, w - 10).slice(0, Math.floor(h / lineHeight));
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lineHeight, w - 6));
}

async function saveImage() {
    const tile = 100, gap = 2, labelW = 120, width = 1000, titleH = state.title.trim() ? 64 : 0;
    const cols = Math.floor((width - labelW - gap) / (tile + gap));
    const rowH = (t) => Math.max(1, Math.ceil(t.items.length / cols)) * (tile + gap) + gap;
    const height = titleH + state.tiers.reduce((sum, t) => sum + rowH(t) + gap, 0);

    const images = {};
    await Promise.all(Object.entries(state.items).filter(([, it]) => it.type === "image").map(([id, it]) =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve((images[id] = img));
            img.onerror = resolve;
            img.src = it.src;
        })
    ));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#121317";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (titleH) {
        ctx.fillStyle = "#e9eaee";
        ctx.font = "700 28px system-ui, sans-serif";
        ctx.fillText(state.title.trim(), width / 2, titleH / 2, width - 40);
    }

    let y = titleH;
    for (const tier of state.tiers) {
        const h = rowH(tier);
        ctx.fillStyle = "#1b1d23";
        ctx.fillRect(0, y, width, h);
        ctx.fillStyle = tier.color;
        ctx.fillRect(0, y, labelW, h);
        ctx.fillStyle = "#111";
        ctx.font = "700 26px system-ui, sans-serif";
        drawCentered(ctx, tier.label, 0, y, labelW, h, 30);
        tier.items.forEach((id, i) => {
            const x = labelW + gap + (i % cols) * (tile + gap);
            const ty = y + gap + Math.floor(i / cols) * (tile + gap);
            const item = state.items[id];
            if (item.type === "image" && images[id]) return ctx.drawImage(images[id], x, ty, tile, tile);
            ctx.fillStyle = "#23262e";
            ctx.fillRect(x, ty, tile, tile);
            ctx.fillStyle = "#e9eaee";
            ctx.font = "600 15px system-ui, sans-serif";
            drawCentered(ctx, item.text ?? "", x, ty, tile, tile, 18);
        });
        y += h + gap;
    }
    canvas.toBlob((blob) => download(blob, fileName("png")), "image/png");
}

$("save-image").addEventListener("click", saveImage);

/* ---------- Controls ---------- */

titleEl.addEventListener("input", () => {
    state.title = titleEl.value;
    save();
});

$("reset").addEventListener("click", () => {
    if (!confirm("Reset the tier list? This removes every item and restores the default tiers.")) return;
    state = defaultState();
    commit();
});

$("add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addText($("add-text").value);
    $("add-text").value = "";
});

$("add-images").addEventListener("click", () => $("image-file").click());
$("image-file").addEventListener("change", (e) => {
    addImages(e.target.files);
    e.target.value = "";
});

// Paste images anywhere; paste text as an item when not typing in a field.
document.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) {
        e.preventDefault();
        return addImages(files);
    }
    if (e.target.closest("input, textarea")) return;
    addText(e.clipboardData?.getData("text") ?? "");
});

// Drag image files from the desktop onto the page.
const overlay = $("drop-overlay");
const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files");
addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    overlay.hidden = false;
});
addEventListener("dragleave", (e) => {
    if (!e.relatedTarget) overlay.hidden = true;
});
addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    overlay.hidden = true;
    addImages(e.dataTransfer.files);
});

load();
render();
