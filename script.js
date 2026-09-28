// Each project folder in this directory that contains an index.html.
// icon: one of the keys in ICONS below. accent: the card's highlight color.
const PROJECTS = [
    { folder: "cellular automata", name: "Automaton", tag: "Simulation", description: "Configurable cellular life. Tweak the rules and watch patterns emerge.", icon: "cells", accent: "#4f9a8a" },
    { folder: "chem lab", name: "Chemical Graph Constructor", tag: "Tool", description: "Build molecules atom by atom and explore their structure.", icon: "molecule", accent: "#8a6fb8" },
    { folder: "Evolution Sim", name: "Evolution Sim", tag: "Simulation", description: "Procedural world maps with biomes from altitude, temperature and humidity.", icon: "globe", accent: "#6f9a4f" },
    { folder: "mule run", name: "Mule Run", tag: "Game", description: "One stubborn mule. One endless canyon. Zero shortcuts.", icon: "run", accent: "#c4782a" },
    { folder: "pony roguelike", name: "Nightfall Charge", tag: "Game", description: "A bat pony's stand against the night. A roguelike.", icon: "moon", accent: "#a0679e" },
];

const ICONS = {
    cells: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="16" y="10" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="10" y="16" width="5" height="5" rx="1"/><rect x="16" y="16" width="5" height="5" rx="1"/>',
    molecule: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="m10 10.5-3.4-3M14 10.5l3.4-3M12 14.5V18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    run: '<path d="M3 17h4l3-4 3 3 4-6 4 3"/><path d="M3 21h18"/><circle cx="17" cy="5" r="2"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3v3M15.5 4.5h3"/>',
};

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const grid = document.getElementById("project-grid");
const search = document.getElementById("search");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const themeToggle = document.getElementById("theme-toggle");

let visible = [];

function projectUrl(project) {
    return `${encodeURIComponent(project.folder)}/index.html`;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function buildCard(project, i) {
    const card = el("button", "card");
    card.type = "button";
    card.style.setProperty("--accent", project.accent);
    card.style.animationDelay = `${i * 60}ms`;

    const top = el("div", "card-top");
    const icon = el("span", "card-icon");
    icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[project.icon]}</svg>`;
    top.append(icon, el("span", "card-index", String(i + 1).padStart(2, "0")));

    const body = el("div", "card-body");
    body.append(
        el("p", "card-tag", project.tag),
        el("h2", "card-title", project.name),
        el("p", "card-desc", project.description)
    );

    const foot = el("div", "card-foot");
    const open = el("span", "card-open", "Open");
    open.insertAdjacentHTML("beforeend", ARROW);
    foot.append(el("span", "card-path", `${project.folder}/index.html`), open);

    card.append(top, body, foot);
    card.addEventListener("click", () => {
        window.location.href = projectUrl(project);
    });
    return card;
}

function render(filter = "") {
    const query = filter.trim().toLowerCase();
    visible = PROJECTS.filter((p) =>
        [p.folder, p.name, p.tag, p.description].some((text) => text.toLowerCase().includes(query))
    );

    grid.replaceChildren(...visible.map(buildCard));
    count.textContent = visible.length;
    empty.hidden = visible.length > 0;
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    try {
        localStorage.setItem("project-index-theme", theme);
    } catch {}
}

try {
    const saved = localStorage.getItem("project-index-theme");
    if (saved) document.body.dataset.theme = saved;
} catch {}

themeToggle.addEventListener("click", () => {
    setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

search.addEventListener("input", () => render(search.value));

search.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && visible.length > 0) {
        window.location.href = projectUrl(visible[0]);
    } else if (e.key === "Escape") {
        search.value = "";
        render();
        search.blur();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== search) {
        e.preventDefault();
        search.focus();
    }
});

render();
