// HTML template — kept 1:1 with netflix_careers.py's HTML_TEMPLATE so the
// embedded JS keeps working unchanged. Placeholders __TEAM__,
// __LAST_SYNCED__, __LAST_SYNCED_TS__, __PILLS__, __DATA_JSON__ are
// substituted by render.ts.
//
// String.raw avoids string-escape processing (mirrors Python's r"""..."""),
// so embedded regex literals like /\.?0+$/ survive the copy.
export const HTML_TEMPLATE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Netflix Careers Explorer</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
:root {
  --bg: #0a0a0a;
  --bg-elev: #141414;
  --bg-hover: #1c1c1c;
  --border: #262626;
  --fg: #e6e6e6;
  --fg-dim: #888;
  --fg-faint: #555;
  --accent: #e50914;
  --new: #4ade80;
  --removed: #ef4444;
  --salary: #facc15;
  --level: #38bdf8;
  --link: #60a5fa;
  --mono: 'SF Mono', 'Menlo', 'Cascadia Code', 'Roboto Mono', ui-monospace, monospace;
}
* { box-sizing: border-box; }
html, body { background: var(--bg); color: var(--fg); font-family: var(--mono);
  font-size: 13px; line-height: 1.45; margin: 0; padding: 0; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
header { position: sticky; top: 0; z-index: 10; background: var(--bg-elev);
  border-bottom: 1px solid var(--border); padding: 8px 14px; }
.title-row { display: flex; align-items: baseline; gap: 14px; margin-bottom: 6px; flex-wrap: wrap; }
.title-row h1 { font-size: 14px; font-weight: 700; margin: 0; color: var(--accent); letter-spacing: 1px; }
.title-row .meta { color: var(--fg-dim); font-size: 12px; }
.title-row .pills { color: var(--fg-dim); font-size: 12px; }
.title-row .pills b { color: var(--fg); font-weight: 500; }
.title-btn { padding: 2px 8px; font-size: 11px; }
.spacer { flex: 1 1 auto; }
.count { color: var(--fg); font-size: 12px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.sep { color: var(--fg-faint); margin: 0 2px; }
input, select, button { background: var(--bg); color: var(--fg);
  font-family: var(--mono); font-size: 12px; border: 1px solid var(--border);
  padding: 4px 8px; border-radius: 3px; outline: none; }
input:focus, select:focus { border-color: var(--accent); }
input[type="search"] { min-width: 160px; }
input[type="number"] { width: 56px; }
button { cursor: pointer; }
/* Multi-select dropdown (location filter). */
.ms { position: relative; display: inline-block; }
.ms-btn.active { border-color: var(--accent); color: var(--accent); }
.ms-panel { position: absolute; top: calc(100% + 4px); left: 0; z-index: 20;
  background: var(--bg-elev); border: 1px solid var(--border); border-radius: 4px;
  padding: 6px; width: 280px; display: none; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
.ms.open .ms-panel { display: block; }
.ms-search { width: 100%; margin-bottom: 6px; }
.ms-actions { display: flex; justify-content: flex-end; margin-bottom: 6px; }
.ms-actions button { padding: 2px 8px; font-size: 11px; }
.ms-list { max-height: 260px; overflow-y: auto; }
.ms-group { color: var(--fg-faint); font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.5px; margin: 6px 2px 2px; }
.ms-opt { display: flex; align-items: center; gap: 7px; padding: 3px 4px; cursor: pointer;
  border-radius: 3px; color: var(--fg-dim); }
.ms-opt:hover { background: var(--bg-hover); color: var(--fg); }
.ms-opt.sel { color: var(--fg); }
.ms-opt input { display: inline-block; width: auto; padding: 0; margin: 0; accent-color: var(--accent); }
.ms-opt .lbl { flex: 1; word-break: break-word; }
.ms-opt .c { color: var(--fg-faint); font-size: 11px; }
button:hover { border-color: var(--accent); color: var(--accent); }
label.chk { display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  user-select: none; padding: 3px 8px; border: 1px solid var(--border); border-radius: 3px;
  color: var(--fg-dim); }
label.chk input { display: none; }
label.chk:hover { border-color: var(--fg-dim); color: var(--fg); }
label.chk.active { background: var(--accent); border-color: var(--accent); color: white; }
main { padding: 0 14px 24px; }
.row { border-bottom: 1px solid var(--border); padding: 6px 4px; cursor: pointer; }
.row:hover { background: var(--bg-hover); }
.row.expanded { background: var(--bg-hover); }
.row .line1 { display: flex; gap: 10px; align-items: baseline; }
.row .line1 .id { color: var(--accent); font-weight: 600; min-width: 84px; }
.row .line1 .title { color: var(--fg); flex: 1; word-break: break-word; }
.row .line1 .level { color: var(--level); white-space: nowrap; }
.row .line1 .salary { color: var(--salary); white-space: nowrap; }
.row .line2 { color: var(--fg-dim); font-size: 12px; padding-left: 94px; }
.row.new .id::before { content: '★ '; color: var(--new); }
.row.new .id { color: var(--new); }
.row.removed .title { text-decoration: line-through; color: var(--removed); }
.row.removed { opacity: 0.55; }
.detail { display: none; padding: 10px 16px 14px 94px; border-left: 2px solid var(--accent);
  margin-top: 6px; white-space: pre-wrap; color: var(--fg); background: var(--bg);
  font-size: 12.5px; max-height: 420px; overflow-y: auto; }
.row.expanded .detail { display: block; }
.empty { color: var(--fg-dim); text-align: center; padding: 40px; }
::selection { background: var(--accent); color: white; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #444; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: none; align-items: center; justify-content: center; z-index: 100; }
.modal-overlay.open { display: flex; }
.modal { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 6px;
  width: min(960px, 92vw); max-height: 88vh; overflow: auto; padding: 14px 16px 12px;
  position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
.modal-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; }
.modal-head h2 { margin: 0; font-size: 13px; color: var(--accent); letter-spacing: 1px; }
.modal-head .meta { color: var(--fg-dim); font-size: 11px; }
.modal-close { position: absolute; top: 8px; right: 10px; background: none; border: none;
  color: var(--fg-dim); font-size: 18px; cursor: pointer; padding: 2px 6px; }
.modal-close:hover { color: var(--accent); border: none; }
.timeline-svg { width: 100%; height: 320px; display: block; }
.timeline-svg circle.new-dot { fill: var(--accent); cursor: pointer; transition: r .12s ease; }
.timeline-svg circle.rem-dot { fill: none; stroke: var(--removed); stroke-width: 1.2;
  cursor: pointer; opacity: 0.7; }
.timeline-svg circle.new-dot:hover { stroke: white; stroke-width: 1.5; }
.timeline-svg circle.rem-dot:hover { opacity: 1; stroke-width: 2; }
.timeline-svg .axis { stroke: var(--fg-faint); stroke-dasharray: 2 3; }
.timeline-svg .lbl { fill: var(--fg-dim); font-size: 10px; font-family: var(--mono); }
.timeline-svg .lbl-side { fill: var(--fg); font-size: 11px; font-family: var(--mono); font-weight: 600; }
.timeline-summary { color: var(--fg-dim); font-size: 11px; margin-top: 8px; }
.timeline-summary b { color: var(--fg); font-weight: 500; }
.timeline-tooltip { position: absolute; background: var(--bg); border: 1px solid var(--accent);
  padding: 6px 9px; border-radius: 3px; font-size: 11px; color: var(--fg);
  pointer-events: none; display: none; max-width: 280px; line-height: 1.4; z-index: 1; }
.timeline-tooltip.show { display: block; }
.timeline-tooltip b { color: var(--accent); }
.timeline-tooltip .dim { color: var(--fg-dim); }
</style>
</head>
<body>
<header>
  <div class="title-row">
    <h1>NETFLIX CAREERS</h1>
    <span class="meta">__TEAM__ · last sync __LAST_SYNCED__</span>
    <span class="pills">__PILLS__</span>
    <button id="toggleTimeline" class="title-btn" title="postings & removals over time">↗ timeline</button>
    <span class="spacer"></span>
    <span class="count" id="count">…</span>
  </div>
  <div class="toolbar">
    <input type="search" id="search" placeholder="title…">
    <div class="ms" id="locMS">
      <button type="button" class="ms-btn" id="locBtn" title="filter by location / work type (choose any number)">location: all ▾</button>
      <div class="ms-panel" id="locPanel">
        <input type="search" class="ms-search" id="locSearch" placeholder="filter options…">
        <div class="ms-actions"><button type="button" id="locClear">clear</button></div>
        <div class="ms-list" id="locList"></div>
      </div>
    </div>
    <input type="search" id="bu" placeholder="business unit…">
    <select id="team"><option value="">all teams</option></select>
    <span class="sep">|</span>
    <label class="chk"><input type="checkbox" id="lvl-4"><span>L4</span></label>
    <label class="chk"><input type="checkbox" id="lvl-5"><span>L5</span></label>
    <label class="chk"><input type="checkbox" id="lvl-6"><span>L6</span></label>
    <label class="chk"><input type="checkbox" id="lvl-none"><span>no level</span></label>
    <span class="sep">|</span>
    <label class="chk" title="hide postings created more than 6 months ago"><input type="checkbox" id="max-age" checked><span>≤6mo</span></label>
    <label class="chk"><input type="checkbox" id="new"><span>NEW</span></label>
    <label class="chk"><input type="checkbox" id="recent"><span>recent</span></label>
    <input type="number" id="recent-days" value="7" min="1" max="365" title="days">
    <span class="sep">|</span>
    <select id="status">
      <option value="open">open</option>
      <option value="all">all</option>
      <option value="removed">removed only</option>
    </select>
    <select id="sort">
      <option value="date">sort: newest</option>
      <option value="high">sort: salary high</option>
      <option value="low">sort: salary low</option>
      <option value="title">sort: title</option>
    </select>
    <button id="reset" title="clear all filters">reset</button>
    <button id="expandAll" title="expand all visible rows">expand</button>
  </div>
</header>
<div class="modal-overlay" id="timelineModal" role="dialog" aria-modal="true" aria-label="postings and removals over time">
  <div class="modal">
    <button class="modal-close" id="timelineClose" aria-label="close">×</button>
    <div class="modal-head">
      <h2>POSTINGS & REMOVALS</h2>
      <span class="meta" id="timelineMeta"></span>
    </div>
    <div style="position:relative">
      <svg class="timeline-svg" id="timelineSvg" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
      <div class="timeline-tooltip" id="timelineTip"></div>
    </div>
    <div class="timeline-summary" id="timelineSummary"></div>
  </div>
</div>
<main id="rows"></main>
<script id="data" type="application/json">__DATA_JSON__</script>
<script>
(function(){
  const STATE = {
    last_synced: __LAST_SYNCED_TS__,
    jobs: JSON.parse(document.getElementById('data').textContent),
  };
  const F = {
    search: document.getElementById('search'),
    bu: document.getElementById('bu'),
    team: document.getElementById('team'),
    lvl4: document.getElementById('lvl-4'),
    lvl5: document.getElementById('lvl-5'),
    lvl6: document.getElementById('lvl-6'),
    lvlNone: document.getElementById('lvl-none'),
    maxAge: document.getElementById('max-age'),
    newOnly: document.getElementById('new'),
    recent: document.getElementById('recent'),
    recentDays: document.getElementById('recent-days'),
    status: document.getElementById('status'),
    sort: document.getElementById('sort'),
    reset: document.getElementById('reset'),
    expandAll: document.getElementById('expandAll'),
  };
  // Postings older than this (by creation date) are hidden unless the ≤6mo
  // toggle is switched off. Also bounds the timeline so old data doesn't skew it.
  const SIX_MONTHS = 182 * 86400;
  const rows = document.getElementById('rows');
  const count = document.getElementById('count');

  // Populate the team filter from the data (each job's team == its department).
  // Counts reflect currently-open positions so the dropdown reads like the page.
  (function () {
    const counts = {};
    STATE.jobs.forEach(j => {
      if (j.status !== 'open') return;
      const t = j.team || '—';
      counts[t] = (counts[t] || 0) + 1;
    });
    Object.keys(counts).sort((a, b) => a.localeCompare(b)).forEach(t => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t + ' (' + counts[t] + ')';
      F.team.appendChild(o);
    });
  })();

  // ── Location filter (multi-select dropdown, inclusive OR) ─────────────────
  // Combines work-type options (USA - Remote, onsite, remote) with every
  // distinct location string. Selecting several matches jobs in ANY of them.
  const selectedLocs = new Set();
  const LOC = {
    wrap: document.getElementById('locMS'),
    btn: document.getElementById('locBtn'),
    panel: document.getElementById('locPanel'),
    search: document.getElementById('locSearch'),
    clear: document.getElementById('locClear'),
    list: document.getElementById('locList'),
  };
  // Special work-type tokens (won't collide with real location strings).
  // The API mislabels USA-Remote jobs' work_location_option as onsite/remote_local
  // (see isUSARemote), so those two buckets exclude anything that is really
  // USA-Remote — otherwise a remote job would show up under "Onsite".
  const WORK_TYPES = [
    { v: '__remote:usa', label: 'USA - Remote', match: j => isUSARemote(j) },
    { v: '__wlo:onsite', label: 'Onsite', match: j => j.work_location_option === 'onsite' && !isUSARemote(j) },
    { v: '__wlo:remote_local', label: 'Remote (local)', match: j => j.work_location_option === 'remote_local' && !isUSARemote(j) },
  ];
  const WORK_MATCH = {};
  WORK_TYPES.forEach(w => { WORK_MATCH[w.v] = w.match; });

  function locMatches(j, v) {
    if (WORK_MATCH[v]) return WORK_MATCH[v](j);
    return (j.locations || []).includes(v);
  }

  (function buildLocOptions() {
    // Count only currently-open postings so the numbers read like the page.
    const wtCounts = {};
    const locCounts = {};
    STATE.jobs.forEach(j => {
      if (j.status !== 'open') return;
      WORK_TYPES.forEach(w => { if (w.match(j)) wtCounts[w.v] = (wtCounts[w.v] || 0) + 1; });
      (j.locations || []).forEach(l => { locCounts[l] = (locCounts[l] || 0) + 1; });
    });
    let html = '<div class="ms-group">work type</div>';
    WORK_TYPES.forEach(w => {
      html += optRow(w.v, w.label, wtCounts[w.v] || 0);
    });
    html += '<div class="ms-group">locations</div>';
    Object.keys(locCounts).sort((a, b) => a.localeCompare(b)).forEach(l => {
      html += optRow(l, l, locCounts[l]);
    });
    LOC.list.innerHTML = html;
  })();

  function optRow(value, label, c) {
    return '<label class="ms-opt" data-v="' + escape(value) + '" data-label="' +
      escape(label.toLowerCase()) + '">' +
      '<input type="checkbox" value="' + escape(value) + '">' +
      '<span class="lbl">' + escape(label) + '</span>' +
      '<span class="c">' + c + '</span></label>';
  }

  function updateLocBtn() {
    const n = selectedLocs.size;
    LOC.btn.textContent = 'location: ' + (n ? n + ' selected' : 'all') + ' ▾';
    LOC.btn.classList.toggle('active', n > 0);
  }

  LOC.btn.addEventListener('click', () => {
    LOC.wrap.classList.toggle('open');
    if (LOC.wrap.classList.contains('open')) LOC.search.focus();
  });
  document.addEventListener('click', e => {
    if (!LOC.wrap.contains(e.target)) LOC.wrap.classList.remove('open');
  });
  LOC.search.addEventListener('input', () => {
    const q = LOC.search.value.trim().toLowerCase();
    LOC.list.querySelectorAll('.ms-opt').forEach(o => {
      o.style.display = !q || o.getAttribute('data-label').includes(q) ? '' : 'none';
    });
  });
  LOC.list.addEventListener('change', e => {
    const cb = e.target;
    if (cb.tagName !== 'INPUT') return;
    if (cb.checked) selectedLocs.add(cb.value); else selectedLocs.delete(cb.value);
    cb.closest('.ms-opt').classList.toggle('sel', cb.checked);
    updateLocBtn();
    applyFilters();
  });
  LOC.clear.addEventListener('click', () => {
    selectedLocs.clear();
    LOC.list.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    LOC.list.querySelectorAll('.ms-opt').forEach(o => o.classList.remove('sel'));
    updateLocBtn();
    applyFilters();
  });

  function fmtSalaryValue(v) {
    if (v >= 1e6) {
      const m = v / 1e6;
      return m === Math.floor(m) ? '$' + m + 'M' : '$' + m.toFixed(2).replace(/\.?0+$/, '') + 'M';
    }
    return '$' + Math.round(v / 1000) + 'k';
  }
  function fmtSalary(low, high) {
    if (!low || !high) return '';
    return fmtSalaryValue(low) + '-' + fmtSalaryValue(high);
  }
  function fmtLevels(levels) {
    if (!levels || !levels.length) return '';
    if (levels.length === 1) return 'L' + levels[0];
    const min = Math.min(...levels), max = Math.max(...levels);
    if (max - min === levels.length - 1) return 'L' + min + '-' + max;
    return 'L' + levels.join('/');
  }
  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toISOString().slice(0, 10);
  }
  function daysAgo(ts) {
    if (!ts) return '';
    const days = Math.floor((Date.now() / 1000 - ts) / 86400);
    if (days <= 0) return 'today';
    if (days === 1) return '1d ago';
    if (days < 30) return days + 'd ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }
  function shortLoc(l) {
    if (!l) return '';
    if (l === 'Remote' || /-\s*Remote/.test(l) && !l.includes(',')) return l;
    const parts = l.split(',').map(s => s.trim());
    if (parts.length >= 3) return parts[0] + ', ' + parts[1];
    return l;
  }
  function summarizeLocs(locs) {
    if (!locs || !locs.length) return '';
    const shown = locs.slice(0, 3).map(shortLoc);
    return shown.join(' · ') + (locs.length > 3 ? ' (+' + (locs.length - 3) + ')' : '');
  }
  function isUSARemote(j) {
    return (j.locations || []).some(l => (l || '').trim() === 'USA - Remote');
  }
  // work_location_option is unreliable for USA-Remote jobs (the API reports
  // "onsite"/"remote_local" for them), so trust the location string first and
  // only fall back to the raw field for everything else.
  function workType(j) {
    if (isUSARemote(j)) return 'Remote';
    return j.work_location_option || '';
  }
  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function applyFilters() {
    const s = F.search.value.trim().toLowerCase();
    const bu = F.bu.value.trim().toLowerCase();
    const teamVal = F.team.value;
    const wantLevels = new Set();
    if (F.lvl4.checked) wantLevels.add(4);
    if (F.lvl5.checked) wantLevels.add(5);
    if (F.lvl6.checked) wantLevels.add(6);
    const wantNone = F.lvlNone.checked;
    const anyLevelFilter = wantLevels.size || wantNone;
    const maxAgeOn = F.maxAge.checked;
    const ageCutoff = Date.now() / 1000 - SIX_MONTHS;
    const newOnly = F.newOnly.checked;
    const recentOn = F.recent.checked;
    const recentDays = parseInt(F.recentDays.value) || 7;
    const recentCutoff = Date.now() / 1000 - recentDays * 86400;
    const status = F.status.value;

    let rs = STATE.jobs.filter(j => {
      if (status === 'open' && j.status !== 'open') return false;
      if (status === 'removed' && j.status !== 'removed') return false;
      if (maxAgeOn && (j.t_create || 0) < ageCutoff) return false;
      if (newOnly && (!j.first_seen || !STATE.last_synced || j.first_seen < STATE.last_synced)) return false;
      if (recentOn && (j.t_create || 0) < recentCutoff) return false;
      if (selectedLocs.size && ![...selectedLocs].some(v => locMatches(j, v))) return false;
      if (s && !(j.title || '').toLowerCase().includes(s)) return false;
      if (bu && !(j.business_unit || '').toLowerCase().includes(bu)) return false;
      if (teamVal && (j.team || '') !== teamVal) return false;
      if (anyLevelFilter) {
        const ls = j.levels || [];
        if (ls.length === 0) {
          if (!wantNone) return false;
        } else {
          if (!ls.some(l => wantLevels.has(l))) return false;
        }
      }
      return true;
    });

    const sortKey = F.sort.value;
    rs.sort((a, b) => {
      if (sortKey === 'high') return (b.salary_high || -1) - (a.salary_high || -1);
      if (sortKey === 'low')  return (b.salary_low  || -1) - (a.salary_low  || -1);
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
      return (b.t_create || 0) - (a.t_create || 0);
    });
    render(rs);
  }

  function render(rs) {
    count.textContent = rs.length + ' / ' + STATE.jobs.length + ' positions';
    if (!rs.length) { rows.innerHTML = '<div class="empty">no jobs match your filters</div>'; return; }
    const frag = document.createDocumentFragment();
    rs.forEach(j => {
      const row = document.createElement('div');
      const isNew = j.first_seen && STATE.last_synced && j.first_seen >= STATE.last_synced;
      const isRemoved = j.status === 'removed';
      row.className = 'row' + (isNew ? ' new' : '') + (isRemoved ? ' removed' : '');
      row.title = isRemoved
        ? 'Removed — no longer listed on Netflix’s board (history kept)'
        : isNew
          ? '★ New — first appeared in the most recent sync'
          : 'Open listing — tracked since ' + fmtDate(j.first_seen);
      row.setAttribute('data-jid', j.id);
      const url = escape(j.url || '');
      row.innerHTML =
        '<div class="line1">' +
          '<span class="id">' + escape(j.display_id) + '</span>' +
          '<span class="title">' + escape(j.title) + '</span>' +
          '<span class="level">' + fmtLevels(j.levels) + '</span>' +
          '<span class="salary">' + fmtSalary(j.salary_low, j.salary_high) + '</span>' +
        '</div>' +
        '<div class="line2">' +
          escape(summarizeLocs(j.locations)) +
          (workType(j) ? ' · ' + escape(workType(j)) : '') +
          (j.business_unit ? ' · ' + escape(j.business_unit) : '') +
          ' · created ' + fmtDate(j.t_create) + ' (' + daysAgo(j.t_create) + ')' +
          (url ? ' · <a href="' + url + '" target="_blank" rel="noopener">open ↗</a>' : '') +
          (isRemoved && j.removed_at ? ' · removed ' + fmtDate(j.removed_at) : '') +
        '</div>' +
        '<div class="detail">' + escape(j.description || '(no description cached)') + '</div>';
      row.addEventListener('click', e => {
        if (e.target.tagName === 'A') return;
        row.classList.toggle('expanded');
      });
      frag.appendChild(row);
    });
    rows.innerHTML = '';
    rows.appendChild(frag);
  }

  function syncChkLabels() {
    document.querySelectorAll('label.chk').forEach(lbl => {
      const cb = lbl.querySelector('input[type="checkbox"]');
      if (cb) lbl.classList.toggle('active', cb.checked);
    });
  }

  Object.entries(F).forEach(([k, el]) => {
    if (!el || !el.addEventListener) return;
    if (k === 'reset' || k === 'expandAll') return;
    const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(ev, () => { syncChkLabels(); applyFilters(); });
  });
  F.reset.addEventListener('click', () => {
    F.search.value = ''; F.bu.value = ''; F.team.value = '';
    F.lvl4.checked = F.lvl5.checked = F.lvl6.checked = F.lvlNone.checked = false;
    F.maxAge.checked = true; F.newOnly.checked = false; F.recent.checked = false;
    F.recentDays.value = 7;
    F.status.value = 'open'; F.sort.value = 'date';
    LOC.clear.click();
    syncChkLabels(); applyFilters();
  });
  F.expandAll.addEventListener('click', () => {
    const visible = rows.querySelectorAll('.row');
    const anyCollapsed = Array.from(visible).some(r => !r.classList.contains('expanded'));
    visible.forEach(r => r.classList.toggle('expanded', anyCollapsed));
  });
  syncChkLabels();
  applyFilters();

  // ── Bubble timeline modal ───────────────────────────────────────────────
  const TM = {
    btn: document.getElementById('toggleTimeline'),
    modal: document.getElementById('timelineModal'),
    closeBtn: document.getElementById('timelineClose'),
    svg: document.getElementById('timelineSvg'),
    tip: document.getElementById('timelineTip'),
    meta: document.getElementById('timelineMeta'),
    summary: document.getElementById('timelineSummary'),
  };
  function hideTip() { TM.tip.classList.remove('show'); }
  function openTimeline() { TM.modal.classList.add('open'); renderTimeline(); }
  function closeTimeline() { TM.modal.classList.remove('open'); hideTip(); }
  TM.btn.addEventListener('click', openTimeline);
  TM.closeBtn.addEventListener('click', closeTimeline);
  TM.modal.addEventListener('click', e => { if (e.target === TM.modal) closeTimeline(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && TM.modal.classList.contains('open')) closeTimeline();
  });

  function renderTimeline() {
    const W = 1000, H = 320;
    const PAD_X = 50, PAD_Y_TOP = 24, PAD_Y_BOT = 28;
    const MID = (PAD_Y_TOP + (H - PAD_Y_BOT)) / 2;

    // Only chart the last 6 months — older events stretch the axis and make
    // the bubble field look sparse and lopsided.
    const chartCutoff = Date.now() / 1000 - SIX_MONTHS;
    const newEvents = [], remEvents = [];
    STATE.jobs.forEach(j => {
      const lvls = j.levels || [];
      const lvl = lvls.length ? Math.max.apply(null, lvls) : 0;
      if (j.t_create && j.t_create >= chartCutoff) newEvents.push({ ts: j.t_create, lvl: lvl, title: j.title, displayId: j.display_id, jid: j.id });
      if (j.removed_at && j.removed_at >= chartCutoff) remEvents.push({ ts: j.removed_at, lvl: lvl, title: j.title, displayId: j.display_id, jid: j.id });
    });

    if (!newEvents.length && !remEvents.length) {
      TM.svg.innerHTML = '<text x="500" y="160" text-anchor="middle" class="lbl">no data yet — wait for the next sync</text>';
      TM.summary.innerHTML = '';
      TM.meta.textContent = '';
      return;
    }

    const allTs = newEvents.concat(remEvents).map(e => e.ts);
    const minTs = Math.min.apply(null, allTs);
    const maxTs = Math.max.apply(null, allTs.concat([Date.now() / 1000]));
    const range = Math.max(maxTs - minTs, 86400);

    function xFor(ts) { return PAD_X + (ts - minTs) / range * (W - 2 * PAD_X); }

    // Stack overlapping dots in time bins so they don't all sit on top of each other.
    const binSeconds = range / 80;
    const stacks = {};
    function place(ev, isNew) {
      const b = Math.floor((ev.ts - minTs) / binSeconds);
      const key = (isNew ? 'n' : 'r') + b;
      stacks[key] = (stacks[key] || 0) + 1;
      const idx = stacks[key];
      const r = 2.5 + Math.max(0, ev.lvl - 3) * 0.9;
      const step = Math.max(2 * r + 1.5, 6);
      const offset = 8 + (idx - 1) * step;
      return { x: xFor(ev.ts), y: isNew ? MID - offset : MID + offset, r: r };
    }

    newEvents.sort((a, b) => a.ts - b.ts);
    remEvents.sort((a, b) => a.ts - b.ts);

    let svg = '';
    // Faint vertical week gridlines.
    const weekStart = Math.ceil(minTs / 604800) * 604800;
    for (let t = weekStart; t <= maxTs; t += 604800) {
      const x = xFor(t);
      svg += '<line x1="' + x + '" y1="' + PAD_Y_TOP + '" x2="' + x + '" y2="' + (H - PAD_Y_BOT) + '" stroke="#262626" stroke-width="1" opacity="0.5"/>';
    }
    // Center time axis.
    svg += '<line class="axis" x1="' + PAD_X + '" y1="' + MID + '" x2="' + (W - PAD_X) + '" y2="' + MID + '" stroke-width="1"/>';
    // Side labels.
    svg += '<text class="lbl-side" x="' + (PAD_X - 6) + '" y="' + (PAD_Y_TOP + 12) + '" text-anchor="end" fill="#4ade80">new ↑</text>';
    svg += '<text class="lbl-side" x="' + (PAD_X - 6) + '" y="' + (H - PAD_Y_BOT - 4) + '" text-anchor="end" fill="#ef4444">↓ rem</text>';

    // Bottom date ticks (~6 evenly spaced).
    const TICKS = 6;
    for (let i = 0; i <= TICKS; i++) {
      const t = minTs + (range * i / TICKS);
      const x = xFor(t);
      svg += '<text class="lbl" x="' + x + '" y="' + (H - 6) + '" text-anchor="middle">' + fmtDate(t) + '</text>';
    }

    // Postings (above) — bigger dot for higher level.
    newEvents.forEach(e => {
      const p = place(e, true);
      svg += '<circle class="new-dot" cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '" data-jid="' + e.jid + '" data-ts="' + e.ts + '" data-kind="new" data-id="' + escape(e.displayId) + '" data-title="' + escape(e.title) + '" data-lvl="' + e.lvl + '"></circle>';
    });
    // Removals (below).
    remEvents.forEach(e => {
      const p = place(e, false);
      svg += '<circle class="rem-dot" cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '" data-jid="' + e.jid + '" data-ts="' + e.ts + '" data-kind="rem" data-id="' + escape(e.displayId) + '" data-title="' + escape(e.title) + '" data-lvl="' + e.lvl + '"></circle>';
    });

    TM.svg.innerHTML = svg;

    TM.svg.querySelectorAll('circle').forEach(c => {
      c.addEventListener('mousemove', ev => {
        const kind = c.getAttribute('data-kind');
        const lvl = c.getAttribute('data-lvl');
        const lvlTxt = lvl && lvl !== '0' ? 'L' + lvl : 'no level';
        const ts = parseInt(c.getAttribute('data-ts'), 10);
        const verb = kind === 'new' ? 'posted' : 'removed';
        TM.tip.innerHTML =
          '<b>' + escape(c.getAttribute('data-id')) + '</b> <span class="dim">' + lvlTxt + '</span><br>' +
          escape(c.getAttribute('data-title')) +
          '<br><span class="dim">' + verb + ' ' + fmtDate(ts) + ' (' + daysAgo(ts) + ')</span>';
        const parentRect = TM.svg.parentElement.getBoundingClientRect();
        let tx = ev.clientX - parentRect.left + 12;
        let ty = ev.clientY - parentRect.top + 12;
        const tipW = 280;
        if (tx + tipW > parentRect.width) tx = parentRect.width - tipW - 4;
        TM.tip.style.left = tx + 'px';
        TM.tip.style.top = ty + 'px';
        TM.tip.classList.add('show');
      });
      c.addEventListener('mouseleave', hideTip);
      c.addEventListener('click', () => {
        const jid = c.getAttribute('data-jid');
        const row = document.querySelector('.row[data-jid="' + jid + '"]');
        if (row) {
          closeTimeline();
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('expanded');
        }
      });
    });

    TM.meta.textContent = fmtDate(minTs) + ' → ' + fmtDate(maxTs);
    TM.summary.innerHTML =
      '<b>' + newEvents.length + '</b> postings tracked · <b>' + remEvents.length + '</b> removed · ' +
      'dot size scales with level · click a dot to jump to its row';
  }
})();
</script>
</body>
</html>
`;
