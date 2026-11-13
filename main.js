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
    c.email && `<a class="btn primary" href="mailto:${safeUrl(c.email)}">${esc(c.email)}</a>`,
    c.phone && `<a class="btn" href="tel:${safeUrl(c.phone.replace(/\s/g, ""))}">${esc(c.phone)}</a>`,
    c.linkedin && `<a class="btn" href="${safeUrl(c.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>`,
    c.github && `<a class="btn" href="${safeUrl(c.github)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`,
  ].filter(Boolean).join("");

  }

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
