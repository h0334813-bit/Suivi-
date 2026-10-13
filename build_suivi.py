#!/usr/bin/env python3
"""Génère suivi_cours_risque.html à partir du cours (Markdown) et des sources de suivi_src/.

Usage : python3 build_suivi.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "suivi_src"

md = (ROOT / "cours_statistiques_du_risque_M1.md").read_text(encoding="utf-8")

# Découpage par titres "## N. ..."
parts = re.split(r"^## ", md, flags=re.M)
sections = {}
for p in parts[1:]:
    head, _, body = p.partition("\n")
    m = re.match(r"(\d+)\.", head)
    if m:
        sections[int(m.group(1))] = (head, body)

def clean(body):
    body = body.strip()
    body = re.sub(r"\n---\s*$", "", body).strip()
    return body

lessons = []
for n in range(1, 12):
    lessons.append(clean(sections[n][1]))
# Séance 12 : ruine + simulation
lessons.append(clean(sections[12][1]) + "\n\n---\n\n## Simulation et rééchantillonnage\n\n" + clean(sections[13][1]))

# Plan : texte d'introduction (avant la section 1) et section 0
intro = parts[0]
plan = clean(sections[0][1])
docs = {
    "plan": plan,
    "eval": clean(sections[15][1]),
    "biblio": clean(sections[16][1]),
}

def js_json(obj):
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")

data = "const LESSONS=%s;\nconst DOCS=%s;" % (js_json(lessons), js_json(docs))

tpl = (SRC / "template.html").read_text(encoding="utf-8")
out = (tpl.replace("/*__CSS__*/", (SRC / "style.css").read_text(encoding="utf-8"))
          .replace("/*__DATA__*/", data)
          .replace("/*__QUIZ__*/", (SRC / "quiz.js").read_text(encoding="utf-8"))
          .replace("/*__EX__*/", (SRC / "exercices.js").read_text(encoding="utf-8"))
          .replace("/*__APP__*/", (SRC / "app.js").read_text(encoding="utf-8")))
(ROOT / "suivi_cours_risque.html").write_text(out, encoding="utf-8")
print("suivi_cours_risque.html généré (%d Ko)" % (len(out.encode()) // 1024))
