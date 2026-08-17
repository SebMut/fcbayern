from pathlib import Path

ROOT=Path('SeasonCrew')

def replace(path, old, new, label):
    p=ROOT/path
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: marker missing')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# The create dialog is intentionally closed in the public auth smoke test. Change
# the select through DOM APIs and assert its own state instead of Playwright
# visibility, which would otherwise wait for the closed dialog forever.
p=ROOT/'tests/e2e/auth.spec.js'
s=p.read_text(encoding='utf-8')
old="""test('new crews can select another club and expose a custom club name',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#newGroupClub option[value=\"custom\"]')).toHaveCount(1);
  await page.locator('#newGroupClub').selectOption('custom');
  await expect(page.locator('#newGroupClubNameRow')).toBeVisible();
  await expect(page.locator('#newGroupClubName')).toHaveAttribute('placeholder','z. B. TSV Feldkirchen');
});
"""
new="""test('new crews can select another club and expose a custom club name',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#newGroupClub option[value=\"custom\"]')).toHaveCount(1);
  await page.locator('#newGroupClub').evaluate(el=>{el.value='custom';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await expect(page.locator('#newGroupClubNameRow')).not.toHaveClass(/hidden/);
  await expect(page.locator('#newGroupClubName')).toHaveAttribute('placeholder','z. B. TSV Feldkirchen');
});
"""
if old not in s:
    raise SystemExit('club smoke test block missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')

# Use the full generic fixture model that now exists in Supabase.
replace('club-fixtures-v1.js',
"  function money(v){return v==null?'Standardpreis':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v))}\n",
"  function money(v){return v==null?'Standardpreis':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v))}\n  function competitionMeta(key){return key==='league'?{key:'league',name:'Liga'}:key==='cup'?{key:'cup',name:'Pokal'}:key==='intl'?{key:'intl',name:'International'}:{key:'other',name:'Sonstiges'}}\n",
'competition metadata')
replace('club-fixtures-v1.js',
"          <input id=\"fixtureOpponent\" maxlength=\"120\" placeholder=\"Gegner\">\n          <input id=\"fixtureDate\" type=\"date\">",
"          <input id=\"fixtureOpponent\" maxlength=\"120\" placeholder=\"Gegner\">\n          <input id=\"fixtureVenue\" maxlength=\"120\" placeholder=\"Spielort optional\">\n          <input id=\"fixtureDate\" type=\"date\">",
'fixture venue input')
replace('club-fixtures-v1.js',
"style.textContent='.manualFixtureForm{display:grid;grid-template-columns:130px 1.4fr 1.2fr 135px 100px 110px auto;gap:7px;align-items:center}.manualFixtureForm input,.manualFixtureForm select{min-width:0}.fixtureSettingMeta{display:flex;gap:7px;flex-wrap:wrap}@media(max-width:900px){.manualFixtureForm{grid-template-columns:1fr 1fr}.manualFixtureForm #fixtureLabel,.manualFixtureForm #fixtureOpponent,.manualFixtureForm #addFixtureBtn{grid-column:1/-1}}'",
"style.textContent='.manualFixtureForm{display:grid;grid-template-columns:120px 1.3fr 1.1fr 1fr 135px 100px 110px auto;gap:7px;align-items:center}.manualFixtureForm input,.manualFixtureForm select{min-width:0}.fixtureSettingMeta{display:flex;gap:7px;flex-wrap:wrap}@media(max-width:900px){.manualFixtureForm{grid-template-columns:1fr 1fr}.manualFixtureForm #fixtureLabel,.manualFixtureForm #fixtureOpponent,.manualFixtureForm #fixtureVenue,.manualFixtureForm #addFixtureBtn{grid-column:1/-1}}'",
'fixture form layout')
replace('club-fixtures-v1.js',
"c.from('sc_fixtures').select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,price_override,source,active').eq('group_id',group).eq('active',true).order('date_start')",
"c.from('sc_fixtures').select('group_id,fixture_id,competition_key,competition_name,label,date_start,date_end,time_text,opponent,venue,price_override,source,active').eq('group_id',group).eq('active',true).order('date_start')",
'fixture settings query')
replace('club-fixtures-v1.js',
"<span>${esc(f.opponent)}</span><span>${new Intl.DateTimeFormat('de-DE').format(new Date(`${f.date_start}T12:00:00`))}",
"<span>${esc(f.competition_name||competitionMeta(f.competition_key).name)} · ${esc(f.opponent)}</span>${f.venue?`<span>${esc(f.venue)}</span>`:''}<span>${new Intl.DateTimeFormat('de-DE').format(new Date(`${f.date_start}T12:00:00`))}",
'fixture settings row')
replace('club-fixtures-v1.js',
"const c=client(),group=gid(),label=$('fixtureLabel')?.value.trim(),opponent=$('fixtureOpponent')?.value.trim(),date=$('fixtureDate')?.value,time=$('fixtureTime')?.value,price=parseMoney($('fixturePrice')?.value),competition=$('fixtureCompetition')?.value||'other';",
"const c=client(),group=gid(),label=$('fixtureLabel')?.value.trim(),opponent=$('fixtureOpponent')?.value.trim(),venue=$('fixtureVenue')?.value.trim(),date=$('fixtureDate')?.value,time=$('fixtureTime')?.value,price=parseMoney($('fixturePrice')?.value),competition=$('fixtureCompetition')?.value||'other',competitionInfo=competitionMeta(competition);",
'fixture add values')
replace('club-fixtures-v1.js',
"{group_id:group,competition_key:competition,label,date_start:date,date_end:date,time_text:time||null,opponent,is_home:true,price_override:price,source:'manual',created_by:session?.user?.id||null}",
"{group_id:group,competition_key:competitionInfo.key,competition_name:competitionInfo.name,label,date_start:date,date_end:date,time_text:time||null,opponent,venue:venue||null,is_home:true,price_override:price,source:'manual',created_by:session?.user?.id||null}",
'fixture insert generic fields')
replace('club-fixtures-v1.js',
"['fixtureLabel','fixtureOpponent','fixtureDate','fixtureTime','fixturePrice']",
"['fixtureLabel','fixtureOpponent','fixtureVenue','fixtureDate','fixtureTime','fixturePrice']",
'fixture form reset')

# Main app reads the generic labels/venue and renders the selected home club.
replace('app.js',
"function competitionName(c,m=null){if(m?.manual)return c==='league'?'Liga':c==='cup'?'Pokal':c==='intl'?'International':'Sonstiges';return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':c==='cl'?'Champions League':'Sonstiges'}",
"function competitionName(c,m=null){if(m?.competition_name)return m.competition_name;if(m?.manual)return c==='league'?'Liga':c==='cup'?'Pokal':c==='intl'?'International':'Sonstiges';return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':c==='cl'?'Champions League':'Sonstiges'}",
'app competition display')
replace('app.js',
".select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,price_override,active,source')",
".select('group_id,fixture_id,competition_key,competition_name,label,date_start,date_end,time_text,opponent,venue,is_home,phase_label,possible,always_show,price_override,active,source')",
'app fixture query fields')
replace('app.js',
"p:f.phase_label||'',manual:true,price_override:f.price_override",
"p:f.venue||f.phase_label||'',competition_name:f.competition_name||'',venue:f.venue||'',manual:true,price_override:f.price_override",
'app fixture map generic fields')

# Personal/product views use the same fixture model.
replace('product-v2.js',
".select('fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,active')",
".select('fixture_id,competition_key,competition_name,label,date_start,date_end,time_text,opponent,venue,is_home,phase_label,possible,always_show,active')",
'product fixture query fields')
replace('product-v2.js',
"p:f.phase_label||'',manual:true",
"p:f.venue||f.phase_label||'',competition_name:f.competition_name||'',venue:f.venue||'',manual:true",
'product fixture map generic fields')
