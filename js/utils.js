'use strict';
/* ---------- Petits utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Dates manipulées en chaînes locales « AAAA-MM-JJ » (pas de piège de fuseau horaire). */
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => iso(new Date());
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const isoWeekday = s => (parseISO(s).getDay() + 6) % 7 + 1; // 1 = lundi … 7 = dimanche
const mondayOf = s => addDays(s, 1 - isoWeekday(s));
const toMin = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAYS_S = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const fmtLong = s => parseISO(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = s => parseISO(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}` : `${m} min`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Libellé relatif à partir d'un nombre de jours. */
function relDays(n) {
  if (n < -1) return `En retard de ${-n} j`;
  if (n === -1) return 'Hier';
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  return `J-${n}`;
}
/** Niveau d'urgence pour la couleur des pastilles. */
function urgency(n) { return n < 0 ? 'late' : n <= 2 ? 'hot' : n <= 7 ? 'warn' : 'ok'; }

const COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#fb923c', '#f87171'];
