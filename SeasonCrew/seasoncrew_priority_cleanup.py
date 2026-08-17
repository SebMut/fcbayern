from pathlib import Path

obsolete = [
    'auth-fallback-v5.js',
    'auth-fallback.js',
    'pricing-runtime.js',
    'supabase-esm-shim.js',
    'app-compat-loader.js',
]
for name in obsolete:
    path = Path('SeasonCrew') / name
    if path.exists():
        path.unlink()
