(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // SeasonCrew/club-kits.js?v=20260817-loginfix1
  var club_kits_exports = {};
  __export(club_kits_exports, {
    ALIASES: () => ALIASES,
    CLUB_KITS: () => CLUB_KITS,
    DEFAULT_KIT: () => DEFAULT_KIT,
    canonicalName: () => canonicalName,
    element: () => element,
    getKit: () => getKit,
    html: () => html,
    hydrate: () => hydrate
  });
  function canonicalName(name = "") {
    const clean = String(name).replace(/\s+/g, " ").trim();
    if (CLUB_KITS[clean]) return clean;
    if (ALIASES[clean]) return ALIASES[clean];
    const lower = clean.toLowerCase();
    const exact = Object.keys(CLUB_KITS).find((k) => k.toLowerCase() === lower);
    if (exact) return exact;
    const alias = Object.keys(ALIASES).find((k) => k.toLowerCase() === lower);
    return alias ? ALIASES[alias] : clean;
  }
  function getKit(name) {
    return CLUB_KITS[canonicalName(name)] || DEFAULT_KIT;
  }
  function isLight(hex = "") {
    const c = hex.replace("#", "");
    if (c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1e3 > 210;
  }
  function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function html(name, extraClass = "") {
    const canonical = canonicalName(name), kit = getKit(canonical), light = isLight(kit.primary) ? " kit-light" : "";
    return `<span class="clubJersey${light}${extraClass ? " " + escapeHtml(extraClass) : ""}" data-kit-ready="1" data-club="${escapeHtml(canonical)}" title="${escapeHtml(canonical)}" aria-label="${escapeHtml(canonical)}" role="img" style="--kit-primary:${kit.primary};--kit-secondary:${kit.secondary}"></span>`;
  }
  function element(name, extraClass = "") {
    const wrap = document.createElement("span");
    wrap.innerHTML = html(name, extraClass);
    return wrap.firstElementChild;
  }
  function clubFromLogoUrl(src = "") {
    try {
      const u = new URL(src, location.href);
      if (u.hostname.includes("google.com") && u.pathname.includes("/s2/favicons")) {
        const domain = u.searchParams.get("domain") || "";
        return DOMAIN_TO_CLUB[domain.replace(/^www\./, "")] || "";
      }
    } catch {
    }
    return "";
  }
  function inferClub(el) {
    const explicit = el.getAttribute?.("data-club") || el.getAttribute?.("data-club-jersey");
    if (explicit) return canonicalName(explicit);
    if (el.tagName === "IMG") {
      const byUrl = clubFromLogoUrl(el.getAttribute("src") || "");
      if (byUrl) return byUrl;
    }
    const next = el.nextElementSibling?.textContent?.trim();
    if (next && next !== "\u2013") return canonicalName(next);
    const prev = el.previousElementSibling?.textContent?.trim();
    if (prev && prev !== "\u2013") return canonicalName(prev);
    const club = el.closest?.(".club");
    const nearby = club?.querySelector?.("span:not(.clubJersey)")?.textContent?.trim();
    if (nearby) return canonicalName(nearby);
    return "";
  }
  function replaceNode(el, name) {
    if (!name || el.dataset?.kitReady === "1") return;
    const jersey = element(name);
    el.classList?.forEach((c) => {
      if (c !== "clubJersey") jersey.classList.add(c);
    });
    el.replaceWith(jersey);
  }
  function hydrate(root = document) {
    root.querySelectorAll?.("[data-club-jersey]:not([data-kit-ready])").forEach((el) => replaceNode(el, inferClub(el)));
    root.querySelectorAll?.("span.clubLogo:not([data-kit-ready])").forEach((el) => replaceNode(el, inferClub(el)));
    root.querySelectorAll?.("img.clubLogo,img.logo").forEach((el) => {
      const name = inferClub(el);
      if (name) replaceNode(el, name);
    });
  }
  function ensureStyles() {
    if (document.querySelector("link[data-seasoncrew-club-kits]")) return;
    const current = document.currentScript?.src || import_meta.url;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("./club-kits.css?v=20260817-2", current).href;
    link.dataset.seasoncrewClubKits = "1";
    document.head.append(link);
  }
  var import_meta, CLUB_KITS, ALIASES, DOMAIN_TO_CLUB, DEFAULT_KIT, observer, api;
  var init_club_kits = __esm({
    "SeasonCrew/club-kits.js?v=20260817-loginfix1"() {
      import_meta = {};
      CLUB_KITS = {
        "FC Bayern M\xFCnchen": { primary: "#DC052D", secondary: "#FFFFFF" },
        "Borussia Dortmund": { primary: "#FDE100", secondary: "#111111" },
        "VfB Stuttgart": { primary: "#FFFFFF", secondary: "#E32219" },
        "FC Schalke 04": { primary: "#005CA9", secondary: "#FFFFFF" },
        "SV 07 Elversberg": { primary: "#111111", secondary: "#FFFFFF" },
        "1. FC Union Berlin": { primary: "#D71920", secondary: "#F4C300" },
        "FC Augsburg": { primary: "#BA3733", secondary: "#2E7D32" },
        "RB Leipzig": { primary: "#FFFFFF", secondary: "#D71920" },
        "SC Freiburg": { primary: "#D71920", secondary: "#111111" },
        "1. FSV Mainz 05": { primary: "#C8102E", secondary: "#FFFFFF" },
        "1. FC K\xF6ln": { primary: "#FFFFFF", secondary: "#D71920" },
        "Hamburger SV": { primary: "#FFFFFF", secondary: "#0057B8" },
        "SC Paderborn 07": { primary: "#005CA9", secondary: "#111111" },
        "TSG Hoffenheim": { primary: "#005CA9", secondary: "#FFFFFF" },
        "SV Werder Bremen": { primary: "#008A45", secondary: "#FFFFFF" },
        "Borussia M\xF6nchengladbach": { primary: "#111111", secondary: "#FFFFFF" },
        "Bayer 04 Leverkusen": { primary: "#111111", secondary: "#D71920" },
        "Eintracht Frankfurt": { primary: "#111111", secondary: "#D71920" },
        "VfL Osnabr\xFCck": { primary: "#6A1B9A", secondary: "#FFFFFF" }
      };
      ALIASES = {
        "FC Bayern": "FC Bayern M\xFCnchen",
        "Bayern": "FC Bayern M\xFCnchen",
        "Bayern M\xFCnchen": "FC Bayern M\xFCnchen",
        "FC Bayern Munich": "FC Bayern M\xFCnchen",
        "BVB": "Borussia Dortmund",
        "Dortmund": "Borussia Dortmund",
        "Schalke": "FC Schalke 04",
        "Union Berlin": "1. FC Union Berlin",
        "Mainz 05": "1. FSV Mainz 05",
        "K\xF6ln": "1. FC K\xF6ln",
        "Werder Bremen": "SV Werder Bremen",
        "Gladbach": "Borussia M\xF6nchengladbach",
        "Leverkusen": "Bayer 04 Leverkusen",
        "Frankfurt": "Eintracht Frankfurt",
        "Hoffenheim": "TSG Hoffenheim",
        "Freiburg": "SC Freiburg",
        "Paderborn": "SC Paderborn 07",
        "Augsburg": "FC Augsburg",
        "Stuttgart": "VfB Stuttgart",
        "Leipzig": "RB Leipzig",
        "Hamburg": "Hamburger SV",
        "Osnabr\xFCck": "VfL Osnabr\xFCck",
        "Elversberg": "SV 07 Elversberg"
      };
      DOMAIN_TO_CLUB = {
        "fcbayern.com": "FC Bayern M\xFCnchen",
        "bvb.de": "Borussia Dortmund",
        "vfb.de": "VfB Stuttgart",
        "schalke04.de": "FC Schalke 04",
        "sv07elversberg.de": "SV 07 Elversberg",
        "fc-union-berlin.de": "1. FC Union Berlin",
        "fcaugsburg.de": "FC Augsburg",
        "rbleipzig.com": "RB Leipzig",
        "scfreiburg.com": "SC Freiburg",
        "mainz05.de": "1. FSV Mainz 05",
        "fc.de": "1. FC K\xF6ln",
        "hsv.de": "Hamburger SV",
        "scp07.de": "SC Paderborn 07",
        "tsg-hoffenheim.de": "TSG Hoffenheim",
        "werder.de": "SV Werder Bremen",
        "borussia.de": "Borussia M\xF6nchengladbach",
        "bayer04.de": "Bayer 04 Leverkusen",
        "eintracht.de": "Eintracht Frankfurt",
        "vfl.de": "VfL Osnabr\xFCck"
      };
      DEFAULT_KIT = { primary: "#252730", secondary: "#E14975" };
      ensureStyles();
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hydrate());
      else hydrate();
      observer = new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
        if (n.nodeType === 1) {
          const el = n;
          const name = inferClub(el);
          if (el.matches?.("span.clubLogo,img.clubLogo,img.logo,[data-club-jersey]") && name) replaceNode(el, name);
          hydrate(el);
        }
      })));
      observer.observe(document.documentElement, { childList: true, subtree: true });
      api = { CLUB_KITS, ALIASES, DEFAULT_KIT, canonicalName, getKit, html, element, hydrate };
      window.SeasonCrewClubKits = api;
    }
  });

  // FcBayern_Tom/schedule.js
  var raw = "bl01|bl|Bundesliga \xB7 1. Spieltag|2026-08-28|2026-08-28|20:30|VfB Stuttgart|H|Allianz Arena, M\xFCnchen\nbl02|bl|Bundesliga \xB7 2. Spieltag|2026-09-05|2026-09-05|18:30|FC Schalke 04||VELTINS-Arena, Gelsenkirchen\nbl03|bl|Bundesliga \xB7 3. Spieltag|2026-09-13|2026-09-13|17:30|SV 07 Elversberg||URSAPHARM-Arena, Elversberg\nbl04|bl|Bundesliga \xB7 4. Spieltag|2026-09-18|2026-09-18|20:30|1. FC Union Berlin|H|Allianz Arena, M\xFCnchen\nbl05|bl|Bundesliga \xB7 5. Spieltag|2026-10-09|2026-10-11||FC Augsburg||WWK Arena, Augsburg\nbl06|bl|Bundesliga \xB7 6. Spieltag|2026-10-16|2026-10-18||RB Leipzig|H|Allianz Arena, M\xFCnchen\nbl07|bl|Bundesliga \xB7 7. Spieltag|2026-10-23|2026-10-25||SC Freiburg||Europa-Park Stadion, Freiburg\nbl08|bl|Bundesliga \xB7 8. Spieltag|2026-10-30|2026-11-01||Borussia Dortmund|H|Allianz Arena, M\xFCnchen\nbl09|bl|Bundesliga \xB7 9. Spieltag|2026-11-06|2026-11-08||1. FSV Mainz 05||MEWA Arena, Mainz\nbl10|bl|Bundesliga \xB7 10. Spieltag|2026-11-20|2026-11-22||1. FC K\xF6ln|H|Allianz Arena, M\xFCnchen\nbl11|bl|Bundesliga \xB7 11. Spieltag|2026-11-27|2026-11-29||Hamburger SV||Volksparkstadion, Hamburg\nbl12|bl|Bundesliga \xB7 12. Spieltag|2026-12-04|2026-12-06||SC Paderborn 07|H|Allianz Arena, M\xFCnchen\nbl13|bl|Bundesliga \xB7 13. Spieltag|2026-12-11|2026-12-13||TSG Hoffenheim||Sinsheim\nbl14|bl|Bundesliga \xB7 14. Spieltag|2026-12-18|2026-12-20||SV Werder Bremen|H|Allianz Arena, M\xFCnchen\nbl15|bl|Bundesliga \xB7 15. Spieltag|2027-01-08|2027-01-10||Borussia M\xF6nchengladbach||Borussia-Park, M\xF6nchengladbach\nbl16|bl|Bundesliga \xB7 16. Spieltag|2027-01-12|2027-01-14||Bayer 04 Leverkusen|H|Allianz Arena, M\xFCnchen\nbl17|bl|Bundesliga \xB7 17. Spieltag|2027-01-15|2027-01-17||Eintracht Frankfurt||Deutsche Bank Park, Frankfurt\nbl18|bl|Bundesliga \xB7 18. Spieltag|2027-01-22|2027-01-24||VfB Stuttgart||MHP-Arena, Stuttgart\nbl19|bl|Bundesliga \xB7 19. Spieltag|2027-01-29|2027-01-31||FC Schalke 04|H|Allianz Arena, M\xFCnchen\nbl20|bl|Bundesliga \xB7 20. Spieltag|2027-02-05|2027-02-07||SV 07 Elversberg|H|Allianz Arena, M\xFCnchen\nbl21|bl|Bundesliga \xB7 21. Spieltag|2027-02-12|2027-02-14||1. FC Union Berlin||Stadion An der Alten F\xF6rsterei, Berlin\nbl22|bl|Bundesliga \xB7 22. Spieltag|2027-02-19|2027-02-21||FC Augsburg|H|Allianz Arena, M\xFCnchen\nbl23|bl|Bundesliga \xB7 23. Spieltag|2027-02-26|2027-02-28||RB Leipzig||Red Bull Arena, Leipzig\nbl24|bl|Bundesliga \xB7 24. Spieltag|2027-03-02|2027-03-04||SC Freiburg|H|Allianz Arena, M\xFCnchen\nbl25|bl|Bundesliga \xB7 25. Spieltag|2027-03-05|2027-03-07||Borussia Dortmund||Signal Iduna Park, Dortmund\nbl26|bl|Bundesliga \xB7 26. Spieltag|2027-03-12|2027-03-14||1. FSV Mainz 05|H|Allianz Arena, M\xFCnchen\nbl27|bl|Bundesliga \xB7 27. Spieltag|2027-03-19|2027-03-21||1. FC K\xF6ln||RheinEnergieStadion, K\xF6ln\nbl28|bl|Bundesliga \xB7 28. Spieltag|2027-04-02|2027-04-04||Hamburger SV|H|Allianz Arena, M\xFCnchen\nbl29|bl|Bundesliga \xB7 29. Spieltag|2027-04-09|2027-04-11||SC Paderborn 07||Home-Deluxe-Arena, Paderborn\nbl30|bl|Bundesliga \xB7 30. Spieltag|2027-04-16|2027-04-18||TSG Hoffenheim|H|Allianz Arena, M\xFCnchen\nbl31|bl|Bundesliga \xB7 31. Spieltag|2027-04-23|2027-04-25||SV Werder Bremen||Weserstadion, Bremen\nbl32|bl|Bundesliga \xB7 32. Spieltag|2027-05-07|2027-05-09||Borussia M\xF6nchengladbach|H|Allianz Arena, M\xFCnchen\nbl33|bl|Bundesliga \xB7 33. Spieltag|2027-05-14|2027-05-16||Bayer 04 Leverkusen||BayArena, Leverkusen\nbl34|bl|Bundesliga \xB7 34. Spieltag|2027-05-22|2027-05-22|15:30|Eintracht Frankfurt|H|Allianz Arena, M\xFCnchen\ndfb01|dfb|DFB-Pokal \xB7 1. Runde|2026-09-02|2026-09-02|20:45|VfL Osnabr\xFCck||Bremer Br\xFCcke, Osnabr\xFCck\ndfb02|dfb|DFB-Pokal \xB7 2. Runde|2026-10-27|2026-10-28||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ndfb03|dfb|DFB-Pokal \xB7 Achtelfinale|2026-12-01|2026-12-02||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ndfb04a|dfb|DFB-Pokal \xB7 Viertelfinale \u2013 Fenster A|2027-02-02|2027-02-03||m\xF6glicher Termin|PX|eines der beiden Viertelfinal-Fenster\ndfb04b|dfb|DFB-Pokal \xB7 Viertelfinale \u2013 Fenster B|2027-02-09|2027-02-10||m\xF6glicher Termin|PX|eines der beiden Viertelfinal-Fenster\ndfb05|dfb|DFB-Pokal \xB7 Halbfinale|2027-04-20|2027-04-21||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ndfb06|dfb|DFB-Pokal \xB7 Finale|2027-05-29|2027-05-29||m\xF6gliches Finale|PN|Olympiastadion Berlin\ncl01|cl|Champions League \xB7 Ligaphase 1|2026-09-08|2026-09-10||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl02|cl|Champions League \xB7 Ligaphase 2|2026-10-13|2026-10-14||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl03|cl|Champions League \xB7 Ligaphase 3|2026-10-20|2026-10-21||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl04|cl|Champions League \xB7 Ligaphase 4|2026-11-03|2026-11-04||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl05|cl|Champions League \xB7 Ligaphase 5|2026-11-24|2026-11-25||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl06|cl|Champions League \xB7 Ligaphase 6|2026-12-08|2026-12-09||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl07|cl|Champions League \xB7 Ligaphase 7|2027-01-19|2027-01-20||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\ncl08|cl|Champions League \xB7 Ligaphase 8|2027-01-27|2027-01-27||Gegner offen|P|Heim/Ausw\xE4rts nach Auslosung\nclpo1|cl|Champions League \xB7 Play-off Hinspiel|2027-02-16|2027-02-17||nur bei Tabellenplatz 9\u201324|P|Heim/Ausw\xE4rts offen\nclpo2|cl|Champions League \xB7 Play-off R\xFCckspiel|2027-02-23|2027-02-24||nur bei Tabellenplatz 9\u201324|P|Heim/Ausw\xE4rts offen\nclr161|cl|Champions League \xB7 Achtelfinale Hinspiel|2027-03-09|2027-03-10||m\xF6glicher Termin|P|Heim/Ausw\xE4rts offen\nclr162|cl|Champions League \xB7 Achtelfinale R\xFCckspiel|2027-03-16|2027-03-17||m\xF6glicher Termin|P|Heim/Ausw\xE4rts offen\nclqf1|cl|Champions League \xB7 Viertelfinale Hinspiel|2027-04-06|2027-04-07||m\xF6glicher Termin|P|Heim/Ausw\xE4rts offen\nclqf2|cl|Champions League \xB7 Viertelfinale R\xFCckspiel|2027-04-13|2027-04-14||m\xF6glicher Termin|P|Heim/Ausw\xE4rts offen\nclsf1|cl|Champions League \xB7 Halbfinale Hinspiel|2027-04-27|2027-04-28||m\xF6glicher Termin|P|Heim/Ausw\xE4rts offen\nclsf2|cl|Champions League \xB7 Halbfinale R\xFCckspiel|2027-05-04|2027-05-05||m\xF6glicher Termin|P|Heim/Ausw\xE4rts offen\nclfinal|cl|Champions League \xB7 Finale|2027-06-05|2027-06-05||m\xF6gliches Finale|PN|Estadio Metropolitano, Madrid";
  var BASE_M = raw.split("\n").map((x) => {
    let [id, c, l, s, e, t, o, f, p] = x.split("|");
    return { id, c, l, s, e, t, o, h: f.includes("H"), pos: f.includes("P"), n: f.includes("N"), p };
  });
  var MON = ["Jan", "Feb", "M\xE4r", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  // SeasonCrew/schedule.js
  var D = Object.freeze({});
  queueMicrotask(() => {
    Promise.resolve().then(() => (init_club_kits(), club_kits_exports)).catch((error) => {
      console.warn("SeasonCrew jersey renderer could not be loaded", error);
    });
  });

  // SeasonCrew/app.js
  var createClient = (...args) => window.supabase.createClient(...args);
  var SUPABASE_URL = "https://kmhadzujovvxvpgblgkk.supabase.co";
  var SUPABASE_KEY = "sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y";
  var sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  var $ = (id) => document.getElementById(id);
  var session = null;
  var user = null;
  var profile = null;
  var groups = [];
  var memberships = /* @__PURE__ */ new Map();
  var currentGroup = null;
  var tickets = [];
  var allocations = [];
  var notes = [];
  var fixtures = [];
  var members = [];
  var filter = "all";
  var activeInvite = null;
  var pendingRequests = [];
  var ownPendingRequests = [];
  var presenceChannel = null;
  var realtimeChannel = null;
  var paymentContext = null;
  var assignmentContext = null;
  var reloadTimer = null;
  var els = {
    authScreen: $("authScreen"),
    authStatus: $("authStatus"),
    loginForm: $("loginForm"),
    signupForm: $("signupForm"),
    groupSelect: $("groupSelect"),
    noGroups: $("noGroups"),
    workspace: $("workspace"),
    helloUser: $("helloUser"),
    seasonPill: $("seasonPill"),
    groupTitle: $("groupTitle"),
    clubName: $("clubName"),
    memberRole: $("memberRole"),
    onlineBadge: $("onlineBadge"),
    syncInfo: $("syncInfo"),
    games: $("games"),
    searchInput: $("searchInput"),
    createDialog: $("createGroupDialog"),
    joinDialog: $("joinGroupDialog"),
    settingsDialog: $("settingsDialog"),
    paymentDialog: $("paymentDialog"),
    toast: $("toast"),
    superadminBadge: $("superadminBadge"),
    heroInviteBtn: $("heroInviteBtn"),
    pendingNotice: $("pendingNotice")
  };
  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function money(v) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(v) || 0);
  }
  function parseMoney(v) {
    const n = Number(String(v ?? "").trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }
  function roleLabel(r) {
    return r === "superadmin" ? "Superadmin" : r === "owner" ? "Owner" : r === "admin" ? "Admin" : "Mitglied";
  }
  function roleView() {
    return window.SeasonCrewRoleView?.get(profile?.is_superadmin) || null;
  }
  function effectiveRole() {
    return roleView() || memberships.get(currentGroup?.id) || "guest";
  }
  function isAdmin() {
    return ["superadmin", "owner", "admin"].includes(effectiveRole());
  }
  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }
  function setStatus(el, text, ok = false) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("ok", !!ok);
  }
  function cleanPaypal(v) {
    return String(v || "").trim().replace(/^https?:\/\/(www\.)?paypal\.me\//i, "").replace(/^paypal\.me\//i, "").replace(/^@/, "").replace(/\/$/, "");
  }
  function todayBerlin() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
  }
  function validUsername(v) {
    return /^[A-Za-z0-9._-]{3,24}$/.test(String(v || "").trim());
  }
  function extractInviteToken(value) {
    const raw2 = String(value || "").trim();
    if (!raw2) return "";
    try {
      const u = new URL(raw2);
      return (u.searchParams.get("invite") || "").trim().toUpperCase();
    } catch {
    }
    const m = raw2.match(/[?&]invite=([^&#]+)/i);
    if (m) return decodeURIComponent(m[1]).trim().toUpperCase();
    return raw2.replace(/\s/g, "").toUpperCase();
  }
  function invitationLink(token) {
    const u = new URL("./", location.href);
    u.search = "";
    u.hash = "";
    u.searchParams.set("invite", token);
    return u.href;
  }
  function gameDate(m) {
    const a = /* @__PURE__ */ new Date(`${m.s}T12:00:00`), b = /* @__PURE__ */ new Date(`${m.e || m.s}T12:00:00`);
    if (m.s === m.e || !m.e) return [`${String(a.getDate()).padStart(2, "0")}.${String(a.getMonth() + 1).padStart(2, "0")}.${String(a.getFullYear()).slice(2)}`, m.t ? `${m.t} Uhr` : ""];
    return [`${a.getDate()}.\u2013${b.getDate()}. ${MON[a.getMonth()]}`, String(a.getFullYear())];
  }
  function competitionName(c) {
    return c === "bl" ? "Bundesliga" : c === "dfb" ? "DFB-Pokal" : "Champions League";
  }
  function clubLogo(name) {
    const domain = D[name];
    return domain ? `<img class="clubLogo" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="">` : `<span class="clubLogo"></span>`;
  }
  function relevantFixture(m) {
    if (m.c === "bl") return m.h === true;
    if (m.n) return true;
    return m.h === true || m.pos === true;
  }
  function ticketLabel(t) {
    return t.label || [t.block, t.row_label, t.seat].filter(Boolean).join("/") || "Karte";
  }
  function allocationKey(fixtureId, ticketId) {
    return `${fixtureId}:${ticketId}`;
  }
  function allocationMap() {
    return new Map(allocations.map((a) => [allocationKey(a.fixture_id, a.ticket_id), a]));
  }
  function noteMap() {
    return new Map(notes.map((n) => [n.fixture_id, n]));
  }
  function isOwnAllocation(a) {
    if (!a) return false;
    const username = String(profile?.username || "").trim().toLowerCase();
    return a.attendee_user_id === user?.id || !a.attendee_user_id && String(a.attendee_name || "").trim().toLowerCase() === username;
  }
  function pendingInviteToken() {
    const urlToken = extractInviteToken(new URL(location.href).searchParams.get("invite"));
    const savedToken = extractInviteToken(localStorage.getItem("seasoncrew-pending-invite"));
    return urlToken || savedToken;
  }
  function syncSignupInvite() {
    const token = pendingInviteToken();
    const input = $("signupInvite");
    if (token) {
      localStorage.setItem("seasoncrew-pending-invite", token);
      if (input && !input.value.trim()) input.value = token;
    }
    return token;
  }
  function setAuthTab(tab) {
    document.querySelectorAll("[data-auth-tab]").forEach((b) => b.classList.toggle("active", b.dataset.authTab === tab));
    els.loginForm.classList.toggle("hidden", tab !== "login");
    els.signupForm.classList.toggle("hidden", tab !== "signup");
    setStatus(els.authStatus, "");
    if (tab === "signup") syncSignupInvite();
  }
  document.querySelectorAll("[data-auth-tab]").forEach((b) => b.addEventListener("click", () => setAuthTab(b.dataset.authTab)));
  var initialInvite = syncSignupInvite();
  if (initialInvite) setAuthTab("signup");
  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus(els.authStatus, "Einloggen \u2026");
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: $("loginEmail").value.trim(), password: $("loginPassword").value });
      if (error) {
        setStatus(els.authStatus, /invalid login credentials/i.test(error.message || "") ? "E-Mail oder Passwort ist falsch." : "Login fehlgeschlagen: " + error.message);
        return;
      }
      session = data.session;
      user = data.user;
      if (!session || !user) {
        setStatus(els.authStatus, "Login fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      const { error: loginAuditError } = await sb.rpc("sc_log_login");
      if (loginAuditError) console.warn("Login-Audit", loginAuditError);
      await enterApp();
    } catch (error) {
      setStatus(els.authStatus, "Login fehlgeschlagen: " + (error?.message || String(error)));
    }
  });
  els.signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = extractInviteToken($("signupInvite")?.value) || pendingInviteToken();
    const username = $("signupUsername").value.trim(), email = $("signupEmail").value.trim();
    if (!validUsername(username)) {
      setStatus(els.authStatus, "Nutzername: 3\u201324 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.");
      return;
    }
    if (token) {
      setStatus(els.authStatus, "Einladungscode wird gepr\xFCft \u2026");
      const { data: inviteRows, error: inviteError } = await sb.rpc("sc_validate_invite", { p_token: token });
      const invite = Array.isArray(inviteRows) ? inviteRows[0] : inviteRows;
      if (inviteError) {
        setStatus(els.authStatus, "Einladung konnte nicht gepr\xFCft werden: " + inviteError.message);
        return;
      }
      if (!invite?.valid) {
        setStatus(els.authStatus, "Dieser Einladungscode ist ung\xFCltig oder abgelaufen.");
        return;
      }
      localStorage.setItem("seasoncrew-pending-invite", token);
    }
    setStatus(els.authStatus, "Nutzername wird gepr\xFCft \u2026");
    const { data: available, error: checkError } = await sb.rpc("sc_username_available", { p_username: username });
    if (checkError) {
      setStatus(els.authStatus, "Nutzername konnte nicht gepr\xFCft werden.");
      return;
    }
    if (!available) {
      setStatus(els.authStatus, "Dieser Nutzername ist bereits vergeben.");
      return;
    }
    setStatus(els.authStatus, "Account wird erstellt \u2026");
    const redirectTo = new URL("./", location.href);
    redirectTo.search = "";
    redirectTo.hash = "";
    if (token) redirectTo.searchParams.set("invite", token);
    const metadata = { username };
    if (token) metadata.invite_token = token;
    const { data, error } = await sb.auth.signUp({ email, password: $("signupPassword").value, options: { emailRedirectTo: redirectTo.href, data: metadata } });
    if (error) {
      setStatus(els.authStatus, error.message);
      return;
    }
    if (data.session && data.user) {
      session = data.session;
      user = data.user;
      setStatus(els.authStatus, "Account erstellt. App wird geladen \u2026", true);
      await enterApp();
      return;
    }
    setAuthTab("login");
    setStatus(els.authStatus, "Account angelegt. Bitte logge dich jetzt ein.", true);
  });
  $("logoutBtn").addEventListener("click", async () => {
    await cleanupChannels();
    await sb.auth.signOut();
    location.reload();
  });
  async function enterApp() {
    if (!user) {
      document.body.classList.add("auth-locked");
      els.authScreen.classList.remove("hidden");
      return;
    }
    document.body.classList.remove("auth-locked");
    els.authScreen.classList.add("hidden");
    await loadProfile();
    await loadGroups();
    await processPendingInvite();
  }
  async function loadProfile() {
    const { data, error } = await sb.from("sc_profiles").select("id,username,is_superadmin").eq("id", user.id).maybeSingle();
    if (error) console.error(error);
    profile = data || { id: user.id, username: user.email?.split("@")[0] || "fan", is_superadmin: false };
    els.superadminBadge.classList.toggle("hidden", !profile.is_superadmin);
  }
  async function loadOwnRequests() {
    const { data, error } = await sb.from("sc_join_requests").select("id,group_id,status,requested_at,assigned_role").eq("user_id", user.id).order("requested_at", { ascending: false });
    ownPendingRequests = error ? [] : (data || []).filter((x) => x.status === "pending");
    renderPendingNotice();
  }
  function renderPendingNotice(extra = "") {
    if (!els.pendingNotice) return;
    const text = extra || (ownPendingRequests.length ? `Deine Beitrittsanfrage wartet auf die Freigabe eines Gruppen-Admins. Danach wirst du als Mitglied oder Admin aufgenommen.` : "");
    els.pendingNotice.textContent = text;
    els.pendingNotice.classList.toggle("hidden", !text);
  }
  async function loadGroups(preferId = null) {
    const { data: ms, error: memberError } = await sb.from("sc_group_members").select("group_id,role,joined_at").eq("user_id", user.id).order("joined_at");
    if (memberError) {
      console.error(memberError);
      showToast("Gruppen konnten nicht geladen werden");
      return;
    }
    memberships = new Map((ms || []).map((m) => [m.group_id, m.role]));
    let gs = [];
    if (profile?.is_superadmin) {
      const { data, error } = await sb.from("sc_groups").select("*").order("created_at");
      if (error) {
        console.error(error);
        return;
      }
      gs = data || [];
    } else {
      const ids = [...memberships.keys()];
      if (ids.length) {
        const { data, error } = await sb.from("sc_groups").select("*").in("id", ids).order("created_at");
        if (error) {
          console.error(error);
          return;
        }
        gs = data || [];
      }
    }
    groups = gs;
    renderGroupSelector();
    await loadOwnRequests();
    if (!groups.length) {
      currentGroup = null;
      els.workspace.classList.add("hidden");
      els.noGroups.classList.remove("hidden");
      return;
    }
    const saved = preferId || localStorage.getItem("seasoncrew-group");
    currentGroup = groups.find((g) => g.id === saved) || groups[0];
    els.groupSelect.value = currentGroup.id;
    localStorage.setItem("seasoncrew-group", currentGroup.id);
    els.noGroups.classList.add("hidden");
    els.workspace.classList.remove("hidden");
    await loadCurrentGroup();
  }
  function renderGroupSelector() {
    els.groupSelect.innerHTML = groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
  }
  els.groupSelect.addEventListener("change", async () => {
    currentGroup = groups.find((g) => g.id === els.groupSelect.value);
    if (!currentGroup) return;
    localStorage.setItem("seasoncrew-group", currentGroup.id);
    await loadCurrentGroup();
  });
  async function loadCurrentGroup() {
    await cleanupChannels();
    const gid = currentGroup.id;
    const [{ data: ts, error: te }, { data: as, error: ae }, { data: ns, error: ne }, { data: ms, error: me }] = await Promise.all([
      sb.from("sc_tickets").select("*").eq("group_id", gid).eq("active", true).order("sort_order").order("created_at"),
      sb.rpc("sc_get_allocations", { p_group: gid }),
      sb.from("sc_fixture_notes").select("*").eq("group_id", gid),
      sb.from("sc_group_members").select("group_id,user_id,role,joined_at").eq("group_id", gid).order("joined_at")
    ]);
    if (te || ae || ne || me) {
      console.error(te || ae || ne || me);
      showToast("Crew-Daten konnten nicht geladen werden");
      return;
    }
    tickets = ts || [];
    allocations = as || [];
    notes = ns || [];
    members = ms || [];
    await Promise.all([loadFixtures(), enrichMembers()]);
    if (isAdmin()) await loadAdminData();
    else {
      activeInvite = null;
      pendingRequests = [];
    }
    render();
    setupPresence();
    setupRealtime();
  }
  async function enrichMembers() {
    const ids = members.map((m) => m.user_id);
    if (!ids.length) return;
    const { data } = await sb.from("sc_profiles").select("id,username").in("id", ids);
    const map = new Map((data || []).map((p) => [p.id, p]));
    members = members.map((m) => ({ ...m, ...map.get(m.user_id) || { username: "mitglied" } }));
  }
  async function loadAdminData() {
    const gid = currentGroup.id, now = (/* @__PURE__ */ new Date()).toISOString();
    const [{ data: invites }, { data: reqs }] = await Promise.all([
      sb.from("sc_group_invites").select("id,token,expires_at,created_at,active").eq("group_id", gid).eq("active", true).gt("expires_at", now).order("created_at", { ascending: false }).limit(1),
      sb.from("sc_join_requests").select("id,user_id,status,requested_at").eq("group_id", gid).eq("status", "pending").order("requested_at")
    ]);
    activeInvite = invites?.[0] || null;
    pendingRequests = reqs || [];
    const ids = pendingRequests.map((r) => r.user_id);
    if (ids.length) {
      const { data: ps } = await sb.from("sc_profiles").select("id,username").in("id", ids);
      const pm = new Map((ps || []).map((p) => [p.id, p]));
      pendingRequests = pendingRequests.map((r) => ({ ...r, ...pm.get(r.user_id) || { username: "bewerber" } }));
    }
  }
  async function loadFixtures() {
    fixtures = BASE_M.map((x) => ({ ...x }));
    const { data, error } = await sb.from("match_overrides").select("id,start_date,end_date,kickoff_time,opponent,home,possible,active").eq("season", currentGroup.season);
    if (!error && data) {
      const map = new Map(data.map((x) => [x.id, x]));
      fixtures = fixtures.map((base) => {
        const x = map.get(base.id);
        if (x?.active === false) return null;
        if (!x) return base;
        return { ...base, s: x.start_date || base.s, e: x.end_date || x.start_date || base.e, t: x.kickoff_time ? String(x.kickoff_time).slice(0, 5) : x.start_date ? "" : base.t, o: x.opponent || base.o, h: x.home ?? base.h, pos: x.possible ?? base.pos };
      }).filter(Boolean);
    }
    const { data: sync } = await sb.from("fixture_sync_runs").select("finished_at,status").eq("status", "success").not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(1).maybeSingle();
    els.syncInfo.textContent = sync?.finished_at ? `Letzter Spielplan-Sync: ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(sync.finished_at))}` : "Spielplan-Sync: noch kein Lauf";
  }
  function filteredFixtures() {
    const q = els.searchInput.value.trim().toLowerCase(), amap = allocationMap();
    return fixtures.filter(relevantFixture).filter((m) => {
      const assigned = tickets.filter((t) => amap.has(allocationKey(m.id, t.id))).length;
      const ok = filter === "all" || filter === m.c || filter === "open" && assigned < tickets.length;
      if (!ok) return false;
      return !q || [m.l, m.o, m.p, competitionName(m.c)].join(" ").toLowerCase().includes(q);
    }).sort((a, b) => a.s.localeCompare(b.s) || a.id.localeCompare(b.id));
  }
  function render() {
    if (!currentGroup) return;
    els.helloUser.textContent = `Hallo ${profile?.username || "Fan"}`;
    els.seasonPill.textContent = `Saison ${currentGroup.season.replace("-", " / ")}`;
    els.groupTitle.textContent = currentGroup.name;
    els.clubName.textContent = currentGroup.club_name;
    els.memberRole.textContent = roleLabel(effectiveRole());
    els.heroInviteBtn.classList.toggle("hidden", !isAdmin());
    renderStats();
    renderGames();
    renderSettings();
    window.dispatchEvent(new CustomEvent("seasoncrew:rendered", { detail: { groupId: currentGroup.id, role: effectiveRole() } }));
  }
  function renderStats() {
    const relevant = fixtures.filter(relevantFixture), ids = new Set(relevant.map((m) => m.id)), relevantAlloc = allocations.filter((a) => ids.has(a.fixture_id));
    const adminView = isAdmin();
    const paymentAlloc = adminView ? relevantAlloc : relevantAlloc.filter(isOwnAllocation);
    const unpaid = paymentAlloc.filter((a) => a.paid === false), unknownPrices = unpaid.filter((a) => a.amount == null).length, open = Math.max(0, relevant.length * tickets.length - relevantAlloc.length);
    $("statFixtures").textContent = relevant.length;
    $("statTickets").textContent = tickets.length;
    $("statAssigned").textContent = relevantAlloc.length;
    $("statOpen").textContent = open;
    const paymentLabel = $("statUnpaid")?.parentElement?.querySelector("small");
    if (paymentLabel) paymentLabel.textContent = adminView ? "Zahlungen offen" : "Deine offenen Zahlungen";
    $("statUnpaid").textContent = money(unpaid.reduce((sum, a) => sum + (a.amount == null ? 0 : Number(a.amount)), 0));
    $("statUnpaidCount").textContent = `${unpaid.length} Ticket${unpaid.length === 1 ? "" : "s"}${unknownPrices ? ` \xB7 ${unknownPrices} Preis${unknownPrices === 1 ? "" : "e"} offen` : ""}`;
  }
  function renderGames() {
    const list = filteredFixtures(), amap = allocationMap(), nmap = noteMap(), today = todayBerlin(), next = list.find((m) => (m.e || m.s) >= today) || list.at(-1);
    if (!list.length) {
      els.games.innerHTML = '<div class="noGames">Keine Spiele f\xFCr diesen Filter.</div>';
      window.dispatchEvent(new CustomEvent("seasoncrew:games-rendered", { detail: { groupId: currentGroup?.id || null } }));
      return;
    }
    const groupsByMonth = {};
    for (const m of list) {
      const d = /* @__PURE__ */ new Date(`${m.s}T12:00:00`), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      (groupsByMonth[k] ||= []).push(m);
    }
    els.games.innerHTML = Object.keys(groupsByMonth).sort().map((k) => `<div class="monthTitle">${MON[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}</div>${groupsByMonth[k].map((m) => renderGame(m, amap, nmap, m.id === next?.id)).join("")}`).join("");
    bindGameEvents();
    window.dispatchEvent(new CustomEvent("seasoncrew:games-rendered", { detail: { groupId: currentGroup?.id || null } }));
  }
  function renderGame(m, amap, nmap, isNext) {
    const allocated = tickets.map((t) => amap.get(allocationKey(m.id, t.id))).filter(Boolean), allPaid = tickets.length > 0 && allocated.length === tickets.length && allocated.every((a) => a.paid), [date, time] = gameDate(m);
    const cols = Math.max(1, Math.min(tickets.length, 4));
    return `<article class="gameCard ${isNext ? "nextGame" : ""} ${allPaid ? "allPaid" : ""}" id="game-${m.id}"><div class="gameTop"><div class="gameDate"><strong>${date}</strong><span>${esc(time || "Termin offen")}</span></div><div class="fixtureMeta"><span class="competition">${competitionName(m.c)}</span><h3>${clubLogo("FC Bayern")}<span>FC Bayern</span><span>\u2013</span>${clubLogo(m.o)}<span>${esc(m.o)}</span></h3><p>${esc(m.l)} \xB7 ${esc(m.p || "")}</p></div><div class="fixtureCount">${allocated.length}/${tickets.length}</div></div><div class="ticketGrid" style="grid-template-columns:repeat(${cols},1fr)">${tickets.length ? tickets.map((t) => renderTicket(m, t, amap.get(allocationKey(m.id, t.id)))).join("") : '<div class="noGames">Noch keine Dauerkarten angelegt. \xD6ffne Einstellungen.</div>'}</div><textarea class="gameNote" data-note-fixture="${m.id}" placeholder="Notiz zum Spiel">${esc(nmap.get(m.id)?.note || "")}</textarea></article>`;
  }
  function renderTicket(m, t, a) {
    const label = ticketLabel(t);
    if (!a) return `<div class="ticketCard unassigned" data-assign-fixture="${m.id}" data-ticket-id="${t.id}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${[t.block && `Block ${esc(t.block)}`, t.row_label && `Reihe ${esc(t.row_label)}`, t.seat && `Sitz ${esc(t.seat)}`].filter(Boolean).join(" \xB7 ")}</small></div><span>+</span></div><div style="padding:8px 10px;color:#8994a3;font-size:9px">Karte vergeben</div></div>`;
    const own = isOwnAllocation(a), paymentVisible = isAdmin() || own, paid = a.paid === true, unpaid = a.paid === false;
    const cardState = paymentVisible ? paid ? "paid" : unpaid ? "unpaid" : "" : "paymentPrivate";
    const status = paymentVisible ? paid ? "bezahlt" : unpaid ? "Zahlung offen" : "Zahlstatus offen" : "zugewiesen";
    const adminActions = isAdmin() ? `<button class="changeAssignmentBtn" type="button" data-change-assignment="${m.id}" data-ticket-id="${t.id}">Zuweisung \xE4ndern</button><button class="releaseAssignmentBtn" type="button" data-release-fixture="${m.id}" data-ticket-id="${t.id}" title="Zuweisung aufheben">Zuweisung aufheben</button>${unpaid && a.amount != null ? `<button type="button" data-paypal-fixture="${m.id}" data-ticket-id="${t.id}">PayPal</button>` : ""}<label class="paidToggle"><input type="checkbox" data-paid-fixture="${m.id}" data-ticket-id="${t.id}" ${paid ? "checked" : ""}> bezahlt</label>` : "";
    return `<div class="ticketCard assigned ${cardState} ${own ? "ownTicket" : ""}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${status}</small></div></div><div class="attendeeDisplay">${esc(a.attendee_name || "Ticket-Gast")}</div>${isAdmin() ? `<div class="ticketActions">${adminActions}</div>` : ""}</div>`;
  }
  function bindGameEvents() {
    document.querySelectorAll("[data-assign-fixture]").forEach((el) => el.addEventListener("click", () => openAssignTicket(el.dataset.assignFixture, el.dataset.ticketId)));
    document.querySelectorAll("[data-change-assignment]").forEach((el) => el.addEventListener("click", (e) => {
      e.stopPropagation();
      openAssignTicket(el.dataset.changeAssignment, el.dataset.ticketId, "", true);
    }));
    document.querySelectorAll("[data-release-fixture]").forEach((el) => el.addEventListener("click", (e) => {
      e.stopPropagation();
      releaseTicket(el.dataset.releaseFixture, el.dataset.ticketId);
    }));
    document.querySelectorAll("[data-paid-fixture]").forEach((input) => input.addEventListener("change", () => savePaid(input.dataset.paidFixture, input.dataset.ticketId, input.checked)));
    document.querySelectorAll("[data-paypal-fixture]").forEach((btn) => btn.addEventListener("click", () => openPayment(btn.dataset.paypalFixture, btn.dataset.ticketId)));
    document.querySelectorAll("[data-note-fixture]").forEach((t) => t.addEventListener("change", () => saveNote(t.dataset.noteFixture, t.value)));
  }
  async function readAllocation(fixtureId, ticketId) {
    const { data, error } = await sb.rpc("sc_get_allocations", { p_group: currentGroup.id });
    if (error) {
      console.warn("Allocation refresh", error);
      return null;
    }
    return (data || []).find((a) => a.fixture_id === fixtureId && a.ticket_id === ticketId) || null;
  }
  function updateAssignTicketSeatMeta() {
    if (!assignmentContext) return;
    const m = fixtureById(assignmentContext.fixtureId), t = ticketById(assignmentContext.ticketId);
    if (!m || !t) return;
    $("assignTicketTitle").textContent = `${ticketLabel(t)} \xB7 ${m.o}`;
    $("assignTicketMeta").textContent = `${gameDate(m)[0]}${gameDate(m)[1] ? ` \xB7 ${gameDate(m)[1]}` : ""} \xB7 ${[t.block && `Block ${t.block}`, t.row_label && `Reihe ${t.row_label}`, t.seat && `Sitz ${t.seat}`].filter(Boolean).join(" \xB7 ")}`;
  }
  function openAssignTicket(fixtureId, ticketId, preselectUserId = "", editExisting = false) {
    if (!isAdmin()) return;
    const m = fixtureById(fixtureId), t = ticketById(ticketId);
    if (!m || !t) return;
    const current = editExisting ? allocationByIds(fixtureId, ticketId) : null;
    assignmentContext = { fixtureId, ticketId, fromTicketId: current?.ticket_id || null, mode: current ? "edit" : "create" };
    const availableTickets = tickets.filter((x) => x.id === ticketId || !allocationByIds(fixtureId, x.id));
    $("assignTicketSeat").innerHTML = availableTickets.map((x) => `<option value="${x.id}">${esc(ticketLabel(x))} \xB7 ${esc([x.block && `Block ${x.block}`, x.row_label && `Reihe ${x.row_label}`, x.seat && `Sitz ${x.seat}`].filter(Boolean).join(" \xB7 "))}</option>`).join("");
    $("assignTicketSeat").value = ticketId;
    updateAssignTicketSeatMeta();
    const assignedMemberIds = new Set(allocations.filter((a) => a.fixture_id === fixtureId && a.attendee_user_id && (!current || a.ticket_id !== current.ticket_id)).map((a) => a.attendee_user_id));
    $("assignTicketMember").innerHTML = '<option value="">Crew-Mitglied w\xE4hlen \u2026</option>' + members.map((x) => {
      const used = assignedMemberIds.has(x.user_id);
      return `<option value="${x.user_id}" ${used ? "disabled" : ""}>${esc(x.username || "Mitglied")} \xB7 ${roleLabel(x.role)}${used ? " \xB7 bereits Ticket" : ""}</option>`;
    }).join("");
    const memberValue = current?.attendee_user_id || preselectUserId;
    $("assignTicketMember").value = memberValue && members.some((x) => x.user_id === memberValue) && !assignedMemberIds.has(memberValue) ? memberValue : "";
    $("assignTicketGuest").value = current && !current.attendee_user_id ? current.attendee_name || "" : "";
    $("assignTicketModeLabel").textContent = current ? "Zuweisung \xE4ndern" : "Karte vergeben";
    $("assignTicketSave").textContent = current ? "Zuweisung speichern" : "Karte vergeben";
    setStatus($("assignTicketStatus"), "");
    $("assignTicketDialog").showModal();
  }
  window.SeasonCrewAssignment = { open: (fixtureId, ticketId, userId = "") => openAssignTicket(fixtureId, ticketId, userId, false) };
  async function saveAssignment(context, attendeeUserId, attendeeName) {
    if (!isAdmin() || !context) return false;
    const { error } = await sb.rpc("sc_save_allocation", { p_group: currentGroup.id, p_fixture: context.fixtureId, p_ticket: context.ticketId, p_attendee_user: attendeeUserId || null, p_attendee_name: String(attendeeName || "").trim(), p_from_ticket: context.fromTicketId || null });
    if (error) {
      let msg = error.message || "Zuweisung konnte nicht gespeichert werden";
      if (error.code === "23505") msg = String(error.message || "").includes("sc_allocations_unique_member_per_fixture") ? "Dieses Mitglied hat f\xFCr dieses Spiel bereits ein Ticket." : "Dieser Sitzplatz wurde inzwischen vergeben.";
      setStatus($("assignTicketStatus"), msg);
      console.error(error);
      return false;
    }
    const { data, error: refreshError } = await sb.rpc("sc_get_allocations", { p_group: currentGroup.id });
    if (!refreshError) allocations = data || [];
    if (attendeeUserId) window.dispatchEvent(new CustomEvent("seasoncrew:ticket-wish-changed", { detail: { fixtureId: context.fixtureId, userId: attendeeUserId, active: false } }));
    render();
    return true;
  }
  $("assignTicketSeat").addEventListener("change", () => {
    if (!assignmentContext) return;
    assignmentContext.ticketId = $("assignTicketSeat").value;
    updateAssignTicketSeatMeta();
  });
  $("assignTicketMember").addEventListener("change", () => {
    if ($("assignTicketMember").value) $("assignTicketGuest").value = "";
  });
  $("assignTicketGuest").addEventListener("input", () => {
    if ($("assignTicketGuest").value.trim()) $("assignTicketMember").value = "";
  });
  function closeAssignTicketDialog() {
    $("assignTicketDialog").close();
    assignmentContext = null;
    setStatus($("assignTicketStatus"), "");
    $("assignTicketModeLabel").textContent = "Karte vergeben";
    $("assignTicketSave").textContent = "Karte vergeben";
  }
  $("assignTicketCancel").addEventListener("click", closeAssignTicketDialog);
  $("assignTicketCancelBottom").addEventListener("click", closeAssignTicketDialog);
  $("assignTicketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!assignmentContext || !isAdmin()) return;
    const memberId = $("assignTicketMember").value, guest = $("assignTicketGuest").value.trim();
    const chosen = memberId ? members.find((x) => x.user_id === memberId) : null;
    if (!chosen && !guest) {
      setStatus($("assignTicketStatus"), "Bitte ein Crew-Mitglied ausw\xE4hlen oder einen Ticket-Gast eintragen.");
      return;
    }
    const guestKey = guest.replace(/^@+/, "").trim().toLowerCase(), matchingMember = guest ? members.find((x) => String(x.username || "").trim().toLowerCase() === guestKey) : null;
    if (matchingMember) {
      setStatus($("assignTicketStatus"), `${matchingMember.username} ist Crew-Mitglied. Bitte oben aus der Mitgliederliste ausw\xE4hlen.`);
      return;
    }
    if (chosen && allocations.some((a) => a.fixture_id === assignmentContext.fixtureId && a.attendee_user_id === chosen.user_id && a.ticket_id !== assignmentContext.fromTicketId)) {
      setStatus($("assignTicketStatus"), "Dieses Mitglied hat f\xFCr dieses Spiel bereits ein Ticket.");
      return;
    }
    const mode = assignmentContext.mode, context = { ...assignmentContext };
    const saveBtn = $("assignTicketSave");
    saveBtn.disabled = true;
    saveBtn.textContent = "Wird gespeichert \u2026";
    const ok = await saveAssignment(context, guest ? null : chosen.user_id, guest || chosen.username);
    saveBtn.disabled = false;
    saveBtn.textContent = mode === "edit" ? "Zuweisung speichern" : "Karte vergeben";
    if (!ok) return;
    $("assignTicketDialog").close();
    assignmentContext = null;
    showToast(mode === "edit" ? "Zuweisung ge\xE4ndert" : "Karte vergeben");
  });
  async function releaseTicket(fixtureId, ticketId) {
    const { error } = await sb.from("sc_allocations").delete().eq("group_id", currentGroup.id).eq("fixture_id", fixtureId).eq("ticket_id", ticketId);
    if (error) {
      showToast("Zuweisung konnte nicht aufgehoben werden");
      return;
    }
    allocations = allocations.filter((a) => allocationKey(a.fixture_id, a.ticket_id) !== allocationKey(fixtureId, ticketId));
    render();
  }
  async function savePaid(fixtureId, ticketId, paid) {
    const { error } = await sb.from("sc_allocations").update({ paid, updated_by: user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("group_id", currentGroup.id).eq("fixture_id", fixtureId).eq("ticket_id", ticketId);
    if (error) {
      showToast("Zahlstatus konnte nicht gespeichert werden");
      return;
    }
    const saved = await readAllocation(fixtureId, ticketId);
    if (saved) replaceAllocation(saved);
    render();
  }
  function replaceAllocation(data) {
    if (!data) return;
    const key = allocationKey(data.fixture_id, data.ticket_id);
    allocations = allocations.filter((a) => allocationKey(a.fixture_id, a.ticket_id) !== key);
    allocations.push(data);
  }
  async function saveNote(fixtureId, note) {
    if (!note.trim()) {
      await sb.from("sc_fixture_notes").delete().eq("group_id", currentGroup.id).eq("fixture_id", fixtureId);
      notes = notes.filter((n) => n.fixture_id !== fixtureId);
      showToast("Notiz entfernt");
      return;
    }
    const { data, error } = await sb.from("sc_fixture_notes").upsert({ group_id: currentGroup.id, fixture_id: fixtureId, note, updated_by: user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, { onConflict: "group_id,fixture_id" }).select().single();
    if (error) {
      showToast("Notiz konnte nicht gespeichert werden");
      return;
    }
    notes = notes.filter((n) => n.fixture_id !== fixtureId);
    notes.push(data);
    showToast("Notiz gespeichert");
  }
  function fixtureById(id) {
    return fixtures.find((m) => m.id === id);
  }
  function ticketById(id) {
    return tickets.find((t) => t.id === id);
  }
  function allocationByIds(f, t) {
    return allocations.find((a) => a.fixture_id === f && a.ticket_id === t);
  }
  function openPayment(fixtureId, ticketId) {
    const a = allocationByIds(fixtureId, ticketId), m = fixtureById(fixtureId), t = ticketById(ticketId);
    if (!a || !m || !t) return;
    paymentContext = { a, m, t };
    $("paymentPerson").textContent = `${a.attendee_name || "Ticket-Gast"} \xB7 ${ticketLabel(t)}`;
    $("paymentMatch").textContent = `${m.l} \xB7 ${m.o} \xB7 ${gameDate(m)[0]}`;
    const known = a.amount != null;
    $("paymentAmount").readOnly = true;
    $("paymentAmount").value = known ? Number(a.amount).toFixed(2).replace(".", ",") : "";
    $("copyPaymentBtn").disabled = !known;
    $("sharePaymentBtn").disabled = !known;
    setStatus($("paymentStatus"), known ? "" : "Preis noch nicht bekannt");
    updatePaymentPreview();
    els.paymentDialog.showModal();
  }
  function paymentData() {
    if (!paymentContext) return null;
    const amount = parseMoney($("paymentAmount").value);
    if (amount == null) return null;
    const { a, m, t } = paymentContext, paypal = cleanPaypal(currentGroup.paypal_me);
    const link = paypal ? `https://paypal.me/${paypal}/${amount.toFixed(2)}` : "";
    const match = `${m.l} \xB7 ${m.o}`;
    const text = `Hi ${a.attendee_name || "!"},

${match}
Ticket: ${ticketLabel(t)}
Datum: ${gameDate(m)[0]}
Betrag: ${money(amount)}${link ? `

PayPal: ${link}` : ""}`;
    return { amount, link, match, text, a, m, t };
  }
  function updatePaymentPreview() {
    if (paymentContext?.a?.amount == null) {
      $("paymentPreview").textContent = "Preis noch nicht bekannt. Hinterlege zuerst den Spielpreis in den Crew-Einstellungen.";
      return;
    }
    const d = paymentData();
    $("paymentPreview").textContent = d ? `${money(d.amount)}
${d.match}${d.link ? `
${d.link}` : "\nPayPal.Me ist f\xFCr diese Crew noch nicht hinterlegt."}` : "Preis konnte nicht geladen werden.";
  }
  $("paymentAmount").addEventListener("input", updatePaymentPreview);
  $("copyPaymentBtn").addEventListener("click", async () => {
    const d = paymentData();
    if (!d) return;
    await navigator.clipboard.writeText(d.text);
    await savePaymentAmountAndLog(d, "message_copied");
    setStatus($("paymentStatus"), "Nachricht kopiert \u2713", true);
  });
  $("sharePaymentBtn").addEventListener("click", async () => {
    const d = paymentData();
    if (!d) return;
    try {
      if (navigator.share) await navigator.share({ title: d.match, text: d.text });
      else await navigator.clipboard.writeText(d.text);
      await savePaymentAmountAndLog(d, navigator.share ? "share_opened" : "message_copied");
      setStatus($("paymentStatus"), navigator.share ? "Teilen ge\xF6ffnet \u2713" : "Nachricht kopiert \u2713", true);
    } catch (e) {
      if (e?.name !== "AbortError") setStatus($("paymentStatus"), "Teilen nicht m\xF6glich");
    }
  });
  async function savePaymentAmountAndLog(d, action) {
    await sb.from("sc_history").insert({ group_id: currentGroup.id, actor_user_id: user.id, actor_name: profile.username, entity_type: "paypal", entity_id: d.m.id, action, before_data: {}, after_data: { person: d.a.attendee_name, ticket: ticketLabel(d.t), opponent: d.m.o, match_label: d.match, amount: d.amount, paypal_me: cleanPaypal(currentGroup.paypal_me) } });
  }
  function renderSettings() {
    if (!currentGroup) return;
    $("settingsTitle").textContent = currentGroup.name;
    $("profileUsername").value = profile?.username || "";
    $("profileEmail").value = user?.email || "";
    $("settingsGroupName").value = currentGroup.name;
    $("settingsPaypal").value = cleanPaypal(currentGroup.paypal_me);
    $("settingsPrice").value = Number(currentGroup.default_price || 50).toFixed(2).replace(".", ",");
    $("adminSettings").classList.toggle("hidden", !isAdmin());
    $("ticketSettings").classList.toggle("hidden", !isAdmin());
    $("inviteAdminSettings").classList.toggle("hidden", !isAdmin());
    $("ticketList").innerHTML = tickets.map((t) => `<div class="ticketSettingRow"><div><b>${esc(ticketLabel(t))}</b><small>${[t.block && `Block ${esc(t.block)}`, t.row_label && `Reihe ${esc(t.row_label)}`, t.seat && `Sitz ${esc(t.seat)}`].filter(Boolean).join(" \xB7 ")}</small></div><button class="dangerButton" type="button" data-delete-ticket="${t.id}">L\xF6schen</button></div>`).join("") || '<div class="loadingCard">Noch keine Karten.</div>';
    document.querySelectorAll("[data-delete-ticket]").forEach((b) => b.onclick = () => deleteTicket(b.dataset.deleteTicket));
    $("memberList").innerHTML = members.map((m) => `<div class="memberRow"><div class="memberIdentity"><b>@${esc(m.username || "mitglied")}</b></div><span class="roleBadge ${m.role === "owner" ? "owner" : m.role === "admin" ? "admin" : "guest"}">${roleLabel(m.role)}</span></div>`).join("");
    renderInviteAdmin();
    window.dispatchEvent(new CustomEvent("seasoncrew:settings-rendered", { detail: { groupId: currentGroup?.id || null } }));
  }
  async function renderInviteAdmin() {
    if (!isAdmin()) return;
    const canGrantAdmin = ["superadmin", "owner"].includes(effectiveRole());
    $("requestCount").textContent = String(pendingRequests.length);
    $("joinRequestList").innerHTML = pendingRequests.length ? pendingRequests.map((r) => `<div class="joinRequestRow"><div class="joinRequestUser"><b>@${esc(r.username || "bewerber")}</b><small>Anfrage ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(r.requested_at))}</small></div><div class="requestActions"><button class="approveGuest" type="button" data-approve-guest="${r.id}">Als Mitglied</button><button class="approveAdmin" type="button" data-approve-admin="${r.id}">Als Admin</button><button class="reject" type="button" data-reject-request="${r.id}">Ablehnen</button></div></div>`).join("") : '<div class="loadingCard">Keine offenen Bewerbungen.</div>';
    if (!canGrantAdmin) document.querySelectorAll("[data-approve-admin]").forEach((b) => b.remove());
    document.querySelectorAll("[data-approve-guest]").forEach((b) => b.onclick = () => decideRequest(b.dataset.approveGuest, true, "guest"));
    document.querySelectorAll("[data-approve-admin]").forEach((b) => b.onclick = () => decideRequest(b.dataset.approveAdmin, true, "admin"));
    document.querySelectorAll("[data-reject-request]").forEach((b) => b.onclick = () => decideRequest(b.dataset.rejectRequest, false, "guest"));
    const box = $("inviteBox");
    if (!activeInvite) {
      box.className = "inviteBox emptyInvite";
      box.textContent = "Noch keine aktive Einladung. Erstelle einen neuen Link oder QR-Code.";
      return;
    }
    const link = invitationLink(activeInvite.token), expires = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activeInvite.expires_at));
    let qr = "";
    try {
      const QRCode = await import("https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm");
      qr = await QRCode.toDataURL(link, { width: 260, margin: 1 });
    } catch (e) {
      console.warn("QR-Code konnte nicht geladen werden", e);
    }
    box.className = "inviteBox";
    box.innerHTML = `<div class="inviteGrid">${qr ? `<img class="inviteQr" src="${qr}" alt="QR-Code f\xFCr Einladung">` : ""}<div class="inviteMeta"><small>Aktive Einladung</small><strong>${esc(currentGroup.name)}</strong><div class="inviteCodeBlock"><small>Einladungscode</small><div class="inviteCodeRow"><code>${esc(activeInvite.token)}</code><button type="button" data-copy-invite-code>Code kopieren</button></div></div><small class="inviteLinkLabel">Einladungslink</small><span class="inviteLink">${esc(link)}</span><div class="inviteActions"><button type="button" data-copy-invite>Link kopieren</button><button type="button" data-share-invite>Teilen</button></div><div class="inviteExpiry">G\xFCltig bis ${esc(expires)} \xB7 danach automatisch ung\xFCltig</div></div></div>`;
    box.querySelector("[data-copy-invite-code]")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(activeInvite.token);
      showToast("Einladungscode kopiert");
    });
    box.querySelector("[data-copy-invite]")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(link);
      showToast("Einladungslink kopiert");
    });
    box.querySelector("[data-share-invite]")?.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: `Einladung zu ${currentGroup.name}`, text: `SeasonCrew Einladungscode: ${activeInvite.token}`, url: link });
        else await navigator.clipboard.writeText(link);
      } catch (e) {
        if (e?.name !== "AbortError") showToast("Teilen nicht m\xF6glich");
      }
    });
  }
  $("settingsBtn").addEventListener("click", () => {
    renderSettings();
    els.settingsDialog.showModal();
  });
  $("groupMenuBtn").addEventListener("click", () => {
    renderSettings();
    els.settingsDialog.showModal();
  });
  els.heroInviteBtn.addEventListener("click", () => {
    renderSettings();
    els.settingsDialog.showModal();
    setTimeout(() => $("inviteAdminSettings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  });
  $("saveProfileBtn").addEventListener("click", async () => {
    const username = $("profileUsername").value.trim();
    if (!validUsername(username)) {
      setStatus($("settingsStatus"), "Bitte einen g\xFCltigen Nutzernamen eingeben.");
      return;
    }
    if (username.toLowerCase() !== String(profile.username || "").toLowerCase()) {
      const { data: available, error: checkError } = await sb.rpc("sc_username_available", { p_username: username });
      if (checkError || !available) {
        setStatus($("settingsStatus"), checkError?.message || "Dieser Nutzername ist bereits vergeben.");
        return;
      }
    }
    const { error } = await sb.from("sc_profiles").update({ username, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", user.id);
    if (error) {
      setStatus($("settingsStatus"), error.message);
      return;
    }
    await sb.auth.updateUser({ data: { username } });
    profile.username = username;
    setStatus($("settingsStatus"), "Profil gespeichert \u2713", true);
    render();
  });
  $("saveGroupBtn").addEventListener("click", async () => {
    if (!isAdmin()) return;
    const price = parseMoney($("settingsPrice").value);
    const update = { name: $("settingsGroupName").value.trim(), paypal_me: cleanPaypal($("settingsPaypal").value) || null, default_price: price ?? 50, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    const { data, error } = await sb.from("sc_groups").update(update).eq("id", currentGroup.id).select().single();
    if (error) {
      setStatus($("settingsStatus"), error.message);
      return;
    }
    currentGroup = data;
    groups = groups.map((g) => g.id === data.id ? data : g);
    renderGroupSelector();
    els.groupSelect.value = data.id;
    setStatus($("settingsStatus"), "Crew gespeichert \u2713", true);
    render();
    window.dispatchEvent(new CustomEvent("seasoncrew:prices-updated", { detail: { groupId: currentGroup.id } }));
  });
  $("addTicketBtn").addEventListener("click", async () => {
    if (!isAdmin()) return;
    const block = $("ticketBlock").value.trim(), row = $("ticketRow").value.trim(), seat = $("ticketSeat").value.trim();
    if (!block && !row && !seat) {
      setStatus($("settingsStatus"), "Bitte Block, Reihe oder Sitz angeben.");
      return;
    }
    const label = [block, row, seat].filter(Boolean).join("/");
    const { data, error } = await sb.from("sc_tickets").insert({ group_id: currentGroup.id, label, block: block || null, row_label: row || null, seat: seat || null, sort_order: tickets.length + 1 }).select().single();
    if (error) {
      setStatus($("settingsStatus"), error.message);
      return;
    }
    tickets.push(data);
    $("ticketBlock").value = $("ticketRow").value = $("ticketSeat").value = "";
    setStatus($("settingsStatus"), "Karte hinzugef\xFCgt \u2713", true);
    render();
  });
  $("createInviteBtn").addEventListener("click", async () => {
    if (!isAdmin()) return;
    setStatus($("settingsStatus"), "Einladung wird erstellt \u2026");
    const { data, error } = await sb.rpc("sc_create_invite", { p_group: currentGroup.id, p_days: 14 });
    if (error) {
      setStatus($("settingsStatus"), error.message);
      return;
    }
    activeInvite = data?.[0] || null;
    setStatus($("settingsStatus"), "Neue Einladung erstellt \u2713", true);
    await renderInviteAdmin();
  });
  async function decideRequest(id, approve, role, userId = null) {
    if (!isAdmin()) return;
    const request = pendingRequests.find((r) => r.id === id);
    const applicantId = userId || request?.user_id;
    const person = request?.username || "Person";
    if (!applicantId) {
      await loadAdminData();
      renderSettings();
      setStatus($("settingsStatus"), "Bewerbung wurde aktualisiert. Bitte erneut versuchen.");
      return;
    }
    const label = approve ? role === "admin" ? "als Admin" : "als Mitglied" : "ablehnen";
    if (!confirm(`Bewerbung wirklich ${label}${approve ? " freigeben" : ""}?`)) return;
    const { error } = await sb.rpc("sc_decide_join_request_v2", { p_request: id, p_group: currentGroup.id, p_user: applicantId, p_approve: approve, p_role: role });
    if (error) {
      await loadAdminData();
      renderSettings();
      setStatus($("settingsStatus"), error.message);
      return;
    }
    pendingRequests = pendingRequests.filter((r) => r.id !== id && r.user_id !== applicantId);
    const { data: ms, error: memberError } = await sb.from("sc_group_members").select("group_id,user_id,role,joined_at").eq("group_id", currentGroup.id).order("joined_at");
    if (memberError) {
      setStatus($("settingsStatus"), memberError.message);
      return;
    }
    members = ms || [];
    await enrichMembers();
    await loadAdminData();
    renderSettings();
    showToast(approve ? `${person} ist jetzt ${role === "admin" ? "Admin" : "Mitglied"}` : `${person} wurde abgelehnt`);
  }
  async function deleteTicket(id) {
    if (!confirm("Dauerkarte wirklich l\xF6schen? Vorhandene Belegungen dieser Karte werden ebenfalls entfernt.")) return;
    const { error } = await sb.from("sc_tickets").delete().eq("id", id).eq("group_id", currentGroup.id);
    if (error) {
      setStatus($("settingsStatus"), error.message);
      return;
    }
    tickets = tickets.filter((t) => t.id !== id);
    allocations = allocations.filter((a) => a.ticket_id !== id);
    render();
    setStatus($("settingsStatus"), "Karte gel\xF6scht", true);
  }
  function openCreate() {
    setStatus($("createGroupStatus"), "");
    els.createDialog.showModal();
  }
  function openJoin() {
    setStatus($("joinGroupStatus"), "");
    els.joinDialog.showModal();
  }
  document.querySelectorAll("[data-open-create]").forEach((b) => b.addEventListener("click", openCreate));
  document.querySelectorAll("[data-open-join]").forEach((b) => b.addEventListener("click", openJoin));
  $("createGroupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("newGroupName").value.trim(), price = parseMoney($("newGroupPrice").value);
    if (!name) return;
    setStatus($("createGroupStatus"), "Crew wird erstellt \u2026");
    const { data, error } = await sb.from("sc_groups").insert({ name, club_key: $("newGroupClub").value, club_name: "FC Bayern M\xFCnchen", season: $("newGroupSeason").value.trim() || "2026-27", paypal_me: cleanPaypal($("newGroupPaypal").value) || null, default_price: price ?? 50, created_by: user.id }).select().single();
    if (error) {
      setStatus($("createGroupStatus"), error.message);
      return;
    }
    els.createDialog.close();
    $("createGroupForm").reset();
    $("newGroupSeason").value = "2026-27";
    $("newGroupPrice").value = "50,00";
    await loadGroups(data.id);
    showToast("Crew erstellt");
  });
  $("joinGroupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requestInvite(extractInviteToken($("joinCode").value));
  });
  async function requestInvite(token) {
    if (!token) {
      setStatus($("joinGroupStatus"), "Bitte Einladungslink oder Code eingeben.");
      return;
    }
    setStatus($("joinGroupStatus"), "Beitrittsanfrage wird gesendet \u2026");
    const { data, error } = await sb.rpc("sc_request_join", { p_token: token });
    if (error) {
      setStatus($("joinGroupStatus"), error.message);
      return;
    }
    localStorage.removeItem("seasoncrew-pending-invite");
    $("joinCode").value = "";
    if (els.joinDialog.open) els.joinDialog.close();
    await loadOwnRequests();
    if (data?.status === "member") {
      showToast("Du bist bereits Mitglied dieser Crew.");
      await loadGroups(data.group_id);
      return;
    }
    const msg = `Anfrage f\xFCr \u201E${data?.group_name || "Crew"}\u201C gesendet. Ein Admin muss dich noch als Mitglied oder Admin freigeben.`;
    renderPendingNotice(msg);
    showToast("Beitrittsanfrage gesendet");
    const u = new URL(location.href);
    u.searchParams.delete("invite");
    history.replaceState({}, "", u);
  }
  async function processPendingInvite() {
    const urlToken = extractInviteToken(new URL(location.href).searchParams.get("invite"));
    if (urlToken) localStorage.setItem("seasoncrew-pending-invite", urlToken);
    const storedToken = extractInviteToken(localStorage.getItem("seasoncrew-pending-invite"));
    const metadataToken = extractInviteToken(user?.user_metadata?.invite_token);
    const token = urlToken || storedToken || metadataToken;
    if (!token) return;
    const { data, error } = await sb.rpc("sc_request_join", { p_token: token });
    if (error) {
      localStorage.removeItem("seasoncrew-pending-invite");
      if (metadataToken) await sb.auth.updateUser({ data: { invite_token: null } });
      showToast(error.message);
      return;
    }
    localStorage.removeItem("seasoncrew-pending-invite");
    if (metadataToken) await sb.auth.updateUser({ data: { invite_token: null } });
    await loadOwnRequests();
    if (data?.status === "member") {
      await loadGroups(data.group_id);
      showToast("Du bist bereits Mitglied dieser Crew.");
    } else {
      renderPendingNotice(`Anfrage f\xFCr \u201E${data?.group_name || "Crew"}\u201C gesendet. Warte jetzt auf die Freigabe eines Admins.`);
      showToast("Einladung angenommen \u2013 Freigabe steht aus");
    }
    const u = new URL(location.href);
    u.searchParams.delete("invite");
    history.replaceState({}, "", u);
  }
  $("filterGroup").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    filter = b.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((x) => x.classList.toggle("active", x === b));
    renderGames();
  });
  els.searchInput.addEventListener("input", renderGames);
  $("nextMatchBtn").addEventListener("click", () => {
    const list = filteredFixtures(), today = todayBerlin(), next = list.find((m) => (m.e || m.s) >= today) || list.at(-1);
    if (!next) return;
    const el = $(`game-${next.id}`);
    if (!el) return;
    const y = window.scrollY + el.getBoundingClientRect().top - document.querySelector(".topbar").offsetHeight - 18;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  });
  async function setupPresence() {
    if (!currentGroup) return;
    presenceChannel = sb.channel(`seasoncrew-presence-${currentGroup.id}`, { config: { presence: { key: user.id } } });
    presenceChannel.on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      const names = [...new Set(Object.values(state).flat().map((x) => x.name).filter(Boolean))];
      els.onlineBadge.innerHTML = `<i></i><span>Online: ${names.length ? names.map(esc).join(", ") : "\u2013"}</span>`;
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await presenceChannel.track({ name: profile.username, group_id: currentGroup.id, at: (/* @__PURE__ */ new Date()).toISOString() });
    });
  }
  function setupRealtime() {
    if (!currentGroup) return;
    const gid = currentGroup.id;
    realtimeChannel = sb.channel(`seasoncrew-data-${gid}`).on("postgres_changes", { event: "*", schema: "public", table: "sc_allocations", select: ["group_id", "fixture_id", "ticket_id", "attendee_name", "attendee_user_id", "updated_by", "updated_at"], filter: `group_id=eq.${gid}` }, queueReload).on("postgres_changes", { event: "*", schema: "public", table: "sc_fixture_notes", filter: `group_id=eq.${gid}` }, queueReload).on("postgres_changes", { event: "*", schema: "public", table: "sc_tickets", filter: `group_id=eq.${gid}` }, queueReload).on("postgres_changes", { event: "*", schema: "public", table: "sc_group_members", filter: `group_id=eq.${gid}` }, queueReload).on("postgres_changes", { event: "*", schema: "public", table: "sc_join_requests", filter: `group_id=eq.${gid}` }, queueReload).on("postgres_changes", { event: "UPDATE", schema: "public", table: "sc_groups", filter: `id=eq.${gid}` }, queueReload).subscribe();
  }
  function queueReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadCurrentGroup(), 450);
  }
  async function cleanupChannels() {
    if (presenceChannel) {
      try {
        await presenceChannel.untrack();
      } catch {
      }
      await sb.removeChannel(presenceChannel);
      presenceChannel = null;
    }
    if (realtimeChannel) {
      await sb.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }
  async function boot() {
    const invite = extractInviteToken(new URL(location.href).searchParams.get("invite"));
    if (invite) localStorage.setItem("seasoncrew-pending-invite", invite);
    const { data: { session: s } } = await sb.auth.getSession();
    session = s;
    user = s?.user || null;
    if (!user) {
      document.body.classList.add("auth-locked");
      els.authScreen.classList.remove("hidden");
      if (invite) {
        setAuthTab("signup");
        setStatus(els.authStatus, "Du wurdest eingeladen. Erstelle einen Account oder logge dich ein; danach wird die Beitrittsanfrage automatisch gestellt.", true);
      } else {
        setStatus(els.authStatus, "");
      }
      return;
    }
    await enterApp();
  }
  boot();
})();
