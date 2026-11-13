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
  const settings = Object.assign({ ...defaultRepo(), branch: "main" }, store.get(SETTINGS_KEY) || {});
  delete settings.remember;
  settings.token = ""; // uniquement en mémoire, jamais stocké en clair
  // Nettoyage des anciennes versions qui stockaient le jeton en clair
  store.del("portfolio-admin-token"); store.del("portfolio-admin-token", sessionStorage);
  function saveSettings() { const { token, ...rest } = settings; store.set(SETTINGS_KEY, rest); }

  // ═══════════════ Coffre chiffré (jeton protégé par mot de passe) ═══════════════
  const VAULT_KEY = "portfolio-admin-vault";
  const FAIL_KEY = "portfolio-admin-fails";
  const ITER = 600000;
  const u8toB64 = (u8) => { let s = ""; u8.forEach((c) => (s += String.fromCharCode(c))); return btoa(s); };
  const b64toU8 = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  async function deriveKey(pw, salt, iter) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function sealVault(token, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(pw, salt, ITER), new TextEncoder().encode(token));
    store.set(VAULT_KEY, { v: 1, iter: ITER, salt: u8toB64(salt), iv: u8toB64(iv), ct: u8toB64(new Uint8Array(ct)) });
  }
  async function openVault(pw) {
    const v = store.get(VAULT_KEY);
    const key = await deriveKey(pw, b64toU8(v.salt), v.iter);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64toU8(v.iv) }, key, b64toU8(v.ct)); // échoue si mauvais mot de passe
    return new TextDecoder().decode(pt);
  }
  const pwError = (pw, pw2) => (pw.length < 10 ? "Le mot de passe doit faire au moins 10 caractères." : pw !== pw2 ? "Les deux mots de passe ne correspondent pas." : "");
  async function checkToken(token) {
    const prev = settings.token; settings.token = token;
    try { const r = await gh(""); if (!r.permissions?.push) throw new Error("Ce jeton ne permet pas d'écrire dans le dépôt " + settings.repo + "."); }
    catch (e) { settings.token = prev; throw e; }
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
    lock(); return false;
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

  const pwInput = (label, help) => {
    const el = h("input", { type: "password", autocomplete: "new-password", spellcheck: "false" });
    return { el, wrap: h("label", { class: "field" }, h("span", {}, label), el, help && h("small", {}, help)) };
  };
  const tokenSteps = () => h("ol", { class: "steps" },
    h("li", {}, "Ouvrez ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener noreferrer" }, "GitHub → Fine-grained token ↗"), " (connexion GitHub + 2FA demandées)."),
    h("li", {}, "Nom : « Admin portfolio ». Expiration : 90 jours conseillé."),
    h("li", {}, "Repository access : ", h("strong", {}, "Only select repositories"), " → ", h("code", {}, settings.repo), "."),
    h("li", {}, "Permissions → Repository → ", h("strong", {}, "Contents : Read and write"), ". Rien d'autre."),
    h("li", {}, "Générez et copiez le jeton (commence par ", h("code", {}, "github_pat_"), ")."));

  function settingsView() {
    const s = settings;
    const repoInp = (k, label) => { const el = h("input", { type: "text", autocomplete: "off", spellcheck: "false", oninput: (e) => (s[k] = e.target.value.trim()) }); el.value = s[k] || ""; return h("label", { class: "field" }, h("span", {}, label), el); };
    const np = pwInput("Nouveau mot de passe", "10 caractères minimum."), np2 = pwInput("Confirmer le nouveau mot de passe");
    const nt = pwInput("Nouveau jeton GitHub"), ntp = pwInput("Mot de passe de l'admin (pour chiffrer le nouveau jeton)");
    return [
      h("h1", {}, "Sécurité & connexion"),
      h("p", { class: "help" }, "Votre jeton GitHub est stocké chiffré sur cet appareil (AES-256). Il n'est déchiffré qu'en mémoire, après saisie de votre mot de passe, et l'admin se verrouille après 15 minutes d'inactivité."),
      h("div", { class: "card" }, h("h2", {}, "Changer le mot de passe"), np.wrap, np2.wrap,
        h("button", { class: "primary", onclick: async () => {
          const err = pwError(np.el.value, np2.el.value); if (err) return toast(err, true);
          await sealVault(s.token, np.el.value); np.el.value = np2.el.value = ""; toast("Mot de passe modifié ✓");
        } }, "Changer le mot de passe")),
      h("div", { class: "card" }, h("h2", {}, "Remplacer le jeton GitHub"), h("p", { class: "help" }, "À faire quand le jeton expire ou si vous pensez qu'il a fuité (révoquez alors l'ancien sur GitHub)."), tokenSteps(), nt.wrap, ntp.wrap,
        h("button", { class: "primary", onclick: async () => {
          const t = nt.el.value.trim(); if (!t) return toast("Collez le nouveau jeton.", true);
          try { await openVault(ntp.el.value); } catch (e) { return toast("Mot de passe incorrect.", true); }
          try { await checkToken(t); await sealVault(t, ntp.el.value); nt.el.value = ntp.el.value = ""; toast("Jeton remplacé ✓"); } catch (e) { toast(e.message, true); }
        } }, "Vérifier et enregistrer")),
      h("div", { class: "card" }, h("h2", {}, "Dépôt GitHub"),
        h("div", { class: "row2" }, repoInp("owner", "Propriétaire"), repoInp("repo", "Dépôt")), repoInp("branch", "Branche"),
        h("button", { onclick: async () => { saveSettings(); try { await checkToken(s.token); toast("Dépôt enregistré ✓"); await load(); } catch (e) { toast(e.message, true); } } }, "Enregistrer et tester")),
      h("div", { class: "card" }, h("h2", {}, "Déconnecter cet appareil"),
        h("p", { class: "help" }, "Supprime le jeton chiffré de ce navigateur. Il faudra un jeton GitHub pour se reconnecter. Pour bloquer l'accès partout, révoquez le jeton sur ",
          h("a", { href: "https://github.com/settings/personal-access-tokens", target: "_blank", rel: "noopener noreferrer" }, "GitHub ↗"), "."),
        h("button", { class: "danger", onclick: () => { if (confirm("Supprimer l'accès admin de cet appareil ?")) { store.del(VAULT_KEY); store.del(FAIL_KEY); lock(); } } }, "Déconnecter cet appareil")),
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

  // ═══════════════ Écran de connexion ═══════════════
  function showApp(on) {
    $("#gate").hidden = on; $(".topbar").hidden = !on; $(".layout").hidden = !on;
  }
  function lock() {
    if (data && isDirty()) store.set(DRAFT_KEY, data);
    settings.token = ""; data = null; $("#editor").textContent = ""; showApp(false); gate();
  }
  let idleTimer;
  const resetIdle = () => { clearTimeout(idleTimer); if (settings.token) idleTimer = setTimeout(() => { lock(); toast("Verrouillé après 15 min d'inactivité."); }, 15 * 60e3); };
  ["click", "keydown", "input", "scroll"].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));

  function gate() {
    const g = $("#gate"); g.textContent = ""; showApp(false);
    if (!window.crypto?.subtle) { g.append(h("div", { class: "gate-box" }, h("h1", {}, "Connexion sécurisée requise"), h("p", { class: "help" }, "Ouvrez l'admin en HTTPS."))); return; }
    const hasVault = !!store.get(VAULT_KEY);
    const msg = h("p", { class: "gate-err", role: "alert" });
    const btn = h("button", { class: "primary", type: "submit" }, hasVault ? "Déverrouiller" : "Activer l'admin");
    const busy = (b, label) => { btn.disabled = b; btn.textContent = b ? label : hasVault ? "Déverrouiller" : "Activer l'admin"; };
    const enter = async (token) => { settings.token = token; store.del(FAIL_KEY); showApp(true); resetIdle(); await load(); };

    if (hasVault) {
      const pw = pwInput("Mot de passe");
      pw.el.autocomplete = "current-password";
      const form = h("form", { class: "gate-box", onsubmit: async (e) => {
        e.preventDefault(); msg.textContent = "";
        const f = store.get(FAIL_KEY) || { n: 0, until: 0 };
        if (Date.now() < f.until) return (msg.textContent = `Trop d'essais. Réessayez dans ${Math.ceil((f.until - Date.now()) / 1000)} s.`);
        busy(true, "Vérification…");
        try { const t = await openVault(pw.el.value); pw.el.value = ""; await enter(t); }
        catch (err) {
          f.n++; if (f.n >= 3) f.until = Date.now() + Math.min(3600, 15 * 2 ** (f.n - 3)) * 1000;
          store.set(FAIL_KEY, f); msg.textContent = "Mot de passe incorrect." + (f.n >= 3 ? " Attente imposée avant le prochain essai." : ""); busy(false); pw.el.select();
        }
      } },
        h("div", { class: "gate-logo" }, "SS"), h("h1", {}, "Admin du portfolio"), h("p", { class: "help" }, "Entrez votre mot de passe pour déverrouiller."),
        pw.wrap, msg, btn,
        h("button", { type: "button", class: "linkish", onclick: () => { if (confirm("Mot de passe oublié : l'accès de cet appareil sera supprimé et il faudra un nouveau jeton GitHub (créé depuis votre compte GitHub). Continuer ?")) { store.del(VAULT_KEY); store.del(FAIL_KEY); gate(); } } }, "Mot de passe oublié ?"));
      g.append(form); pw.el.focus();
    } else {
      const tk = pwInput("Jeton GitHub"), p1 = pwInput("Choisissez un mot de passe admin", "10 caractères minimum. Il chiffre le jeton sur cet appareil."), p2 = pwInput("Confirmez le mot de passe");
      tk.el.autocomplete = "off";
      const form = h("form", { class: "gate-box wide", onsubmit: async (e) => {
        e.preventDefault(); msg.textContent = "";
        const err = pwError(p1.el.value, p2.el.value); if (err) return (msg.textContent = err);
        const t = tk.el.value.trim(); if (!t) return (msg.textContent = "Collez votre jeton GitHub.");
        busy(true, "Vérification auprès de GitHub…");
        try { await checkToken(t); await sealVault(t, p1.el.value); tk.el.value = p1.el.value = p2.el.value = ""; await enter(t); toast("Admin activé sur cet appareil ✓"); }
        catch (err2) { msg.textContent = err2.message; busy(false); }
      } },
        h("div", { class: "gate-logo" }, "SS"), h("h1", {}, "Activer l'admin sur cet appareil"),
        h("p", { class: "help" }, "Seul le propriétaire du compte GitHub peut créer le jeton demandé. Il sera chiffré par votre mot de passe et ne quittera jamais ce navigateur (sauf vers GitHub)."),
        tokenSteps(), tk.wrap, p1.wrap, p2.wrap, msg, btn);
      g.append(form); tk.el.focus();
    }
  }

  // ═══════════════ Démarrage ═══════════════
  $("#lockBtn").addEventListener("click", lock);
  $("#publishBtn").addEventListener("click", publish);
  $("#previewBtn").addEventListener("click", () => { store.set(DRAFT_KEY, data); window.open("../?preview=1", "_blank", "noopener"); });
  $("#navToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  document.querySelectorAll("aside [data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  window.addEventListener("beforeunload", (e) => { if (data && settings.token && isDirty()) { store.set(DRAFT_KEY, data); e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s" && settings.token) { e.preventDefault(); publish(); } });
  gate();
})();
