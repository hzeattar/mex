import re, json, os

BASE = r"C:\Users\AM\Documents\Codex\2026-05-06\files-mentioned-by-the-user-vertexpluse\mex\frontend\src"
I18N = BASE + r"\utils\i18n.js"

VIEWS = [
    r"views\funding.js",
    r"views\portfolio.js",
    r"views\trade.js",
    r"views\home.js",
    r"views\invest.js",
    r"views\account.js",
    r"views\kyc.js",
    r"views\news.js",
    r"views\support.js",
    r"components\layout\Shell.js",
]

def extract_t_calls(text):
    pattern = r"t\(\s*['\"]([^'\"]+)['\"](?:\s*,\s*['\"]([^'\"]*)['\"])?\s*\)"
    return re.findall(pattern, text)

def extract_builtin_keys(text, lang_label):
    keys = set()
    in_target = False
    brace_depth = 0
    for line in text.splitlines():
        stripped = line.strip()
        if f"{lang_label}: {{" in stripped:
            in_target = True
            brace_depth = stripped.count("{") - stripped.count("}")
            continue
        if in_target:
            brace_depth += stripped.count("{") - stripped.count("}")
            if brace_depth <= 0:
                in_target = False
                continue
            if stripped.startswith("'") and ":" in stripped:
                k = stripped.split(":")[0].strip().strip("'").strip('"')
                keys.add(k)
    return keys

with open(I18N, "r", encoding="utf-8") as f:
    i18n_text = f.read()

en_keys = extract_builtin_keys(i18n_text, "en")
ar_keys = extract_builtin_keys(i18n_text, "ar")

missing_from_ar = en_keys - ar_keys

print(f"TOTAL EN KEYS: {len(en_keys)}")
print(f"TOTAL AR KEYS: {len(ar_keys)}")
print(f"MISSING FROM AR: {len(missing_from_ar)}")
print("\n--- Missing Arabic Translations ---")
for key in sorted(missing_from_ar):
    print(key)
