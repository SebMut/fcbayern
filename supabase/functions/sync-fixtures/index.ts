import { withSupabase } from "npm:@supabase/server@^1";
import * as cheerio from "npm:cheerio@1.2.0";

const SEASON = "2026-27";
const TZ = "Europe/Berlin";

const SOURCES = {
  bundesliga:
    "https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/fc-bayern-muenchen",
  dfb:
    "https://datencenter.dfb.de/competitions/dfb-pokal/seasons/2026-27/teams/bayern-muenchen?datacenter_name=datencenter%3Fhistorize_title%3D&historize_url=",
  championsLeague:
    "https://de.uefa.com/uefachampionsleague/clubs/50037--bayern-munchen/matches/",
};

type ParsedMatch = {
  id?: string;
  competition: "bl" | "dfb" | "cl";
  start_date: string;
  end_date: string;
  kickoff_time: string | null;
  opponent: string;
  home: boolean;
  exact: boolean;
};

type SourceResult = {
  source: string;
  matches: ParsedMatch[];
  error?: string;
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const BUNDESLIGA_CODES: Record<string, string> = {
  FCB: "FC Bayern München",
  VFB: "VfB Stuttgart",
  S04: "FC Schalke 04",
  ELV: "SV 07 Elversberg",
  FCU: "1. FC Union Berlin",
  FCA: "FC Augsburg",
  RBL: "RB Leipzig",
  SCF: "SC Freiburg",
  BVB: "Borussia Dortmund",
  M05: "1. FSV Mainz 05",
  KOE: "1. FC Köln",
  HSV: "Hamburger SV",
  SCP: "SC Paderborn 07",
  TSG: "TSG Hoffenheim",
  SVW: "SV Werder Bremen",
  BMG: "Borussia Mönchengladbach",
  B04: "Bayer 04 Leverkusen",
  SGE: "Eintracht Frankfurt",
};

const BL_EXPECTED = [
  ["bl01", true,  "VfB Stuttgart",              "2026-08-28"],
  ["bl02", false, "FC Schalke 04",              "2026-09-05"],
  ["bl03", false, "SV 07 Elversberg",           "2026-09-13"],
  ["bl04", true,  "1. FC Union Berlin",         "2026-09-18"],
  ["bl05", false, "FC Augsburg",                "2026-10-09"],
  ["bl06", true,  "RB Leipzig",                 "2026-10-16"],
  ["bl07", false, "SC Freiburg",                "2026-10-23"],
  ["bl08", true,  "Borussia Dortmund",          "2026-10-30"],
  ["bl09", false, "1. FSV Mainz 05",            "2026-11-06"],
  ["bl10", true,  "1. FC Köln",                 "2026-11-20"],
  ["bl11", false, "Hamburger SV",               "2026-11-27"],
  ["bl12", true,  "SC Paderborn 07",            "2026-12-04"],
  ["bl13", false, "TSG Hoffenheim",             "2026-12-11"],
  ["bl14", true,  "SV Werder Bremen",           "2026-12-18"],
  ["bl15", false, "Borussia Mönchengladbach",   "2027-01-08"],
  ["bl16", true,  "Bayer 04 Leverkusen",        "2027-01-12"],
  ["bl17", false, "Eintracht Frankfurt",        "2027-01-15"],
  ["bl18", false, "VfB Stuttgart",              "2027-01-22"],
  ["bl19", true,  "FC Schalke 04",              "2027-01-29"],
  ["bl20", true,  "SV 07 Elversberg",           "2027-02-05"],
  ["bl21", false, "1. FC Union Berlin",         "2027-02-12"],
  ["bl22", true,  "FC Augsburg",                "2027-02-19"],
  ["bl23", false, "RB Leipzig",                 "2027-02-26"],
  ["bl24", true,  "SC Freiburg",                "2027-03-02"],
  ["bl25", false, "Borussia Dortmund",          "2027-03-05"],
  ["bl26", true,  "1. FSV Mainz 05",            "2027-03-12"],
  ["bl27", false, "1. FC Köln",                 "2027-03-19"],
  ["bl28", true,  "Hamburger SV",               "2027-04-02"],
  ["bl29", false, "SC Paderborn 07",            "2027-04-09"],
  ["bl30", true,  "TSG Hoffenheim",             "2027-04-16"],
  ["bl31", false, "SV Werder Bremen",           "2027-04-23"],
  ["bl32", true,  "Borussia Mönchengladbach",   "2027-05-07"],
  ["bl33", false, "Bayer 04 Leverkusen",        "2027-05-14"],
  ["bl34", true,  "Eintracht Frankfurt",        "2027-05-22"],
] as const;

const DFB_IDS = ["dfb01", "dfb02", "dfb03", "dfb04a", "dfb05", "dfb06"];

const CL_SLOTS = [
  ["cl01",   "2026-09-08"],
  ["cl02",   "2026-10-13"],
  ["cl03",   "2026-10-20"],
  ["cl04",   "2026-11-03"],
  ["cl05",   "2026-11-24"],
  ["cl06",   "2026-12-08"],
  ["cl07",   "2027-01-19"],
  ["cl08",   "2027-01-27"],
  ["clpo1",  "2027-02-16"],
  ["clpo2",  "2027-02-23"],
  ["clr161", "2027-03-09"],
  ["clr162", "2027-03-16"],
  ["clqf1",  "2027-04-06"],
  ["clqf2",  "2027-04-13"],
  ["clsf1",  "2027-04-27"],
  ["clsf2",  "2027-05-04"],
  ["clfinal","2027-06-05"],
] as const;

function localParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

function cleanText(v: string) {
  return v.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function cleanTeam(v: string) {
  return cleanText(v)
    .replace(/^FC Bayern Munich$/i, "FC Bayern München")
    .replace(/^Bayern Munich$/i, "FC Bayern München")
    .replace(/^Bayern München$/i, "FC Bayern München");
}

function isBayern(v: string) {
  return /(?:FC\s+)?Bayern\s+(?:München|Munich)/i.test(cleanTeam(v));
}

function seasonYear(month: number) {
  return month >= 7 ? 2026 : 2027;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseEnglishDate(day: string, monthName: string) {
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) throw new Error(`Unknown month: ${monthName}`);
  return isoDate(seasonYear(month), month, Number(day));
}

function dateDistance(a: string, b: string) {
  return Math.abs(
    new Date(`${a}T12:00:00Z`).getTime() -
    new Date(`${b}T12:00:00Z`).getTime()
  );
}

function utcTimeToBerlin(date: string, time: string) {
  const d = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function parseBundesliga(html: string): ParsedMatch[] {
  const $ = cheerio.load(html);
  const text = cleanText($("body").text());

  const days =
    "(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)";

  const re = new RegExp(
    `${days}\\s+` +
    `(?:-\\s+${days}\\s+)?` +
    `(\\d{1,2})\\s+([A-Za-z]+)` +
    `(?:\\s*-\\s*(\\d{1,2})\\s+([A-Za-z]+))?` +
    `(?:\\s+(\\d{2}:\\d{2}))?\\s+` +
    `([A-Z0-9]{2,4})\\s+([A-Z0-9]{2,4})`,
    "g",
  );

  const candidates: ParsedMatch[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    const [, d1, mon1, d2, mon2, rawTime, homeCode, awayCode] = m;

    if (homeCode !== "FCB" && awayCode !== "FCB") continue;
    if (!BUNDESLIGA_CODES[homeCode] || !BUNDESLIGA_CODES[awayCode]) continue;

    let start = parseEnglishDate(d1, mon1);
    let end = d2 && mon2 ? parseEnglishDate(d2, mon2) : start;
    let kickoff: string | null = null;

    if (rawTime && start === end) {
      const berlin = utcTimeToBerlin(start, rawTime);
      start = berlin.date;
      end = berlin.date;
      kickoff = berlin.time;
    }

    candidates.push({
      competition: "bl",
      start_date: start,
      end_date: end,
      kickoff_time: kickoff,
      opponent:
        homeCode === "FCB"
          ? BUNDESLIGA_CODES[awayCode]
          : BUNDESLIGA_CODES[homeCode],
      home: homeCode === "FCB",
      exact: Boolean(kickoff),
    });
  }

  const dedup = new Map<string, ParsedMatch>();
  for (const x of candidates) {
    const key = [
      x.start_date, x.end_date, x.kickoff_time,
      x.opponent, x.home,
    ].join("|");
    dedup.set(key, x);
  }

  const unique = [...dedup.values()];
  const result: ParsedMatch[] = [];

  for (const [id, home, opponent, baseline] of BL_EXPECTED) {
    const matches = unique
      .filter((x) => x.home === home && x.opponent === opponent)
      .sort(
        (a, b) =>
          dateDistance(a.start_date, baseline) -
          dateDistance(b.start_date, baseline),
      );

    const best = matches[0];
    if (best) result.push({ ...best, id });
  }

  return result;
}

function parseDfb(html: string): ParsedMatch[] {
  const $ = cheerio.load(html);
  const text = cleanText($("body").text());

  const re =
    /(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2})\s+Uhr\s+(.+?)\s+-\s*:\s*-\s+(.+?)(?=\s+(?:Vergleich|Liveticker|Spielbericht|$))/gi;

  const candidates: ParsedMatch[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    const [, day, month, year, time, leftRaw, rightRaw] = m;
    const left = cleanTeam(leftRaw);
    const right = cleanTeam(rightRaw);

    if (!isBayern(left) && !isBayern(right)) continue;

    candidates.push({
      competition: "dfb",
      start_date: `${year}-${month}-${day}`,
      end_date: `${year}-${month}-${day}`,
      kickoff_time: time,
      opponent: isBayern(left) ? right : left,
      home: isBayern(left),
      exact: true,
    });
  }

  const dedup = new Map<string, ParsedMatch>();
  for (const x of candidates) {
    dedup.set(
      [x.start_date, x.kickoff_time, x.opponent, x.home].join("|"),
      x,
    );
  }

  return [...dedup.values()]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, DFB_IDS.length)
    .map((x, i) => ({ ...x, id: DFB_IDS[i] }));
}

function getTeamName(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return cleanTeam(value);
  if (typeof value?.name === "string") return cleanTeam(value.name);
  if (typeof value?.teamName === "string") return cleanTeam(value.teamName);
  if (typeof value?.clubName === "string") return cleanTeam(value.clubName);
  return null;
}

function findString(obj: any, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function parseDateValue(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function scanJsonForUefaMatches(
  node: any,
  out: ParsedMatch[],
  seen = new Set<any>(),
) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  const home =
    getTeamName(node.homeTeam) ??
    getTeamName(node.home) ??
    findString(node, ["homeTeamName", "homeName"]);

  const away =
    getTeamName(node.awayTeam) ??
    getTeamName(node.away) ??
    findString(node, ["awayTeamName", "awayName"]);

  const dateValue = findString(node, [
    "startDate",
    "dateTime",
    "kickOffTime",
    "kickoffTime",
    "utcDate",
    "matchDate",
  ]);

  if (
    home &&
    away &&
    dateValue &&
    (isBayern(home) || isBayern(away))
  ) {
    const dt = parseDateValue(dateValue);
    if (dt) {
      out.push({
        competition: "cl",
        start_date: dt.date,
        end_date: dt.date,
        kickoff_time: dt.time,
        opponent: isBayern(home) ? cleanTeam(away) : cleanTeam(home),
        home: isBayern(home),
        exact: true,
      });
    }
  }

  if (Array.isArray(node)) {
    for (const item of node) scanJsonForUefaMatches(item, out, seen);
  } else {
    for (const value of Object.values(node)) {
      scanJsonForUefaMatches(value, out, seen);
    }
  }
}

function parseUefa(html: string): ParsedMatch[] {
  const $ = cheerio.load(html);
  const candidates: ParsedMatch[] = [];

  $("script").each((_, element) => {
    const type = ($(element).attr("type") || "").toLowerCase();
    const raw = $(element).html()?.trim();
    if (!raw) return;

    if (
      type.includes("json") ||
      $(element).attr("id") === "__NEXT_DATA__" ||
      raw.startsWith("{") ||
      raw.startsWith("[")
    ) {
      try {
        scanJsonForUefaMatches(JSON.parse(raw), candidates);
      } catch {
      }
    }
  });

  const dedup = new Map<string, ParsedMatch>();
  for (const x of candidates) {
    dedup.set(
      [x.start_date, x.kickoff_time, x.opponent, x.home].join("|"),
      x,
    );
  }

  const unique = [...dedup.values()]
    .filter((x) => x.start_date >= "2026-09-01" && x.start_date <= "2027-06-10")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const freeSlots = new Set(CL_SLOTS.map(([id]) => id));
  const result: ParsedMatch[] = [];

  for (const match of unique) {
    const options = CL_SLOTS
      .filter(([id]) => freeSlots.has(id))
      .map(([id, baseline]) => ({
        id,
        distance: dateDistance(match.start_date, baseline),
      }))
      .sort((a, b) => a.distance - b.distance);

    const best = options[0];

    if (best && best.distance <= 12 * 24 * 60 * 60 * 1000) {
      freeSlots.delete(best.id);
      result.push({ ...match, id: best.id });
    }
  }

  return result;
}

async function loadSource(
  source: keyof typeof SOURCES,
): Promise<SourceResult> {
  try {
    const html = await fetchHtml(SOURCES[source]);

    if (source === "bundesliga") {
      return { source, matches: parseBundesliga(html) };
    }

    if (source === "dfb") {
      return { source, matches: parseDfb(html) };
    }

    return { source, matches: parseUefa(html) };
  } catch (error) {
    return {
      source,
      matches: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchMatches() {
  const results = await Promise.all([
    loadSource("bundesliga"),
    loadSource("dfb"),
    loadSource("championsLeague"),
  ]);

  const errors = results
    .filter((x) => x.error)
    .map((x) => `${x.source}: ${x.error}`);

  if (results.every((x) => x.error)) {
    throw new Error(`Alle Quellen fehlgeschlagen: ${errors.join(" | ")}`);
  }

  return {
    matches: results.flatMap((x) => x.matches),
    diagnostics: results.map((x) => ({
      source: x.source,
      count: x.matches.length,
      error: x.error ?? null,
    })),
    errors,
  };
}

async function writeHistory(
  supabaseAdmin: any,
  actor: string,
  runId: number,
  status: "success" | "failed",
  payload: Record<string, unknown>,
) {
  const { error } = await supabaseAdmin.from("history_log").insert({
    actor_name: actor,
    entity_type: "sync_run",
    entity_id: String(runId),
    before_data: {},
    after_data: { status, ...payload },
  });

  if (error) console.error("history_log:", error.message);
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    const local = localParts();

    let force = false;
    let actor = "System";

    try {
      const body = await req.json();
      force = body?.force === true;

      if (force && ["Admin", "Patrick", "Ober"].includes(body?.actor)) {
        actor = body.actor;
      } else if (force) {
        actor = "Admin";
      }
    } catch {
    }

    // Automatischer Sync alle 3 Stunden in Europe/Berlin:
    // 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00.
    // Der Supabase-Cron ruft die Function technisch jede volle Stunde auf.
    // Dadurch bleibt der Rhythmus auch bei Sommer-/Winterzeit korrekt.
    // Manueller Test mit force=true darf jederzeit laufen.
    if (!force && local.hour % 3 !== 0) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: "not a Berlin 3-hour sync slot",
        localHour: local.hour,
      });
    }

    const { data: run, error: runError } = await ctx.supabaseAdmin
      .from("fixture_sync_runs")
      .insert({
        local_date: local.date,
        status: "running",
      })
      .select("id")
      .single();

    if (runError) throw runError;

    try {
      const { matches, diagnostics, errors } = await fetchMatches();

      let updatedCount = 0;

      for (const m of matches) {
        if (!m.id) continue;

        const { error } = await ctx.supabaseAdmin
          .from("match_overrides")
          .upsert(
            {
              id: m.id,
              season: SEASON,
              start_date: m.start_date,
              end_date: m.end_date,
              kickoff_time: m.kickoff_time,
              opponent: m.opponent,
              home: m.home,
              possible: m.competition === "bl" ? false : m.home,
              active: true,
              source:
                m.competition === "bl"
                  ? "bundesliga.com"
                  : m.competition === "dfb"
                    ? "datencenter.dfb.de"
                    : "uefa.com",
              source_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

        if (error) throw error;
        updatedCount++;
      }

      if (matches.some((x) => x.id === "dfb04a")) {
        const { error } = await ctx.supabaseAdmin
          .from("match_overrides")
          .upsert(
            {
              id: "dfb04b",
              season: SEASON,
              active: false,
              source: "datencenter.dfb.de",
              source_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

        if (error) throw error;
      }

      const finishedAt = new Date().toISOString();

      const message = force
        ? "Manueller Spieltagssync erfolgreich"
        : "Automatischer Spieltagssync erfolgreich";

      const detailMessage =
        errors.length > 0
          ? `${message}; Teilfehler: ${errors.join(" | ")}`
          : message;

      await ctx.supabaseAdmin
        .from("fixture_sync_runs")
        .update({
          status: "success",
          finished_at: finishedAt,
          found_count: matches.length,
          updated_count: updatedCount,
          message: detailMessage,
        })
        .eq("id", run.id);

      await writeHistory(ctx.supabaseAdmin, actor, run.id, "success", {
        found_count: matches.length,
        updated_count: updatedCount,
        message: detailMessage,
        diagnostics,
        finished_at: finishedAt,
        forced: force,
      });

      return Response.json({
        ok: true,
        localDate: local.date,
        found: matches.length,
        updated: updatedCount,
        forced: force,
        diagnostics,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const finishedAt = new Date().toISOString();

      await ctx.supabaseAdmin
        .from("fixture_sync_runs")
        .update({
          status: "failed",
          finished_at: finishedAt,
          message,
        })
        .eq("id", run.id);

      await writeHistory(ctx.supabaseAdmin, actor, run.id, "failed", {
        found_count: 0,
        updated_count: 0,
        message,
        finished_at: finishedAt,
        forced: force,
      });

      console.error(message);

      return Response.json(
        { ok: false, error: message },
        { status: 500 },
      );
    }
  }),
};
