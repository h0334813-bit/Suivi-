'use strict';
/* =====================================================================
   Import d'un calendrier .ics (Google Agenda, Outlook, ENT, TimeTree…)
   ===================================================================== */
const ICS_WINDOW = { before: 120, after: 240 }; // jours analysés autour d'aujourd'hui
const ICS_EXAM = /\b(exam|examen|partiel|contr[ôo]le|soutenance|oral|rattrapage|ds|cc|cts?)\b/i;
const ICS_BYDAY = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };

const icsText = s => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/** Convertit une valeur DTSTART/DTEND. Les heures « Z » (UTC) passent en heure locale ; les autres sont prises telles quelles. */
function icsDate(val, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(val.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || /VALUE=DATE(?!-)/i.test(params)) return { date: new Date(+y, mo - 1, +d), allDay: true };
  if (z) return { date: new Date(Date.UTC(+y, mo - 1, +d, +h, +mi, +(s || 0))) };
  return { date: new Date(+y, mo - 1, +d, +h, +mi, +(s || 0)) };
}

function parseICS(text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events = []; let cur = null;
  for (const raw of lines) {
    if (raw === 'BEGIN:VEVENT') { cur = { ex: new Set() }; continue; }
    if (raw === 'END:VEVENT') { if (cur && cur.start) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = raw.indexOf(':'); if (i < 0) continue;
    const [name, ...rest] = raw.slice(0, i).split(';'), params = rest.join(';'), val = raw.slice(i + 1);
    switch (name.toUpperCase()) {
      case 'SUMMARY': cur.title = icsText(val); break;
      case 'LOCATION': cur.room = icsText(val); break;
      case 'DTSTART': { const r = icsDate(val, params); if (r) { cur.start = r.date; cur.allDay = !!r.allDay; } break; }
      case 'DTEND': { const r = icsDate(val, params); if (r) cur.end = r.date; break; }
      case 'RRULE': cur.rr = Object.fromEntries(val.split(';').map(p => p.split('='))); break;
      case 'EXDATE': val.split(',').forEach(v => { const r = icsDate(v, params); if (r) cur.ex.add(iso(r.date)); }); break;
      case 'STATUS': if (/CANCELLED/i.test(val)) cur.cancelled = true; break;
    }
  }
  return events.filter(e => !e.cancelled);
}

/** Déploie les récurrences (hebdomadaires / quotidiennes) dans la fenêtre analysée. */
function expandICS(ev, from, to) {
  const dur = ev.end ? ev.end - ev.start : 3600e3, startISO = iso(ev.start), at = dISO => { const d = parseISO(dISO); d.setHours(ev.start.getHours(), ev.start.getMinutes()); return d; };
  const mk = dISO => { const s = at(dISO); return { start: s, end: new Date(+s + dur) }; };
  const rr = ev.rr, out = [];
  if (!rr || (rr.FREQ !== 'WEEKLY' && rr.FREQ !== 'DAILY')) return startISO >= from && startISO <= to ? [{ start: ev.start, end: new Date(+ev.start + dur) }] : [];
  const until = rr.UNTIL ? icsDate(rr.UNTIL, '')?.date : null, untilISO = until ? iso(until) : '9999', count = +rr.COUNT || Infinity, step = +rr.INTERVAL || 1;
  let n = 0;
  const push = dISO => { if (dISO < startISO) return true; if (++n > count || dISO > untilISO || dISO > to) return false; if (dISO >= from && !ev.ex.has(dISO)) out.push(mk(dISO)); return true; };
  if (rr.FREQ === 'DAILY') { for (let i = 0; i < 800; i++) if (!push(addDays(startISO, i * step))) break; return out; }
  const days = (rr.BYDAY ? rr.BYDAY.split(',').map(x => ICS_BYDAY[x.slice(-2)]).filter(Boolean) : [isoWeekday(startISO)]).sort(), first = mondayOf(startISO);
  outer: for (let w = 0; w < 300; w++) for (const wd of days) if (!push(addDays(first, 7 * step * w + wd - 1))) break outer;
  return out;
}

/** Regroupe les occurrences (même titre, jour et horaire) et devine leur nature. */
function groupICS(events) {
  const t = todayISO(), from = addDays(t, -ICS_WINDOW.before), to = addDays(t, ICS_WINDOW.after), map = new Map();
  events.forEach(ev => expandICS(ev, from, to).forEach(o => {
    const date = iso(o.start), start = ev.allDay ? '' : fromMin(o.start.getHours() * 60 + o.start.getMinutes()), end = ev.allDay ? '' : fromMin(o.end.getHours() * 60 + o.end.getMinutes());
    const key = [ev.title || '(sans titre)', ev.allDay ? 'all' : isoWeekday(date), start, end].join('|');
    if (!map.has(key)) map.set(key, { title: ev.title || '(sans titre)', wd: isoWeekday(date), start, end, room: ev.room || '', allDay: ev.allDay, dates: [] });
    map.get(key).dates.push(date);
  }));
  const groups = [...map.values()];
  groups.forEach(g => {
    g.future = g.dates.filter(d => d >= t);
    g.type = g.allDay ? 'skip' : ICS_EXAM.test(g.title) ? 'exam' : g.dates.length >= 2 ? 'course' : 'task';
    if (!g.future.length && g.type !== 'course') g.type = 'skip';
  });
  const rank = { course: 0, exam: 1, task: 2, skip: 3 };
  return groups.sort((a, b) => rank[a.type] - rank[b.type] || b.dates.length - a.dates.length || a.title.localeCompare(b.title));
}

function icsRowHTML(g, i) {
  const when = g.dates.length > 1 ? `${DAYS[g.wd]} ${g.start}–${g.end} · ${g.dates.length} séances` : `${fmtShort(g.dates[0])}${g.start ? ' · ' + g.start + '–' + g.end : ' · toute la journée'}`;
  return `<label class="ics-row"><div class="ics-t"><b>${esc(g.title)}</b><small>${when}${g.room ? ' · ' + esc(g.room) : ''}</small></div>
    <select data-idx="${i}">${[['course', '📚 Cours (hebdo)'], ['exam', '📝 Examen'], ['task', '✅ Tâche'], ['skip', '— Ignorer']].map(([v, l]) => `<option value="${v}" ${v === g.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
}

function applyICS(groups, replace) {
  const t = todayISO(), stat = { course: 0, exam: 0, task: 0 };
  Store.commit(s => {
    if (replace) { s.courses = []; }
    groups.forEach(g => {
      const dur = Math.max(10, toMin(g.end) - toMin(g.start)) || 60;
      if (g.pick === 'course') {
        if (s.courses.some(c => c.name === g.title && +c.day === g.wd && c.start === g.start)) return;
        s.courses.push({ id: uid(), name: g.title, day: Math.min(g.wd, 6), start: g.start, end: g.end, room: g.room, teacher: '', ects: 0, color: COLORS[s.courses.length % COLORS.length] }); stat.course++;
      }
    });
    groups.forEach(g => {
      const dur = Math.max(10, toMin(g.end) - toMin(g.start)) || 60;
      if (g.pick === 'exam' || g.pick === 'task') g.dates.filter(d => d >= t).forEach(d => {
        if (g.pick === 'exam') {
          if (s.exams.some(e => e.title === g.title && e.date === d)) return;
          const c = s.courses.find(c => g.title.toLowerCase().includes(c.name.toLowerCase()));
          s.exams.push({ id: uid(), title: g.title, courseId: c ? c.id : '', date: d, start: g.start || '09:00', duration: dur, room: g.room, coef: 1, grade: '' }); stat.exam++;
        } else {
          if (s.tasks.some(x => x.title === g.title && x.date === d && x.start === g.start)) return;
          s.tasks.push({ id: uid(), title: g.title, date: d, start: g.start || '09:00', duration: dur, color: COLORS[1] }); stat.task++;
        }
      });
    });
    const ids = new Set(s.courses.map(c => c.id));
    [...s.exams, ...s.revisions, ...s.projects].forEach(x => { if (x.courseId && !ids.has(x.courseId)) x.courseId = ''; });
  });
  return stat;
}

function openICSPreview(events, fileName) {
  const groups = groupICS(events);
  if (!groups.length) return toast('Aucun événement exploitable dans ce fichier', '⚠️');
  const hasCourses = Store.state.courses.length > 0;
  openModal({
    title: '📅 Importer mon calendrier', wide: true, fields: [], values: {},
    extra: `<p class="ics-intro"><b>${events.length}</b> événement(s) dans <i>${esc(fileName)}</i>. Vérifie ce que chaque ligne doit devenir :</p>
      <div class="ics-list">${groups.map(icsRowHTML).join('')}</div>
      ${hasCourses ? `<label class="ics-opt"><input type="checkbox" id="ics-replace"> Remplacer mes cours actuels (${Store.state.courses.length})</label>` : ''}
      <small class="muted">Les ECTS, coefficients et enseignants ne sont pas dans un calendrier : tu pourras les compléter ensuite dans Cours.</small>`,
    onSave: () => {
      $$('.ics-row select').forEach(sel => { groups[+sel.dataset.idx].pick = sel.value; });
      const stat = applyICS(groups, !!$('#ics-replace')?.checked);
      toast(`Importé : ${stat.course} cours, ${stat.exam} examen(s), ${stat.task} tâche(s)`, '📅'); render();
    },
  });
}

ACT.icsimport = () => {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.ics,text/calendar';
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    try { const ev = parseICS(await f.text()); if (!ev.length) throw 0; openICSPreview(ev, f.name); } catch { toast('Fichier .ics invalide ou vide', '⚠️'); }
  };
  input.click();
};
