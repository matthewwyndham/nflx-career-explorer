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
</style>
</head>
<body>
<header>
  <div class="title-row">
    <h1>NETFLIX CAREERS</h1>
    <span class="meta">__TEAM__ · last sync __LAST_SYNCED__</span>
    <span class="pills">__PILLS__</span>
    <span class="spacer"></span>
    <span class="count" id="count">…</span>
  </div>
  <div class="toolbar">
    <input type="search" id="search" placeholder="title…">
    <input type="search" id="location" placeholder="location…">
    <input type="search" id="bu" placeholder="business unit…">
    <span class="sep">|</span>
    <label class="chk"><input type="checkbox" id="lvl-4"><span>L4</span></label>
    <label class="chk"><input type="checkbox" id="lvl-5"><span>L5</span></label>
    <label class="chk"><input type="checkbox" id="lvl-6"><span>L6</span></label>
    <label class="chk"><input type="checkbox" id="lvl-none"><span>no level</span></label>
    <span class="sep">|</span>
    <label class="chk"><input type="checkbox" id="remote" checked><span>USA Remote</span></label>
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
    location: document.getElementById('location'),
    bu: document.getElementById('bu'),
    lvl4: document.getElementById('lvl-4'),
    lvl5: document.getElementById('lvl-5'),
    lvl6: document.getElementById('lvl-6'),
    lvlNone: document.getElementById('lvl-none'),
    remote: document.getElementById('remote'),
    newOnly: document.getElementById('new'),
    recent: document.getElementById('recent'),
    recentDays: document.getElementById('recent-days'),
    status: document.getElementById('status'),
    sort: document.getElementById('sort'),
    reset: document.getElementById('reset'),
    expandAll: document.getElementById('expandAll'),
  };
  const rows = document.getElementById('rows');
  const count = document.getElementById('count');

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
  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function applyFilters() {
    const s = F.search.value.trim().toLowerCase();
    const loc = F.location.value.trim().toLowerCase();
    const bu = F.bu.value.trim().toLowerCase();
    const wantLevels = new Set();
    if (F.lvl4.checked) wantLevels.add(4);
    if (F.lvl5.checked) wantLevels.add(5);
    if (F.lvl6.checked) wantLevels.add(6);
    const wantNone = F.lvlNone.checked;
    const anyLevelFilter = wantLevels.size || wantNone;
    const remoteOnly = F.remote.checked;
    const newOnly = F.newOnly.checked;
    const recentOn = F.recent.checked;
    const recentDays = parseInt(F.recentDays.value) || 7;
    const recentCutoff = Date.now() / 1000 - recentDays * 86400;
    const status = F.status.value;

    let rs = STATE.jobs.filter(j => {
      if (status === 'open' && j.status !== 'open') return false;
      if (status === 'removed' && j.status !== 'removed') return false;
      if (newOnly && (!j.first_seen || !STATE.last_synced || j.first_seen < STATE.last_synced)) return false;
      if (recentOn && (j.t_create || 0) < recentCutoff) return false;
      if (remoteOnly && !isUSARemote(j)) return false;
      if (s && !(j.title || '').toLowerCase().includes(s)) return false;
      if (loc && !(j.locations || []).some(l => (l || '').toLowerCase().includes(loc))) return false;
      if (bu && !(j.business_unit || '').toLowerCase().includes(bu)) return false;
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
          (j.work_location_option ? ' · ' + escape(j.work_location_option) : '') +
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
    F.search.value = ''; F.location.value = ''; F.bu.value = '';
    F.lvl4.checked = F.lvl5.checked = F.lvl6.checked = F.lvlNone.checked = false;
    F.remote.checked = true; F.newOnly.checked = false; F.recent.checked = false;
    F.recentDays.value = 7;
    F.status.value = 'open'; F.sort.value = 'date';
    syncChkLabels(); applyFilters();
  });
  F.expandAll.addEventListener('click', () => {
    const visible = rows.querySelectorAll('.row');
    const anyCollapsed = Array.from(visible).some(r => !r.classList.contains('expanded'));
    visible.forEach(r => r.classList.toggle('expanded', anyCollapsed));
  });
  syncChkLabels();
  applyFilters();
})();
</script>
</body>
</html>
`;
