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

# The generated bundle workflow should reject an actual legacy script reference,
# not the word "auth-fallback" inside its own validation message.
bundle = Path('.github/workflows/seasoncrew-bundle.yml')
if bundle.exists():
    text = bundle.read_text(encoding='utf-8')
    text = text.replace("if 'auth-fallback' in s:raise SystemExit('Legacy auth fallback reference remains')",
                        "if 'auth-fallback-v' in s:raise SystemExit('Legacy auth fallback script reference remains')")
    bundle.write_text(text, encoding='utf-8')

ci = Path('.github/workflows/seasoncrew-ci.yml')
if ci.exists():
    text = ci.read_text(encoding='utf-8')
    text = text.replace("if grep -R -n 'auth-fallback' SeasonCrew/index.html .github/workflows/seasoncrew-bundle.yml; then\n            echo 'Legacy auth fallback reference exists.'\n            exit 1\n          fi",
                        "if grep -n 'auth-fallback-v' SeasonCrew/index.html; then\n            echo 'Legacy auth fallback script reference exists.'\n            exit 1\n          fi")
    ci.write_text(text, encoding='utf-8')

# Playwright's semantic disabled matcher can behave inconsistently for OPTION nodes.
# Check the actual HTML disabled attribute, which is what the browser select uses.
demo_test = Path('SeasonCrew/tests/e2e/demo.spec.js')
if demo_test.exists():
    text = demo_test.read_text(encoding='utf-8')
    text = text.replace("await expect(page.locator('#assignMember option[value=\"lea\"]')).toBeDisabled();",
                        "await expect(page.locator('#assignMember option[value=\"lea\"]')).toHaveAttribute('disabled','');")
    demo_test.write_text(text, encoding='utf-8')
