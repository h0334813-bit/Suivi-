'use strict';
/* =====================================================================
   Suivi Master — interface, vues et interactions
   ===================================================================== */
const App = { view: 'dash', date: todayISO(), projFilter: 'open', openProj: null, openSem: null, pomoLabel: '' };
const HOUR = 62, T0 = 7, T1 = 22; // échelle de la timeline (px/h, 7h → 22h)

/* ---------- Composants visuels ---------- */
function ring(p, size = 84, sw = 8, color = 'var(--accent)', inner) {
  p = clamp(p, 0, 100);
  const r = (size - sw) / 2, c = 2 * Math.PI * r, o = c * (1 - p / 100);
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle class="trk" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/><circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${o}" style="--c:${c}"/></svg><span>${inner ?? Math.round(p) + '%'}</span></div>`;
}
const bar = (p, color = 'var(--accent)') => `<div class="bar-track"><i style="width:${clamp(p, 0, 100)}%;background:${color}"></i></div>`;
const chip = (txt, cls = '', color) => `<span class="chip ${cls}" ${color ? `style="--c:${color}"` : ''}>${esc(txt)}</span>`;
const courseOf = id => Store.state.courses.find(c => c.id === id);
const courseChip = id => { const c = courseOf(id); return c ? chip(c.name, 'course', c.color) : ''; };
const colorOfCourse = (id, fb) => courseOf(id)?.color || fb || 'var(--accent)';
const empty = (emoji, txt) => `<div class="empty"><b>${emoji}</b><p>${txt}</p></div>`;
const head = (title, sub, actions = '') => `<header class="vhead"><div><h1>${title}</h1><p>${sub}</p></div><div class="vact">${actions}</div></header>`;

/* ---------- Agenda : fusion de toutes les sources pour un jour donné ---------- */
function getItems(d) {
  const S = Store.state, out = [], wd = isoWeekday(d);
  const mk = (kind, o, title, sub, start, dur, color) => {
    const key = `${kind}:${o.id}:${d}`, s = toMin(start);
    return { kind, id: o.id, key, title, sub, s, e: s + dur, start, color, done: Stats.isDone(key), d };
  };
  S.courses.filter(c => +c.day === wd).forEach(c => out.push(mk('cours', c, c.name, [c.room, c.teacher].filter(Boolean).join(' · '), c.start, toMin(c.end) - toMin(c.start), c.color)));
  S.exams.filter(e => e.date === d).forEach(e => out.push(mk('exam', e, '📝 ' + e.title, e.room, e.start, +e.duration || 120, colorOfCourse(e.courseId, '#f87171'))));
  S.revisions.filter(r => r.date === d).forEach(r => out.push(mk('rev', r, r.title, 'Révision', r.start, +r.duration || 60, colorOfCourse(r.courseId))));
  S.tasks.filter(t => t.date === d).forEach(t => out.push(mk('task', t, t.title, 'Tâche', t.start, +t.duration || 60, t.color || 'var(--accent)')));
  return out.sort((a, b) => a.s - b.s || a.e - b.e);
}
const deadlinesOn = d => Store.state.projects.filter(p => p.deadline === d && !p.done);

/** Place les événements qui se chevauchent côte à côte. */
function layout(items) {
  const res = []; let cluster = [], end = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach(it => {
      let l = lanes.findIndex(le => le <= it.s);
      if (l < 0) { l = lanes.length; lanes.push(0); }
      lanes[l] = it.e; it.lane = l;
    });
    cluster.forEach(it => { it.lanes = lanes.length; res.push(it); });
    cluster = [];
  };
  items.forEach(it => { if (cluster.length && it.s >= end) { flush(); end = -1; } cluster.push(it); end = Math.max(end, it.e); });
  if (cluster.length) flush();
  return res;
}
function blockHTML(it, min = T0 * 60, hour = HOUR) {
  const top = (it.s - min) * hour / 60, h = Math.max((it.e - it.s) * hour / 60, 22);
  const w = 100 / it.lanes;
  return `<div class="blk k-${it.kind} ${it.done ? 'done' : ''}" style="top:${top}px;height:${h}px;left:calc(${it.lane * w}% + 2px);width:calc(${w}% - 4px);--c:${it.color}" data-act="edit" data-kind="${it.kind}" data-id="${it.id}">
    <button class="tick" data-act="toggle" data-key="${it.key}" aria-label="Terminé" title="Marquer comme fait">${it.done ? '✓' : ''}</button>
    <div class="bt"><b>${esc(it.title)}</b>${h > 38 ? `<small>${it.start} – ${fromMin(it.e)}${it.sub ? ' · ' + esc(it.sub) : ''}</small>` : ''}</div></div>`;
}

/* ---------- VUE : tableau de bord ---------- */
function vDash() {
  const S = Store.state, t = todayISO(), items = getItems(t), now = nowMin();
  const doneN = items.filter(i => i.done).length, hour = new Date().getHours();
  const hello = hour < 5 ? 'Bonne nuit' : hour < 18 ? 'Bonjour' : 'Bonsoir';
  const upcoming = [
    ...S.projects.filter(p => !p.done).map(p => ({ t: 'Projet', title: p.title, date: p.deadline, color: p.color, p, pct: Stats.progress(p) })),
    ...S.exams.filter(e => e.date >= t).map(e => ({ t: 'Examen', title: e.title, date: e.date, color: colorOfCourse(e.courseId, '#f87171'), e })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const nextProj = upcoming.find(u => u.p), nextExam = upcoming.find(u => u.e);
  const cur = items.find(i => i.s <= now && now < i.e), nxt = items.find(i => i.s > now);
  const lv = Stats.level(), mods = Stats.allModules(), ects = Stats.ects(mods), avg = Stats.avg(mods);
  const total = S.semesters.reduce((a, s) => a + Stats.ects(s.modules).total, 0) || 120;
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(mondayOf(t), i), it = getItems(d); return { d, n: it.length, k: it.filter(x => x.done).length }; });
  const maxN = Math.max(1, ...week.map(w => w.n));
  const urgent = upcoming.slice(0, 6).map(u => {
    const n = diffDays(t, u.date);
    return `<li class="up" ${u.p ? `data-act="goproj" data-id="${u.p.id}"` : `data-act="go" data-v="exams"`}><i style="background:${u.color}"></i><div><b>${esc(u.title)}</b><small>${u.t} · ${fmtShort(u.date)}${u.pct != null ? ' · ' + u.pct + '%' : ''}</small></div>${chip(relDays(n), 'u-' + urgency(n))}</li>`;
  }).join('');
  const agenda = items.map(i => `<li class="ag ${i.done ? 'done' : ''} ${cur === i ? 'now' : ''}" style="--c:${i.color}"><button class="tick" data-act="toggle" data-key="${i.key}">${i.done ? '✓' : ''}</button><span class="tm">${i.start}</span><div data-act="edit" data-kind="${i.kind}" data-id="${i.id}"><b>${esc(i.title)}</b><small>${fromMin(i.e - i.s)}${i.sub ? ' · ' + esc(i.sub) : ''}</small></div></li>`).join('');

  return `
  ${head(`${hello}${S.settings.name ? ', ' + esc(S.settings.name) : ''} 👋`, cap(fmtLong(t)) + (items.length ? ` — ${items.length} activité${items.length > 1 ? 's' : ''} au programme` : ' — journée libre'),
    `<button class="btn" data-act="new" data-kind="task">＋ Tâche</button><button class="btn pri" data-act="go" data-v="focus">⏱ Lancer un focus</button>`)}
  <section class="stats">
    <div class="card stat"><span class="si">✅</span><div><small>Aujourd'hui</small><b><em data-count="${doneN}">${doneN}</em><u>/${items.length}</u></b></div>${bar(items.length ? doneN / items.length * 100 : 0)}</div>
    <div class="card stat" ${nextProj ? `data-act="goproj" data-id="${nextProj.p.id}"` : ''}><span class="si">📦</span><div><small>Prochain rendu</small><b>${nextProj ? relDays(diffDays(t, nextProj.date)) : '—'}</b></div><small class="ell">${nextProj ? esc(nextProj.title) : 'Aucun projet en cours'}</small></div>
    <div class="card stat" data-act="go" data-v="exams"><span class="si">📝</span><div><small>Prochain examen</small><b>${nextExam ? relDays(diffDays(t, nextExam.date)) : '—'}</b></div><small class="ell">${nextExam ? esc(nextExam.title) : 'Aucun examen prévu'}</small></div>
    <div class="card stat" data-act="go" data-v="parcours"><span class="si">🔥</span><div><small>Série · Niveau ${lv.lvl}</small><b><em data-count="${Stats.streak()}">${Stats.streak()}</em><u> jour${Stats.streak() > 1 ? 's' : ''}</u></b></div>${bar(lv.pct, 'linear-gradient(90deg,var(--accent),#22d3ee)')}</div>
  </section>
  <section class="grid2">
    <div class="col">
      <div class="card now-card" style="--c:${(cur || nxt)?.color || 'var(--accent)'}">
        <small class="eyebrow">${cur ? '● En ce moment' : nxt ? 'Ensuite' : 'Rien de prévu'}</small>
        ${cur || nxt ? (() => { const x = cur || nxt, left = cur ? cur.e - now : x.s - now; return `<h2>${esc(x.title)}</h2><p>${x.start} – ${fromMin(x.e)} · ${cur ? `encore ${fmtDur(left)}` : `dans ${fmtDur(left)}`}</p>${cur ? bar((now - x.s) / (x.e - x.s) * 100, x.color) : ''}`; })() : `<h2>Profite 🎉</h2><p>Plus rien au planning. Ajoute une tâche ou lance une session de focus.</p>`}
      </div>
      <div class="card"><div class="ch"><h3>Programme du jour</h3><button class="lnk" data-act="go" data-v="day">Voir la timeline →</button></div>
        ${items.length ? `<ul class="list">${agenda}</ul>` : empty('🌤️', 'Journée libre — profites-en pour avancer sur un projet.')}</div>
      <div class="card"><div class="ch"><h3>Ma semaine</h3><button class="lnk" data-act="go" data-v="week">Détails →</button></div>
        <div class="wbars">${week.map(w => `<div class="wb ${w.d === t ? 'today' : ''}" data-act="goday" data-d="${w.d}" title="${w.k}/${w.n} faits"><div class="wcol"><i style="height:${w.n / maxN * 100}%"><s style="height:${w.n ? w.k / w.n * 100 : 0}%"></s></i></div><small>${DAYS_S[isoWeekday(w.d)]}</small></div>`).join('')}</div></div>
    </div>
    <div class="col">
      <div class="card"><div class="ch"><h3>Échéances à venir</h3></div>${urgent ? `<ul class="list">${urgent}</ul>` : empty('🎉', 'Aucune échéance !')}</div>
      <div class="card par" data-act="go" data-v="parcours"><div class="ch"><h3>Mon parcours</h3><span class="lnk">Ouvrir →</span></div>
        <div class="par-row">${ring(total ? ects.got / total * 100 : 0, 96, 9, 'var(--accent)', `<b>${ects.got}</b><small>/${total}</small>`)}
        <div><small>ECTS validés</small><h2>${avg != null ? avg.toFixed(2) : '—'}<small> /20</small></h2><small>Moyenne générale · objectif ${S.settings.goal}</small></div></div></div>
    </div>
  </section>`;
}

/* ---------- VUE : journée (timeline) ---------- */
function vDay() {
  const d = App.date, t = todayISO(), items = layout(getItems(d)), dls = deadlinesOn(d);
  const done = items.filter(i => i.done).length, H = (T1 - T0) * HOUR;
  const rows = Array.from({ length: T1 - T0 }, (_, i) => `<div class="hr" style="top:${i * HOUR}px"><span>${pad(T0 + i)}:00</span></div>`).join('');
  return `${head(cap(fmtLong(d)), d === t ? "C'est aujourd'hui" : relDays(diffDays(t, d)),
    `<button class="btn ico" data-act="shiftday" data-n="-1" aria-label="Jour précédent">‹</button><button class="btn" data-act="goday" data-d="${t}">Aujourd'hui</button><button class="btn ico" data-act="shiftday" data-n="1" aria-label="Jour suivant">›</button><button class="btn pri" data-act="new" data-kind="task">＋ Ajouter</button>`)}
  <div class="day-top card">${ring(items.length ? done / items.length * 100 : 0, 64, 7)}<div><b>${done}/${items.length} terminé${done > 1 ? 's' : ''}</b><small>Focus du jour : ${fmtDur(Stats.focusOn(d))}</small></div>
    <div class="dls">${dls.map(p => `<button class="chip u-hot" data-act="goproj" data-id="${p.id}">📦 Rendu : ${esc(p.title)}</button>`).join('')}</div></div>
  <div class="card tl-wrap"><div class="tl" id="tl" style="height:${H}px" data-date="${d}">${rows}<div class="tl-grid" id="tl-grid"></div>${items.map(i => blockHTML(i)).join('')}${d === t ? `<div class="nowline" id="nowline"><i></i></div>` : ''}</div>
  ${!items.length ? `<div class="tl-empty">Clique sur la grille pour planifier un créneau ✨</div>` : ''}</div>`;
}

/* ---------- VUE : semaine ---------- */
function vWeek() {
  const t = todayISO(), m = mondayOf(App.date);
  const cols = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(m, i), it = getItems(d), dl = deadlinesOn(d);
    return `<div class="wcard card ${d === t ? 'today' : ''}"><div class="wch" data-act="goday" data-d="${d}"><small>${DAYS_S[i + 1]}</small><b>${parseISO(d).getDate()}</b></div>
      ${dl.map(p => `<div class="wdl" data-act="goproj" data-id="${p.id}">📦 ${esc(p.title)}</div>`).join('')}
      ${it.map(x => `<div class="wit ${x.done ? 'done' : ''}" style="--c:${x.color}" data-act="edit" data-kind="${x.kind}" data-id="${x.id}"><button class="tick sm" data-act="toggle" data-key="${x.key}">${x.done ? '✓' : ''}</button><span><small>${x.start}</small>${esc(x.title)}</span></div>`).join('') || '<p class="muted">—</p>'}
      <button class="add-mini" data-act="new" data-kind="task" data-date="${d}">＋</button></div>`;
  }).join('');
  return `${head('Ma semaine', `Du ${fmtShort(m)} au ${fmtShort(addDays(m, 6))}`, `<button class="btn ico" data-act="shiftweek" data-n="-7">‹</button><button class="btn" data-act="goday" data-d="${t}" data-v="week">Cette semaine</button><button class="btn ico" data-act="shiftweek" data-n="7">›</button>`)}<div class="week">${cols}</div>`;
}

/* ---------- VUE : projets ---------- */
function vProjects() {
  const S = Store.state, t = todayISO(), f = App.projFilter;
  let list = S.projects.filter(p => f === 'all' || (f === 'open' ? !p.done : p.done));
  list = list.sort((a, b) => a.done - b.done || a.deadline.localeCompare(b.deadline));
  const open = S.projects.filter(p => !p.done);
  const span = Math.max(30, ...open.map(p => diffDays(t, p.deadline) + 3), ...S.exams.filter(e => e.date >= t).map(e => diffDays(t, e.date) + 3));
  const marks = [...open.map(p => ({ id: p.id, date: p.deadline, c: p.color, l: p.title, p: 1 })), ...S.exams.filter(e => e.date >= t).map(e => ({ date: e.date, c: '#f87171', l: e.title, p: 0 }))].sort((a, b) => a.date.localeCompare(b.date));
  const tl = `<div class="rail card"><div class="rail-line">${[0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84].filter(n => n <= span).map(n => `<span style="left:${n / span * 100}%"><em>${n === 0 ? 'Auj.' : fmtShort(addDays(t, n))}</em></span>`).join('')}
    ${marks.map((m, i) => { const n = diffDays(t, m.date); return `<button class="pin lane${i % 4}" style="left:${clamp(n, 0, span) / span * 100}%;--c:${m.c}" ${m.id ? `data-act="goproj" data-id="${m.id}"` : `data-act="go" data-v="exams"`} title="${esc(m.l)} — ${relDays(n)}"><i>${m.p ? '📦' : '📝'}</i><b>${esc(m.l.length > 22 ? m.l.slice(0, 21) + '…' : m.l)}</b></button>`; }).join('')}</div></div>`;
  const cards = list.map(p => {
    const pct = Stats.progress(p), n = diffDays(t, p.deadline), isOpen = App.openProj === p.id, hasSubs = p.subs.length > 0;
    return `<article class="card proj ${p.done ? 'is-done' : ''} ${isOpen ? 'open' : ''}" id="proj-${p.id}" style="--c:${p.color}">
      <div class="proj-main" data-act="toggleproj" data-id="${p.id}">
        ${ring(pct, 70, 7, p.color)}
        <div class="pm"><h3>${esc(p.title)}</h3><div class="chips">${courseChip(p.courseId)}${p.done ? chip('Terminé ✓', 'u-ok') : chip(`${relDays(n)} · ${fmtShort(p.deadline)}`, 'u-' + urgency(n))}${p.priority === 'high' ? chip('🔥 Priorité', 'u-hot') : ''}</div></div>
        <span class="caret">⌄</span></div>
      <div class="proj-body"><div class="pbi">
        ${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ''}
        ${hasSubs ? `<ul class="subs">${p.subs.map(s => `<li class="${s.done ? 'done' : ''}"><button class="tick sm" data-act="sub" data-id="${p.id}" data-sid="${s.id}">${s.done ? '✓' : ''}</button><span>${esc(s.t)}</span><button class="x" data-act="delsub" data-id="${p.id}" data-sid="${s.id}" aria-label="Supprimer">×</button></li>`).join('')}</ul>`
          : `<label class="range">Avancement <b>${pct}%</b><input type="range" min="0" max="100" step="5" value="${pct}" data-input="progress" data-id="${p.id}" ${p.done ? 'disabled' : ''}></label>`}
        <input class="sub-add" placeholder="＋ Ajouter une sous-tâche (Entrée)" data-id="${p.id}">
        <div class="row-act"><button class="btn sm" data-act="edit" data-kind="project" data-id="${p.id}">Modifier</button>
          <button class="btn sm pri" data-act="finishproj" data-id="${p.id}">${p.done ? 'Rouvrir' : '✓ Marquer terminé'}</button>
          <button class="btn sm" data-act="focusproj" data-id="${p.id}">⏱ Focus</button></div>
      </div></div></article>`;
  }).join('');
  return `${head('Projets', `${open.length} en cours · ${S.projects.length - open.length} terminé${S.projects.length - open.length > 1 ? 's' : ''}`, `<button class="btn pri" data-act="new" data-kind="project">＋ Nouveau projet</button>`)}
  ${tl}
  <div class="tabs">${[['open', 'En cours'], ['done', 'Terminés'], ['all', 'Tous']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="pfilter" data-f="${k}">${l}</button>`).join('')}</div>
  <div class="proj-grid">${cards || empty('📂', 'Aucun projet ici. Crée-en un pour suivre son avancement !')}</div>`;
}

/* ---------- VUE : cours ---------- */
function vCourses() {
  const S = Store.state, h0 = 8, h1 = 19, H = (h1 - h0) * 52;
  const cols = [1, 2, 3, 4, 5, 6].map(d => {
    const it = layout(S.courses.filter(c => +c.day === d).map(c => ({ kind: 'cours', id: c.id, title: c.name, sub: c.room, start: c.start, s: toMin(c.start), e: toMin(c.end), color: c.color, key: '', done: false })));
    return `<div class="gcol"><div class="gh ${isoWeekday(todayISO()) === d ? 'today' : ''}">${DAYS_S[d]}</div><div class="gbody" style="height:${H}px">${it.map(i => blockHTML(i, h0 * 60, 52).replace(/<button class="tick".*?<\/button>/, '')).join('')}</div></div>`;
  }).join('');
  const hours = Array.from({ length: h1 - h0 }, (_, i) => `<div style="top:${i * 52}px">${pad(h0 + i)}h</div>`).join('');
  const totalEcts = S.courses.reduce((a, c) => a + (+c.ects || 0), 0);
  return `${head('Cours', `${S.courses.length} matières · ${totalEcts} ECTS`, `<button class="btn" data-act="icsimport">📅 Importer un .ics</button><button class="btn pri" data-act="new" data-kind="course">＋ Nouveau cours</button>`)}
  <div class="card gridwrap"><div class="ghours" style="height:${H}px;margin-top:34px">${hours}</div>${cols}</div>
  <div class="cards3">${S.courses.map(c => `<div class="card course" style="--c:${c.color}" data-act="edit" data-kind="course" data-id="${c.id}"><i></i><div><h3>${esc(c.name)}</h3><p>${DAYS[c.day]} · ${c.start}–${c.end}</p><small>${esc([c.room, c.teacher].filter(Boolean).join(' · '))}</small></div>${chip(c.ects + ' ECTS')}</div>`).join('') || empty('📚', 'Ajoute tes cours pour remplir ton emploi du temps.')}</div>`;
}

/* ---------- VUE : révisions ---------- */
function vRevisions() {
  const S = Store.state, t = todayISO(), mon = mondayOf(t);
  const all = S.revisions.map(r => ({ ...r, done: Stats.isDone(`rev:${r.id}:${r.date}`) })).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const groups = [['⚠️ En retard', r => !r.done && r.date < t], ["Aujourd'hui", r => !r.done && r.date === t], ['Cette semaine', r => !r.done && r.date > t && r.date < addDays(mon, 7)], ['Plus tard', r => !r.done && r.date >= addDays(mon, 7)], ['✓ Terminées', r => r.done]];
  const row = r => `<li class="rv ${r.done ? 'done' : ''}" style="--c:${colorOfCourse(r.courseId)}"><button class="tick" data-act="toggle" data-key="rev:${r.id}:${r.date}">${r.done ? '✓' : ''}</button><div data-act="edit" data-kind="rev" data-id="${r.id}"><b>${esc(r.title)}</b><small>${cap(fmtLong(r.date))} · ${r.start} · ${fmtDur(+r.duration)}</small></div>${courseChip(r.courseId)}</li>`;
  const prep = S.exams.filter(e => e.date >= t).map(e => {
    const rs = S.revisions.filter(r => r.examId === e.id), dn = rs.filter(r => Stats.isDone(`rev:${r.id}:${r.date}`)).length, n = diffDays(t, e.date);
    return `<div class="prep"><div><b>${esc(e.title)}</b><small>${relDays(n)} · ${rs.length ? `${dn}/${rs.length} séances` : 'pas de plan'}</small></div>${bar(rs.length ? dn / rs.length * 100 : 0, colorOfCourse(e.courseId))}</div>`;
  }).join('');
  const totalMin = all.filter(r => r.done).reduce((a, r) => a + (+r.duration || 0), 0);
  return `${head('Révisions', `${all.filter(r => !r.done).length} séance(s) à faire · ${fmtDur(totalMin)} déjà révisées`, `<button class="btn" data-act="autoplan">✨ Générer le plan</button><button class="btn pri" data-act="new" data-kind="rev">＋ Séance</button>`)}
  <section class="grid2"><div class="col">${groups.map(([n, fn]) => { const l = all.filter(fn); return l.length ? `<div class="card"><div class="ch"><h3>${n}</h3><small>${l.length}</small></div><ul class="list">${l.map(row).join('')}</ul></div>` : ''; }).join('') || `<div class="card">${empty('🧠', 'Aucune séance. Clique sur « Générer le plan » pour répartir tes révisions avant chaque examen.')}</div>`}</div>
  <div class="col"><div class="card"><div class="ch"><h3>Préparation des examens</h3></div>${prep || empty('🎯', 'Aucun examen à préparer.')}<p class="hint">💡 Le plan automatique crée 4 séances espacées (J-7, J-4, J-2, J-1) : cours → exercices → annales → fiche.</p></div></div></section>`;
}

/* ---------- VUE : examens ---------- */
function vExams() {
  const S = Store.state, t = todayISO();
  const up = S.exams.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const past = S.exams.filter(e => e.date < t).sort((a, b) => b.date.localeCompare(a.date));
  const card = e => {
    const n = diffDays(t, e.date), rs = S.revisions.filter(r => r.examId === e.id || (r.courseId && r.courseId === e.courseId && r.date <= e.date && r.date >= t));
    const dn = rs.filter(r => Stats.isDone(`rev:${r.id}:${r.date}`)).length;
    const target = parseISO(e.date); target.setHours(...e.start.split(':').map(Number));
    const hrs = Math.max(0, Math.floor((target - new Date()) / 36e5));
    return `<article class="card exam" style="--c:${colorOfCourse(e.courseId, '#f87171')}" data-act="edit" data-kind="exam" data-id="${e.id}">
      <div class="cd"><b>${n >= 0 ? n : 0}</b><small>jour${n > 1 ? 's' : ''}</small>${n >= 0 && n <= 3 ? `<em>${hrs} h</em>` : ''}</div>
      <div class="em"><h3>${esc(e.title)}</h3><p>${cap(fmtLong(e.date))} · ${e.start} · ${fmtDur(+e.duration)}</p><small>${esc(e.room || '')} ${e.coef ? '· coef ' + e.coef : ''}</small>
      <div class="prep-mini"><small>Révisions : ${dn}/${rs.length}</small>${bar(rs.length ? dn / rs.length * 100 : 0, colorOfCourse(e.courseId))}</div></div></article>`;
  };
  const pastRow = e => `<li class="rv" style="--c:${colorOfCourse(e.courseId)}" data-act="edit" data-kind="exam" data-id="${e.id}"><div><b>${esc(e.title)}</b><small>${fmtShort(e.date)} · coef ${e.coef || 1}</small></div>${e.grade !== '' ? `<span class="grade ${+e.grade >= 10 ? 'ok' : 'ko'}">${e.grade}<small>/20</small></span>` : chip('Note à saisir', 'u-warn')}</li>`;
  return `${head('Examens', up.length ? `Prochain : ${esc(up[0].title)} — ${relDays(diffDays(t, up[0].date))}` : 'Aucun examen à venir', `<button class="btn pri" data-act="new" data-kind="exam">＋ Nouvel examen</button>`)}
  <div class="cards2">${up.map(card).join('') || empty('🌴', 'Aucun examen à venir.')}</div>
  ${past.length ? `<div class="card"><div class="ch"><h3>Passés</h3></div><ul class="list">${past.map(pastRow).join('')}</ul></div>` : ''}`;
}

/* ---------- VUE : parcours ---------- */
function vParcours() {
  const S = Store.state, mods = Stats.allModules(), ects = Stats.ects(mods), avg = Stats.avg(mods), lv = Stats.level(), goal = +S.settings.goal || 14;
  const total = S.semesters.reduce((a, s) => a + Stats.ects(s.modules).total, 0) || 120;
  const done = (s) => { const e = Stats.ects(s.modules); return s.modules.length > 0 && s.modules.every(x => x.grade !== '') && e.got === e.total; };
  const curIdx = Math.max(0, S.semesters.findIndex(s => !done(s)));
  const road = S.semesters.map((s, i) => { const e = Stats.ects(s.modules), st = done(s) ? 'ok' : i === curIdx ? 'cur' : 'next';
    return `<div class="stp ${st}"><i>${st === 'ok' ? '✓' : i + 1}</i><b>${esc(s.name)}</b><small>${e.got}/${e.total || 30} ECTS</small></div>`; }).join('<span class="sep"></span>');
  // moyenne nécessaire sur les modules restants pour atteindre l'objectif
  const coefAll = mods.reduce((a, x) => a + (+x.coef || 1), 0), graded = mods.filter(x => x.grade !== '');
  const coefG = graded.reduce((a, x) => a + (+x.coef || 1), 0), sumG = graded.reduce((a, x) => a + (+x.grade) * (+x.coef || 1), 0);
  const need = coefAll > coefG ? (goal * coefAll - sumG) / (coefAll - coefG) : null;
  const needTxt = need == null ? '' : need > 20 ? `🎯 Objectif ${goal} hors d'atteinte sur les modules restants.` : need <= 0 ? `🎯 Objectif ${goal} déjà assuré !` : `🎯 Pour atteindre ${goal}/20 il te faut <b>${need.toFixed(1)}/20</b> de moyenne sur les modules restants.`;
  const gradedAll = S.semesters.flatMap(s => s.modules.filter(x => x.grade !== '').map(x => ({ n: x.name, g: +x.grade })));
  const chart = gradedAll.length ? (() => { const W = 560, Hh = 170, bw = Math.min(90, W / gradedAll.length);
    return `<svg viewBox="0 0 ${W} ${Hh + 26}" class="chart"><line x1="0" x2="${W}" y1="${Hh - 10 / 20 * Hh}" y2="${Hh - 10 / 20 * Hh}" class="pass"/><text x="${W - 2}" y="${Hh - 10 / 20 * Hh - 4}" text-anchor="end">10</text>
      ${gradedAll.map((x, i) => `<g><rect x="${i * bw + bw * .18}" width="${bw * .64}" y="${Hh - x.g / 20 * Hh}" height="${x.g / 20 * Hh}" rx="6" class="${x.g >= 10 ? 'okb' : 'kob'}"><title>${esc(x.n)} : ${x.g}</title></rect><text x="${i * bw + bw / 2}" y="${Hh - x.g / 20 * Hh - 5}" text-anchor="middle" class="v">${x.g}</text><text x="${i * bw + bw / 2}" y="${Hh + 14}" text-anchor="middle">${esc(x.n.length > 11 ? x.n.slice(0, 10) + '…' : x.n)}</text></g>`).join('')}</svg>`; })() : empty('📈', 'Saisis tes notes pour voir ta courbe de progression.');
  const sems = S.semesters.map(s => {
    const e = Stats.ects(s.modules), a = Stats.avg(s.modules), open = App.openSem === s.id || (App.openSem == null && s.id === S.semesters[curIdx]?.id);
    return `<div class="card sem ${open ? 'open' : ''}"><div class="sem-h" data-act="togglesem" data-id="${s.id}">${ring(e.total ? e.got / e.total * 100 : 0, 50, 6)}<div><h3>${esc(s.name)}</h3><small>${e.got}/${e.total} ECTS · moyenne ${a != null ? a.toFixed(2) : '—'}</small></div><span class="caret">⌄</span></div>
      <div class="sem-b"><div class="sbi"><table class="mods"><thead><tr><th>Module</th><th>ECTS</th><th>Coef</th><th>Note /20</th><th></th></tr></thead><tbody>
      ${s.modules.map(m => `<tr><td data-act="editmod" data-sid="${s.id}" data-id="${m.id}">${esc(m.name)}</td><td>${m.ects}</td><td>${m.coef}</td><td><input type="number" min="0" max="20" step="0.25" value="${m.grade}" placeholder="—" data-change="grade" data-sid="${s.id}" data-id="${m.id}"></td><td>${m.grade === '' ? '' : Stats.validated(m) ? '<span class="grade ok sm">Validé</span>' : '<span class="grade ko sm">Rattrapage</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Aucun module — ajoute-en un.</td></tr>'}</tbody></table>
      <div class="row-act"><button class="btn sm" data-act="newmod" data-sid="${s.id}">＋ Module</button><button class="btn sm" data-act="editsem" data-id="${s.id}">Renommer</button></div></div></div></div>`;
  }).join('');
  return `${head('Mon parcours', 'Ta progression dans le master, semestre après semestre', `<button class="btn" data-act="newsem">＋ Semestre</button><button class="btn pri" data-act="settings">⚙ Objectifs</button>`)}
  <section class="hero-par card">
    ${ring(total ? ects.got / total * 100 : 0, 150, 13, 'url(#g)', `<b>${ects.got}</b><small>/${total} ECTS</small>`)}
    <svg width="0" height="0"><defs><linearGradient id="g"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg>
    <div class="hp-info"><div class="kpis"><div><small>Moyenne générale</small><b>${avg != null ? avg.toFixed(2) : '—'}</b></div><div><small>Niveau</small><b>${lv.lvl}</b></div><div><small>Série</small><b>${Stats.streak()} 🔥</b></div><div><small>Focus total</small><b>${fmtDur(Stats.focusMinutes())}</b></div></div>
      <div class="xp"><small>${lv.xp} XP · encore ${Math.ceil(lv.next)} XP pour le niveau ${lv.lvl + 1}</small>${bar(lv.pct, 'linear-gradient(90deg,var(--accent),#22d3ee)')}</div>
      <p class="need">${needTxt}</p></div></section>
  <div class="card road"><div class="roadmap">${road || ''}</div></div>
  <section class="grid2"><div class="col">${sems}</div>
    <div class="col"><div class="card"><div class="ch"><h3>Notes par module</h3></div>${chart}</div>
    <div class="card"><div class="ch"><h3>Succès</h3><small>${Stats.badges().filter(b => b.ok).length}/${Stats.badges().length}</small></div><div class="badges">${Stats.badges().map(b => `<div class="badge ${b.ok ? 'on' : ''}" title="${esc(b.d)}"><i>${b.i}</i><b>${b.n}</b><small>${b.d}</small></div>`).join('')}</div></div></div></section>`;
}

/* ---------- VUE : focus (Pomodoro) ---------- */
const Pomo = { mode: 'focus', total: 25 * 60, remaining: 25 * 60, running: false, endAt: 0, started: 0 };
function vFocus() {
  const t = todayISO(), S = Store.state;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)), vals = days.map(Stats.focusOn), mx = Math.max(60, ...vals);
  const label = App.pomoLabel;
  return `${head('Focus', 'Sessions de travail profond, une à la fois', '')}
  <section class="grid2"><div class="card pomo"><div class="modes">${[[25, 'Pomodoro 25'], [50, 'Deep 50'], [15, 'Pause 15']].map(([m, l]) => `<button class="${Pomo.total === m * 60 ? 'on' : ''}" data-act="pomomode" data-m="${m}">${l}</button>`).join('')}</div>
    <div class="pomo-ring" id="pomo-ring">${ring(100, 260, 14, 'url(#g2)', `<b id="pomo-time">${fmtClock(Pomo.remaining)}</b><small id="pomo-mode">${Pomo.mode === 'focus' ? 'Concentration' : 'Pause'}</small>`)}<svg width="0" height="0"><defs><linearGradient id="g2"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg></div>
    <select id="pomo-label" data-input="pomolabel"><option value="">Sur quoi travailles-tu ?</option>${S.projects.filter(p => !p.done).map(p => `<option ${label === p.title ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}${S.courses.map(c => `<option ${label === 'Révision : ' + c.name ? 'selected' : ''}>Révision : ${esc(c.name)}</option>`).join('')}<option ${label === 'Autre' ? 'selected' : ''}>Autre</option></select>
    <div class="pomo-btns"><button class="btn pri big" id="pomo-go" data-act="pomotoggle">${Pomo.running ? '⏸ Pause' : '▶ Démarrer'}</button><button class="btn" data-act="pomoreset">↺ Reset</button><button class="btn" data-act="pomosave">💾 Enregistrer</button></div></div>
  <div class="col"><div class="card"><div class="ch"><h3>7 derniers jours</h3><small>${fmtDur(vals.reduce((a, b) => a + b, 0))}</small></div><div class="fbars">${days.map((d, i) => `<div><i style="height:${vals[i] / mx * 100}%" title="${vals[i]} min"></i><small>${DAYS_S[isoWeekday(d)]}</small></div>`).join('')}</div></div>
  <div class="card"><div class="ch"><h3>Sessions récentes</h3></div><ul class="list">${S.focus.slice(-6).reverse().map(f => `<li class="rv"><div><b>${esc(f.label || 'Session libre')}</b><small>${fmtShort(f.date)}</small></div>${chip(fmtDur(f.min))}</li>`).join('') || empty('⏱', 'Lance ta première session !')}</ul></div></div></section>`;
}
const fmtClock = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;

/* ---------- Registre des vues ---------- */
const VIEWS = {
  dash: { label: "Vue d'ensemble", icon: '🏠', fn: vDash }, day: { label: 'Ma journée', icon: '🗓️', fn: vDay }, week: { label: 'Semaine', icon: '📆', fn: vWeek },
  projects: { label: 'Projets', icon: '🚀', fn: vProjects }, courses: { label: 'Cours', icon: '📚', fn: vCourses }, revisions: { label: 'Révisions', icon: '🧠', fn: vRevisions },
  exams: { label: 'Examens', icon: '📝', fn: vExams }, parcours: { label: 'Parcours', icon: '🎓', fn: vParcours }, focus: { label: 'Focus', icon: '⏱️', fn: vFocus },
};

/* ---------- Rendu ---------- */
function renderSide() {
  const lv = Stats.level();
  $('#side').innerHTML = `<div class="brand"><span>🎓</span><div><b>Suivi Master</b><small>Planifie. Avance. Valide.</small></div></div>
  <nav>${Object.entries(VIEWS).map(([k, v], i) => `<a href="#${k}" class="${App.view === k ? 'on' : ''}" data-act="go" data-v="${k}"><i>${v.icon}</i><span>${v.label}</span><kbd>${i + 1}</kbd></a>`).join('')}</nav>
  <div class="mini-pomo ${Pomo.running ? 'run' : ''}" id="mini-pomo" data-act="go" data-v="focus"><span>⏱</span><b id="mini-time">${fmtClock(Pomo.remaining)}</b><small>${Pomo.running ? (Pomo.mode === 'focus' ? 'Focus en cours' : 'Pause') : 'Focus'}</small></div>
  <div class="lvl" data-act="go" data-v="parcours"><div><b>Niveau ${lv.lvl}</b><small>🔥 ${Stats.streak()} j</small></div>${bar(lv.pct, 'linear-gradient(90deg,var(--accent),#22d3ee)')}</div>
  <div class="side-foot"><button class="btn sm" data-act="settings">⚙ Réglages</button><button class="btn sm ico" data-act="theme" title="Thème">${Store.state.settings.theme === 'dark' ? '☀️' : '🌙'}</button></div>`;
}
function render(anim = false) {
  const y = window.scrollY, view = VIEWS[App.view] || VIEWS.dash;
  $('#main').innerHTML = `<div class="view ${anim ? 'anim' : ''}">${view.fn()}</div>`;
  renderSide();
  document.title = `${view.label} · Suivi Master`;
  if (!anim) window.scrollTo(0, y);
  afterRender(anim);
}
function afterRender(anim) {
  $$('[data-count]').forEach(el => { const to = +el.dataset.count; if (!anim || !to) return; const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(f); })(t0); });
  if (App.view === 'day') {
    positionNow();
    if (anim && App.date === todayISO()) { const m = nowMin(), y = (clamp(m, T0 * 60, T1 * 60) - T0 * 60) * HOUR / 60; window.scrollTo({ top: Math.max(0, $('#tl').getBoundingClientRect().top + window.scrollY + y - 260), behavior: 'smooth' }); }
  }
}
function positionNow() { const el = $('#nowline'); if (!el) return; const m = nowMin(); el.style.display = m < T0 * 60 || m > T1 * 60 ? 'none' : 'block'; el.style.top = (m - T0 * 60) * HOUR / 60 + 'px'; }
function go(v, d) { if (!VIEWS[v]) v = 'dash'; App.view = v; if (d) App.date = d; if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v); render(true); window.scrollTo(0, 0); }

/* ---------- Toasts & confettis ---------- */
function toast(msg, ico = '✨') {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = `<i>${ico}</i><span>${msg}</span>`;
  $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3100);
}
function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 70) {
  const cv = $('#fx'), ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cs = [...COLORS], ps = Array.from({ length: n }, () => ({ x, y, vx: (Math.random() - .5) * 11, vy: Math.random() * -11 - 3, s: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cs[Math.random() * cs.length | 0], l: 1 }));
  (function f() {
    ctx.clearRect(0, 0, cv.width, cv.height); let alive = 0;
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l -= .011; if (p.l <= 0) return; alive++; ctx.save(); ctx.globalAlpha = p.l; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); });
    if (alive) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 784; g.gain.setValueAtTime(.15, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + 1); o.start(); o.stop(a.currentTime + 1); } catch { /* audio indisponible */ } }

/* ---------- Formulaires génériques (modales) ---------- */
const courseOpts = () => [{ v: '', l: '— Aucun —' }, ...Store.state.courses.map(c => ({ v: c.id, l: c.name }))];
const ENT = {
  project: { list: 'projects', label: 'Projet', fields: () => [
    { k: 'title', l: 'Titre', t: 'text', req: 1 }, { k: 'courseId', l: 'Matière', t: 'select', o: courseOpts() }, { k: 'deadline', l: 'Deadline', t: 'date', req: 1 },
    { k: 'priority', l: 'Priorité', t: 'select', o: [{ v: 'high', l: '🔥 Haute' }, { v: 'mid', l: 'Moyenne' }, { v: 'low', l: 'Basse' }] },
    { k: 'progress', l: 'Avancement % (si pas de sous-tâches)', t: 'number', min: 0, max: 100 }, { k: 'color', l: 'Couleur', t: 'color' }, { k: 'notes', l: 'Notes', t: 'textarea' }],
    def: () => ({ title: '', courseId: '', deadline: addDays(todayISO(), 14), priority: 'mid', progress: 0, color: COLORS[0], notes: '', subs: [], done: false }) },
  course: { list: 'courses', label: 'Cours', fields: () => [
    { k: 'name', l: 'Matière', t: 'text', req: 1 }, { k: 'day', l: 'Jour', t: 'select', o: [1, 2, 3, 4, 5, 6].map(i => ({ v: i, l: DAYS[i] })) },
    { k: 'start', l: 'Début', t: 'time' }, { k: 'end', l: 'Fin', t: 'time' }, { k: 'room', l: 'Salle', t: 'text' }, { k: 'teacher', l: 'Enseignant', t: 'text' }, { k: 'ects', l: 'ECTS', t: 'number', min: 0 }, { k: 'color', l: 'Couleur', t: 'color' }],
    def: () => ({ name: '', day: 1, start: '09:00', end: '11:00', room: '', teacher: '', ects: 4, color: COLORS[Store.state.courses.length % COLORS.length] }) },
  exam: { list: 'exams', label: 'Examen', fields: () => [
    { k: 'title', l: 'Intitulé', t: 'text', req: 1 }, { k: 'courseId', l: 'Matière', t: 'select', o: courseOpts() }, { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'start', l: 'Heure', t: 'time' },
    { k: 'duration', l: 'Durée (min)', t: 'number', min: 10 }, { k: 'room', l: 'Salle', t: 'text' }, { k: 'coef', l: 'Coefficient', t: 'number', min: 0 }, { k: 'grade', l: 'Note obtenue /20', t: 'number', min: 0, max: 20, step: .25 }],
    def: () => ({ title: '', courseId: '', date: addDays(todayISO(), 21), start: '09:00', duration: 120, room: '', coef: 1, grade: '' }) },
  rev: { list: 'revisions', label: 'Révision', fields: () => [
    { k: 'title', l: 'Quoi réviser ?', t: 'text', req: 1 }, { k: 'courseId', l: 'Matière', t: 'select', o: courseOpts() }, { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'start', l: 'Heure', t: 'time' }, { k: 'duration', l: 'Durée (min)', t: 'number', min: 10 }],
    def: () => ({ title: '', courseId: '', date: todayISO(), start: '18:00', duration: 60 }) },
  task: { list: 'tasks', label: 'Tâche', fields: () => [
    { k: 'title', l: 'Titre', t: 'text', req: 1 }, { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'start', l: 'Heure', t: 'time' }, { k: 'duration', l: 'Durée (min)', t: 'number', min: 5 }, { k: 'color', l: 'Couleur', t: 'color' }],
    def: () => ({ title: '', date: todayISO(), start: fromMin(Math.min(21 * 60, Math.ceil(nowMin() / 30) * 30 + 30)), duration: 60, color: COLORS[1] }) },
};
ENT.cours = ENT.course;

function fieldHTML(f, v) {
  const id = 'f_' + f.k, val = v ?? '';
  if (f.t === 'textarea') return `<label class="fld wide"><span>${f.l}</span><textarea id="${id}" rows="3">${esc(val)}</textarea></label>`;
  if (f.t === 'select') return `<label class="fld"><span>${f.l}</span><select id="${id}">${f.o.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></label>`;
  if (f.t === 'color') return `<div class="fld wide"><span>${f.l}</span><div class="swatches" id="${id}" data-v="${val}">${COLORS.map(c => `<button type="button" class="${c === val ? 'on' : ''}" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`).join('')}</div></div>`;
  return `<label class="fld"><span>${f.l}</span><input id="${id}" type="${f.t}" value="${esc(val)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.req ? 'required' : ''}></label>`;
}
function openModal({ title, fields, values, onSave, onDelete, extra = '', wide = false }) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay" data-act="closemodal"><form class="modal${wide ? ' wide' : ''}" novalidate><h2>${title}</h2><div class="fields">${fields.map(f => fieldHTML(f, values[f.k])).join('')}</div>${extra}
    <div class="m-act">${onDelete ? '<button type="button" class="btn danger" id="m-del">Supprimer</button>' : ''}<span></span><button type="button" class="btn" data-act="closemodal">Annuler</button><button class="btn pri" type="submit">Enregistrer</button></div></form></div>`;
  const form = $('.modal', root);
  form.addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { $$('[data-color]', form).forEach(x => x.classList.toggle('on', x === b)); b.parentElement.dataset.v = b.dataset.color; } });
  form.addEventListener('submit', e => {
    e.preventDefault(); const out = {};
    for (const f of fields) {
      const el = $('#f_' + f.k, form); let v = f.t === 'color' ? el.dataset.v : el.value.trim();
      if (f.req && !v) { el.focus(); el.classList.add('err'); return; }
      if (f.t === 'number') v = v === '' ? '' : +v;
      out[f.k] = v;
    }
    onSave(out); closeModal();
  });
  if (onDelete) $('#m-del', form).onclick = () => { if (confirm('Supprimer définitivement ?')) { onDelete(); closeModal(); } };
  setTimeout(() => $('input,select,textarea', form)?.focus(), 30);
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };

function openEntity(kind, id, preset = {}) {
  const E = ENT[kind]; if (!E) return;
  const list = Store.state[E.list], cur = id ? list.find(x => x.id === id) : null;
  openModal({
    title: `${cur ? 'Modifier' : 'Nouveau'} — ${E.label.toLowerCase()}`, fields: E.fields(), values: cur ? cur : { ...E.def(), ...preset },
    onSave: v => { Store.commit(s => { if (cur) Object.assign(cur, v); else s[E.list].push({ id: uid(), ...E.def(), ...preset, ...v }); }); toast(cur ? 'Modifié' : `${E.label} ajouté(e)`, cur ? '✏️' : '✨'); render(); },
    onDelete: cur ? () => { Store.commit(s => { s[E.list] = s[E.list].filter(x => x.id !== id); }); toast('Supprimé', '🗑️'); render(); } : null,
  });
}
function openModule(sid, id) {
  const sem = Store.state.semesters.find(s => s.id === sid), cur = id ? sem.modules.find(m => m.id === id) : null;
  openModal({
    title: cur ? 'Modifier le module' : 'Nouveau module',
    fields: [{ k: 'name', l: 'Module', t: 'text', req: 1 }, { k: 'ects', l: 'ECTS', t: 'number', min: 0 }, { k: 'coef', l: 'Coefficient', t: 'number', min: 0 }, { k: 'grade', l: 'Note /20', t: 'number', min: 0, max: 20, step: .25 }],
    values: cur || { name: '', ects: 4, coef: 2, grade: '' },
    onSave: v => { Store.commit(() => { if (cur) Object.assign(cur, v); else sem.modules.push({ id: uid(), ...v }); }); render(); },
    onDelete: cur ? () => { Store.commit(() => { sem.modules = sem.modules.filter(m => m.id !== id); }); render(); } : null,
  });
}
function openSettings() {
  const s = Store.state.settings;
  openModal({
    title: 'Réglages', fields: [{ k: 'name', l: 'Ton prénom', t: 'text' }, { k: 'goal', l: 'Objectif de moyenne /20', t: 'number', min: 0, max: 20, step: .5 }, { k: 'accent', l: 'Couleur d’accent', t: 'color' }], values: s,
    extra: `<div class="data-act"><small>Données (stockées dans ce navigateur)</small><div><button type="button" class="btn sm" data-act="icsimport">📅 Importer .ics</button><button type="button" class="btn sm" data-act="export">⬇ Exporter</button><button type="button" class="btn sm" data-act="import">⬆ Importer</button><button type="button" class="btn sm" data-act="demo">Démo</button><button type="button" class="btn sm danger" data-act="wipe">Tout effacer</button></div></div>`,
    onSave: v => { Store.commit(st => Object.assign(st.settings, v)); applyTheme(); render(); toast('Réglages enregistrés', '⚙️'); },
  });
}
function applyTheme() {
  const s = Store.state.settings; document.documentElement.dataset.theme = s.theme; document.documentElement.style.setProperty('--accent', s.accent || COLORS[0]);
  document.querySelector('meta[name=theme-color]').content = s.theme === 'dark' ? '#0b0b1a' : '#f4f3ff';
}

/* ---------- Actions (délégation d'événements) ---------- */
function toggleCheck(key, ev) {
  const before = Stats.level().lvl; let nowDone;
  Store.commit(s => { if (s.checks[key]) delete s.checks[key]; else s.checks[key] = todayISO(); nowDone = !!s.checks[key]; });
  if (nowDone) {
    toast('+10 XP — bien joué !', '✅'); const r = ev?.target?.getBoundingClientRect(); if (r) confetti(r.left + r.width / 2, r.top, 22);
    if (Stats.level().lvl > before) setTimeout(() => { toast(`Niveau ${Stats.level().lvl} atteint !`, '🏆'); confetti(); }, 400);
  }
  render();
}
const ACT = {
  go: el => go(el.dataset.v),
  goday: el => { App.date = el.dataset.d; go(el.dataset.v || 'day', el.dataset.d); },
  shiftday: el => { App.date = addDays(App.date, +el.dataset.n); render(); },
  shiftweek: el => { App.date = addDays(App.date, +el.dataset.n); render(); },
  toggle: (el, ev) => { ev.stopPropagation(); toggleCheck(el.dataset.key, ev); },
  edit: el => openEntity(el.dataset.kind, el.dataset.id),
  new: el => openEntity(el.dataset.kind, null, el.dataset.date ? { date: el.dataset.date } : {}),
  closemodal: (el, e) => { if (el.classList.contains('overlay') && e.target !== el) return; closeModal(); },
  settings: () => openSettings(),
  theme: () => { Store.commit(s => { s.settings.theme = s.settings.theme === 'dark' ? 'light' : 'dark'; }); applyTheme(); render(); },
  goproj: el => { App.projFilter = 'open'; App.openProj = el.dataset.id; go('projects'); setTimeout(() => $('#proj-' + el.dataset.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); },
  toggleproj: el => { App.openProj = App.openProj === el.dataset.id ? null : el.dataset.id; $$('.proj').forEach(c => c.classList.toggle('open', c.id === 'proj-' + App.openProj)); },
  pfilter: el => { App.projFilter = el.dataset.f; render(); },
  sub: el => { Store.commit(() => { const s = Store.state.projects.find(p => p.id === el.dataset.id).subs.find(x => x.id === el.dataset.sid); s.done = !s.done; }); const p = Store.state.projects.find(p => p.id === el.dataset.id); if (Stats.progress(p) === 100 && p.subs.length) { confetti(); toast('Toutes les étapes sont faites — marque le projet comme terminé !', '🎉'); } render(); },
  delsub: el => { Store.commit(() => { const p = Store.state.projects.find(p => p.id === el.dataset.id); p.subs = p.subs.filter(x => x.id !== el.dataset.sid); }); render(); },
  finishproj: el => { Store.commit(() => { const p = Store.state.projects.find(p => p.id === el.dataset.id); p.done = !p.done; if (p.done) { confetti(); toast('Projet terminé — +60 XP', '🏆'); } }); render(); },
  focusproj: el => { App.pomoLabel = Store.state.projects.find(p => p.id === el.dataset.id).title; go('focus'); },
  autoplan: () => autoPlan(),
  togglesem: el => { const open = $$('.sem.open').some(e => e.contains(el)); App.openSem = open ? '' : el.dataset.id; $$('.sem').forEach(e => e.classList.remove('open')); if (!open) el.closest('.sem').classList.add('open'); },
  newsem: () => openModal({ title: 'Nouveau semestre', fields: [{ k: 'name', l: 'Nom', t: 'text', req: 1 }], values: { name: `Semestre ${Store.state.semesters.length + 1}` }, onSave: v => { Store.commit(s => s.semesters.push({ id: uid(), name: v.name, modules: [] })); render(); } }),
  editsem: el => { const sem = Store.state.semesters.find(s => s.id === el.dataset.id); openModal({ title: 'Semestre', fields: [{ k: 'name', l: 'Nom', t: 'text', req: 1 }], values: sem, onSave: v => { Store.commit(() => { sem.name = v.name; }); render(); }, onDelete: () => { Store.commit(s => { s.semesters = s.semesters.filter(x => x.id !== sem.id); }); render(); } }); },
  newmod: el => openModule(el.dataset.sid),
  editmod: el => openModule(el.dataset.sid, el.dataset.id),
  pomotoggle: () => pomoToggle(), pomoreset: () => pomoReset(), pomosave: () => pomoSave(),
  pomomode: el => { Pomo.running = false; Pomo.mode = +el.dataset.m === 15 ? 'break' : 'focus'; Pomo.total = Pomo.remaining = +el.dataset.m * 60; render(); },
  export: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.state, null, 2)], { type: 'application/json' })); a.download = `suivi-master-${todayISO()}.json`; a.click(); toast('Sauvegarde exportée', '⬇️'); },
  import: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json'; i.onchange = async () => { try { const d = JSON.parse(await i.files[0].text()); if (!d.courses) throw 0; Store.replace(d); applyTheme(); closeModal(); render(); toast('Données importées', '⬆️'); } catch { toast('Fichier invalide', '⚠️'); } }; i.click(); },
  demo: () => { if (confirm('Remplacer tes données par les données de démonstration ?')) { Store.reset(true); applyTheme(); closeModal(); render(true); } },
  wipe: () => { if (confirm('Effacer toutes tes données ? Action irréversible.')) { Store.reset(false); applyTheme(); closeModal(); render(true); } },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (e.target.closest('input,select,textarea') && el !== e.target) return;
  ACT[el.dataset.act]?.(el, e);
});
document.addEventListener('keydown', e => {
  if (e.target.classList?.contains('sub-add') && e.key === 'Enter' && e.target.value.trim()) {
    const p = Store.state.projects.find(p => p.id === e.target.dataset.id), v = e.target.value.trim();
    Store.commit(() => p.subs.push({ id: uid(), t: v, done: false })); App.openProj = p.id; render(); $('#proj-' + p.id + ' .sub-add')?.focus(); return;
  }
  if (e.key === 'Escape') closeModal();
  if (e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey || $('.modal')) return;
  const keys = Object.keys(VIEWS), n = +e.key;
  if (n >= 1 && n <= keys.length) go(keys[n - 1]); else if (e.key === 'n') { e.preventDefault(); openEntity('task'); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.input === 'progress') { Store.commit(() => { Store.state.projects.find(p => p.id === el.dataset.id).progress = +el.value; }); el.previousElementSibling && (el.parentElement.querySelector('b').textContent = el.value + '%'); }
  if (el.dataset.input === 'pomolabel') App.pomoLabel = el.value;
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.input === 'progress') render();
  if (el.dataset.change === 'grade') {
    const m = Store.state.semesters.find(s => s.id === el.dataset.sid).modules.find(m => m.id === el.dataset.id), wasOk = Stats.validated(m);
    Store.commit(() => { m.grade = el.value === '' ? '' : clamp(+el.value, 0, 20); });
    if (!wasOk && Stats.validated(m)) { confetti(); toast(`${m.name} validé !`, '🎓'); }
    render();
  }
});
/* Clic sur la grille de la timeline → nouveau créneau à l'heure cliquée */
document.addEventListener('click', e => {
  const tl = e.target.closest('#tl'); if (!tl || e.target.closest('.blk')) return;
  const y = e.clientY - tl.getBoundingClientRect().top, m = clamp(Math.floor((y / HOUR * 60 + T0 * 60) / 30) * 30, T0 * 60, (T1 - 1) * 60);
  openEntity('task', null, { date: tl.dataset.date, start: fromMin(m) });
});

/* ---------- Plan de révision automatique ---------- */
function autoPlan() {
  const S = Store.state, t = todayISO(), steps = [[7, 'Relire le cours'], [4, 'Exercices'], [2, 'Annales'], [1, 'Fiche de synthèse']]; let n = 0;
  Store.commit(s => {
    s.exams.filter(e => e.date >= t).forEach(e => {
      steps.forEach(([off, what], i) => {
        const date = addDays(e.date, -off); if (date < t || s.revisions.some(r => r.examId === e.id && r.step === i)) return;
        s.revisions.push({ id: uid(), examId: e.id, step: i, title: `${what} — ${e.title.replace(/^Examen\s*/i, '')}`, courseId: e.courseId, date, start: i % 2 ? '19:00' : '18:00', duration: off === 1 ? 60 : 90 }); n++;
      });
    });
  });
  toast(n ? `${n} séance${n > 1 ? 's' : ''} de révision planifiée${n > 1 ? 's' : ''}` : 'Le plan est déjà à jour', n ? '🧠' : 'ℹ️'); render();
}

/* ---------- Minuteur Pomodoro (reste actif dans toutes les vues) ---------- */
function pomoToggle() {
  if (Pomo.running) { Pomo.remaining = Math.max(0, Math.round((Pomo.endAt - Date.now()) / 1000)); Pomo.running = false; }
  else { if (Pomo.remaining <= 0) Pomo.remaining = Pomo.total; Pomo.endAt = Date.now() + Pomo.remaining * 1000; Pomo.running = true; Pomo.started = Pomo.started || Date.now(); }
  render();
}
function pomoElapsedMin() { const left = Pomo.running ? (Pomo.endAt - Date.now()) / 1000 : Pomo.remaining; return Math.floor((Pomo.total - left) / 60); }
function pomoLog(min) { if (min >= 1 && Pomo.mode === 'focus') Store.commit(s => s.focus.push({ date: todayISO(), min, label: App.pomoLabel })); }
function pomoReset() { Pomo.running = false; Pomo.remaining = Pomo.total; Pomo.started = 0; render(); }
function pomoSave() { const m = pomoElapsedMin(); if (m < 1) return toast('Rien à enregistrer pour l’instant', 'ℹ️'); pomoLog(m); toast(`${m} min de focus enregistrées`, '💾'); Pomo.running = false; Pomo.remaining = Pomo.total; Pomo.started = 0; render(); }
function pomoTick() {
  if (Pomo.running) {
    const left = Math.max(0, Math.round((Pomo.endAt - Date.now()) / 1000));
    if (left <= 0) {
      Pomo.running = false; beep(); confetti();
      if (Pomo.mode === 'focus') { pomoLog(Pomo.total / 60); toast(`Session terminée — +${Pomo.total / 60} XP`, '🎯'); Pomo.mode = 'break'; Pomo.total = Pomo.remaining = 5 * 60; }
      else { toast('Pause terminée, on repart ?', '⏰'); Pomo.mode = 'focus'; Pomo.total = Pomo.remaining = 25 * 60; }
      Pomo.started = 0; render(); return;
    }
    Pomo.remaining = left;
  }
  const txt = fmtClock(Pomo.remaining), set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('#pomo-time', txt); set('#mini-time', txt);
  if (Pomo.running) document.title = `${txt} · Focus`;
  const circ = $('#pomo-ring .bar'); if (circ) { const c = +circ.getAttribute('stroke-dasharray'); circ.style.strokeDashoffset = c * (1 - Pomo.remaining / Pomo.total); circ.style.animation = 'none'; }
}

/* ---------- Démarrage ---------- */
Store.load(); applyTheme();
App.view = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'dash';
render(true);
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS[v] && v !== App.view) go(v); });
setInterval(pomoTick, 500);
setInterval(() => { positionNow(); if (App.view === 'dash' && !$('.modal') && !document.activeElement?.closest('input,select,textarea')) render(); }, 60000);
