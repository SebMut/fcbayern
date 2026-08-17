from pathlib import Path

ROOT=Path('SeasonCrew')

def rep(path,old,new,label):
    p=ROOT/path;s=p.read_text(encoding='utf-8')
    if old not in s: raise SystemExit(f'{label}: marker missing')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# Generic fixture editor: competition label + optional venue.
rep('club-fixtures-v1.js',
"  function money(v){return v==null?'Standardpreis':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v))}\n",
"  function money(v){return v==null?'Standardpreis':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v))}\n  function competitionMeta(key){return key==='league'?{key:'league',name:'Liga'}:key==='cup'?{key:'cup',name:'Pokal'}:key==='intl'?{key:'intl',name:'International'}:{key:'other',name:'Sonstiges'}}\n",
'competition metadata')
rep('club-fixtures-v1.js',
"          <input id=\"fixtureOpponent\" maxlength=\"120\" placeholder=\"Gegner\">\n          <input id=\"fixtureDate\" type=\"date\">",
"          <input id=\"fixtureOpponent\" maxlength=\"120\" placeholder=\"Gegner\">\n          <input id=\"fixtureVenue\" maxlength=\"120\" placeholder=\"Spielort optional\">\n          <input id=\"fixtureDate\" type=\"date\">",
'fixture venue input')
rep('club-fixtures-v1.js',
"style.textContent='.manualFixtureForm{display:grid;grid-template-columns:130px 1.4fr 1.2fr 135px 100px 110px auto;gap:7px;align-items:center}.manualFixtureForm input,.manualFixtureForm select{min-width:0}.fixtureSettingMeta{display:flex;gap:7px;flex-wrap:wrap}@media(max-width:900px){.manualFixtureForm{grid-template-columns:1fr 1fr}.manualFixtureForm #fixtureLabel,.manualFixtureForm #fixtureOpponent,.manualFixtureForm #addFixtureBtn{grid-column:1/-1}}'",
"style.textContent='.manualFixtureForm{display:grid;grid-template-columns:120px 1.3fr 1.1fr 1fr 135px 100px 110px auto;gap:7px;align-items:center}.manualFixtureForm input,.manualFixtureForm select{min-width:0}.fixtureSettingMeta{display:flex;gap:7px;flex-wrap:wrap}@media(max-width:900px){.manualFixtureForm{grid-template-columns:1fr 1fr}.manualFixtureForm #fixtureLabel,.manualFixtureForm #fixtureOpponent,.manualFixtureForm #fixtureVenue,.manualFixtureForm #addFixtureBtn{grid-column:1/-1}}'",
'fixture layout')
rep('club-fixtures-v1.js',
"c.from('sc_fixtures').select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,price_override,source,active').eq('group_id',group).eq('active',true).order('date_start')",
"c.from('sc_fixtures').select('group_id,fixture_id,competition_key,competition_name,label,date_start,date_end,time_text,opponent,venue,price_override,source,active').eq('group_id',group).eq('active',true).order('date_start')",
'fixture editor query')
rep('club-fixtures-v1.js',
"<span>${esc(f.opponent)}</span><span>${new Intl.DateTimeFormat('de-DE').format(new Date(`${f.date_start}T12:00:00`))}",
"<span>${esc(f.competition_name||competitionMeta(f.competition_key).name)} · ${esc(f.opponent)}</span>${f.venue?`<span>${esc(f.venue)}</span>`:''}<span>${new Intl.DateTimeFormat('de-DE').format(new Date(`${f.date_start}T12:00:00`))}",
'fixture row labels')
rep('club-fixtures-v1.js',
"const c=client(),group=gid(),label=$('fixtureLabel')?.value.trim(),opponent=$('fixtureOpponent')?.value.trim(),date=$('fixtureDate')?.value,time=$('fixtureTime')?.value,price=parseMoney($('fixturePrice')?.value),competition=$('fixtureCompetition')?.value||'other';",
"const c=client(),group=gid(),label=$('fixtureLabel')?.value.trim(),opponent=$('fixtureOpponent')?.value.trim(),venue=$('fixtureVenue')?.value.trim(),date=$('fixtureDate')?.value,time=$('fixtureTime')?.value,price=parseMoney($('fixturePrice')?.value),competition=$('fixtureCompetition')?.value||'other',competitionInfo=competitionMeta(competition);",
'fixture values')
rep('club-fixtures-v1.js',
"{group_id:group,competition_key:competition,label,date_start:date,date_end:date,time_text:time||null,opponent,is_home:true,price_override:price,source:'manual',created_by:session?.user?.id||null}",
"{group_id:group,competition_key:competitionInfo.key,competition_name:competitionInfo.name,label,date_start:date,date_end:date,time_text:time||null,opponent,venue:venue||null,is_home:true,price_override:price,source:'manual',created_by:session?.user?.id||null}",
'fixture insert')
rep('club-fixtures-v1.js',
"['fixtureLabel','fixtureOpponent','fixtureDate','fixtureTime','fixturePrice']",
"['fixtureLabel','fixtureOpponent','fixtureVenue','fixtureDate','fixtureTime','fixturePrice']",
'fixture reset')

# Main app consumes generic fixture metadata.
rep('app.js',
"function competitionName(c,m=null){if(m?.manual)return c==='league'?'Liga':c==='cup'?'Pokal':c==='intl'?'International':'Sonstiges';return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':c==='cl'?'Champions League':'Sonstiges'}",
"function competitionName(c,m=null){if(m?.competition_name)return m.competition_name;if(m?.manual)return c==='league'?'Liga':c==='cup'?'Pokal':c==='intl'?'International':'Sonstiges';return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':c==='cl'?'Champions League':'Sonstiges'}",
'app competition')
rep('app.js',
".select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,price_override,active,source')",
".select('group_id,fixture_id,competition_key,competition_name,label,date_start,date_end,time_text,opponent,venue,is_home,phase_label,possible,always_show,price_override,active,source')",
'app fixture query')
rep('app.js',
"p:f.phase_label||'',manual:true,price_override:f.price_override",
"p:f.venue||f.phase_label||'',competition_name:f.competition_name||'',venue:f.venue||'',manual:true,price_override:f.price_override",
'app fixture mapping')

# Product/personal views consume the same generic metadata.
rep('product-v2.js',
".select('fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,active')",
".select('fixture_id,competition_key,competition_name,label,date_start,date_end,time_text,opponent,venue,is_home,phase_label,possible,always_show,active')",
'product query')
rep('product-v2.js',
"p:f.phase_label||'',manual:true",
"p:f.venue||f.phase_label||'',competition_name:f.competition_name||'',venue:f.venue||'',manual:true",
'product mapping')

# Custom clubs use per-game/default pricing, so hide Bayern-specific round pricing UI.
p=ROOT/'price-management.js';s=p.read_text(encoding='utf-8')
old="const [{data,error}]=await Promise.all([sb.from('sc_groups').select('id,default_price,price_rules').eq('id',gid).single(),loadFixtures()]);"
new="const [{data,error}]=await Promise.all([sb.from('sc_groups').select('id,club_key,default_price,price_rules').eq('id',gid).single(),loadFixtures()]);"
if old not in s: raise SystemExit('price group query marker missing')
s=s.replace(old,new,1)
old="groupData=data;fillFixtureSelect();fillValues();setStatus('');"
new="groupData=data;section.classList.toggle('genericClubPrices',groupData.club_key!=='fcbayern');fillFixtureSelect();fillValues();setStatus(groupData.club_key!=='fcbayern'?'Für diesen Verein gilt der Standardpreis; individuelle Spielpreise legst du unter Eigene Heimspiele fest.':'');"
if old not in s: raise SystemExit('price generic state marker missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# A tiny style keeps the legacy round blocks out of custom-club settings.
p=ROOT/'price-management.css';s=p.read_text(encoding='utf-8')
if '.genericClubPrices' not in s:
    s += "\n.genericClubPrices .priceCompetition:not(.priceCompetitionBl){display:none!important}.genericClubPrices .priceManagementHead p{max-width:760px}\n"
p.write_text(s,encoding='utf-8')
