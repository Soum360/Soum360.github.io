(function () {
  "use strict";

  // ═══════════════ Schéma du contenu ═══════════════
  // kind: "object" (champs simples), "list" (éléments répétables), "strings" (paragraphes), "tags" (liste de mots)
  const EXP_FIELDS = [
    { k: "period", label: "Période", req: true, ph: "2023 — Aujourd'hui", half: true },
    { k: "place", label: "Lieu", ph: "Cotonou", half: true },
    { k: "title", label: "Intitulé du poste", req: true },
    { k: "org", label: "Entreprise / organisation", req: true },
    { k: "points", label: "Missions & résultats", type: "lines", help: "Une ligne = un point. Commencez par un verbe d'action et chiffrez si possible." },
    { k: "tags", label: "Technologies / compétences", type: "tags", help: "Séparées par des virgules." },
  ];
  const SECTIONS = [
    { key: "profile", label: "Profil", kind: "object", help: "Les informations principales affichées en haut du site.", fields: [
      { k: "name", label: "Nom complet", req: true },
      { k: "role", label: "Titre / métier", req: true, help: "Ex. : Développeur Full Stack · Chef de projet tech" },
      { k: "intro", label: "Phrase d'accroche", type: "textarea" },
      { k: "location", label: "Localisation", half: true },
      { k: "githubUser", label: "Utilisateur GitHub", half: true, help: "Pour lister automatiquement vos dépôts publics." },
      { k: "available", label: "Afficher le badge « Disponible pour des missions »", type: "bool" },
    ] },
    { key: "stats", label: "Chiffres clés", kind: "list", title: "value", sub: "label", help: "Quelques chiffres affichés sous l'accroche (3 ou 4 conseillés).",
      fields: [{ k: "value", label: "Valeur", req: true, ph: "5+", half: true }, { k: "label", label: "Libellé", req: true, ph: "années d'expérience", half: true }] },
    { key: "about", label: "À propos", kind: "strings", itemLabel: "Paragraphe", help: "Votre présentation, en un ou plusieurs paragraphes." },
    { key: "skills", label: "Compétences techniques", kind: "list", title: "group", sub: "items", help: "Regroupez vos compétences par catégorie.",
      fields: [{ k: "group", label: "Catégorie", req: true, ph: "Front-end" }, { k: "items", label: "Compétences", type: "tags", help: "Séparées par des virgules : React, TypeScript, …" }] },
    { key: "softSkills", label: "Savoir-faire", kind: "list", title: "title", help: "Compétences transverses : gestion de projet, communication, …",
      fields: [{ k: "title", label: "Intitulé", req: true }, { k: "text", label: "Description", type: "textarea" }] },
    { key: "experience", label: "Expériences", kind: "list", title: "title", sub: "org", addTop: true, help: "Du plus récent au plus ancien. Les nouveaux éléments sont ajoutés en haut.", fields: EXP_FIELDS },
    { key: "achievements", label: "Réalisations", kind: "list", title: "title", help: "Vos projets phares. Les technologies servent aussi de filtres sur le site.",
      fields: [
        { k: "title", label: "Nom du projet", req: true },
        { k: "description", label: "Description", type: "textarea", help: "Le problème, votre rôle, le résultat." },
        { k: "tags", label: "Technologies", type: "tags" },
        { k: "demo", label: "Lien vers le site / la démo", type: "url", half: true },
        { k: "repo", label: "Lien vers le code source", type: "url", half: true },
      ] },
    { key: "hiddenRepos", label: "Dépôts masqués", kind: "tags", help: "Dépôts GitHub publics à NE PAS afficher dans la liste automatique (noms séparés par des virgules)." },
    { key: "education", label: "Formation", kind: "list", title: "title", sub: "org", addTop: true, help: "Diplômes et formations, du plus récent au plus ancien.",
      fields: EXP_FIELDS.filter((f) => f.k !== "tags").map((f) => ({ ...f, label: { title: "Diplôme / formation", org: "Établissement", points: "Détails (mention, spécialité…)" }[f.k] || f.label })) },
    { key: "certifications", label: "Certifications", kind: "list", title: "name", sub: "org", addTop: true,
      fields: [{ k: "name", label: "Certification", req: true }, { k: "org", label: "Organisme", half: true }, { k: "year", label: "Année", half: true }, { k: "url", label: "Lien de vérification", type: "url" }] },
    { key: "languages", label: "Langues", kind: "list", title: "name", sub: "level",
      fields: [{ k: "name", label: "Langue", req: true, half: true }, { k: "level", label: "Niveau", ph: "Courant, B2, natif…", half: true }] },
    { key: "contact", label: "Contact", kind: "object", help: "Laissez un champ vide pour ne pas l'afficher.", fields: [
      { k: "email", label: "E-mail public", type: "email" },
      { k: "phone", label: "Téléphone / WhatsApp", type: "tel" },
      { k: "linkedin", label: "Profil LinkedIn", type: "url" },
      { k: "github", label: "Profil GitHub", type: "url" },
    ] },
  ];
  const DRAFT_KEY = "portfolio-draft";
  const SETTINGS_KEY = "portfolio-admin-settings";

  // ═══════════════ Utilitaires ═══════════════
  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
    return el;
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const toast = (msg, isError) => {
    const t = $("#toast"); t.textContent = msg; t.className = "show" + (isError ? " error" : "");
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = isError ? "error" : ""), isError ? 6000 : 3000);
  };
  const b64encode = (str) => { const b = new TextEncoder().encode(str); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  const store = {
    get(k, s) { try { return JSON.parse((s || localStorage).getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v, s) { try { (s || localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k, s) { try { (s || localStorage).removeItem(k); } catch (e) {} },
  };

  // ═══════════════ Paramètres GitHub ═══════════════
  function defaultRepo() {
    const host = location.hostname;
    if (host.endsWith(".github.io")) {
      const owner = host.split(".")[0];
      const first = location.pathname.split("/").filter(Boolean)[0];
      return { owner, repo: first && first !== "admin" ? first : host };
    }
    return { owner: "Soum360", repo: "Soum360.github.io" };
  }
  const settings = Object.assign({ ...defaultRepo(), branch: "main", remember: false }, store.get(SETTINGS_KEY) || {});
  settings.token = store.get("portfolio-admin-token", sessionStorage) || store.get("portfolio-admin-token") || "";
  function saveSettings() {
    const { token, ...rest } = settings;
    store.set(SETTINGS_KEY, rest);
    store.del("portfolio-admin-token"); store.del("portfolio-admin-token", sessionStorage);
    if (token) store.set("portfolio-admin-token", token, settings.remember ? localStorage : sessionStorage);
  }

  async function gh(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}${path}`, {
      ...opts,
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${settings.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (!r.ok) {
      let detail = ""; try { detail = (await r.json()).message || ""; } catch (e) {}
      const msg = { 401: "Jeton invalide ou expiré.", 403: "Accès refusé : le jeton n'a pas le droit d'écrire dans ce dépôt.", 404: "Dépôt ou fichier introuvable (vérifiez le nom du dépôt et l'accès du jeton).", 409: "Conflit : le fichier a changé entre-temps. Réessayez.", 422: "Requête refusée par GitHub." }[r.status] || `Erreur GitHub (${r.status}).`;
      const e = new Error(msg + (detail ? ` — ${detail}` : "")); e.status = r.status; throw e;
    }
    return r.status === 204 ? null : r.json();
  }
  const getFile = async (path) => { try { return await gh(`/contents/${path}?ref=${encodeURIComponent(settings.branch)}`); } catch (e) { if (e.status === 404) return null; throw e; } };
  const putFile = async (path, contentB64, message, sha) =>
    gh(`/contents/${path}`, { method: "PUT", body: JSON.stringify({ message, content: contentB64, branch: settings.branch, sha: sha === undefined ? (await getFile(path))?.sha : sha || undefined }) });

  // ═══════════════ État ═══════════════
  let data = null;       // contenu en cours d'édition
  let published = "";    // JSON de la dernière version publiée (référence)
  let baseSha = null;    // sha de content.json au chargement (détection de conflit)
  let view = (location.hash || "#profile").slice(1);

  const isDirty = () => JSON.stringify(data) !== published;
  let draftTimer;
  function changed() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => store.set(DRAFT_KEY, data), 300);
    updateStatus(); renderNav();
  }
  function updateStatus(text, cls) {
    const s = $("#status");
    if (text) { s.textContent = text; s.className = "status " + (cls || ""); return; }
    s.textContent = isDirty() ? "● Modifications non publiées (brouillon sauvegardé)" : "✓ À jour avec le site en ligne";
    s.className = "status " + (isDirty() ? "dirty" : "ok");
  }
  function normalize(d) {
    d = d && typeof d === "object" ? d : {};
    for (const s of SECTIONS) {
      if (s.kind === "object") d[s.key] = d[s.key] && typeof d[s.key] === "object" ? d[s.key] : {};
      else d[s.key] = Array.isArray(d[s.key]) ? d[s.key] : [];
    }
    return d;
  }

  async function load() {
    updateStatus("Chargement…");
    let remote = null;
    try {
      if (settings.token) {
        const f = await getFile("content.json");
        if (f) { remote = JSON.parse(b64decode(f.content)); baseSha = f.sha; }
      }
    } catch (e) { toast("GitHub : " + e.message + " — chargement de la version du site.", true); }
    if (!remote) {
      try { remote = await (await fetch("../content.json", { cache: "no-store" })).json(); }
      catch (e) { toast("Impossible de charger content.json.", true); remote = {}; }
    }
    remote = normalize(remote);
    published = JSON.stringify(remote);
    const draft = store.get(DRAFT_KEY);
    if (draft && JSON.stringify(normalize(draft)) !== published && confirm("Un brouillon non publié a été trouvé sur cet appareil.\n\nOK = reprendre le brouillon\nAnnuler = repartir de la version en ligne")) {
      data = normalize(draft);
    } else {
      data = clone(remote); store.del(DRAFT_KEY);
    }
    updateStatus(); route();
  }

  // ═══════════════ Champs de formulaire ═══════════════
  function field(obj, f, onInput) {
    const id = "f" + Math.random().toString(36).slice(2, 9);
    const t = f.type || "text";
    let input;
    if (t === "bool") {
      input = h("input", { type: "checkbox", id, checked: !!obj[f.k], onchange: (e) => { obj[f.k] = e.target.checked; onInput(); } });
      return h("label", { class: "field check", for: id }, input, h("span", {}, f.label));
    }
    const fmt = { tags: (v) => (v || []).join(", "), lines: (v) => (v || []).join("\n") }[t] || ((v) => v ?? "");
    const parse = { tags: (v) => v.split(",").map((x) => x.trim()).filter(Boolean), lines: (v) => v.split("\n").map((x) => x.trim()).filter(Boolean) }[t] || ((v) => v);
    const attrs = { id, placeholder: f.ph || (t === "url" ? "https://…" : ""), oninput: (e) => { obj[f.k] = parse(e.target.value); validateEl(e.target, f); onInput(); } };
    input = t === "textarea" || t === "lines"
      ? h("textarea", { ...attrs, rows: t === "lines" ? 4 : 3 })
      : h("input", { ...attrs, type: { url: "url", email: "email", tel: "tel" }[t] || "text" });
    input.value = fmt(obj[f.k]);
    const wrap = h("label", { class: "field", for: id }, h("span", {}, f.label + (f.req ? " *" : "")), input, f.help && h("small", {}, f.help));
    wrap.dataset.half = f.half ? "1" : "";
    return wrap;
  }
  function fieldError(v, f) {
    if (f.req && (Array.isArray(v) ? !v.length : !String(v ?? "").trim())) return "obligatoire";
    if (f.type === "url" && v && !/^https?:\/\/[^\s]+$/i.test(v)) return "doit commencer par https://";
    if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "adresse e-mail invalide";
    return "";
  }
  const validateEl = (el, f) => el.classList.toggle("invalid", !!fieldError(f.type === "tags" || f.type === "lines" ? el.value.trim() : el.value, f));
  function fieldsGrid(obj, fields, onInput) {
    const out = []; let pair = null;
    for (const f of fields) {
      const el = field(obj, f, onInput);
      if (f.half) { if (!pair) { pair = h("div", { class: "row2" }); out.push(pair); } pair.append(el); if (pair.children.length === 2) pair = null; }
      else { pair = null; out.push(el); }
    }
    return out;
  }

  // ═══════════════ Vues ═══════════════
  function renderNav() {
    const nav = $("#sections"); nav.textContent = "";
    for (const s of SECTIONS) {
      const n = s.kind === "object" ? null : (data?.[s.key] || []).length;
      nav.append(h("button", { class: "side" + (view === s.key ? " active" : ""), onclick: () => go(s.key) }, h("span", {}, s.label), n != null && h("span", { class: "count" }, n)));
    }
    document.querySelectorAll("aside [data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  }
  function go(v) { view = v; history.replaceState(null, "", "#" + v); route(); $("#sidebar").classList.remove("open"); $("#editor").focus(); window.scrollTo(0, 0); }
  function route() {
    renderNav();
    const ed = $("#editor"); ed.textContent = "";
    const sec = SECTIONS.find((s) => s.key === view);
    if (sec) ed.append(...sectionView(sec));
    else if (view === "files") ed.append(...filesView());
    else if (view === "backup") ed.append(...backupView());
    else if (view === "settings") ed.append(...settingsView());
    else go("profile");
  }

  function sectionView(s) {
    const head = [h("h1", {}, s.label), s.help && h("p", { class: "help" }, s.help)];
    if (s.kind === "object") return [...head, h("div", { class: "card" }, fieldsGrid(data[s.key], s.fields, changed))];
    if (s.kind === "tags") {
      const holder = { v: data[s.key] };
      return [...head, h("div", { class: "card" }, field(holder, { k: "v", label: s.label, type: "tags" }, () => { data[s.key] = holder.v; changed(); }))];
    }
    const arr = data[s.key];
    const list = h("div", {});
    const titleOf = (it) => (s.kind === "strings" ? (it || "").slice(0, 80) : Array.isArray(it[s.title]) ? it[s.title].join(", ") : it[s.title]) || "";
    const subOf = (it) => (s.kind === "strings" || !s.sub ? "" : Array.isArray(it[s.sub]) ? it[s.sub].join(", ") : it[s.sub] || "");
    const draw = (openIdx) => {
      list.textContent = "";
      arr.forEach((it, i) => {
        const title = h("span", { class: "title" });
        const setTitle = () => { title.textContent = ""; title.append(titleOf(arr[i]) || h("em", {}, "(sans titre)")); const sub = subOf(arr[i]); if (sub) title.append(h("em", {}, " — " + sub)); };
        setTitle();
        const move = (d) => (e) => { e.preventDefault(); [arr[i], arr[i + d]] = [arr[i + d], arr[i]]; changed(); draw(i + d); };
        const tools = h("span", { class: "tools" },
          h("button", { title: "Monter", "aria-label": "Monter", disabled: i === 0, onclick: move(-1) }, "↑"),
          h("button", { title: "Descendre", "aria-label": "Descendre", disabled: i === arr.length - 1, onclick: move(1) }, "↓"),
          h("button", { class: "opt", title: "Dupliquer", onclick: (e) => { e.preventDefault(); arr.splice(i + 1, 0, clone(arr[i])); changed(); draw(i + 1); } }, "Dupliquer"),
          h("button", { class: "danger", title: "Supprimer", onclick: (e) => { e.preventDefault(); if (confirm(`Supprimer « ${titleOf(arr[i]) || "cet élément"} » ?`)) { arr.splice(i, 1); changed(); draw(); toast("Élément supprimé (pas encore publié)."); } } }, "Supprimer"));
        let body;
        if (s.kind === "strings") {
          const holder = { v: it };
          body = field(holder, { k: "v", label: s.itemLabel, type: "textarea" }, () => { arr[i] = holder.v; setTitle(); changed(); });
          $("textarea", body).rows = 5;
        } else body = fieldsGrid(it, s.fields, () => { setTitle(); changed(); });
        const det = h("details", { class: "item", open: i === openIdx }, h("summary", {}, title, tools), h("div", { class: "body" }, body));
        list.append(det);
      });
    };
    draw();
    const add = h("button", { class: "add", onclick: () => {
      const blank = s.kind === "strings" ? "" : Object.fromEntries(s.fields.map((f) => [f.k, f.type === "tags" || f.type === "lines" ? [] : ""]));
      const idx = s.addTop ? 0 : arr.length;
      arr.splice(idx, 0, blank); changed(); draw(idx);
      const first = list.children[idx]?.querySelector("input, textarea"); if (first) { first.focus(); first.scrollIntoView({ block: "center" }); }
    } }, "+ Ajouter " + (s.kind === "strings" ? "un paragraphe" : "un élément"));
    return s.addTop ? [...head, add, list] : [...head, list, add];
  }

  function requireToken() {
    if (settings.token) return true;
    toast("Configurez d'abord la connexion GitHub.", true); go("settings"); return false;
  }

  function filesView() {
    const p = data.profile;
    const photoPrev = h("img", { class: "preview-img", alt: "", hidden: !p.photo, src: p.photo ? "../" + p.photo : null });
    const photoInput = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp", hidden: true, onchange: async (e) => {
      const file = e.target.files[0]; e.target.value = ""; if (!file || !requireToken()) return;
      try {
        updateStatus("Optimisation et envoi de la photo…");
        const bmp = await createImageBitmap(file);
        const side = Math.min(bmp.width, bmp.height), size = Math.min(480, side);
        const c = h("canvas", { width: size, height: size });
        c.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
        const dataUrl = c.toDataURL("image/jpeg", 0.85);
        await putFile("assets/photo.jpg", dataUrl.split(",")[1], "Mise à jour de la photo de profil");
        p.photo = "assets/photo.jpg?v=" + Date.now(); photoPrev.src = dataUrl; photoPrev.hidden = false;
        changed(); toast("Photo envoyée. Cliquez sur « Publier » pour l'afficher sur le site.");
      } catch (err) { toast(err.message, true); updateStatus(); }
    } });
    const cvInput = h("input", { type: "file", accept: "application/pdf", hidden: true, onchange: async (e) => {
      const file = e.target.files[0]; e.target.value = ""; if (!file || !requireToken()) return;
      if (file.size > 5e6) return toast("Le PDF dépasse 5 Mo : compressez-le d'abord.", true);
      try {
        updateStatus("Envoi du CV…");
        const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
        await putFile("assets/cv.pdf", b64, "Mise à jour du CV");
        p.cv = "assets/cv.pdf?v=" + Date.now(); changed(); route();
        toast("CV envoyé. Cliquez sur « Publier » pour activer le bouton de téléchargement.");
      } catch (err) { toast(err.message, true); updateStatus(); }
    } });
    return [
      h("h1", {}, "Photo & CV"),
      h("p", { class: "help" }, "Les fichiers sont envoyés directement dans le dépôt GitHub. La photo est recadrée en carré et optimisée automatiquement (480 px)."),
      h("div", { class: "card" }, h("h2", {}, "Photo de profil"), photoPrev, !p.photo && h("p", { class: "help" }, "Aucune photo : le site affiche vos initiales."),
        h("div", { class: "btnrow" }, photoInput, h("button", { onclick: () => photoInput.click() }, p.photo ? "Remplacer la photo" : "Ajouter une photo"),
          p.photo && h("button", { class: "danger", onclick: () => { p.photo = ""; changed(); route(); } }, "Ne plus afficher la photo"))),
      h("div", { class: "card" }, h("h2", {}, "CV (PDF)"),
        h("p", { class: "help" }, p.cv ? h("a", { href: "../" + p.cv, target: "_blank", rel: "noopener" }, "Voir le CV actuel ↗") : "Aucun CV : le bouton « Télécharger mon CV » est masqué."),
        h("div", { class: "btnrow" }, cvInput, h("button", { onclick: () => cvInput.click() }, p.cv ? "Remplacer le CV" : "Ajouter un CV"),
          p.cv && h("button", { class: "danger", onclick: () => { p.cv = ""; changed(); route(); } }, "Masquer le CV"))),
    ];
  }

  function backupView() {
    const importInput = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: async (e) => {
      const file = e.target.files[0]; e.target.value = ""; if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        if (!obj || typeof obj !== "object" || !obj.profile) throw new Error("Ce fichier ne ressemble pas à une sauvegarde du portfolio.");
        if (!confirm("Remplacer tout le contenu actuel par cette sauvegarde ? (rien n'est publié tant que vous ne cliquez pas sur « Publier »)")) return;
        data = normalize(obj); changed(); toast("Sauvegarde importée.");
      } catch (err) { toast("Import impossible : " + err.message, true); }
    } });
    const hist = `https://github.com/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/commits/${encodeURIComponent(settings.branch)}/content.json`;
    return [
      h("h1", {}, "Sauvegarde & historique"),
      h("div", { class: "card" }, h("h2", {}, "Sauvegarde locale"),
        h("p", { class: "help" }, "Téléchargez une copie de tout votre contenu (fichier JSON), et réimportez-la si besoin."),
        h("div", { class: "btnrow" },
          h("button", { onclick: () => { const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })), download: `portfolio-${new Date().toISOString().slice(0, 10)}.json` }); a.click(); URL.revokeObjectURL(a.href); } }, "Exporter (.json)"),
          importInput, h("button", { onclick: () => importInput.click() }, "Importer une sauvegarde"))),
      h("div", { class: "card" }, h("h2", {}, "Annuler les modifications"),
        h("p", { class: "help" }, "Abandonner le brouillon et revenir exactement à la version actuellement en ligne."),
        h("button", { class: "danger", disabled: !isDirty(), onclick: () => { if (confirm("Abandonner toutes les modifications non publiées ?")) { data = JSON.parse(published); store.del(DRAFT_KEY); changed(); route(); toast("Modifications abandonnées."); } } }, "Revenir à la version en ligne")),
      h("div", { class: "card" }, h("h2", {}, "Historique des publications"),
        h("p", { class: "help" }, "Chaque publication est enregistrée sur GitHub. Vous pouvez consulter et restaurer n'importe quelle version précédente."),
        h("a", { href: hist, target: "_blank", rel: "noopener noreferrer" }, "Voir l'historique sur GitHub ↗")),
    ];
  }

  function settingsView() {
    const s = settings;
    const inp = (k, label, type, help) => {
      const el = h("input", { type: type || "text", autocomplete: "off", spellcheck: "false", oninput: (e) => (s[k] = e.target.value.trim()) });
      el.value = s[k] || "";
      return h("label", { class: "field" }, h("span", {}, label), el, help && h("small", {}, help));
    };
    const tokenUrl = "https://github.com/settings/personal-access-tokens/new";
    return [
      h("h1", {}, "Connexion GitHub"),
      h("p", { class: "help" }, "Pour publier, l'admin a besoin d'un jeton d'accès GitHub limité à votre seul dépôt. Il reste stocké uniquement dans ce navigateur."),
      h("div", { class: "card" }, h("h2", {}, "Créer le jeton (une seule fois)"),
        h("ol", { class: "steps" },
          h("li", {}, "Ouvrez ", h("a", { href: tokenUrl, target: "_blank", rel: "noopener noreferrer" }, "GitHub → Fine-grained token ↗"), "."),
          h("li", {}, "Nom : « Admin portfolio ». Expiration : 90 jours ou 1 an."),
          h("li", {}, "Repository access : ", h("strong", {}, "Only select repositories"), " → ", h("code", {}, s.repo), "."),
          h("li", {}, "Permissions → Repository → ", h("strong", {}, "Contents : Read and write"), ". Rien d'autre."),
          h("li", {}, "Générez, copiez le jeton (commence par ", h("code", {}, "github_pat_"), ") et collez-le ci-dessous."))),
      h("div", { class: "card" },
        h("div", { class: "row2" }, inp("owner", "Propriétaire du dépôt"), inp("repo", "Nom du dépôt")),
        inp("branch", "Branche", "text", "Généralement « main »."),
        inp("token", "Jeton d'accès", "password"),
        h("label", { class: "field check" }, h("input", { type: "checkbox", checked: s.remember, onchange: (e) => (s.remember = e.target.checked) }),
          h("span", {}, "Se souvenir du jeton sur cet appareil (sinon, oublié à la fermeture de l'onglet). À n'activer que sur un appareil personnel.")),
        h("div", { class: "btnrow" },
          h("button", { class: "primary", onclick: async () => {
            saveSettings();
            if (!s.token) return toast("Paramètres enregistrés (sans jeton).");
            try {
              const r = await gh("");
              if (!r.permissions?.push) throw new Error("Le jeton ne permet pas d'écrire dans ce dépôt.");
              toast("Connexion réussie ✓"); await load();
            } catch (e) { toast(e.message, true); }
          } }, "Enregistrer et tester"),
          h("button", { class: "danger", onclick: () => { s.token = ""; saveSettings(); route(); toast("Jeton supprimé de cet appareil."); } }, "Déconnecter cet appareil"))),
    ];
  }

  // ═══════════════ Publication ═══════════════
  function validateAll() {
    const errs = [];
    for (const s of SECTIONS) {
      if (s.kind === "object") s.fields.forEach((f) => { const e = fieldError(data[s.key][f.k], f); if (e) errs.push({ s, msg: `${s.label} › ${f.label} : ${e}` }); });
      if (s.kind === "list") data[s.key].forEach((it, i) => s.fields.forEach((f) => { const e = fieldError(it[f.k], f); if (e) errs.push({ s, msg: `${s.label} › n°${i + 1} › ${f.label} : ${e}` }); }));
    }
    return errs;
  }
  async function publish() {
    const errs = validateAll();
    if (errs.length) {
      go(errs[0].s.key);
      $("#editor").prepend(h("div", { class: "errors", role: "alert" }, h("strong", {}, "Corrigez ces points avant de publier :"), h("ul", {}, errs.slice(0, 12).map((e) => h("li", {}, e.msg)))));
      return;
    }
    if (!isDirty()) return toast("Rien à publier : le site est déjà à jour.");
    if (!requireToken()) return;
    const btn = $("#publishBtn"); btn.disabled = true; updateStatus("Publication…");
    try {
      const cur = await getFile("content.json");
      if (baseSha && cur && cur.sha !== baseSha && !confirm("Le contenu en ligne a été modifié ailleurs depuis l'ouverture de l'admin. Publier quand même et remplacer cette version ?")) throw new Error("Publication annulée.");
      const res = await putFile("content.json", b64encode(JSON.stringify(data, null, 2) + "\n"), `Mise à jour du portfolio (${new Date().toLocaleString("fr-FR")})`, cur ? cur.sha : null);
      baseSha = res.content.sha; published = JSON.stringify(data); store.del(DRAFT_KEY);
      updateStatus("✓ Publié — en ligne d'ici 1 à 2 minutes", "ok"); renderNav();
      toast("Publié ! Le site sera à jour d'ici 1 à 2 minutes.");
    } catch (e) { toast(e.message, true); updateStatus(); }
    finally { btn.disabled = false; }
  }

  // ═══════════════ Démarrage ═══════════════
  $("#publishBtn").addEventListener("click", publish);
  $("#previewBtn").addEventListener("click", () => { store.set(DRAFT_KEY, data); window.open("../?preview=1", "_blank", "noopener"); });
  $("#navToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  document.querySelectorAll("aside [data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  window.addEventListener("beforeunload", (e) => { if (data && isDirty()) { store.set(DRAFT_KEY, data); e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); publish(); } });
  load();
})();
