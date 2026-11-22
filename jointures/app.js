/* Interface — Labo des jointures */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = v => v === null || v === undefined ? '<span class="null">NULL</span>' : esc(v);
const TABS = [['comprendre', '1 · Comprendre'], ['labo', '2 · Labo'], ['reflexe', '3 · Quel réflexe ?'], ['pieges', '4 · Pièges & S/P'], ['train', '5 · Entraînement'], ['memo', '6 · Aide-mémoire']];
const S = {
  tab: 'comprendre',
  lab: { l: 'contrats', r: 'cotisations', lk: 'id_contrat', rk: 'id_contrat', type: 'left', lang: 'SQL' },
  clean: false,
  quiz: { mode: 'join', cur: null, answered: false, score: { ok: 0, total: 0 } }
};
try { const sc = JSON.parse(localStorage.getItem('jointures-score')); if (sc) S.quiz.score = sc; } catch (e) { }

/* ---------- Helpers d'affichage ---------- */
function tableHTML(rows, cols, o = {}) {
  const head = cols.map((c, i) => `<th class="${o.keys && o.keys.includes(c.k) ? 'key' : ''} ${c.sep ? 'sep' : ''}">${c.label || c.k}</th>`).join('');
  const body = rows.map((r, i) => `<tr class="${(o.flags && o.flags[i]) || ''}">${cols.map(c =>
    `<td class="${o.keys && o.keys.includes(c.k) ? 'key' : ''} ${c.sep ? 'sep' : ''}">${fmt(r[c.k])}</td>`).join('')}</tr>`).join('');
  return `<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" class="null">(aucune ligne)</td></tr>`}</tbody></table></div>`;
}
const colsOf = name => DB[name].cols.map(k => ({ k }));
const srcTable = (name, flags, keys) => `<h3>${name} <span class="muted small">(${DB[name].rows.length} lignes)</span></h3>` + tableHTML(DB[name].rows, colsOf(name), { flags, keys });

/* ---------- Onglet 1 : Comprendre ---------- */
function viewComprendre() {
  return `
  <div class="card"><h2>Une jointure, c'est quoi ?</h2>
    <p>Dans un portefeuille, l'information est <b>éclatée en plusieurs tables</b> : une table d'individus, une de contrats, une de cotisations, une de prestations. Une <b>jointure</b> les recolle ligne à ligne en comparant une <b>clé</b> : une colonne (ou plusieurs) qui identifie la même chose des deux côtés.</p>
    <div class="rel"><span class="tb">individus</span><span class="ar">1 ──&lt; N</span><span class="tb">contrats</span><span class="ar">1 ──&lt; N</span><span class="tb">cotisations</span><span class="ar">&nbsp;&nbsp;et&nbsp;&nbsp;</span><span class="tb">contrats</span><span class="ar">1 ──&lt; N</span><span class="tb">prestations</span></div>
    <div class="info"><b>3 notions à toujours avoir en tête</b><br>
    <b>① Clé</b> : <code>id_indiv</code> relie individus↔contrats ; <code>id_contrat</code> relie contrats↔cotisations et contrats↔prestations.<br>
    <b>② Granularité</b> : « 1 ligne = quoi ? » (1 individu, 1 contrat, 1 cotisation annuelle, 1 sinistre). Joindre deux granularités différentes <i>duplique</i> des lignes.<br>
    <b>③ Cardinalité</b> : 1–1, 1–N, N–N. Un assuré a N contrats, un contrat a N cotisations et N prestations.</div>
    <div class="info warn">Les données sont <b>volontairement imparfaites</b>, comme dans la vraie vie : <span class="tag t-left">I5, I6</span> n'ont pas de contrat, <span class="tag t-left">C5, C6</span> n'ont aucune cotisation, le contrat <span class="tag t-bad">C6</span> pointe vers un assuré inconnu <code>I9</code>, et les contrats <span class="tag t-bad">C99</span> / <span class="tag t-bad">C8</span> n'existent pas dans la table contrats. Ces « orphelins » sont ce qui fait la différence entre les types de jointures.</div>
  </div>
  <div class="grid2">
    <div class="card">${srcTable('individus')}</div>
    <div class="card">${srcTable('contrats')}</div>
    <div class="card">${srcTable('cotisations')}</div>
    <div class="card">${srcTable('prestations')}</div>
  </div>
  <div class="card"><b>Et maintenant ?</b> Va dans le <button class="btn ghost" data-go="labo">Labo</button> : choisis deux tables et un type de jointure, et regarde ce qui se passe ligne par ligne.</div>`;
}

/* ---------- Onglet 2 : Labo ---------- */
function viewLabo() {
  const L = S.lab, T = Object.keys(DB);
  const lt = DB[L.l], rt = DB[L.r], cross = L.type === 'cross';
  const recs = runJoin(lt.rows, rt.rows, L.lk, L.rk, L.type);
  const lflags = cross ? lt.rows.map(() => 'match') : matchFlags(lt.rows, L.lk, rt.rows, L.rk).map(m => m ? 'match' : 'left');
  const rflags = cross ? rt.rows.map(() => 'match') : matchFlags(rt.rows, L.rk, lt.rows, L.lk).map(m => m ? 'match' : 'right');
  const showL = L.type !== 'right_anti', showR = !['semi', 'left_anti'].includes(L.type);
  let cols = [];
  if (showL) cols = cols.concat(lt.cols.map((c, i) => ({ k: 'l.' + c, label: `${L.l}.${c}` })));
  if (showR) cols = cols.concat(rt.cols.map((c, i) => ({ k: 'r.' + c, label: `${L.r}.${c}`, sep: i === 0 && showL })));
  const flat = recs.map(x => { const o = {}; lt.cols.forEach(c => o['l.' + c] = x.l ? x.l[c] : null); rt.cols.forEach(c => o['r.' + c] = x.r ? x.r[c] : null); return o; });
  const keys = [];
  if (!cross) { if (showL) keys.push('l.' + L.lk); if (showR) keys.push('r.' + L.rk); }
  const uniq = (rows, k) => new Set(rows.map(x => x[k])).size === rows.length;
  const card = cross ? 'N × M (pas de clé)' : (uniq(lt.rows, L.lk) && uniq(rt.rows, L.rk) ? '1 – 1' : uniq(lt.rows, L.lk) && !uniq(rt.rows, L.rk) ? '1 – N' : !uniq(lt.rows, L.lk) && uniq(rt.rows, L.rk) ? 'N – 1' : 'N – N ⚠️');
  const lOrph = lflags.filter(f => f === 'left').length, rOrph = rflags.filter(f => f === 'right').length;
  const J = JOINS[L.type], code = codeFor(L.type, L.l, L.r, L.lk, L.rk);
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  return `
  <div class="card">
    <div class="row">
      <label>Table de gauche (A)<select data-lab="l">${opt(T, L.l)}</select></label>
      <label>Clé gauche<select data-lab="lk" ${cross ? 'disabled' : ''}>${opt(lt.cols, L.lk)}</select></label>
      <label>Table de droite (B)<select data-lab="r">${opt(T, L.r)}</select></label>
      <label>Clé droite<select data-lab="rk" ${cross ? 'disabled' : ''}>${opt(rt.cols, L.rk)}</select></label>
    </div>
    <div class="jtypes">${JOIN_ORDER.map(t => `<button class="jt" data-type="${t}" aria-pressed="${t === L.type}">${vennSVG(t, true)}<b>${JOINS[t].nom.replace(' JOIN', '')}</b>${JOINS[t].court}</button>`).join('')}</div>
    <div class="grid2">
      <div><h2>${J.nom} <span class="muted small">— ${J.court}</span></h2>
        <p>${J.def}</p><div class="info good"><b>En actuariat :</b> ${J.actu}</div><div class="info warn"><b>Attention :</b> ${J.piege}</div></div>
      <div style="text-align:center">${vennSVG(L.type, false)}<div class="small muted">A = ${L.l} · B = ${L.r}</div></div>
    </div>
  </div>
  <div class="card"><h3>① Avant la jointure — qui a une correspondance ?</h3>
    <p class="small"><span class="tag t-ok">apparié</span><span class="tag t-left">orphelin côté A</span><span class="tag t-right">orphelin côté B</span> Les colonnes clés sont en gras.</p>
    <div class="grid2"><div>${srcTable(L.l, lflags, cross ? [] : [L.lk])}</div><div>${srcTable(L.r, rflags, cross ? [] : [L.rk])}</div></div></div>
  <div class="card"><h3>② Résultat</h3>
    <div class="kpis"><div class="kpi"><b>${lt.rows.length}</b>lignes A</div><div class="kpi"><b>${rt.rows.length}</b>lignes B</div><div class="kpi"><b>${recs.length}</b>lignes résultat</div>
      <div class="kpi"><b>${cross ? '–' : lOrph}</b>orphelins A</div><div class="kpi"><b>${cross ? '–' : rOrph}</b>orphelins B</div><div class="kpi"><b>${card}</b>cardinalité</div></div>
    ${card.includes('N – N') ? '<div class="info warn">Clé non unique des deux côtés : chaque valeur se multiplie → le nombre de lignes explose. Probablement la mauvaise clé !</div>' : ''}
    ${!cross && !lt.rows.some(r => rt.rows.some(s => eqKey(r[L.lk], s[L.rk]))) && !['left_anti', 'right_anti'].includes(L.type) && !['left', 'right', 'full'].includes(L.type) ? '<div class="info warn">Aucune correspondance : ces deux colonnes ne représentent sans doute pas la même chose.</div>' : ''}
    ${tableHTML(flat, cols, { keys, flags: recs.map(x => x.st) })}
  </div>
  <div class="card"><h3>③ Le même code dans ton outil</h3>
    <div class="subtabs">${['SQL', 'Python', 'R', 'SAS'].map(l => `<button data-lang="${l}" aria-pressed="${l === L.lang}">${l === 'Python' ? 'Python (pandas)' : l === 'R' ? 'R (dplyr)' : l}</button>`).join('')}</div>
    <pre>${esc(code[L.lang])}</pre></div>`;
}

/* ---------- Onglet 3 : Quel réflexe ? ---------- */
const REFLEXES = [
  { q: 'Tous les assurés, avec leurs contrats s\'ils en ont', cfg: ['individus', 'contrats', 'id_indiv', 'id_indiv', 'left'], why: 'La population de référence = les individus : aucun ne doit disparaître → LEFT JOIN depuis individus.' },
  { q: 'Seulement les assurés qui ont un contrat (1 ligne par contrat)', cfg: ['individus', 'contrats', 'id_indiv', 'id_indiv', 'inner'], why: 'On ne veut que l\'intersection → INNER JOIN. I5, I6 (prospects) et C6 (assuré inconnu) disparaissent.' },
  { q: 'Les prospects : individus sans aucun contrat', cfg: ['individus', 'contrats', 'id_indiv', 'id_indiv', 'left_anti'], why: 'On cherche les absents de l\'autre table → LEFT ANTI JOIN.' },
  { q: 'Contrats sans aucune cotisation (anomalie d\'encaissement)', cfg: ['contrats', 'cotisations', 'id_contrat', 'id_contrat', 'left_anti'], why: 'Contrôle qualité classique : contrats « fantômes » côté comptabilité.' },
  { q: 'Cotisations rattachées à un contrat inexistant (orphelines)', cfg: ['cotisations', 'contrats', 'id_contrat', 'id_contrat', 'left_anti'], why: 'On part de la table suspecte (cotisations) et on cherche celles absentes du référentiel contrats.' },
  { q: 'Contrats ayant eu au moins un sinistre (sans dupliquer)', cfg: ['contrats', 'prestations', 'id_contrat', 'id_contrat', 'semi'], why: 'On veut filtrer, pas enrichir : SEMI JOIN garde 1 ligne par contrat même si 2 sinistres (C1).' },
  { q: 'Réconciliation gestion ↔ prestations : écarts dans les deux sens', cfg: ['contrats', 'prestations', 'id_contrat', 'id_contrat', 'full'], why: 'On veut voir TOUT ce qui ne colle pas, des deux côtés → FULL OUTER JOIN.' },
  { q: 'Toutes les combinaisons possibles (grille / scénarios)', cfg: ['individus', 'contrats', 'id_indiv', 'id_indiv', 'cross'], why: 'Pas de clé : on veut le produit cartésien (ex. produit × année × âge pour une table d\'exposition).' }
];
function viewReflexe() {
  return `
  <div class="card"><h2>Arbre de décision en 5 questions</h2>
    <ol>
      <li><b>Quelle est ma population de référence ?</b> (individus ? contrats ? sinistres ?) → c'est la table de <b>gauche</b>.</li>
      <li>Dois-je la <b>garder en entier</b>, avec des NULL quand il manque de l'info ? → <b>LEFT JOIN</b>.</li>
      <li>Ne veux-je que ce qui existe <b>des deux côtés</b> ? → <b>INNER JOIN</b> (ou <b>SEMI</b> si je veux juste filtrer, sans dupliquer).</li>
      <li>Je cherche ce qui <b>manque</b> ou ce qui est <b>orphelin</b> ? → <b>ANTI JOIN</b>. Je compare deux sources dans les deux sens ? → <b>FULL JOIN</b>.</li>
      <li>Je veux <b>toutes les combinaisons</b>, sans clé ? → <b>CROSS JOIN</b>.</li>
    </ol>
    <div class="info">Réflexe final : <b>compte les lignes avant / après</b>. Si un LEFT JOIN augmente le nombre de lignes, tu as un fan-out (1–N).</div>
  </div>
  <h2>Objectif → jointure</h2>
  <div class="reflex">${REFLEXES.map((r, i) => `<div class="card"><div class="q">${r.q}</div>
    <div>${vennSVG(r.cfg[4], true)}</div><div><span class="tag t-ok">${JOINS[r.cfg[4]].nom}</span> <span class="muted small">${r.cfg[0]} → ${r.cfg[1]}</span></div>
    <div class="small">${r.why}</div><div><button class="btn ghost" data-try="${i}">Essayer dans le labo</button></div></div>`).join('')}
    <div class="card"><div class="q">Calculer le S/P (sinistres / primes) par contrat</div><div class="small">Piège n°1 de l'actuaire : <b>agréger AVANT de joindre</b>, sinon les montants sont comptés plusieurs fois.</div><div><button class="btn ghost" data-go="pieges">Voir le cas pratique</button></div></div>
  </div>`;
}

/* ---------- Onglet 4 : Pièges & S/P ---------- */
function groupSum(rows, key, field) { const m = {}; rows.forEach(r => { m[r[key]] = (m[r[key]] || 0) + r[field]; }); return m; }
function viewPieges() {
  const C = DB.contrats.rows, K = DB.cotisations.rows, P = DB.prestations.rows;
  /* mauvaise méthode : joindre puis sommer */
  const j1 = runJoin(C, K, 'id_contrat', 'id_contrat', 'left').map(x => ({ id_contrat: x.l.id_contrat, produit: x.l.produit, annee: x.r ? x.r.annee : null, prime: x.r ? x.r.montant : null }));
  const j2 = runJoin(j1, P, 'id_contrat', 'id_contrat', 'left').map(x => ({ ...x.l, id_prest: x.r ? x.r.id_prest : null, sinistre: x.r ? x.r.montant : null }));
  const bad = {}; j2.forEach(r => { const b = bad[r.id_contrat] = bad[r.id_contrat] || { prime: 0, sin: 0 }; b.prime += r.prime || 0; b.sin += r.sinistre || 0; });
  /* bonne méthode : agréger puis joindre */
  const aK = groupSum(K, 'id_contrat', 'montant'), aP = groupSum(P, 'id_contrat', 'montant');
  const good = C.map(c => ({ id_contrat: c.id_contrat, prime: aK[c.id_contrat] || 0, sin: aP[c.id_contrat] || 0 }));
  const sp = (s, p) => p > 0 ? Math.round(100 * s / p) + ' %' : '—';
  const badRows = C.map(c => ({ id_contrat: c.id_contrat, primes: bad[c.id_contrat].prime, sinistres: bad[c.id_contrat].sin, 'S/P': sp(bad[c.id_contrat].sin, bad[c.id_contrat].prime) }));
  const goodRows = good.map(g => ({ id_contrat: g.id_contrat, primes: g.prime, sinistres: g.sin, 'S/P': sp(g.sin, g.prime) }));
  const flagsBad = good.map(g => (bad[g.id_contrat].prime !== g.prime || bad[g.id_contrat].sin !== g.sin) ? 'bad' : '');
  const tot = (a, k) => a.reduce((s, r) => s + r[k], 0);
  const c4 = ['id_contrat', 'primes', 'sinistres', 'S/P'].map(k => ({ k }));
  /* ON vs WHERE */
  const P24 = P.filter(p => p.date_sinistre >= '2024-01-01');
  const onRes = runJoin(C, P24, 'id_contrat', 'id_contrat', 'left');
  const whereRes = runJoin(C, P, 'id_contrat', 'id_contrat', 'left').filter(x => x.r && x.r.date_sinistre >= '2024-01-01');
  /* clés sales */
  const dirty = [{ id_contrat: 'C1', montant: 620 }, { id_contrat: 'c3 ', montant: 560 }, { id_contrat: ' C4', montant: 580 }];
  const dd = S.clean ? dirty.map(d => ({ ...d, id_contrat: d.id_contrat.trim().toUpperCase() })) : dirty;
  const dj = runJoin(C, dd, 'id_contrat', 'id_contrat', 'inner');
  return `
  <div class="card"><h2>Piège n°1 — Le fan-out : joindre puis sommer</h2>
    <p>But : <b>S/P par contrat</b> (prestations ÷ cotisations). Le contrat C1 a <b>2 cotisations</b> et <b>2 prestations</b> : en joignant les trois tables d'un coup, on obtient 2×2 = 4 lignes, et chaque prime est comptée deux fois. Le contrat C3 (2 cotisations, 1 prestation) voit, lui, sa prestation comptée deux fois.</p>
    <div class="grid2">
      <div><h3><span class="tag t-bad">❌ Joindre puis sommer</span></h3>
        <p class="small">contrats ⟕ cotisations ⟕ prestations → ${j2.length} lignes (au lieu de ${C.length} contrats)</p>
        ${tableHTML(badRows, c4, { flags: flagsBad })}
        <div class="kpis"><div class="kpi"><b>${tot(badRows, 'primes')} €</b>primes</div><div class="kpi"><b>${tot(badRows, 'sinistres')} €</b>sinistres</div></div>
        <pre>SELECT c.id_contrat, SUM(k.montant), SUM(p.montant)
FROM contrats c
LEFT JOIN cotisations k ON k.id_contrat = c.id_contrat
LEFT JOIN prestations p ON p.id_contrat = c.id_contrat
GROUP BY c.id_contrat;  -- ❌ montants dupliqués</pre></div>
      <div><h3><span class="tag t-ok">✅ Agréger puis joindre</span></h3>
        <p class="small">On résume cotisations et prestations à la granularité « 1 ligne = 1 contrat », puis on joint → ${C.length} lignes, comme voulu.</p>
        ${tableHTML(goodRows, c4, {})}
        <div class="kpis"><div class="kpi"><b>${tot(goodRows, 'primes')} €</b>primes</div><div class="kpi"><b>${tot(goodRows, 'sinistres')} €</b>sinistres</div></div>
        <pre>WITH k AS (SELECT id_contrat, SUM(montant) AS prime
            FROM cotisations GROUP BY id_contrat),
     p AS (SELECT id_contrat, SUM(montant) AS sinistre
            FROM prestations GROUP BY id_contrat)
SELECT c.id_contrat, COALESCE(k.prime,0), COALESCE(p.sinistre,0)
FROM contrats c
LEFT JOIN k ON k.id_contrat = c.id_contrat
LEFT JOIN p ON p.id_contrat = c.id_contrat;  -- ✅</pre></div>
    </div>
    <div class="info good"><b>Réflexe :</b> avant de joindre, demande-toi « 1 ligne = quoi ? » de chaque côté. Si ce n'est pas la même granularité, <b>agrège d'abord</b>. Après : compare les totaux au contrôle (ici primes ${tot(goodRows, 'primes')} € ≠ ${tot(badRows, 'primes')} €).</div>
    <div class="small muted">Note : seules les cotisations/prestations des contrats connus sont comptées (C99 et C8 n'existent pas dans la table contrats).</div>
  </div>
  <div class="card"><h2>Piège n°2 — Filtre dans ON ou dans WHERE ?</h2>
    <p>Objectif : « tous les contrats, avec leurs prestations de <b>2024</b> s'il y en a ».</p>
    <div class="grid2">
      <div><h3><span class="tag t-ok">✅ Filtre dans ON</span> → ${onRes.length} lignes</h3>
        <pre>FROM contrats c
LEFT JOIN prestations p
  ON p.id_contrat = c.id_contrat
 AND p.date_sinistre >= '2024-01-01'</pre>
        <p class="small">Tous les contrats sont conservés, seule la prestation 2024 de C1 est ramenée.</p></div>
      <div><h3><span class="tag t-bad">❌ Filtre dans WHERE</span> → ${whereRes.length} ligne</h3>
        <pre>FROM contrats c
LEFT JOIN prestations p
  ON p.id_contrat = c.id_contrat
WHERE p.date_sinistre >= '2024-01-01'</pre>
        <p class="small">Le WHERE élimine les lignes NULL : ton LEFT JOIN est devenu un INNER JOIN sans que tu le voies !</p></div>
    </div>
  </div>
  <div class="card"><h2>Piège n°3 — Les clés « sales »</h2>
    <p>Dans une extraction, les identifiants contiennent des espaces ou des minuscules (<code>'c3 '</code>, <code>' C4'</code>). Un <code>INNER JOIN contrats ⋈ cotisations</code> ne les reconnaît pas : <b>${dj.length}</b> ligne(s) retrouvée(s) sur 3.</p>
    <button class="btn" data-clean="1">${S.clean ? 'Revenir aux clés brutes' : 'Nettoyer : UPPER(TRIM(id_contrat))'}</button>
    <div style="margin-top:10px">${tableHTML(dd.map(d => ({ id_contrat: '«' + d.id_contrat + '»', montant: d.montant })), [{ k: 'id_contrat' }, { k: 'montant' }], { flags: dd.map(d => C.some(c => c.id_contrat === d.id_contrat) ? 'match' : 'bad') })}</div>
    <div class="info">Autres pièges : un <b>NULL ne s'apparie jamais</b> (même pas avec un autre NULL) ; un <b>type différent</b> (texte vs numérique, <code>'007'</code> vs <code>7</code>) ; une clé <b>non unique</b> alors qu'on la croyait unique ; des clés <b>composites</b> oubliées (ex. contrat + année).</div>
  </div>
  <div class="card"><h2>Checklist avant de valider une jointure</h2>
    <ol><li>Ai-je défini ma <b>table de référence</b> (gauche) ?</li><li>Quelle est la <b>granularité</b> de chaque table ? La clé est-elle <b>unique</b> ?</li><li>Dois-je <b>agréger avant</b> de joindre ?</li><li>Ai-je <b>compté les lignes</b> avant/après ? (LEFT JOIN : même nombre si clé unique à droite)</li><li>Ai-je <b>contrôlé les totaux</b> (primes, prestations) et traité les <b>orphelins</b> ?</li></ol></div>`;
}

/* ---------- Onglet 5 : Entraînement ---------- */
const SCENARIOS = [
  { q: 'Je veux la liste de tous mes assurés avec leurs contrats éventuels.', ok: ['left'], ex: 'Les assurés sont la population de référence : on les garde tous → LEFT JOIN (individus à gauche).' },
  { q: 'Quels assurés n\'ont jamais souscrit de contrat ?', ok: ['left_anti'], ex: 'On cherche les absents de la table contrats → ANTI JOIN.' },
  { q: 'Quels contrats ont eu au moins un sinistre ? (une ligne par contrat)', ok: ['semi'], ex: 'Filtrer sans dupliquer → SEMI JOIN. (Un INNER JOIN donnerait 2 lignes pour C1.)' },
  { q: 'Je compare deux extractions (gestion vs comptabilité) et je veux voir les écarts dans les deux sens.', ok: ['full'], ex: 'Réconciliation bilatérale → FULL OUTER JOIN.' },
  { q: 'Table de gauche = prestations, table de droite = contrats. Quelles prestations ne correspondent à aucun contrat ?', ok: ['left_anti'], ex: 'Orphelines côté gauche → LEFT ANTI JOIN.' },
  { q: 'Je veux créer toutes les combinaisons âge × année pour une table d\'exposition.', ok: ['cross'], ex: 'Pas de clé, produit cartésien → CROSS JOIN.' },
  { q: 'Analyse uniquement sur les contrats présents à la fois en gestion et en comptabilité.', ok: ['inner'], ex: 'Intersection stricte → INNER JOIN.' },
  { q: 'Quels contrats n\'ont jamais été facturés (aucune cotisation) ?', ok: ['left_anti'], ex: 'Contrats absents des cotisations → LEFT ANTI JOIN (contrats à gauche).' },
  { q: 'Table de pilotage : tous les contrats, avec primes et sinistres lorsqu\'ils existent.', ok: ['left'], ex: 'Population de référence = contrats → LEFT JOIN (après avoir agrégé primes et sinistres !).' },
  { q: 'Gauche = contrats, droite = prestations. Je veux toutes les prestations, avec les infos contrat quand elles existent.', ok: ['right'], ex: 'On garde toute la droite → RIGHT JOIN (ou LEFT JOIN en inversant les tables).' }
];
const PAIRS = [['individus', 'contrats', 'id_indiv', 'id_indiv'], ['contrats', 'cotisations', 'id_contrat', 'id_contrat'], ['contrats', 'prestations', 'id_contrat', 'id_contrat'], ['cotisations', 'contrats', 'id_contrat', 'id_contrat'], ['prestations', 'contrats', 'id_contrat', 'id_contrat']];
const CTYPES = ['inner', 'left', 'right', 'full', 'left_anti', 'right_anti', 'semi'];
const pick = a => a[Math.floor(Math.random() * a.length)];
function newQuestion() {
  const Q = S.quiz;
  if (Q.mode === 'join') Q.cur = { i: Math.floor(Math.random() * SCENARIOS.length) };
  else { const p = pick(PAIRS), t = pick(CTYPES); Q.cur = { p, t, ans: countJoin(p[0], p[1], p[2], p[3], t) }; }
  Q.answered = false;
}
function saveScore() { try { localStorage.setItem('jointures-score', JSON.stringify(S.quiz.score)); } catch (e) { } }
function viewTrain() {
  const Q = S.quiz; if (!Q.cur) newQuestion();
  const sc = Q.score;
  let body = '';
  if (Q.mode === 'join') {
    const s = SCENARIOS[Q.cur.i];
    body = `<div class="q">${s.q}</div><div class="opts">${JOIN_ORDER.map(t => `<button data-ans="${t}" ${Q.answered ? 'disabled' : ''} class="${Q.answered ? (s.ok.includes(t) ? 'r' : (Q.picked === t ? 'w' : '')) : ''}">${vennSVG(t, true)}${JOINS[t].nom}</button>`).join('')}</div>`;
    if (Q.answered) body += `<div class="info ${s.ok.includes(Q.picked) ? 'good' : 'warn'}">${s.ok.includes(Q.picked) ? '✅ Bien vu ! ' : '❌ Pas tout à fait. '}${s.ex}</div>`;
  } else {
    const { p, t, ans } = Q.cur, [l, r, lk, rk] = p;
    const m = DB[l].rows.filter(x => DB[r].rows.some(y => eqKey(x[lk], y[rk]))).length;
    body = `<div class="q"><code>${l}</code> <b>${JOINS[t].nom}</b> <code>${r}</code> ON ${l}.${lk} = ${r}.${rk}</div>
      <p class="muted small">${l} : ${DB[l].rows.length} lignes · ${r} : ${DB[r].rows.length} lignes. Combien de lignes dans le résultat ? (Observe les tables dans « Comprendre ».)</p>
      <div class="row"><label>Ma réponse<input type="number" id="cnt" min="0" ${Q.answered ? 'disabled' : ''} value="${Q.answered ? Q.picked : ''}"></label><button class="btn" data-check="1" ${Q.answered ? 'disabled' : ''}>Valider</button></div>`;
    if (Q.answered) body += `<div class="info ${Q.picked === ans ? 'good' : 'warn'}">${Q.picked === ans ? '✅ Exact : ' : '❌ La bonne réponse est '}<b>${ans}</b> ligne(s). <br><span class="small">${JOINS[t].def} · lignes de ${l} avec correspondance : ${m}/${DB[l].rows.length}.</span><br><button class="btn ghost" data-try-count="1" style="margin-top:6px">Vérifier dans le labo</button></div>`;
  }
  return `<div class="card"><div class="row" style="justify-content:space-between;align-items:center">
    <div class="subtabs" style="margin:0"><button data-mode="join" aria-pressed="${Q.mode === 'join'}">Quelle jointure ?</button><button data-mode="count" aria-pressed="${Q.mode === 'count'}">Combien de lignes ?</button></div>
    <div class="kpi"><b>${sc.ok} / ${sc.total}</b>bonnes réponses</div></div>
    <div style="margin-top:14px">${body}</div>
    <div style="margin-top:10px"><button class="btn" data-next="1" ${Q.answered ? '' : 'disabled'}>Question suivante →</button> <button class="btn ghost" data-reset="1">Remettre le score à 0</button></div></div>`;
}

/* ---------- Onglet 6 : Aide-mémoire ---------- */
function viewMemo() {
  return `<div class="card"><h2>Les 8 jointures en un coup d'œil</h2><div class="tw"><table>
    <thead><tr><th></th><th>Jointure</th><th>Ce qu'on garde</th><th>Usage actuariat</th></tr></thead><tbody>
    ${JOIN_ORDER.map(t => `<tr><td>${vennSVG(t, true)}</td><td><b>${JOINS[t].nom}</b></td><td style="white-space:normal">${JOINS[t].def}</td><td style="white-space:normal">${JOINS[t].actu}</td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="card"><h2>Équivalences entre outils</h2><div class="tw"><table>
    <thead><tr><th>Jointure</th><th>SQL</th><th>pandas</th><th>R (dplyr)</th></tr></thead><tbody>
    <tr><td>Inner</td><td>INNER JOIN</td><td>merge(how="inner")</td><td>inner_join()</td></tr>
    <tr><td>Left</td><td>LEFT JOIN</td><td>merge(how="left")</td><td>left_join()</td></tr>
    <tr><td>Right</td><td>RIGHT JOIN</td><td>merge(how="right")</td><td>right_join()</td></tr>
    <tr><td>Full</td><td>FULL OUTER JOIN</td><td>merge(how="outer")</td><td>full_join()</td></tr>
    <tr><td>Anti</td><td>LEFT JOIN … WHERE b.k IS NULL</td><td>merge(indicator=True) + filtre</td><td>anti_join()</td></tr>
    <tr><td>Semi</td><td>WHERE EXISTS (…)</td><td>df[df.k.isin(other.k)]</td><td>semi_join()</td></tr>
    <tr><td>Cross</td><td>CROSS JOIN</td><td>merge(how="cross")</td><td>cross_join()</td></tr></tbody></table></div></div>
  <div class="card"><h2>Les 5 réflexes</h2><ol>
    <li><b>Population de référence à gauche</b>, puis LEFT JOIN pour enrichir.</li>
    <li><b>Granularité</b> : 1 ligne = quoi ? Même niveau des deux côtés, sinon agréger d'abord.</li>
    <li><b>Clé unique ?</b> Vérifier les doublons (<code>COUNT(*)</code> vs <code>COUNT(DISTINCT clé)</code>).</li>
    <li><b>Chercher les orphelins</b> avec des ANTI JOIN avant d'analyser.</li>
    <li><b>Contrôler</b> : lignes et totaux avant/après chaque jointure.</li></ol></div>`;
}

/* ---------- Routage & événements ---------- */
const VIEWS = { comprendre: viewComprendre, labo: viewLabo, reflexe: viewReflexe, pieges: viewPieges, train: viewTrain, memo: viewMemo };
function render() {
  document.getElementById('tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${l}</button>`).join('');
  document.getElementById('main').innerHTML = VIEWS[S.tab]();
}
function go(tab) { S.tab = tab; render(); window.scrollTo(0, 0); try { history.replaceState(null, '', '#' + tab); } catch (e) { } }
function setLab(patch) {
  Object.assign(S.lab, patch);
  const L = S.lab;
  if (patch.l || patch.r) { [L.lk, L.rk] = defaultKeys(L.l, L.r); }
  render();
}
document.addEventListener('change', e => {
  const k = e.target.dataset.lab; if (!k) return;
  setLab({ [k]: e.target.value });
});
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.tab) return go(d.tab);
  if (d.go) return go(d.go);
  if (d.type) return setLab({ type: d.type });
  if (d.lang) return setLab({ lang: d.lang });
  if (d.try !== undefined) { const c = REFLEXES[+d.try].cfg; S.lab = { ...S.lab, l: c[0], r: c[1], lk: c[2], rk: c[3], type: c[4] }; return go('labo'); }
  if (d.clean) { S.clean = !S.clean; return render(); }
  if (d.mode) { S.quiz.mode = d.mode; S.quiz.cur = null; return render(); }
  if (d.ans) { const s = SCENARIOS[S.quiz.cur.i]; S.quiz.picked = d.ans; S.quiz.answered = true; S.quiz.score.total++; if (s.ok.includes(d.ans)) S.quiz.score.ok++; saveScore(); return render(); }
  if (d.check) {
    const v = parseInt(document.getElementById('cnt').value, 10); if (isNaN(v)) return;
    S.quiz.picked = v; S.quiz.answered = true; S.quiz.score.total++; if (v === S.quiz.cur.ans) S.quiz.score.ok++; saveScore(); return render();
  }
  if (d.next) { newQuestion(); return render(); }
  if (d.reset) { S.quiz.score = { ok: 0, total: 0 }; saveScore(); return render(); }
  if (d.tryCount) { const { p, t } = S.quiz.cur; S.lab = { ...S.lab, l: p[0], r: p[1], lk: p[2], rk: p[3], type: t }; return go('labo'); }
});
const h = location.hash.slice(1); if (VIEWS[h]) S.tab = h;
render();
