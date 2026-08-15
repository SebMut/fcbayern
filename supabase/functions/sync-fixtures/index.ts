import { withSupabase } from "npm:@supabase/server@1.4.1";
import * as cheerio from "npm:cheerio@1.2.0";

const SEASON = "2026-27";
const START_YEAR = 2026;
const TZ = "Europe/Berlin";
const BAYERN = "Bayern Munich";

const SOURCES = [
  "https://fcbayern.com/en/match-center/matchplan/profis/bundesliga/2026-2027",
  "https://fcbayern.com/en/match-center/matchplan/profis/dfb-pokal/2026-2027",
  "https://fcbayern.com/en/match-center/matchplan/profis/champions-league/2026-2027",
];

type ParsedMatch = {
  competition: "bl" | "dfb" | "cl";
  round: string;
  start_date: string;
  end_date: string;
  kickoff_time: string | null;
  opponent: string;
  home: boolean;
  exact: boolean;
};

const DAY = "(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)";
const MATCH_RE = new RegExp(
  DAY + "\\s+(\\d{2})/(\\d{2})" +
  "(?:\\s*-\\s*" + DAY + "\\s+(\\d{2})/(\\d{2}))?" +
  "(?:\\s+(\\d{2}:\\d{2}))?" +
  "\\s+Match\\s+(.+?)\\s+vs\\s+(.+?)\\s+" +
  "(Bundesliga|DFB Cup|Champions League)\\s+-\\s+" +
  "(Matchday\\s+\\d+|Round\\s+\\d+|Round of 16|Quarter-finals|Semi-finals|Final|Play-offs?|Knockout phase play-offs?)",
  "gi",
);

function localParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

function isoDate(day: string, month: string) {
  const m = Number(month);
  const year = m >= 7 ? START_YEAR : START_YEAR + 1;
  return `${year}-${String(m).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function cleanTeam(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function parsePage(html: string): ParsedMatch[] {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const result: ParsedMatch[] = [];

  MATCH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATCH_RE.exec(text))) {
    const [, d1, mo1, d2, mo2, time, homeRaw, awayRaw, compRaw, round] = m;
    const homeTeam = cleanTeam(homeRaw);
    const awayTeam = cleanTeam(awayRaw);

    if (homeTeam !== BAYERN && awayTeam !== BAYERN) continue;

    const competition =
      compRaw === "Bundesliga" ? "bl" :
      compRaw === "DFB Cup" ? "dfb" : "cl";

    result.push({
      competition,
      round: round.trim(),
      start_date: isoDate(d1, mo1),
      end_date: d2 && mo2 ? isoDate(d2, mo2) : isoDate(d1, mo1),
      kickoff_time: time ?? null,
      opponent: homeTeam === BAYERN ? awayTeam : homeTeam,
      home: homeTeam === BAYERN,
      exact: Boolean(time && !d2),
    });
  }
  return result;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function mappedRows(matches: ParsedMatch[]) {
  const updates: Array<ParsedMatch & { id: string }> = [];

  for (const m of matches.filter((x) => x.competition === "bl")) {
    const md = Number(m.round.match(/\d+/)?.[0]);
    if (md >= 1 && md <= 34) updates.push({ ...m, id: `bl${pad2(md)}` });
  }

  const dfbMap: Record<string, string> = {
    "Round 1": "dfb01",
    "Round 2": "dfb02",
    "Round of 16": "dfb03",
    "Quarter-finals": "dfb04a",
    "Semi-finals": "dfb05",
    "Final": "dfb06",
  };
  for (const m of matches.filter((x) => x.competition === "dfb")) {
    const id = dfbMap[m.round];
    if (id) updates.push({ ...m, id });
  }

  for (const m of matches.filter((x) => x.competition === "cl" && /^Matchday \d+$/.test(x.round))) {
    const md = Number(m.round.match(/\d+/)?.[0]);
    if (md >= 1 && md <= 8) updates.push({ ...m, id: `cl${pad2(md)}` });
  }

  const stageMappings = [
    { names: ["Play-off", "Play-offs", "Knockout phase play-off", "Knockout phase play-offs"], ids: ["clpo1", "clpo2"] },
    { names: ["Round of 16"], ids: ["clr161", "clr162"] },
    { names: ["Quarter-finals"], ids: ["clqf1", "clqf2"] },
    { names: ["Semi-finals"], ids: ["clsf1", "clsf2"] },
    { names: ["Final"], ids: ["clfinal"] },
  ];

  for (const stage of stageMappings) {
    const stageMatches = matches
      .filter((x) => x.competition === "cl" && stage.names.includes(x.round))
      .sort((a, b) => `${a.start_date} ${a.kickoff_time ?? ""}`.localeCompare(`${b.start_date} ${b.kickoff_time ?? ""}`));

    stageMatches.slice(0, stage.ids.length).forEach((m, i) => {
      updates.push({ ...m, id: stage.ids[i] });
    });
  }

  return updates;
}

async function fetchMatches() {
  const all: ParsedMatch[] = [];
  for (const url of SOURCES) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "FCBayern-Ober-Fixture-Sync/1.0 (+private season planner)",
        "Accept-Language": "en",
      },
    });
    if (!response.ok) throw new Error(`FC Bayern source returned ${response.status}: ${url}`);
    all.push(...parsePage(await response.text()));
  }

  const seen = new Set<string>();
  return all.filter((m) => {
    const key = [m.competition, m.round, m.start_date, m.kickoff_time, m.opponent, m.home].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    const local = localParts();

    if (local.hour < 2 || local.hour > 3) {
      return Response.json({ ok: true, skipped: true, reason: "outside Berlin 02:00/03:00 window" });
    }

    const { data: already } = await ctx.supabaseAdmin
      .from("fixture_sync_runs")
      .select("id")
      .eq("local_date", local.date)
      .eq("status", "success")
      .limit(1);

    if (already?.length) {
      return Response.json({ ok: true, skipped: true, reason: "already synced today" });
    }

    const { data: run, error: runError } = await ctx.supabaseAdmin
      .from("fixture_sync_runs")
      .insert({ local_date: local.date, status: "running" })
      .select("id")
      .single();

    if (runError) throw runError;

    try {
      const parsed = await fetchMatches();
      const updates = mappedRows(parsed);
      let updatedCount = 0;

      for (const m of updates) {
        const { error } = await ctx.supabaseAdmin
          .from("matches")
          .update({
            start_date: m.start_date,
            end_date: m.end_date,
            kickoff_time: m.kickoff_time,
            opponent: m.opponent,
            home: m.home,
            exact: m.exact,
            possible: false,
            source: "fcbayern.com",
            source_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("season", SEASON)
          .eq("id", m.id);

        if (error) throw error;
        updatedCount++;
      }

      if (updates.some((x) => x.id === "dfb04a")) {
        await ctx.supabaseAdmin
          .from("matches")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("id", "dfb04b")
          .eq("season", SEASON);
      }

      await ctx.supabaseAdmin
        .from("fixture_sync_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          found_count: parsed.length,
          updated_count: updatedCount,
          message: "Official FC Bayern pages parsed successfully",
        })
        .eq("id", run.id);

      return Response.json({
        ok: true,
        localDate: local.date,
        found: parsed.length,
        updated: updatedCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.supabaseAdmin
        .from("fixture_sync_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          message,
        })
        .eq("id", run.id);

      console.error(message);
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }),
};
