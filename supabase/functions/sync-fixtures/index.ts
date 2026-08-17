import { withSupabase } from "npm:@supabase/server@^1";

const SEASON = "2026-27";
const OPENLIGA_SEASON = "2026";
const TZ = "Europe/Berlin";
const API = "https://api.openligadb.de";
const TEAM_FILTER = "Bayern";
const TRUST_OPENLIGA_WITHIN_DAYS = 21;

type Competition = "bl" | "dfb" | "cl";
type ParsedMatch = {
  id: string;
  competition: Competition;
  start_date: string;
  end_date: string;
  kickoff_time: string | null;
  opponent: string;
  home: boolean;
  possible: boolean;
  source: string;
};

type SourceResult = { source: string; matches: ParsedMatch[]; error?: string };

const BL_WINDOWS: Record<string, { start: string; end: string; time: string | null }> = {
  bl01:{start:"2026-08-28",end:"2026-08-28",time:"20:30"},
  bl02:{start:"2026-09-05",end:"2026-09-05",time:"18:30"},
  bl03:{start:"2026-09-13",end:"2026-09-13",time:"17:30"},
  bl04:{start:"2026-09-18",end:"2026-09-18",time:"20:30"},
  bl05:{start:"2026-10-09",end:"2026-10-11",time:null},
  bl06:{start:"2026-10-16",end:"2026-10-18",time:null},
  bl07:{start:"2026-10-23",end:"2026-10-25",time:null},
  bl08:{start:"2026-10-30",end:"2026-11-01",time:null},
  bl09:{start:"2026-11-06",end:"2026-11-08",time:null},
  bl10:{start:"2026-11-20",end:"2026-11-22",time:null},
  bl11:{start:"2026-11-27",end:"2026-11-29",time:null},
  bl12:{start:"2026-12-04",end:"2026-12-06",time:null},
  bl13:{start:"2026-12-11",end:"2026-12-13",time:null},
  bl14:{start:"2026-12-18",end:"2026-12-20",time:null},
  bl15:{start:"2027-01-08",end:"2027-01-10",time:null},
  bl16:{start:"2027-01-12",end:"2027-01-14",time:null},
  bl17:{start:"2027-01-15",end:"2027-01-17",time:null},
  bl18:{start:"2027-01-22",end:"2027-01-24",time:null},
  bl19:{start:"2027-01-29",end:"2027-01-31",time:null},
  bl20:{start:"2027-02-05",end:"2027-02-07",time:null},
  bl21:{start:"2027-02-12",end:"2027-02-14",time:null},
  bl22:{start:"2027-02-19",end:"2027-02-21",time:null},
  bl23:{start:"2027-02-26",end:"2027-02-28",time:null},
  bl24:{start:"2027-03-02",end:"2027-03-04",time:null},
  bl25:{start:"2027-03-05",end:"2027-03-07",time:null},
  bl26:{start:"2027-03-12",end:"2027-03-14",time:null},
  bl27:{start:"2027-03-19",end:"2027-03-21",time:null},
  bl28:{start:"2027-04-02",end:"2027-04-04",time:null},
  bl29:{start:"2027-04-09",end:"2027-04-11",time:null},
  bl30:{start:"2027-04-16",end:"2027-04-18",time:null},
  bl31:{start:"2027-04-23",end:"2027-04-25",time:null},
  bl32:{start:"2027-05-07",end:"2027-05-09",time:null},
  bl33:{start:"2027-05-14",end:"2027-05-16",time:null},
  bl34:{start:"2027-05-22",end:"2027-05-22",time:"15:30"},
};

const DFB_SLOTS = [
  ["dfb01", "2026-09-02"], ["dfb02", "2026-10-27"], ["dfb03", "2026-12-01"],
  ["dfb04a", "2027-02-02"], ["dfb04b", "2027-02-09"], ["dfb05", "2027-04-20"],
  ["dfb06", "2027-05-29"],
] as const;

const CL_SLOTS = [
  ["cl01","2026-09-08"],["cl02","2026-10-13"],["cl03","2026-10-20"],["cl04","2026-11-03"],
  ["cl05","2026-11-24"],["cl06","2026-12-08"],["cl07","2027-01-19"],["cl08","2027-01-27"],
  ["clpo1","2027-02-16"],["clpo2","2027-02-23"],["clr161","2027-03-09"],["clr162","2027-03-16"],
  ["clqf1","2027-04-06"],["clqf2","2027-04-13"],["clsf1","2027-04-27"],["clsf2","2027-05-04"],
  ["clfinal","2027-06-05"],
] as const;

function localParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const get=(type:string)=>parts.find((p)=>p.type===type)?.value??"";
  return {date:`${get("year")}-${get("month")}-${get("day")}`,hour:Number(get("hour"))};
}

function value(obj:any,...keys:string[]){for(const key of keys){const v=obj?.[key];if(v!==undefined&&v!==null)return v}return null}
function teamName(team:any):string{return String(value(team,"teamName","TeamName","shortName","ShortName")??"").trim()}
function isBayern(name:string){return /(?:fc\s+)?bayern(?:\s+m(?:ü|u)nchen|\s+munich)?/i.test(name.trim())}
function cleanTeam(name:string){return name.replace(/^FC Bayern Munich$/i,"FC Bayern München").replace(/^Bayern Munich$/i,"FC Bayern München").replace(/^Bayern München$/i,"FC Bayern München").trim()}

function berlinDateTimeFromUtc(raw:string){
  const d=new Date(raw);if(Number.isNaN(d.getTime()))return null;
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);
  const get=(type:string)=>parts.find((p)=>p.type===type)?.value??"";
  return {date:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")}:${get("minute")}`};
}
function localOpenLigaDateTime(raw:string){const m=raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return m?{date:m[1],time:m[2]}:null}
function matchDateTime(match:any){
  const utc=String(value(match,"matchDateTimeUTC","MatchDateTimeUTC")??"").trim();if(utc){const parsed=berlinDateTimeFromUtc(utc);if(parsed)return parsed}
  const local=String(value(match,"matchDateTime","MatchDateTime")??"").trim();return local?localOpenLigaDateTime(local):null;
}
function groupOrder(match:any):number|null{const group=value(match,"group","Group");const raw=value(group,"groupOrderID","GroupOrderID","groupOrderId","GroupOrderId");const n=Number(raw);return Number.isFinite(n)?n:null}
function dateDistance(a:string,b:string){return Math.abs(new Date(`${a}T12:00:00Z`).getTime()-new Date(`${b}T12:00:00Z`).getTime())}
function daysUntil(date:string,today:string){return Math.floor((new Date(`${date}T12:00:00Z`).getTime()-new Date(`${today}T12:00:00Z`).getTime())/86400000)}

function assignNearestSlots(rows:Array<Omit<ParsedMatch,"id">>,slots:readonly(readonly[string,string])[],maxDays:number):ParsedMatch[]{
  const free=new Set(slots.map(([id])=>id));const result:ParsedMatch[]=[];
  for(const row of [...rows].sort((a,b)=>a.start_date.localeCompare(b.start_date))){
    const candidates=slots.filter(([id])=>free.has(id)).map(([id,baseline])=>({id,distance:dateDistance(row.start_date,baseline)})).sort((a,b)=>a.distance-b.distance);
    const best=candidates[0];if(best&&best.distance<=maxDays*86400000){free.delete(best.id);result.push({...row,id:best.id})}
  }return result;
}

async function fetchOpenLiga(shortcut:string){
  const url=`${API}/getmatchdata/${encodeURIComponent(shortcut)}/${OPENLIGA_SEASON}/${encodeURIComponent(TEAM_FILTER)}`;
  const response=await fetch(url,{headers:{Accept:"application/json","User-Agent":"SeasonCrew/1.0 (fixture sync; OpenLigaDB)"}});
  if(!response.ok)throw new Error(`${shortcut}: HTTP ${response.status} ${response.statusText}`);
  const data=await response.json();if(!Array.isArray(data))throw new Error(`${shortcut}: unerwartetes API-Format`);return data;
}

function normalizeOpenLigaMatch(match:any,competition:Competition,shortcut:string):Omit<ParsedMatch,"id">|null{
  const homeName=cleanTeam(teamName(value(match,"team1","Team1")));const awayName=cleanTeam(teamName(value(match,"team2","Team2")));
  if(!homeName||!awayName||(!isBayern(homeName)&&!isBayern(awayName)))return null;const dt=matchDateTime(match);if(!dt)return null;
  return {competition,start_date:dt.date,end_date:dt.date,kickoff_time:dt.time||null,opponent:isBayern(homeName)?awayName:homeName,home:isBayern(homeName),possible:false,source:`openligadb.de:${shortcut}`};
}

async function loadBundesliga(today:string):Promise<SourceResult>{
  const source="openligadb.de:bl1";
  try{
    const raw=await fetchOpenLiga("bl1");const matches:ParsedMatch[]=[];
    for(const item of raw){
      const row=normalizeOpenLigaMatch(item,"bl","bl1");const order=groupOrder(item);if(!row||!order||order<1||order>34)continue;
      const id=`bl${String(order).padStart(2,"0")}`;const baseline=BL_WINDOWS[id];if(!baseline)continue;
      const baselineAlreadyExact=baseline.start===baseline.end&&Boolean(baseline.time);
      const closeEnough=daysUntil(row.start_date,today)<=TRUST_OPENLIGA_WITHIN_DAYS;
      if(baselineAlreadyExact||closeEnough){matches.push({...row,id,possible:false})}
      else{matches.push({...row,id,start_date:baseline.start,end_date:baseline.end,kickoff_time:null,possible:true})}
    }
    return {source,matches};
  }catch(error){return {source,matches:[],error:error instanceof Error?error.message:String(error)}}
}

async function loadCup(shortcut:string,competition:"dfb"|"cl"):Promise<SourceResult>{
  const source=`openligadb.de:${shortcut}`;
  try{
    const raw=await fetchOpenLiga(shortcut);const rows=raw.map((item:any)=>normalizeOpenLigaMatch(item,competition,shortcut)).filter(Boolean) as Array<Omit<ParsedMatch,"id">>;
    const matches=competition==="dfb"?assignNearestSlots(rows,DFB_SLOTS,18):assignNearestSlots(rows,CL_SLOTS,14);return {source,matches};
  }catch(error){return {source,matches:[],error:error instanceof Error?error.message:String(error)}}
}

async function fetchMatches(today:string){
  const results=await Promise.all([loadBundesliga(today),loadCup("dfb","dfb"),loadCup("ucl","cl")]);
  const errors=results.filter((x)=>x.error).map((x)=>`${x.source}: ${x.error}`);if(results.every((x)=>x.error))throw new Error(`OpenLigaDB fehlgeschlagen: ${errors.join(" | ")}`);
  const dedup=new Map<string,ParsedMatch>();for(const match of results.flatMap((x)=>x.matches))dedup.set(match.id,match);
  return {matches:[...dedup.values()],diagnostics:results.map((x)=>({source:x.source,count:x.matches.length,error:x.error??null})),errors};
}

async function writeHistory(supabaseAdmin:any,actor:string,runId:number,status:"success"|"failed",payload:Record<string,unknown>){
  const {error}=await supabaseAdmin.from("history_log").insert({actor_name:actor,entity_type:"sync_run",entity_id:String(runId),before_data:{},after_data:{status,...payload}});if(error)console.error("history_log:",error.message);
}

export default {fetch:withSupabase({auth:"secret"},async(req,ctx)=>{
  const local=localParts();let force=false;let actor="Admin";try{const body=await req.json();force=body?.force===true;if(force&&["Admin","Patrick","Ober","Tom"].includes(body?.actor))actor=body.actor}catch{}
  if(!force&&local.hour%3!==0)return Response.json({ok:true,skipped:true,localDate:local.date,localHour:local.hour,reason:"outside Berlin 3-hour schedule"});
  const {data:run,error:runError}=await ctx.supabaseAdmin.from("fixture_sync_runs").insert({local_date:local.date,status:"running"}).select("id").single();if(runError)throw runError;
  try{
    const {matches,diagnostics,errors}=await fetchMatches(local.date);let updatedCount=0;
    for(const m of matches){const {error}=await ctx.supabaseAdmin.from("match_overrides").upsert({id:m.id,season:SEASON,start_date:m.start_date,end_date:m.end_date,kickoff_time:m.kickoff_time,opponent:m.opponent,home:m.home,possible:m.possible,active:true,source:m.source,source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;updatedCount++}
    const finishedAt=new Date().toISOString();const baseMessage=force?"Manueller OpenLigaDB-Spieltagssync erfolgreich":"Automatischer OpenLigaDB-Spieltagssync erfolgreich";const message=errors.length?`${baseMessage}; Teilfehler: ${errors.join(" | ")}`:baseMessage;
    await ctx.supabaseAdmin.from("fixture_sync_runs").update({status:"success",finished_at:finishedAt,found_count:matches.length,updated_count:updatedCount,message}).eq("id",run.id);
    await writeHistory(ctx.supabaseAdmin,actor,run.id,"success",{provider:"OpenLigaDB",license:"ODbL-1.0",found_count:matches.length,updated_count:updatedCount,message,diagnostics,finished_at:finishedAt,forced:force,berlin_hour:local.hour,confirmation_window_days:TRUST_OPENLIGA_WITHIN_DAYS});
    return Response.json({ok:true,provider:"OpenLigaDB",license:"ODbL-1.0",localDate:local.date,localHour:local.hour,found:matches.length,updated:updatedCount,forced:force,diagnostics});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);const finishedAt=new Date().toISOString();await ctx.supabaseAdmin.from("fixture_sync_runs").update({status:"failed",finished_at:finishedAt,message}).eq("id",run.id);await writeHistory(ctx.supabaseAdmin,actor,run.id,"failed",{provider:"OpenLigaDB",found_count:0,updated_count:0,message,finished_at:finishedAt,forced:force,berlin_hour:local.hour});console.error(message);return Response.json({ok:false,provider:"OpenLigaDB",error:message},{status:500});
  }
})};