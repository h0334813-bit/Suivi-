'use strict';
/* ---------- État + persistance (localStorage) + statistiques dérivées ---------- */
const KEY = 'suivi-master-v1';

function seed() {
  const t = todayISO(), d = n => addDays(t, n);
  const courses = [
    { id: 'c1', name: 'Machine Learning', day: 1, start: '09:00', end: '12:00', room: 'A12', teacher: 'Pr. Martin', ects: 5, color: COLORS[0] },
    { id: 'c2', name: 'Systèmes distribués', day: 2, start: '14:00', end: '17:00', room: 'B03', teacher: 'Dr. Leroy', ects: 5, color: COLORS[1] },
    { id: 'c3', name: 'Data Mining', day: 3, start: '09:00', end: '11:00', room: 'A07', teacher: 'Pr. Dubois', ects: 5, color: COLORS[2] },
    { id: 'c4', name: 'Anglais professionnel', day: 4, start: '10:00', end: '12:00', room: 'C21', teacher: 'Ms. Clarke', ects: 3, color: COLORS[3] },
    { id: 'c5', name: 'Cloud & DevOps', day: 5, start: '14:00', end: '17:00', room: 'Lab 2', teacher: 'M. Bernard', ects: 5, color: COLORS[4] },
    { id: 'c6', name: 'Méthodologie de recherche', day: 3, start: '14:00', end: '16:00', room: 'D10', teacher: 'Dr. Petit', ects: 4, color: COLORS[5] },
  ];
  const sub = (t, done) => ({ id: uid(), t, done: !!done });
  const projects = [
    { id: 'p1', title: 'Projet ML — prédiction de séries temporelles', courseId: 'c1', deadline: d(12), priority: 'high', color: COLORS[0], progress: 0, done: false, notes: 'Dataset météo + modèle LSTM, rapport de 10 pages.',
      subs: [sub('Collecte & nettoyage des données', 1), sub('Modèle baseline', 1), sub('Entraînement LSTM'), sub('Rédaction du rapport'), sub('Soutenance (slides)')] },
    { id: 'p2', title: 'TP noté — cluster Kubernetes', courseId: 'c5', deadline: d(5), priority: 'high', color: COLORS[4], progress: 0, done: false, notes: '',
      subs: [sub('Déployer le cluster', 1), sub('Monitoring Prometheus'), sub('Pipeline CI/CD'), sub('Documentation')] },
    { id: 'p3', title: 'Revue de littérature (article)', courseId: 'c6', deadline: d(27), priority: 'mid', color: COLORS[5], progress: 25, done: false, notes: '30 références minimum.', subs: [] },
    { id: 'p4', title: 'Pitch vidéo en anglais', courseId: 'c4', deadline: d(2), priority: 'mid', color: COLORS[3], progress: 70, done: false, notes: '', subs: [] },
    { id: 'p5', title: 'Implémentation de Raft', courseId: 'c2', deadline: d(19), priority: 'mid', color: COLORS[1], progress: 0, done: false, notes: '',
      subs: [sub('Élection du leader'), sub('Réplication du log'), sub('Tests de pannes')] },
  ];
  const exams = [
    { id: 'e0', title: 'Partiel Cloud', courseId: 'c5', date: d(-9), start: '09:00', duration: 120, room: 'Amphi 1', coef: 3, grade: 14 },
    { id: 'e1', title: 'Examen Machine Learning', courseId: 'c1', date: d(21), start: '09:00', duration: 120, room: 'Amphi 2', coef: 3, grade: '' },
    { id: 'e2', title: 'Examen Systèmes distribués', courseId: 'c2', date: d(24), start: '14:00', duration: 120, room: 'Amphi 1', coef: 3, grade: '' },
    { id: 'e3', title: 'Examen Data Mining', courseId: 'c3', date: d(28), start: '09:00', duration: 90, room: 'B12', coef: 2, grade: '' },
    { id: 'e4', title: 'Oral d’anglais', courseId: 'c4', date: d(33), start: '10:00', duration: 30, room: 'C21', coef: 1, grade: '' },
  ];
  const revisions = [
    { id: 'r1', title: 'Fiche de révision — Régression & SVM', courseId: 'c1', date: t, start: '10:00', duration: 90 },
    { id: 'r2', title: 'Annales Data Mining', courseId: 'c3', date: d(1), start: '18:00', duration: 90 },
    { id: 'r3', title: 'Relire cours Raft / Paxos', courseId: 'c2', date: d(3), start: '19:00', duration: 60 },
    { id: 'r4', title: 'Exercices ML — réseaux de neurones', courseId: 'c1', date: d(-1), start: '17:00', duration: 90 },
  ];
  const tasks = [
    { id: 't1', title: 'Réunion groupe projet ML', date: t, start: '16:00', duration: 60, color: COLORS[0] },
    { id: 't2', title: 'Sport / pause', date: t, start: '18:30', duration: 60, color: COLORS[6] },
  ];
  const m = (name, ects, coef, grade) => ({ id: uid(), name, ects, coef, grade: grade ?? '' });
  const semesters = [
    { id: 's1', name: 'M1 — Semestre 1', modules: [m('Machine Learning', 5, 3), m('Systèmes distribués', 5, 3), m('Data Mining', 5, 2), m('Anglais professionnel', 3, 1), m('Cloud & DevOps', 5, 3, 14), m('Méthodologie de recherche', 4, 2, 15.5), m('Projet tutoré', 3, 2)] },
    { id: 's2', name: 'M1 — Semestre 2', modules: [] },
    { id: 's3', name: 'M2 — Semestre 3', modules: [] },
    { id: 's4', name: 'M2 — Semestre 4 (stage)', modules: [] },
  ];
  const checks = { 'seed:a': d(-1), 'seed:b': d(-1), 'seed:c': d(-2), 'seed:d': d(-3), 'seed:e': d(-3) };
  const focus = [{ date: d(-1), min: 50, label: 'Projet ML' }, { date: d(-2), min: 75, label: 'Révisions' }, { date: d(-3), min: 25, label: 'Cloud' }];
  return { v: 1, settings: { name: '', accent: COLORS[0], theme: 'dark', goal: 14 }, courses, projects, exams, revisions, tasks, semesters, checks, focus };
}

const Store = {
  state: null,
  load() {
    try { const r = localStorage.getItem(KEY); this.state = r ? JSON.parse(r) : seed(); } catch { this.state = seed(); }
    const s = this.state, def = { settings: {}, courses: [], projects: [], exams: [], revisions: [], tasks: [], semesters: [], checks: {}, focus: [] };
    for (const k in def) if (!s[k]) s[k] = def[k];
    s.settings = Object.assign({ name: '', accent: COLORS[0], theme: 'dark', goal: 14 }, s.settings);
    return this;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* stockage indisponible */ } },
  commit(fn) { fn(this.state); this.save(); },
  replace(obj) { this.state = obj; this.save(); this.load(); },
  reset(withDemo) { this.state = withDemo ? seed() : { v: 1, settings: { ...this.state.settings } }; this.save(); this.load(); },
};

/* ---------- Statistiques dérivées ---------- */
const Stats = {
  isDone: key => !!Store.state.checks[key],
  progress(p) {
    if (p.done) return 100;
    if (p.subs && p.subs.length) return Math.round(p.subs.filter(s => s.done).length / p.subs.length * 100);
    return clamp(+p.progress || 0, 0, 100);
  },
  /** Moyenne pondérée des modules notés d'une liste. */
  avg(mods) {
    const g = mods.filter(x => x.grade !== '' && x.grade !== null && !isNaN(+x.grade));
    const c = g.reduce((a, x) => a + (+x.coef || 1), 0);
    return c ? g.reduce((a, x) => a + (+x.grade) * (+x.coef || 1), 0) / c : null;
  },
  validated: x => x.grade !== '' && x.grade !== null && !isNaN(+x.grade) && +x.grade >= 10,
  ects(mods) { return { got: mods.filter(Stats.validated).reduce((a, x) => a + (+x.ects || 0), 0), total: mods.reduce((a, x) => a + (+x.ects || 0), 0) }; },
  allModules: () => Store.state.semesters.flatMap(s => s.modules),
  focusMinutes: () => Store.state.focus.reduce((a, f) => a + f.min, 0),
  xp() {
    const S = Store.state;
    const subs = S.projects.reduce((a, p) => a + p.subs.filter(s => s.done).length, 0);
    return Object.keys(S.checks).length * 10 + Stats.focusMinutes() + subs * 5 + S.projects.filter(p => p.done).length * 60 + Stats.allModules().filter(Stats.validated).length * 40;
  },
  xpFor: lvl => 40 * (lvl - 1) ** 2,
  level(xp = Stats.xp()) {
    const lvl = Math.floor(Math.sqrt(xp / 40)) + 1, lo = Stats.xpFor(lvl), hi = Stats.xpFor(lvl + 1);
    return { lvl, xp, pct: (xp - lo) / (hi - lo) * 100, next: hi - xp };
  },
  activeDays() {
    const S = Store.state, set = new Set(Object.values(S.checks));
    S.focus.forEach(f => set.add(f.date));
    return set;
  },
  streak() {
    const set = Stats.activeDays(); let day = todayISO(), n = 0;
    if (!set.has(day)) day = addDays(day, -1);
    while (set.has(day)) { n++; day = addDays(day, -1); }
    return n;
  },
  focusOn: date => Store.state.focus.filter(f => f.date === date).reduce((a, f) => a + f.min, 0),
  badges() {
    const S = Store.state, checks = Object.keys(S.checks).length, done = S.projects.filter(p => p.done).length;
    return [
      { i: '🌱', n: 'Premier pas', d: 'Cocher une première tâche', ok: checks >= 1 },
      { i: '🔥', n: 'En feu', d: 'Série de 3 jours', ok: Stats.streak() >= 3 },
      { i: '⚡', n: 'Marathon', d: '5 jours de série', ok: Stats.streak() >= 5 },
      { i: '🎯', n: 'Concentré', d: '100 min de focus', ok: Stats.focusMinutes() >= 100 },
      { i: '🧠', n: 'Deep work', d: '10 h de focus', ok: Stats.focusMinutes() >= 600 },
      { i: '📦', n: 'Livré !', d: 'Terminer un projet', ok: done >= 1 },
      { i: '🏆', n: 'Série de rendus', d: 'Terminer 3 projets', ok: done >= 3 },
      { i: '🎓', n: 'Validé', d: 'Valider un module', ok: Stats.allModules().some(Stats.validated) },
      { i: '⭐', n: 'Mention', d: 'Une note ≥ 16', ok: Stats.allModules().some(x => +x.grade >= 16) },
    ];
  },
};
