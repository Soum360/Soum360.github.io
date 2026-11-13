(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  // Tout le contenu est échappé avant insertion (protection XSS).
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // N'accepte que des liens http(s), mailto, tel ou relatifs.
  const safeUrl = (u) => (/^(https?:|mailto:|tel:|[\w./-]+(\?[\w=&.-]*)?$)/i.test(u || "") ? esc(u) : "#");
  const ext = (u, label) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  const chips = (arr) => (arr && arr.length ? `<div class="chips">${arr.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : "");
  const hideSection = (id) => { const s = $(id); if (s) s.hidden = true; const a = document.querySelector(`nav a[href="#${id}"]`); if (a) a.hidden = true; };

  function render(D) {
  const P = Object.assign({}, D.profile, D, { contact: D.contact || {} });
  // ── Hero ──
  $("name").textContent = P.name;
  $("footName").textContent = P.name;
  $("role").textContent = P.role;
  $("intro").textContent = P.intro;
  $("location").textContent = P.location;
  $("available").hidden = !P.available;
  $("year").textContent = new Date().getFullYear();
  if (P.photo) {
    $("avatar").innerHTML = `<img src="${safeUrl(P.photo)}" alt="" width="240" height="240" decoding="async" />`;
  } else {
    $("avatar").firstElementChild.textContent = (P.name || "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }
  if (P.cv) $("heroCta").insertAdjacentHTML("beforeend", `<a href="${safeUrl(P.cv)}" class="btn" download>Télécharger mon CV</a>`);
  $("stats").innerHTML = (P.stats || []).map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join("");

  // ── À propos ──
  $("aboutText").innerHTML = (P.about || []).map((p) => `<p>${esc(p)}</p>`).join("");

  // ── Compétences ──
  $("skillsGrid").innerHTML = (P.skills || []).map((s) => `<div class="tile"><h4>${esc(s.group)}</h4>${chips(s.items)}</div>`).join("");
  $("softGrid").innerHTML = (P.softSkills || []).map((s) => `<div class="tile"><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></div>`).join("");

  // ── Timelines (expérience, formation) ──
  const timeline = (items) =>
    items.map((e) => `
      <li>
        <span class="period">${esc(e.period)}</span>
        <div class="tl-body">
          <h3>${esc(e.title)}</h3>
          <p class="org">${esc(e.org)}${e.place ? ` · ${esc(e.place)}` : ""}</p>
          ${e.points && e.points.length ? `<ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          ${chips(e.tags)}
        </div>
      </li>`).join("");
  if (P.experience && P.experience.length) $("expList").innerHTML = timeline(P.experience);
  else hideSection("experience");
  $("eduList").innerHTML = timeline(P.education || []);

  if (P.certifications && P.certifications.length) {
    $("certBlock").hidden = false;
    $("certList").innerHTML = P.certifications.map((c) => `<li><strong>${c.url ? ext(c.url, esc(c.name)) : esc(c.name)}</strong> — ${esc(c.org)}${c.year ? ` (${esc(c.year)})` : ""}</li>`).join("");
  }
  $("langList").innerHTML = (P.languages || []).map((l) => `<li><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></li>`).join("");

  // ── Réalisations + filtres par technologie ──
  const A = P.achievements || [];
  const renderCards = (filter) => {
    $("featured").innerHTML = A.filter((p) => !filter || (p.tags || []).includes(filter))
      .map((p) => `
        <article class="card">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.description)}</p>
          ${chips(p.tags)}
          ${p.demo || p.repo ? `<div class="links">${p.demo ? ext(p.demo, "Voir le site ↗") : ""}${p.repo ? ext(p.repo, "Code source ↗") : ""}</div>` : ""}
        </article>`).join("");
    stagger($("featured").children, 60);
  };
  const allTags = [...new Set(A.flatMap((p) => p.tags || []))];
  $("filters").innerHTML = [`<button class="filter active" data-tag="">Tout</button>`]
    .concat(allTags.map((t) => `<button class="filter" data-tag="${esc(t)}">${esc(t)}</button>`)).join("");
  $("filters").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("filters").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    renderCards(b.dataset.tag);
  });
  renderCards("");

  // ── Autres repos GitHub (asynchrone, mis en cache 1 h, ne bloque jamais l'affichage) ──
  const shown = new Set(A.filter((p) => p.repo).map((p) => (p.repo || "").toLowerCase()));
  const hidden = new Set((P.hiddenRepos || []).map((r) => r.toLowerCase()));
  const profile = `https://github.com/${encodeURIComponent(P.githubUser)}`;
  const showRepos = (repos) => {
    const list = repos.filter((r) => !r.fork && !hidden.has(r.name.toLowerCase()) && !shown.has(r.html_url.toLowerCase()) && !r.name.endsWith(".github.io"));
    $("repos").innerHTML = list.length
      ? list.map((r) => `<a class="repo" href="${safeUrl(r.html_url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(r.name)}</strong><span>${esc(r.description || r.language || "Dépôt GitHub")}</span></a>`).join("")
      : `<p class="muted">Tous mes projets publics sont présentés ci-dessus. ${ext(profile, "Voir mon profil GitHub ↗")}</p>`;
    stagger($("repos").children, 50);
  };
  const KEY = "gh-repos-v1";
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
  if (cached && Date.now() - cached.t < 3600e3) showRepos(cached.d);
  else
    fetch(`https://api.github.com/users/${encodeURIComponent(P.githubUser)}/repos?per_page=100&sort=updated`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const slim = d.map(({ name, html_url, description, language, fork }) => ({ name, html_url, description, language, fork }));
        try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: slim })); } catch (e) {}
        showRepos(slim);
      })
      .catch(() => { $("repos").innerHTML = `<p class="muted">${ext(profile, "Voir tous mes dépôts sur GitHub ↗")}</p>`; });

  // ── Contact ──
  const c = P.contact;
  document.title = `${P.name} — ${(P.role || "").split("·")[0].trim()}`;
  $("contactLinks").innerHTML = [
    c.email && `<a class="btn primary" href="mailto:${safeUrl(c.email)}">Écrire un e-mail <span class="arrow" aria-hidden="true">→</span></a>`,
    c.email && `<button class="btn" type="button" data-copy="${esc(c.email)}">Copier l'adresse</button>`,
    c.phone && `<a class="btn" href="tel:${safeUrl(c.phone.replace(/\s/g, ""))}">${esc(c.phone)}</a>`,
    c.linkedin && `<a class="btn" href="${safeUrl(c.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>`,
    c.github && `<a class="btn" href="${safeUrl(c.github)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`,
  ].filter(Boolean).join("");

  enhance();
  }

  // ═══════════ Interactions ═══════════
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stagger = (els, step) => [...els].forEach((el, i) => el.style.setProperty("--d", Math.min(i * step, 480) + "ms"));
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function enhance() {
    // Apparition progressive au défilement
    const groups = [".section h2", ".prose p", "#skillsGrid .tile", "#softGrid .tile", ".timeline > li", ".langs li", ".contact-box", ".sub"];
    const targets = [];
    groups.forEach((sel) => { const els = document.querySelectorAll(sel); stagger(els, 70); els.forEach((el) => { el.classList.add("reveal"); targets.push(el); }); });
    if (reduced || !("IntersectionObserver" in window)) targets.forEach((el) => el.classList.add("in"));
    else {
      const ro = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { const el = en.target; el.classList.add("in"); ro.unobserve(el); setTimeout(() => el.classList.remove("reveal", "in"), 1400); } }), { rootMargin: "0px 0px -8% 0px" });
      targets.forEach((el) => ro.observe(el));
    }

    // Compteurs animés (« 15+ » compte de 0 à 15)
    document.querySelectorAll(".stats dd").forEach((dd) => {
      const m = dd.textContent.match(/^(\d+)(.*)$/); if (!m || reduced) return;
      const end = +m[1], rest = m[2]; dd.textContent = "0" + rest;
      const so = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return; so.disconnect();
        const t0 = performance.now(), dur = 1100;
        const tick = (now) => { const p = Math.min(1, (now - t0) / dur); dd.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + rest; if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      so.observe(dd);
    });
  }

  // Copier l'e-mail
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]"); if (!b) return;
    navigator.clipboard?.writeText(b.dataset.copy).then(() => toast("Adresse copiée ✓"), () => toast(b.dataset.copy));
  });

  // Halo qui suit la souris sur les cartes
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest?.(".card, .tile, .repo"); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px"); el.style.setProperty("--my", e.clientY - r.top + "px");
  }, { passive: true });

  // Barre de progression, ombre de l'en-tête, bouton retour en haut
  const bar = $("progress"), nav = $("nav"), top = $("toTop");
  let ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle("scrolled", y > 8);
    top.classList.toggle("show", y > 700);
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  top.addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
  onScroll();

  // ── Chargement du contenu (ou du brouillon en mode aperçu depuis l'admin) ──
  const preview = new URLSearchParams(location.search).has("preview");
  let draft = null;
  if (preview) { try { draft = JSON.parse(localStorage.getItem("portfolio-draft") || "null"); } catch (e) {} }
  if (draft) {
    document.body.insertAdjacentHTML("afterbegin", '<div class="preview-bar">Aperçu du brouillon — non publié</div>');
    render(draft);
  } else {
    fetch("content.json", { cache: "no-cache" })
      .then((r) => r.json())
      .then(render)
      .catch(() => { $("intro").textContent = "Le contenu n'a pas pu être chargé. Rechargez la page."; });
  }

  // ── Thème clair / sombre ──
  $("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  // ── Menu mobile ──
  const menu = $("menu"), mt = $("menuToggle");
  mt.addEventListener("click", () => { const o = menu.classList.toggle("open"); mt.setAttribute("aria-expanded", o); });
  menu.addEventListener("click", (e) => { if (e.target.tagName === "A") { menu.classList.remove("open"); mt.setAttribute("aria-expanded", "false"); } });

  // ── Lien actif dans le menu selon la section visible ──
  const links = [...menu.querySelectorAll("a")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle("current", a.getAttribute("href") === "#" + en.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => io.observe(s));
})();
