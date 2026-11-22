/* Moteur de jointures + générateurs de code + schéma de Venn */
const eqKey = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && a === b;

/* L, R : tableaux d'objets. Retourne des enregistrements {l, r, st} (st = match | left | right) */
function runJoin(L, R, lk, rk, type) {
  const recs = [];
  if (type === 'cross') {
    L.forEach(l => R.forEach(r => recs.push({ l, r, st: 'match' })));
    return recs;
  }
  const usedR = new Set();
  L.forEach(l => {
    let found = false;
    R.forEach((r, j) => {
      if (eqKey(l[lk], r[rk])) {
        found = true; usedR.add(j);
        if (type !== 'semi' && type !== 'left_anti' && type !== 'right_anti') recs.push({ l, r, st: 'match' });
      }
    });
    if (found && type === 'semi') recs.push({ l, r: null, st: 'match' });
    if (!found && ['left', 'full', 'left_anti'].includes(type)) recs.push({ l, r: null, st: 'left' });
  });
  if (['right', 'full', 'right_anti'].includes(type)) {
    R.forEach((r, j) => { if (!usedR.has(j)) recs.push({ l: null, r, st: 'right' }); });
  }
  return recs;
}

/* Quelles lignes d'une table ont (ou non) une correspondance dans l'autre ? */
function matchFlags(rows, key, other, okey) {
  return rows.map(x => other.some(o => eqKey(x[key], o[okey])));
}

/* Nombre de lignes attendu, pour le mode entraînement */
function countJoin(lt, rt, lk, rk, type) {
  return runJoin(DB[lt].rows, DB[rt].rows, lk, rk, type).length;
}

/* ---------- Générateurs de code ---------- */
function codeFor(type, lt, rt, lk, rk) {
  const same = lk === rk;
  const on = `l.${lk} = r.${rk}`;
  const sql = {
    inner: `SELECT *\nFROM ${lt} l\nINNER JOIN ${rt} r ON ${on};`,
    left: `SELECT *\nFROM ${lt} l\nLEFT JOIN ${rt} r ON ${on};`,
    right: `SELECT *\nFROM ${lt} l\nRIGHT JOIN ${rt} r ON ${on};`,
    full: `SELECT *\nFROM ${lt} l\nFULL OUTER JOIN ${rt} r ON ${on};`,
    left_anti: `SELECT l.*\nFROM ${lt} l\nLEFT JOIN ${rt} r ON ${on}\nWHERE r.${rk} IS NULL;`,
    right_anti: `SELECT r.*\nFROM ${lt} l\nRIGHT JOIN ${rt} r ON ${on}\nWHERE l.${lk} IS NULL;`,
    semi: `SELECT l.*\nFROM ${lt} l\nWHERE EXISTS (\n  SELECT 1 FROM ${rt} r WHERE ${on}\n);`,
    cross: `SELECT *\nFROM ${lt}\nCROSS JOIN ${rt};`
  }[type];
  const pyOn = same ? `on="${lk}"` : `left_on="${lk}", right_on="${rk}"`;
  const py = {
    inner: `${lt}.merge(${rt}, ${pyOn}, how="inner")`,
    left: `${lt}.merge(${rt}, ${pyOn}, how="left")`,
    right: `${lt}.merge(${rt}, ${pyOn}, how="right")`,
    full: `${lt}.merge(${rt}, ${pyOn}, how="outer")`,
    left_anti: `m = ${lt}.merge(${rt}, ${pyOn}, how="left", indicator=True)\nm[m["_merge"] == "left_only"]`,
    right_anti: `m = ${lt}.merge(${rt}, ${pyOn}, how="right", indicator=True)\nm[m["_merge"] == "right_only"]`,
    semi: `${lt}[${lt}["${lk}"].isin(${rt}["${rk}"])]`,
    cross: `${lt}.merge(${rt}, how="cross")`
  }[type];
  const by = same ? `by = "${lk}"` : `by = c("${lk}" = "${rk}")`;
  const byRev = same ? `by = "${lk}"` : `by = c("${rk}" = "${lk}")`;
  const r = {
    inner: `inner_join(${lt}, ${rt}, ${by})`,
    left: `left_join(${lt}, ${rt}, ${by})`,
    right: `right_join(${lt}, ${rt}, ${by})`,
    full: `full_join(${lt}, ${rt}, ${by})`,
    left_anti: `anti_join(${lt}, ${rt}, ${by})`,
    right_anti: `anti_join(${rt}, ${lt}, ${byRev})`,
    semi: `semi_join(${lt}, ${rt}, ${by})`,
    cross: `cross_join(${lt}, ${rt})`
  }[type];
  const sas = 'PROC SQL;\n  CREATE TABLE resultat AS\n  ' + sql.replace(/;$/, '').replace(/\n/g, '\n  ') + ';\nQUIT;';
  return { SQL: sql, Python: py, R: r, SAS: sas };
}

/* ---------- Schéma de Venn (SVG) ---------- */
function vennSVG(type, small) {
  const w = small ? 120 : 190, h = small ? 70 : 110;
  const s = small ? 0.62 : 1;
  const ax = 62 * s, bx = 112 * s, cy = 55 * s, r = 42 * s;
  const id = 'v' + type + (small ? 's' : 'l') + Math.random().toString(36).slice(2, 6);
  const fillA = 'var(--venn)', bg = 'var(--card)';
  let body = '';
  const A = `<circle cx="${ax}" cy="${cy}" r="${r}"`, B = `<circle cx="${bx}" cy="${cy}" r="${r}"`;
  const defs = `<defs><clipPath id="${id}a">${A}/></clipPath><clipPath id="${id}b">${B}/></clipPath></defs>`;
  if (type === 'cross') {
    let dots = '';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++)
      dots += `<circle cx="${(45 + i * 28) * s}" cy="${(20 + j * 24) * s}" r="${5 * s}" fill="var(--venn)"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="produit cartésien">${dots}</svg>`;
  }
  switch (type) {
    case 'inner': case 'semi':
      body = `${B} fill="${fillA}" clip-path="url(#${id}a)"/>`;
      if (type === 'semi') body = `${A} fill="${fillA}" clip-path="url(#${id}b)"/>`; break;
    case 'left': body = `${A} fill="${fillA}"/>`; break;
    case 'right': body = `${B} fill="${fillA}"/>`; break;
    case 'full': body = `${A} fill="${fillA}"/>${B} fill="${fillA}"/>`; break;
    case 'left_anti': body = `${A} fill="${fillA}"/>${B} fill="${bg}"/>`; break;
    case 'right_anti': body = `${B} fill="${fillA}"/>${A} fill="${bg}"/>`; break;
  }
  const outline = `${A} fill="none" stroke="var(--ink2)" stroke-width="2"/>${B} fill="none" stroke="var(--ink2)" stroke-width="2"/>`;
  const labels = small ? '' : `<text x="${ax - 24}" y="${cy + 4}" class="vl">A</text><text x="${bx + 18}" y="${cy + 4}" class="vl">B</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="schéma de ${JOINS[type].nom}">${defs}${body}${outline}${labels}</svg>`;
}
