from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected snippet not found in {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace(
    'SeasonCrew/app.js',
    "function roleLabel(r){return r==='owner'?'Owner':r==='admin'?'Admin':'Gast'}\nfunction isAdmin(){if(profile?.is_superadmin)return true;const r=memberships.get(currentGroup?.id);return r==='owner'||r==='admin'}",
    "function roleLabel(r){return r==='superadmin'?'Superadmin':r==='owner'?'Owner':r==='admin'?'Admin':'Gast'}\nfunction roleView(){return window.SeasonCrewRoleView?.get(profile?.is_superadmin)||null}\nfunction effectiveRole(){return roleView()||memberships.get(currentGroup?.id)||'guest'}\nfunction isAdmin(){return ['superadmin','owner','admin'].includes(effectiveRole())}"
)
replace(
    'SeasonCrew/app.js',
    "els.groupTitle.textContent=currentGroup.name;els.clubName.textContent=currentGroup.club_name;els.memberRole.textContent=profile?.is_superadmin?'Superadmin':roleLabel(memberships.get(currentGroup.id));",
    "els.groupTitle.textContent=currentGroup.name;els.clubName.textContent=currentGroup.club_name;els.memberRole.textContent=roleLabel(effectiveRole());"
)

replace(
    'SeasonCrew/features-v1.js',
    "  function currentRole(){return state?.members.find(m=>m.user_id===session?.user?.id)?.role||null}\n  function isManager(){return !!state?.profile?.is_superadmin||currentRole()==='owner'}\n  function canAllocate(){return !!state?.profile?.is_superadmin||['owner','admin'].includes(currentRole())}",
    "  function currentRole(){const view=window.SeasonCrewRoleView?.get(state?.profile?.is_superadmin);if(view)return view;return state?.members.find(m=>m.user_id===session?.user?.id)?.role||null}\n  function isManager(){return ['superadmin','owner'].includes(currentRole())}\n  function canAllocate(){return ['superadmin','owner','admin'].includes(currentRole())}"
)

replace(
    'SeasonCrew/product-v2.js',
    "  function role(){return state?.members.find(m=>m.user_id===session?.user?.id)?.role||null}\n  function admin(){return !!state?.profile?.is_superadmin||['owner','admin'].includes(role())}\n  function owner(){return !!state?.profile?.is_superadmin||role()==='owner'}",
    "  function role(){const view=window.SeasonCrewRoleView?.get(state?.profile?.is_superadmin);if(view)return view;return state?.members.find(m=>m.user_id===session?.user?.id)?.role||null}\n  function admin(){return ['superadmin','owner','admin'].includes(role())}\n  function owner(){return ['superadmin','owner'].includes(role())}"
)

replace(
    'SeasonCrew/crew-delete.js',
    "link.href='./features-v1.css?v=1'",
    "link.href='./features-v1.css?v=1'"
)
replace(
    'SeasonCrew/crew-delete.js',
    "script.src='./features-v1.js?v=1'",
    "script.src='./features-v1.js?v=2'"
)
replace(
    'SeasonCrew/crew-delete.js',
    "script.src='./product-v2.js?v=2'",
    "script.src='./product-v2.js?v=3'"
)

replace(
    'SeasonCrew/index.html',
    '<link rel="stylesheet" href="crew-settings-button.css?v=1">',
    '<link rel="stylesheet" href="crew-settings-button.css?v=1">\n  <link rel="stylesheet" href="role-switcher.css?v=1">'
)
replace(
    'SeasonCrew/index.html',
    '<small class="authFoot">Pilot V1 · Build product-v2-2 · Multi-User · Freigabe-Workflow</small>',
    '<small class="authFoot">Pilot V1 · Build product-v2-4 · Multi-User · Freigabe-Workflow</small>'
)
replace(
    'SeasonCrew/index.html',
    '<script src="ui-v2.js?v=4"></script>',
    '<script src="role-switcher.js?v=1"></script>\n  <script src="ui-v2.js?v=4"></script>'
)
replace(
    'SeasonCrew/index.html',
    "import('./app.js?v=20260816-usernameonly1')",
    "import('./app.js?v=20260817-roleview1')"
)
