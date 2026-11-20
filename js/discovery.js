/* ============================================================
   DISCOVERY: small touches that make exploring careers feel like
   finding things out, not reading a directory.

   - an exploration trail: which careers and fields this learner has
     opened (remembered in this browser only -- a convenience, never
     needed for anything to work)
   - "Discover something new": three careers from fields they have not
     looked at yet, leaning towards their interests, with a Shuffle
   - fit meters on a career page that fill in to show how it fits them

   Motion lives in style.css (search "Discovery") and is switched off
   for anyone who asks their device to reduce motion.
   ============================================================ */

let DS_SEED = 1;

function dsKey(){ return 'iroli_viewed_v1_' + (ME && ME.id ? ME.id : 'anon'); }
function dsViewed(){
  try{ const v = JSON.parse(localStorage.getItem(dsKey()) || '[]'); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}
function dsMarkViewed(id){
  if(PREVIEW_MODE) return;
  try{
    const v = dsViewed();
    if(v.indexOf(id) < 0){ v.push(id); localStorage.setItem(dsKey(), JSON.stringify(v.slice(-400))); }
  }catch(e){}
}

/* ---------- the exploration trail ---------- */
function dsTrailHTML(){
  const viewed = dsViewed().map(function(id){ return CAREERS.find(function(c){ return c.id === id; }); }).filter(Boolean);
  const facs = {};
  viewed.forEach(function(c){ facs[c.faculty] = (facs[c.faculty] || 0) + 1; });
  const fieldCount = Object.keys(facs).length;
  return `<div class="ds-trail" aria-label="Your exploration so far">
    <div class="ds-trail-text"><b>${viewed.length ? 'You’ve explored ' + viewed.length + ' career' + (viewed.length === 1 ? '' : 's') : 'Start exploring'}</b>
      <span>${viewed.length ? fieldCount + ' of ' + FACULTIES.length + ' fields' : 'Open any career and its field lights up here'}</span></div>
    <div class="ds-dots">${FACULTIES.map(function(f){
      const n = facs[f.id] || 0;
      return `<button class="ds-dot ${n ? 'on' : ''}" style="--fc:${f.color};" title="${esc(f.name)}${n ? ': ' + n + ' explored' : ': not explored yet'}" aria-label="${esc(f.name)}, ${n ? n + ' explored' : 'not explored yet'}" onclick="navigate('explore','${f.id}')"></button>`;
    }).join('')}</div>
  </div>`;
}

/* ---------- Discover something new ---------- */
// A small seeded shuffle, so Shuffle gives a new set but a re-draw of the
// same screen (saving a favourite, say) keeps the cards where they are.
function dsRand(seed){ let s = seed * 9301 + 49297; return function(){ s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function dsPicks(l){
  const viewed = dsViewed();
  const seenFacs = {};
  viewed.forEach(function(id){ const c = CAREERS.find(function(x){ return x.id === id; }); if(c) seenFacs[c.faculty] = 1; });
  const assessed = !!l.assessmentCompletedAt;
  const rnd = dsRand(DS_SEED);
  const pool = CAREERS.filter(function(c){ return viewed.indexOf(c.id) < 0; }).map(function(c){
    const ev = assessed ? evaluateCareer(l, c) : null;
    // Fresh fields first; then the learner's interests; then chance.
    const w = (seenFacs[c.faculty] ? 0 : 40) + (ev ? ev.interestFit * 0.5 : 25) + rnd() * 45;
    return { career: c, ev: ev, w: w };
  }).sort(function(a, b){ return b.w - a.w; });
  const out = [], usedFac = {};
  for(let i = 0; i < pool.length && out.length < 3; i++){
    if(usedFac[pool[i].career.faculty]) continue;
    usedFac[pool[i].career.faculty] = 1; out.push(pool[i]);
  }
  return out;
}
function dsReason(l, p){
  const c = p.career, seen = dsViewed().some(function(id){ const x = CAREERS.find(function(y){ return y.id === id; }); return x && x.faculty === c.faculty; });
  if(p.ev && p.ev.interestFit >= 65){
    const r = l.riasec || {};
    const d = c.riasec.filter(function(x){ return (r[x] || 0) >= 60; }).map(function(x){ return (RIASEC.find(function(y){ return y.id === x; }) || {}).name; }).filter(Boolean)[0];
    if(d) return 'Fits your ' + d.toLowerCase() + ' side';
  }
  return seen ? 'Something different to try' : 'A field you haven’t explored yet';
}
function dsDiscoverHTML(l){
  const picks = dsPicks(l);
  if(!picks.length) return '';
  return `<section class="ds-discover" aria-label="Discover something new">
    <div class="ds-head"><div><h2>Discover something new</h2><p class="page-sub">Careers from fields you haven’t looked at yet${l.assessmentCompletedAt ? ', leaning towards your interests' : ''}.</p></div>
      <button class="btn btn-ghost btn-sm ds-shuffle" onclick="App.dsShuffle()" aria-label="Show three different careers">${icon('switch')} Shuffle</button></div>
    <div class="ds-grid" id="dsGrid">${picks.map(function(p, i){
      const c = p.career, f = facultyById(c.faculty);
      return `<button class="ds-card" style="--fc:${f.color};--i:${i};" onclick="navigate('career',${paramLiteral({ id:c.id, from:{ route:'explore' } })})">
        <span class="ds-fac">${esc(f.name)}</span>
        <span class="ds-name">${esc(c.name)}</span>
        <span class="ds-blurb">${esc(c.blurb)}</span>
        <span class="ds-why">${esc(dsReason(l, p))} →</span>
      </button>`;
    }).join('')}</div>
  </section>`;
}

/* ---------- fit meters on a career page ---------- */
function dsFitMetersHTML(l, ev){
  if(!l.assessmentCompletedAt) return '';
  const rows = [
    ['Your interests', ev.interestFit],
    ['Your strengths', ev.strengthFit],
    ['Your subjects and marks', ev.academicFit != null ? ev.academicFit : ev.subjectFit],
    ['How you like to work', ev.workStyleFit],
  ].filter(function(r){ return r[1] != null; });
  return `<div class="ds-meters">${rows.map(function(r, i){
    const v = Math.round(clamp(r[1], 0, 100));
    return `<div class="ds-meter"><div class="ds-meter-top"><span>${esc(r[0])}</span><b>${v}%</b></div>
      <div class="ds-meter-bar" role="img" aria-label="${esc(r[0])}: ${v}%"><div style="--w:${v}%;--i:${i};"></div></div></div>`;
  }).join('')}</div>`;
}

const DISCOVERY_HANDLERS = {
  dsShuffle(){
    DS_SEED++;
    const grid = document.getElementById('dsGrid');
    const host = grid && grid.closest('.ds-discover');
    if(!host){ render(); return; }
    const tmp = document.createElement('div');
    tmp.innerHTML = dsDiscoverHTML(ensureLearnerObj());
    const fresh = tmp.firstElementChild;
    if(fresh){ fresh.classList.add('ds-shuffled'); host.replaceWith(fresh); }
  },
};
