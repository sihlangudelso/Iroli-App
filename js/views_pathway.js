/* ============================================================
   GRADE 11-12 PATHWAY: screens and handlers (the Pro plan)

   Routes (all checked in render(): Grade 11-12, Pro, see pathwayOpen /
   isProLearner in app.js):
     pathway             the dashboard: goals, subjects, bursary, next steps
     pathway-marks       marks for each term, languages, support
     pathway-programmes  choose a programme (search + suggestions)
     pathway-programme   one programme's requirements (param: programme id)
     pathway-goal        one saved goal in detail (param: goal index)
     pathway-bursary     the bursary goal (starter list or Dream bursary)

   Data: learners.termMarks and learners.pathway (see add_pathway.sql).
   The logic lives in pathway_engine.js; this file only draws and saves.
   ============================================================ */

const PW_DATA_CYCLE = '2026 application cycle';
const PW_APP_STATUSES = [['', 'Not started'], ['applied', 'Applied'], ['offer', 'Offer received'], ['unsuccessful', 'Unsuccessful']];

// Programme rows (1,410) and bursaries, loaded once per session.
let PW_PROGRAMMES = undefined;   // undefined: not started, null: loading, 'error', or array
let PW_BURSARIES = undefined;
let PW_SUGGESTED = undefined;    // { key, list:[{ programme, career, reasons }] }
let PW_SEARCH = { q:'', type:'', place:'' };

async function pwLoadProgrammes(){
  if(PW_PROGRAMMES !== undefined) return;
  PW_PROGRAMMES = null;
  try{
    const cols = 'id, institution, typeOfInstitution, location, faculty, courseName, openingDate, closingDate, apsScore, subjectRequirements, institutionScores';
    let all = [], from = 0;
    // The API returns at most 1,000 rows per request.
    for(;;){
      const { data, error } = await sb.from('courseRequirements').select(cols).order('id').range(from, from + 999);
      if(error) throw error;
      all = all.concat(data || []);
      if(!data || data.length < 1000) break;
      from += 1000;
    }
    PW_PROGRAMMES = all;
  }catch(e){
    console.error('Could not load programmes', e);
    PW_PROGRAMMES = 'error';
  }
  if(isPathwayRoute(ROUTE)) render();
}
async function pwLoadBursaries(){
  if(PW_BURSARIES !== undefined) return;
  PW_BURSARIES = null;
  try{
    const { data, error } = await sb.from('bursaries').select('*').order('sortOrder');
    if(error) throw error;
    PW_BURSARIES = data || [];
  }catch(e){
    console.error('Could not load bursaries', e);
    PW_BURSARIES = 'error';
  }
  if(isPathwayRoute(ROUTE)) render();
}
// Learners see checked bursaries only; an admin previewing sees the rest too,
// labelled, so they can review them.
function pwVisibleBursaries(){
  if(!Array.isArray(PW_BURSARIES)) return [];
  return PW_BURSARIES.filter(function(b){ return b.active || PREVIEW_MODE; });
}
function pwProgrammeById(id){
  return Array.isArray(PW_PROGRAMMES) ? PW_PROGRAMMES.find(function(p){ return String(p.id) === String(id); }) : null;
}

/* ---------- small pieces ---------- */

// "Moving Physical Sciences to 70% and Geography to 60% would add 2 points."
function pwApsSuggestionText(l, a){
  const sug = pwApsSuggestions(pwCurrentMarks(l).marks, a.gap);
  if(!sug.length) return '';
  const all = sug.length >= a.gap;
  return 'Moving ' + sug.map(function(s){ return pwSubjectLabel(l, s.key) + ' from ' + s.pct + '% to ' + s.toPct + '%'; }).join(', ') + ' would add ' + sug.length + ' point' + (sug.length === 1 ? '' : 's') + (all ? '.' : ' of the ' + a.gap + ' you need.');
}

function pwStatusChip(status, text){
  const label = text || { met:'Met', unmet:'Not yet', notTaken:'Not your subject', check:'Check' }[status] || status;
  return `<span class="pw-chip pw-${esc(status)}">${esc(label)}</span>`;
}
function pwOverallChip(ev){
  const t = ev.overall === 'met' ? 'Currently meeting' : (ev.overall === 'unmet' ? 'Not yet meeting' : 'Needs checking');
  return pwStatusChip(ev.overall, t);
}
function pwHead(title, sub){
  return `<div class="pw-crumb"><a href="#" onclick="navigate('pathway');return false;">${icon('flag')} My Pathway</a></div>${pageHeadHTML(title, sub)}`;
}
function pwDate(s){
  if(!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if(isNaN(d)) return esc(String(s));
  return d.toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
}
function pwDayMonth(s){
  const d = new Date(String(s).replace(' ', 'T'));
  if(isNaN(d)) return '';
  return d.toLocaleDateString('en-ZA', { day:'numeric', month:'long' });
}
function pwData(l){ return (l && l.pathway) || {}; }
function pwIsGrade12(l){ return Number(l.grade) === 12; }
// The year a goal's intake would usually be: Grade 11 learners start
// university two years later, Grade 12 learners the next year.
function pwDefaultIntake(l){
  const y = Number(l.gradeYear) || currentSchoolYear();
  return pwIsGrade12(l) ? y + 1 : y + 2;
}
// A saved goal's live row differs from the copy saved with it.
function pwGoalChanged(goal){
  if(!Array.isArray(PW_PROGRAMMES)) return false;
  const p = pwProgrammeById(goal.programmeId);
  if(!p) return 'gone';
  const same = JSON.stringify(p.subjectRequirements || {}) === JSON.stringify(goal.subjectRequirements || {})
    && String(p.apsScore == null ? '' : Number(p.apsScore)) === String(goal.apsScore == null ? '' : Number(goal.apsScore))
    && JSON.stringify(p.institutionScores || null) === JSON.stringify(goal.institutionScores || null)
    && String(p.closingDate || '') === String(goal.closingDate || '');
  return same ? false : 'changed';
}
function pwSnapshot(p, l, old){
  return {
    programmeId: p.id, institution: p.institution, typeOfInstitution: p.typeOfInstitution || null, location: p.location || null,
    faculty: p.faculty || null, courseName: p.courseName, apsScore: p.apsScore == null ? null : Number(p.apsScore),
    subjectRequirements: p.subjectRequirements || {}, institutionScores: p.institutionScores || null,
    openingDate: p.openingDate || null, closingDate: p.closingDate || null,
    dataCycle: PW_DATA_CYCLE, source: 'Iroli programme requirements (' + PW_DATA_CYCLE + ')', savedAt: todayISO(),
    intakeYear: (old && old.intakeYear) || pwDefaultIntake(l),
    ownScore: old ? old.ownScore : null, application: old ? old.application : null,
  };
}

/* ---------- screens ---------- */

function viewPathwayRoute(route, param){
  pwLoadProgrammes();
  if(route === 'pathway-programmes') return viewPathwayProgrammes(param);
  if(route === 'pathway-programme') return viewPathwayProgramme(param);
  if(route === 'pathway-goal') return viewPathwayGoal(param);
  if(route === 'pathway-bursary'){ pwLoadBursaries(); return viewPathwayBursary(); }
  return viewPathwayHome();
}

// Grade 11-12 learners without Pro.
function viewPathwayUpgrade(){
  const l = ensureLearnerObj();
  const onStandard = l.licenseStatus === 'active';
  return `
  ${pageHeadHTML('My Pathway', 'Plan your way into university, one term at a time.')}
  <div class="card pw-upgrade">
    <span class="badge badge-good">Pro plan</span>
    <h3 style="margin-top:10px;">Work towards three university programmes and a bursary</h3>
    <ul class="pw-list">
      <li>Save three programmes you want to study, with their entry requirements.</li>
      <li>Add your marks each term and see the marks to aim for in every subject.</li>
      <li>Choose a bursary goal and track what you still need for it.</li>
      <li>In Grade 12: application deadlines and application tracking.</li>
    </ul>
    <p class="page-sub">${onStandard ? 'You are on the Standard plan. Move up to Pro for the R150 difference.' : 'Pro is R450 once-off and lasts until the end of Grade 12.'}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <a class="btn btn-primary" href="mailto:info@iroli.co.za?subject=Iroli%20Pro%20plan&body=My%20account%20email%3A%20${encodeURIComponent(ME.email||'')}">Ask about Pro</a>
      <a class="btn btn-ghost" href="pricing.html" target="_blank" rel="noopener">See pricing</a>
    </div>
    <p class="page-sub" style="margin-top:12px;">If your school gives Pro, join with your class code in <a href="#" onclick="navigate('account');return false;">Account</a>.</p>
  </div>`;
}

// After Grade 12 (see schoolFinished in app.js).
function viewSchoolFinished(){
  const l = ensureLearnerObj();
  return `
  ${pageHeadHTML('Your Iroli access has ended', 'Iroli covers learners from Grade 9 to the end of Grade 12.')}
  <div class="card">
    <h3>Well done on finishing Grade 12</h3>
    <p class="page-sub">Your account was set up for Grade 12 in ${esc(l.gradeYear)}. Your saved results stay in your account.</p>
    <p class="page-sub">Still in Grade 12, or repeating a grade? Change your grade and you can carry on.</p>
    <button class="btn btn-primary" onclick="navigate('profile')">Not my grade? Change it</button>
  </div>`;
}

// Shown once on the dashboard after the January move-up (see applyGradeRollover).
function pwRolloverBannerHTML(){
  if(!ROLLOVER_NOTICE) return '';
  return `<div class="disclaimer" style="margin-bottom:18px;align-items:center;">${icon('info','ic')}
    <div style="flex:1;">We've moved you to <b>Grade ${esc(ROLLOVER_NOTICE.toGrade)}</b> for ${esc(ROLLOVER_NOTICE.year)}. <a href="#" onclick="App.pwNotMyGrade();return false;">Not my grade? Change it</a></div>
    <button class="btn btn-ghost btn-sm" onclick="App.pwDismissRollover()">OK</button></div>`;
}

/* ---- the dashboard ---- */
function viewPathwayHome(){
  const l = ensureLearnerObj();
  const goals = pwGoals(l);
  const cur = pwCurrentMarks(l);
  const targets = pwTargets(l);
  const bursary = pwBursaryStatus(l);
  const steps = pwNextSteps(l);
  const g12 = pwIsGrade12(l);
  return `
  ${pageHeadHTML('My Pathway', g12 ? 'Your programme goals, marks, bursary and applications for Grade 12.' : 'Your programme goals, the marks to aim for and your bursary goal.')}
  ${steps.length ? `<div class="card pw-next" style="margin-bottom:18px;">
    <h3>What to do next</h3>
    <ol class="pw-steps">${steps.map(function(s){ return `<li><span>${s.html}</span>${s.action ? `<button class="btn btn-ghost btn-sm" onclick="${s.action}">${esc(s.label)}</button>` : ''}</li>`; }).join('')}</ol>
  </div>` : ''}

  <div class="section-title"><h2>The programmes you are working towards</h2></div>
  ${cur.source === 'none' ? `<p class="page-sub">Add your marks to see how they compare with these programmes.</p>` : `<p class="page-sub">Compared with your ${cur.source === 'term' ? esc(pwEntryLabel(cur.entry)) + ' marks' : 'latest profile marks'}.</p>`}
  <div class="grid grid-3 pw-goals">
    ${[0,1,2].map(function(i){ return goals[i] ? pwGoalCardHTML(l, goals[i], i, cur.marks) : pwEmptyGoalHTML(i); }).join('')}
  </div>

  <div class="section-title"><h2>Your subjects</h2><button class="btn btn-ghost btn-sm" onclick="navigate('marks')">${icon('edit')} Add or update marks</button></div>
  ${pwSubjectsTableHTML(l, targets, cur)}

  <div class="section-title"><h2>Your bursary goal</h2></div>
  ${pwBursarySummaryHTML(l, bursary)}

  ${g12 ? pwDeadlinesHTML(l, goals, bursary) : ''}

  ${disclaimerHTML('Entry requirements come from the ' + PW_DATA_CYCLE + ' and can change each year. "Currently meeting" means your marks reach the published academic minimums; universities also look at other things, and many programmes have more applicants than places. Always confirm on the university’s own website.')}
  `;
}
function pwEmptyGoalHTML(i){
  return `<button class="card pw-goal pw-goal-empty" onclick="navigate('pathway-programmes', ${i})">
    ${icon('plus')}<b>Choose programme ${i + 1}</b><span class="page-sub">Search by university or programme</span></button>`;
}
function pwGoalCardHTML(l, goal, i, marks){
  const ev = pwEvaluateGoal(l, goal, marks);
  const changed = pwGoalChanged(goal);
  const n = ev.counts;
  return `<div class="card pw-goal">
    <div class="pw-goal-top">${pwOverallChip(ev)}${changed ? `<span class="pw-chip pw-check">${changed === 'gone' ? 'No longer listed' : 'Requirements changed'}</span>` : ''}</div>
    <h3>${esc(goal.courseName)}</h3>
    <p class="page-sub" style="margin:0 0 8px;">${esc(goal.institution)}${goal.intakeYear ? ' · for ' + esc(goal.intakeYear) : ''}</p>
    <p class="pw-overall">${esc(pwOverallText(ev))}</p>
    <div class="pw-counts"><span>${n.met} met</span><span>${n.unmet + n.notTaken} not yet</span><span>${n.check} to check</span></div>
    ${pwIsGrade12(l) && goal.application && goal.application.status ? `<p class="page-sub" style="margin:6px 0 0;">Application: ${esc(pwAppLabel(goal.application.status))}</p>` : ''}
    <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="navigate('pathway-goal', ${i})">See details</button>
  </div>`;
}
function pwAppLabel(s){ const r = PW_APP_STATUSES.find(function(x){ return x[0] === s; }); return r ? r[1] : 'Not started'; }

function pwSubjectsTableHTML(l, targets, cur){
  if(cur.source === 'none') return `<div class="empty-state">${icon('chart')}<p>No marks yet. Add your latest term marks to see your targets.</p><button class="btn btn-primary" style="margin-top:10px;" onclick="navigate('marks')">Add marks</button></div>`;
  const asked = pwData(l).supportSubjects || [];
  return `<div class="table-wrap"><table class="pw-table">
    <thead><tr><th>Subject</th><th>Now</th><th>Aim for</th><th>Gap</th><th>Since last term</th><th>For</th></tr></thead>
    <tbody>${targets.map(function(t){
      const support = asked.indexOf(t.key) >= 0;
      return `<tr>
        <td><b>${esc(pwSubjectLabel(l, t.key))}</b>${support ? ' <span class="pw-chip pw-check">Support</span>' : ''}</td>
        <td>${t.current != null ? esc(t.current) + '%' : '<span class="page-sub">No mark</span>'}</td>
        <td>${t.target ? esc(t.target) + '%' : '<span class="page-sub">—</span>'}</td>
        <td>${t.gap == null ? '' : (t.gap > 0 ? `<span class="pw-gap">${esc(Math.round(t.gap * 10) / 10)}% to go</span>` : pwStatusChip('met', 'On target'))}</td>
        <td>${t.change == null ? '' : (t.change > 0 ? '+' + esc(t.change) + '%' : (t.change < 0 ? esc(t.change) + '%' : 'No change'))}</td>
        <td class="pw-for">${t.supports.length ? esc(t.supports.join(', ')) : ''}</td>
      </tr>`; }).join('')}</tbody></table></div>
    <p class="page-sub" style="margin-top:8px;">"Aim for" is the highest minimum your programme goals ask for in that subject.</p>`;
}

function pwBursarySummaryHTML(l, st){
  if(!st) return `<div class="card"><p class="page-sub" style="margin:0 0 10px;">Choose a bursary to work towards, from our list or your own Dream bursary.</p><button class="btn btn-primary" onclick="navigate('pathway-bursary')">Choose a bursary goal</button></div>`;
  const b = st.bursary;
  return `<div class="card">
    <div class="pw-goal-top">${pwStatusChip(st.overall, st.overall === 'met' ? 'All met so far' : (st.overall === 'unmet' ? 'Not yet' : 'Needs checking'))}${b.dream ? '<span class="pw-chip pw-notTaken">Added by you</span>' : ''}</div>
    <h3>${esc(b.name)}</h3>
    <div class="pw-counts">${st.academic.length ? `<span>Academic: ${st.academic.filter(function(x){ return x.status === 'met'; }).length} of ${st.academic.length} met</span>` : ''}<span>Other requirements: ${st.other.filter(function(x){ return x.status === 'met'; }).length} of ${st.other.length}</span><span>Documents: ${st.docsHave} of ${st.docs.length} ready</span></div>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="navigate('pathway-bursary')">See details</button>
  </div>`;
}

function pwDeadlinesHTML(l, goals, bursary){
  const rows = [];
  goals.forEach(function(g){ if(g.closingDate) rows.push({ what: g.courseName + ' (' + pwShortInstitution(g.institution) + ')', when: g.closingDate, status: g.application && g.application.status }); });
  if(bursary && bursary.bursary.usualClosing) rows.push({ what: bursary.bursary.name, when: null, text: bursary.bursary.usualClosing, status: bursary.bursary.application && bursary.bursary.application.status });
  if(!rows.length) return '';
  return `<div class="section-title"><h2>Application deadlines</h2></div>
  <div class="card"><div class="table-wrap"><table class="pw-table"><thead><tr><th>Application</th><th>Closed last year on</th><th>Your application</th></tr></thead><tbody>
    ${rows.map(function(r){ return `<tr><td>${esc(r.what)}</td><td>${r.when ? esc(pwDayMonth(r.when)) : esc(r.text)}</td><td>${esc(pwAppLabel(r.status || ''))}</td></tr>`; }).join('')}
  </tbody></table></div>
  <p class="page-sub" style="margin-top:8px;">These are last year's closing dates. Universities and bursaries set new dates each year, so check each one early.</p></div>`;
}

/* ---- what to do next ---- */
function pwNextSteps(l){
  const steps = [];
  const pw = pwData(l), goals = pwGoals(l);
  const year = Number(l.gradeYear) || currentSchoolYear();
  const langs = pw.languages || {};
  const thisYear = (l.termMarks && l.termMarks[year] && l.termMarks[year].terms) || {};
  const termsDone = PW_TERMS.filter(function(t){ return thisYear[t] && Object.keys(thisYear[t]).length; });
  if(!langs.home || !langs.fal) steps.push({ html: 'Tell us which languages you take, so we can check language requirements.', action: "navigate('marks')", label: 'Add languages' });
  if(pwIsGrade12(l)){
    const prev = l.termMarks && l.termMarks[year - 1] && l.termMarks[year - 1].terms;
    if(!(prev && prev['4'] && Object.keys(prev['4']).length)) steps.push({ html: 'Add your <b>final Grade 11 results</b>. Universities and bursaries often use them for early offers.', action: "App.pwOpenMarks(" + (year - 1) + ",'4')", label: 'Add final results' });
  }
  if(!termsDone.length) steps.push({ html: 'Add your marks for this term.', action: "navigate('marks')", label: 'Add marks' });
  if(goals.length < PW_MAX_GOALS) steps.push({ html: 'Choose your programme goals (' + goals.length + ' of ' + PW_MAX_GOALS + ' chosen).', action: "navigate('pathway-programmes', " + goals.length + ")", label: 'Choose a programme' });
  goals.forEach(function(g, i){
    const own = pwOwnScoreName(g);
    if(own && (g.ownScore == null || g.ownScore === '')) steps.push({ html: esc(g.institution) + ' uses its own score (' + esc(own.name) + '). Work it out on their website and add it.', action: "navigate('pathway-goal', " + i + ")", label: 'Add score' });
    if(pwGoalChanged(g)) steps.push({ html: 'The requirements for <b>' + esc(g.courseName) + '</b> have changed. Review them.', action: "navigate('pathway-goal', " + i + ")", label: 'Review' });
  });
  const marksNow = pwCurrentMarks(l).marks;
  goals.forEach(function(g, i){
    const a = pwEvaluateAPS(l, g, marksNow);
    if(a.kind === 'aps' && a.status === 'unmet'){
      const sug = pwApsSuggestions(marksNow, a.gap).slice(0, 2);
      steps.push({ html: 'Your APS estimate is ' + esc(a.current) + '; <b>' + esc(pwGoalShortName(g)) + '</b> asks for ' + esc(a.needed) + '.' + (sug.length ? ' A good start: ' + esc(sug.map(function(s){ return pwSubjectLabel(l, s.key) + ' to ' + s.toPct + '%'; }).join(' and ')) + '.' : ''), action: "navigate('pathway-goal', " + i + ")", label: 'See details' });
    }
  });
  const gaps = pwTargets(l).filter(function(t){ return t.gap > 0; }).sort(function(a, b){ return b.gap - a.gap; });
  if(gaps.length){
    const t = gaps[0];
    steps.push({ html: '<b>' + esc(pwSubjectLabel(l, t.key)) + '</b> is ' + esc(Math.round(t.gap * 10) / 10) + '% below the ' + esc(t.target) + '% ' + (t.supports.length > 1 ? 'your goals need' : 'your goal needs') + '. Ask your teacher what to focus on.' });
  }
  if(!pw.bursary) steps.push({ html: 'Choose a bursary to work towards.', action: "navigate('pathway-bursary')", label: 'Choose a bursary' });
  return steps.slice(0, 3);
}

/* ---- marks for each term (My Marks, Grade 10-12; not Pro-only) ---- */
// The marks a term starts with: what is saved for it, or -- for a learner who
// has never entered term marks -- the marks already on their profile, so
// nobody types the same marks twice.
function pwSavedTermMarks(l, year, term, allowProfile){
  const y = l.termMarks && l.termMarks[year];
  const saved = y && y.terms && y.terms[term];
  if(saved && Object.keys(saved).length) return Object.assign({}, saved);
  // Only the term the form opens on, so other terms never get copies.
  if(allowProfile && !pwTermEntries(l).length){
    const m = pwCurrentMarks(l);
    if(m.source === 'profile') return Object.assign({}, m.marks);
  }
  return {};
}
function pwMarksDraft(l, year, term){
  const y = String(year || l.gradeYear || currentSchoolYear());
  const terms = (l.termMarks && l.termMarks[y] && l.termMarks[y].terms) || {};
  // The first term this year without marks, or term 4.
  const t = term || PW_TERMS.find(function(x){ return !(terms[x] && Object.keys(terms[x]).length); }) || '4';
  const pw = pwData(l);
  const marks = pwSavedTermMarks(l, y, t, true);
  return { kind:'marks', year: y, term: t, marks: marks, base: JSON.stringify(marks), edits: {},
    languages: Object.assign({}, pw.languages || {}), support: (pw.supportSubjects || []).slice() };
}
// Move the marks form to another term, keeping what was typed for this one
// (it is saved together with the others).
function pwSwitchTerm(year, term){
  const l = ensureLearnerObj();
  const d = PATHWAY_DRAFT;
  pwCaptureMarks(l);
  // Keep this term only if something in it was changed.
  if(JSON.stringify(d.marks) !== d.base || d.edits[d.year + '|' + d.term]) d.edits[d.year + '|' + d.term] = d.marks;
  const y = String(year), key = y + '|' + term;
  d.year = y; d.term = term;
  d.marks = d.edits[key] ? d.edits[key] : pwSavedTermMarks(l, y, term);
  d.base = JSON.stringify(pwSavedTermMarks(l, y, term));
}
function pwCaptureMarks(l){
  pwLearnerSubjects(l).forEach(function(k, i){ const el = document.getElementById('pwMark' + i); if(el) PATHWAY_HANDLERS.pwSetMark(i, el.value); });
  const h = document.getElementById('pwLangHome'), f = document.getElementById('pwLangFal');
  if(h) PATHWAY_DRAFT.languages.home = h.value || undefined;
  if(f) PATHWAY_DRAFT.languages.fal = f.value || undefined;
}
function viewTermMarks(){
  const l = ensureLearnerObj();
  if(!PATHWAY_DRAFT || PATHWAY_DRAFT.kind !== 'marks') PATHWAY_DRAFT = pwMarksDraft(l);
  const d = PATHWAY_DRAFT;
  const year = Number(d.year), thisYear = Number(l.gradeYear) || currentSchoolYear();
  const gradeForYear = Number(l.grade) - (thisYear - year);
  const keys = pwLearnerSubjects(l);
  const unsaved = Object.keys(d.edits).filter(function(k){ return k !== d.year + '|' + d.term; }).length;
  return `
  ${pageHeadHTML('My Marks', 'Add your report marks for each term. Your report, career matches' + (pathwayOpen(l) ? ', My Pathway' : '') + ' and APS use them.')}
  <div class="card" style="margin-bottom:16px;">
    <h3>Grade ${esc(gradeForYear)} marks, ${esc(year)}</h3>
    <div class="filter-bar" style="margin:8px 0 14px;" role="group" aria-label="Term">
      ${PW_TERMS.map(function(t){ return `<button class="chip-select ${d.term === t ? 'on' : ''}" aria-pressed="${d.term === t}" onclick="App.pwSetTerm('${t}')">Term ${t}</button>`; }).join('')}
      ${Number(l.grade) === 12 && year === thisYear ? `<button class="chip-select" onclick="App.pwOpenMarks(${thisYear - 1},'4')">Final Grade 11 results</button>` : ''}
      ${year !== thisYear ? `<button class="chip-select" onclick="App.pwOpenMarks(${thisYear},'')">Back to ${thisYear}</button>` : ''}
    </div>
    <div class="grid grid-2" style="gap:12px;">
      <div class="form-row"><label for="pwLangHome">Your Home Language</label><select id="pwLangHome" onchange="App.pwSetLanguage('home', this.value)"><option value="">Choose\u2026</option>${PW_LANGUAGES.map(function(x){ return `<option ${d.languages.home === x ? 'selected' : ''}>${esc(x)}</option>`; }).join('')}</select></div>
      <div class="form-row"><label for="pwLangFal">Your First Additional Language</label><select id="pwLangFal" onchange="App.pwSetLanguage('fal', this.value)"><option value="">Choose\u2026</option>${PW_LANGUAGES.map(function(x){ return `<option ${d.languages.fal === x ? 'selected' : ''}>${esc(x)}</option>`; }).join('')}</select></div>
    </div>
    <div class="pw-marks">
      ${keys.map(function(k, i){ const v = d.marks[k]; return `<div class="pw-mark-row">
        <label for="pwMark${i}">${esc(pwSubjectLabel({ pathway:{ languages:d.languages } }, k))}</label>
        <input id="pwMark${i}" type="number" inputmode="decimal" min="0" max="100" placeholder="%" value="${v != null ? esc(v) : ''}" onchange="App.pwSetMark(${i}, this.value)"/>
        <label class="pw-support"><input type="checkbox" ${d.support.indexOf(k) >= 0 ? 'checked' : ''} onchange="App.pwToggleSupport(${i}, this.checked)"/> I'd like support</label>
      </div>`; }).join('')}
    </div>
    <p class="page-sub">Leave a subject empty if you don't have its mark yet. Wrong subjects? <a href="#" onclick="navigate('profile');return false;">Change them in Account</a>.</p>
    ${unsaved ? `<p class="page-sub"><b>You have unsaved marks for another term.</b> Save keeps all of them.</p>` : ''}
    <button class="btn btn-primary" id="pwSaveMarks" onclick="App.pwSaveMarks()">Save marks</button>
  </div>
  ${pwApsCardHTML(l)}
  ${academicProfileHTML(l)}`;
}
// The APS worked out from the learner's saved marks, with a way to try others.
function pwApsCardHTML(l){
  const cur = pwCurrentMarks(l);
  if(cur.source === 'none') return '';
  const a = computeAPSFromMarks(cur.marks);
  return `<div class="card" style="margin-bottom:20px;">
    <h3>Your APS estimate: <span style="color:var(--link);">${esc(a.aps)} / 42</span></h3>
    <div class="aps-bar" style="margin:10px 0 12px;"><div style="width:${Math.round(a.aps/42*100)}%"></div></div>
    <p class="page-sub">From your ${cur.source === 'term' ? esc(pwEntryLabel(cur.entry)) + ' marks' : 'saved marks'}: your best ${esc(a.count)} subjects, excluding Life Orientation${a.count < 6 ? ' (add all your marks for a full estimate)' : ''}. Universities each work APS out their own way.</p>
    <button class="btn btn-ghost btn-sm" onclick="App.pwTryMarks()">${icon('calc')} Try different marks</button>
  </div>`;
}

/* ---- choosing a programme ---- */
function viewPathwayProgrammes(slot){
  const l = ensureLearnerObj();
  const goals = pwGoals(l);
  const slotNo = (slot == null || slot === '') ? Math.min(goals.length, PW_MAX_GOALS - 1) : Number(slot);
  if(PW_PROGRAMMES === null || PW_PROGRAMMES === undefined) return `${pwHead('Choose a programme')}<div class="card"><p class="page-sub">Loading programmes…</p></div>`;
  if(PW_PROGRAMMES === 'error') return `${pwHead('Choose a programme')}<div class="card"><p class="page-sub">We couldn't load the programmes right now. Check your connection and try again.</p><button class="btn btn-primary" onclick="App.pwRetryProgrammes()">Try again</button></div>`;
  const s = PW_SEARCH;
  const q = s.q.trim().toLowerCase();
  const types = [...new Set(PW_PROGRAMMES.map(function(p){ return p.typeOfInstitution; }).filter(Boolean))].sort();
  const places = [...new Set(PW_PROGRAMMES.map(function(p){ return p.location; }).filter(Boolean))].sort();
  const words = q.split(/\s+/).filter(Boolean);
  const results = (words.length || s.type || s.place) ? PW_PROGRAMMES.filter(function(p){
    const hay = (p.courseName + ' ' + p.institution + ' ' + (p.faculty || '') + ' ' + (p.location || '')).toLowerCase();
    return words.every(function(w){ return hay.indexOf(w) >= 0; }) && (!s.type || p.typeOfInstitution === s.type) && (!s.place || p.location === s.place);
  }) : [];
  const replacing = goals[slotNo];
  return `
  ${pwHead('Choose a programme', replacing ? 'Replacing ' + esc(replacing.courseName) + ' at ' + esc(replacing.institution) + '.' : 'Programme ' + (slotNo + 1) + ' of ' + PW_MAX_GOALS + '. You can choose any programme, suggested or not.')}
  ${pwSuggestionsHTML(l, slotNo)}
  <div class="card" style="margin-bottom:16px;">
    <h3>Search all programmes</h3>
    <div class="form-row"><label for="pwSearch">Programme, university or faculty</label><input id="pwSearch" type="search" placeholder="e.g. BCom Accounting, Wits, Engineering" value="${esc(s.q)}" oninput="App.pwSearch(this.value)"/></div>
    <div class="grid grid-2" style="gap:12px;">
      <div class="form-row"><label for="pwType">Type of institution</label><select id="pwType" onchange="App.pwFilter('type', this.value)"><option value="">Any</option>${types.map(function(t){ return `<option ${s.type === t ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></div>
      <div class="form-row"><label for="pwPlace">Where</label><select id="pwPlace" onchange="App.pwFilter('place', this.value)"><option value="">Anywhere</option>${places.map(function(t){ return `<option ${s.place === t ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></div>
    </div>
  </div>
  <div id="pwResults">${pwResultsHTML(l, results, slotNo, words.length || s.type || s.place)}</div>`;
}
function pwResultsHTML(l, results, slotNo, searched){
  if(!searched) return `<p class="page-sub">Type a programme or university to search ${PW_PROGRAMMES.length.toLocaleString('en-ZA')} programmes.</p>`;
  if(!results.length) return `<div class="empty-state">${icon('search')}<p>No programmes match. Try fewer words, or another spelling.</p></div>`;
  const shown = results.slice(0, 40);
  return `<p class="page-sub">${results.length} programme${results.length === 1 ? '' : 's'}${results.length > shown.length ? ', showing the first ' + shown.length + '. Add more words to narrow it down' : ''}.</p>
  ${shown.map(function(p){ return pwProgrammeRowHTML(l, p, slotNo); }).join('')}`;
}
function pwProgrammeRowHTML(l, p, slotNo, reasons){
  const ev = pwEvaluateGoal(l, p);
  return `<div class="card pw-prog-row">
    <div style="flex:1;min-width:0;">
      <h3>${esc(p.courseName)}</h3>
      <p class="page-sub" style="margin:0;">${esc(p.institution)}${p.location ? ' · ' + esc(p.location) : ''}${p.faculty ? ' · ' + esc(p.faculty) : ''}</p>
      ${reasons ? `<p class="pw-reason">${reasons}</p>` : ''}
      <div style="margin-top:6px;">${pwOverallChip(ev)}</div>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="navigate('pathway-programme', {id:${Number(p.id)}, slot:${Number(slotNo)}})">View</button>
  </div>`;
}

// Programmes that may suit the learner's interests: from the careers that
// fit their personality assessment alone (no marks), through the careers'
// linked programmes. Academic status is shown beside them, never mixed in.
function pwSuggestionsHTML(l, slotNo){
  if(!l.assessmentCompletedAt) return `<div class="card" style="margin-bottom:16px;"><h3>Programmes that may suit your interests</h3><p class="page-sub">Take the personality assessment to see suggestions based on your interests, strengths and how you like to work.</p><button class="btn btn-ghost btn-sm" onclick="navigate('assessment')">Take the assessment</button></div>`;
  const key = JSON.stringify([l.riasec, l.strengths, l.workStyle]);
  if(!PW_SUGGESTED || PW_SUGGESTED.key !== key){ PW_SUGGESTED = { key: key, list: null }; pwLoadSuggestions(l, key); }
  if(!PW_SUGGESTED.list) return `<div class="card" style="margin-bottom:16px;"><h3>Programmes that may suit your interests</h3><p class="page-sub">Finding programmes…</p></div>`;
  if(!PW_SUGGESTED.list.length) return '';
  return `<div class="section-title"><h2>Programmes that may suit your interests</h2></div>
    <p class="page-sub">Based on your personality assessment only. Whether your marks meet each one is shown separately.</p>
    ${PW_SUGGESTED.list.slice(0, 6).map(function(s){ return pwProgrammeRowHTML(l, s.programme, slotNo, s.reasons); }).join('')}`;
}
function pwFitCareers(l){
  return CAREERS.map(function(c){
    const ev = evaluateCareer(l, c);
    const parts = [ev.interestFit, ev.strengthFit, ev.workStyleFit].filter(function(x){ return x != null; });
    return { career: c, fit: parts.length ? parts.reduce(function(a, b){ return a + b; }, 0) / parts.length : 0 };
  }).sort(function(a, b){ return b.fit - a.fit; }).slice(0, 6);
}
function pwReasonText(l, c){
  const r = l.riasec || {};
  const dims = c.riasec.filter(function(d){ return r[d] != null && r[d] >= 60; }).map(function(d){ return (RIASEC.find(function(x){ return x.id === d; }) || {}).blend; }).filter(Boolean);
  const why = dims.length ? 'You enjoy work where you ' + joinBlends(dims) + '.' : 'It fits your interests and strengths.';
  return esc('Linked to ' + c.name + '. ' + why);
}
async function pwLoadSuggestions(l, key){
  const top = pwFitCareers(l);
  try{
    const { data, error } = await sb.from('careerCourseLinks').select('careerId, courseRequirementId, matchType').in('careerId', top.map(function(t){ return t.career.id; }));
    if(error) throw error;
    await pwLoadProgrammesNow();
    const seen = {}, list = [];
    top.forEach(function(t){
      (data || []).filter(function(x){ return x.careerId === t.career.id && x.matchType !== 'approximate'; }).forEach(function(x){
        const p = pwProgrammeById(x.courseRequirementId);
        if(p && !seen[p.id] && list.filter(function(y){ return y.career.id === t.career.id; }).length < 2){ seen[p.id] = 1; list.push({ programme: p, career: t.career, reasons: pwReasonText(l, t.career) }); }
      });
    });
    if(PW_SUGGESTED && PW_SUGGESTED.key === key) PW_SUGGESTED.list = list;
  }catch(e){
    console.error('Could not load suggestions', e);
    if(PW_SUGGESTED && PW_SUGGESTED.key === key) PW_SUGGESTED.list = [];
  }
  if(ROUTE === 'pathway-programmes') render();
}
async function pwLoadProgrammesNow(){
  if(Array.isArray(PW_PROGRAMMES)) return;
  if(PW_PROGRAMMES === undefined || PW_PROGRAMMES === 'error'){ PW_PROGRAMMES = undefined; await pwLoadProgrammes(); return; }
  // Already loading: wait for it.
  for(let i = 0; i < 100 && PW_PROGRAMMES === null; i++) await new Promise(function(r){ setTimeout(r, 100); });
}

/* ---- one programme ---- */
function pwRequirementsListHTML(l, ev){
  return `<ul class="pw-reqs">${ev.groups.length ? '' : '<li><div class="pw-req-note">No subject minimums are listed for this programme. Check the university\u2019s website for its subject requirements.</div></li>'}${ev.groups.map(function(g){ return `<li>
      <div class="pw-req-line">${pwStatusChip(g.status)}<b>${esc(g.group.kind === 'language' ? 'Language' : g.group.label)}</b></div>
      <div class="pw-req-detail">${esc(pwGroupText(l, g))}</div>
      ${pwGroupStatusText(l, g) ? `<div class="pw-req-note">${esc(pwGroupStatusText(l, g))}</div>` : ''}
    </li>`; }).join('')}
    <li>${pwApsHTML(l, ev)}</li></ul>`;
}
function pwApsHTML(l, ev){
  const a = ev.aps;
  if(a.kind === 'own') return `<div class="pw-req-line">${pwStatusChip(a.status)}<b>${esc(a.name)}</b></div>
    <div class="pw-req-detail">This university uses its own score instead of APS: ${esc(a.needed)} needed.</div>
    <div class="pw-req-note">${a.current != null ? 'Your score: ' + esc(a.current) + '.' : 'Work out your score with the university’s own calculator and add it to compare.'}</div>`;
  if(a.kind === 'none') return `<div class="pw-req-line">${pwStatusChip('check')}<b>APS</b></div><div class="pw-req-note">No APS is listed for this programme. Check the university’s website.</div>`;
  return `<div class="pw-req-line">${pwStatusChip(a.status)}<b>APS ${esc(a.needed)}</b></div>
    <div class="pw-req-detail">Your estimate: ${esc(a.current)}${a.counted < 6 ? ' (from ' + esc(a.counted) + ' subjects; add all your marks)' : ''}.${a.status === 'unmet' ? ' ' + esc(pwApsSuggestionText(l, a)) : ''}</div>
    <div class="pw-req-note">Iroli's estimate uses your best six subjects excluding Life Orientation. Universities each work APS out their own way, so check with them.</div>`;
}
function viewPathwayProgramme(param){
  const l = ensureLearnerObj();
  const id = param && typeof param === 'object' ? param.id : param;
  const slot = param && typeof param === 'object' && param.slot != null ? Number(param.slot) : pwGoals(l).length;
  if(!Array.isArray(PW_PROGRAMMES)) return `${pwHead('Programme')}<div class="card"><p class="page-sub">Loading…</p></div>`;
  const p = pwProgrammeById(id);
  if(!p) return `${pwHead('Programme')}<div class="card"><p class="page-sub">This programme is no longer listed.</p><button class="btn btn-ghost" onclick="navigate('pathway-programmes')">Back to search</button></div>`;
  const ev = pwEvaluateGoal(l, p);
  const goals = pwGoals(l);
  const already = goals.findIndex(function(g){ return String(g.programmeId) === String(p.id); });
  const slotNo = Math.min(slot, PW_MAX_GOALS - 1);
  return `
  ${pwHead(p.courseName, esc(p.institution) + (p.location ? ' · ' + esc(p.location) : ''))}
  <div class="card" style="margin-bottom:16px;">
    <div class="pw-goal-top">${pwOverallChip(ev)}</div>
    <p class="pw-overall">${esc(pwOverallText(ev))}</p>
    ${pwRequirementsListHTML(l, ev)}
    ${p.openingDate || p.closingDate ? `<p class="page-sub">Applications in the ${PW_DATA_CYCLE}: ${p.openingDate ? 'opened ' + esc(pwDate(p.openingDate)) : ''}${p.openingDate && p.closingDate ? ', ' : ''}${p.closingDate ? 'closed ' + esc(pwDate(p.closingDate)) : ''}.</p>` : ''}
    ${disclaimerHTML('Based on the ' + PW_DATA_CYCLE + '. Confirm the current requirements on the university’s website.')}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    ${already >= 0 ? `<span class="page-sub">Already saved as programme ${already + 1}.</span>` : `<button class="btn btn-primary" onclick="App.pwSaveGoal(${Number(p.id)}, ${slotNo})">${goals[slotNo] ? 'Replace programme ' + (slotNo + 1) + ' with this' : 'Save as programme ' + (slotNo + 1)}</button>`}
    <button class="btn btn-ghost" onclick="navigate('pathway-programmes', ${slotNo})">Back to search</button>
  </div>`;
}

/* ---- one saved goal ---- */
function viewPathwayGoal(i){
  const l = ensureLearnerObj();
  const goals = pwGoals(l);
  const idx = Number(i);
  const goal = goals[idx];
  if(!goal) return viewPathwayHome();
  const ev = pwEvaluateGoal(l, goal);
  const changed = pwGoalChanged(goal);
  const own = pwOwnScoreName(goal);
  const app = goal.application || {};
  return `
  ${pwHead(goal.courseName, esc(goal.institution))}
  ${changed ? `<div class="disclaimer warn" style="margin-bottom:16px;">${icon('info','ic')}<div>${changed === 'gone' ? 'This programme is no longer in our list. It may have been renamed or closed; check the university’s website.' : 'The requirements for this programme have changed since you saved it.'}
    ${changed === 'changed' ? `<div style="margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="App.pwRefreshGoal(${idx})">Use the latest requirements</button></div>` : ''}</div></div>` : ''}
  <div class="card" style="margin-bottom:16px;">
    <div class="pw-goal-top">${pwOverallChip(ev)}</div>
    <p class="pw-overall">${esc(pwOverallText(ev))}</p>
    ${pwRequirementsListHTML(l, ev)}
    <p class="page-sub">Saved ${esc(pwDate(goal.savedAt))} from ${esc(goal.source || PW_DATA_CYCLE)}.</p>
  </div>
  <div class="grid grid-2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Your plans</h3>
      <div class="form-row"><label for="pwIntake">Year you want to start</label><input id="pwIntake" type="number" min="2026" max="2040" value="${esc(goal.intakeYear || '')}" onchange="App.pwSetGoalField(${idx}, 'intakeYear', this.value)"/></div>
      ${own ? `<div class="form-row"><label for="pwOwn">Your ${esc(own.name)}</label><input id="pwOwn" type="number" min="0" value="${goal.ownScore != null ? esc(goal.ownScore) : ''}" placeholder="From the university's calculator" onchange="App.pwSetGoalField(${idx}, 'ownScore', this.value)"/><div class="hint">${esc(goal.institution)} needs ${esc(own.value)}.</div></div>` : ''}
    </div>
    ${pwIsGrade12(l) ? `<div class="card">
      <h3>Your application</h3>
      ${goal.closingDate ? `<p class="page-sub">Closed on ${esc(pwDayMonth(goal.closingDate))} last year. Check this year's date.</p>` : ''}
      <div class="form-row"><label for="pwApp">Status</label><select id="pwApp" onchange="App.pwSetApplication('goal', ${idx}, this.value)">${PW_APP_STATUSES.map(function(s){ return `<option value="${s[0]}" ${String(app.status || '') === s[0] ? 'selected' : ''}>${s[1]}</option>`; }).join('')}</select></div>
      ${app.date ? `<p class="page-sub">Updated ${esc(pwDate(app.date))}.</p>` : ''}
    </div>` : ''}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn btn-ghost" onclick="navigate('pathway-programmes', ${idx})">Change this programme</button>
    <button class="btn btn-ghost" onclick="App.pwRemoveGoal(${idx})">${icon('trash')} Remove</button>
  </div>`;
}

/* ---- the bursary goal ---- */
function viewPathwayBursary(){
  const l = ensureLearnerObj();
  const pw = pwData(l);
  if(PATHWAY_DRAFT && PATHWAY_DRAFT.kind === 'dream') return pwDreamFormHTML(PATHWAY_DRAFT);
  if(pw.bursary && !(PATHWAY_DRAFT && PATHWAY_DRAFT.kind === 'chooseBursary')) return pwBursaryDetailHTML(l);
  const list = pwVisibleBursaries();
  return `
  ${pwHead('Choose a bursary goal', 'Pick one bursary to work towards. You can change it later.')}
  ${PW_BURSARIES === null || PW_BURSARIES === undefined ? '<div class="card"><p class="page-sub">Loading bursaries…</p></div>' : ''}
  ${PW_BURSARIES === 'error' ? '<div class="card"><p class="page-sub">We couldn’t load the bursary list right now. You can still add your own Dream bursary.</p></div>' : ''}
  ${list.map(function(b){ return `<div class="card pw-prog-row">
    <div style="flex:1;min-width:0;">
      <h3>${esc(b.name)}${!b.active ? ' <span class="pw-chip pw-check">Not checked yet</span>' : ''}</h3>
      <p class="page-sub" style="margin:0 0 4px;">${esc(b.fields || '')}</p>
      ${b.academicNote ? `<p class="pw-reason">${esc(b.academicNote)}</p>` : ''}
      <p class="page-sub" style="margin:4px 0 0;">${b.usualClosing ? 'Usually closes: ' + esc(b.usualClosing) + '. ' : ''}${b.obligations ? esc(b.obligations) : ''}</p>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="App.pwChooseBursary('${esc(b.id)}')">Choose</button>
  </div>`; }).join('')}
  ${Array.isArray(PW_BURSARIES) && !list.length ? '<p class="page-sub">Our bursary list is being checked. Add your own Dream bursary for now.</p>' : ''}
  <div class="card" style="margin-top:16px;">
    <h3>Your Dream bursary</h3>
    <p class="page-sub">Working towards a bursary that isn't listed? Add it yourself.</p>
    <button class="btn btn-primary" onclick="App.pwStartDream()">${icon('plus')} Add my Dream bursary</button>
  </div>
  ${pw.bursary ? `<button class="btn btn-ghost" style="margin-top:12px;" onclick="App.pwCancelBursaryChoice()">Keep ${esc(pw.bursary.name)}</button>` : ''}`;
}
function pwDreamFormHTML(d){
  return `
  ${pwHead('Your Dream bursary', 'Add the details from the bursary’s website or advert.')}
  <div class="card">
    <div class="form-row"><label for="pwDName">Bursary name</label><input id="pwDName" type="text" maxlength="120" value="${esc(d.name || '')}"/></div>
    <div class="form-row"><label for="pwDProv">Who offers it</label><input id="pwDProv" type="text" maxlength="120" value="${esc(d.provider || '')}"/></div>
    <div class="form-row"><label for="pwDUrl">Website (optional)</label><input id="pwDUrl" type="url" maxlength="300" value="${esc(d.officialUrl || '')}" placeholder="https://"/></div>
    <div class="form-row"><label for="pwDClose">Closing date (optional)</label><input id="pwDClose" type="text" maxlength="60" value="${esc(d.usualClosing || '')}" placeholder="e.g. 31 August"/></div>
    <div class="form-row"><label for="pwDReq">Its requirements, one per line</label><textarea id="pwDReq" rows="5" maxlength="2000" placeholder="e.g.&#10;South African citizen&#10;Average of 65%&#10;Studying engineering">${esc((d.requirements || []).join('\n'))}</textarea></div>
    <div class="form-row"><label for="pwDDocs">Documents it asks for, one per line (optional)</label><textarea id="pwDDocs" rows="3" maxlength="1000">${esc((d.documents || []).join('\n'))}</textarea></div>
    <p class="page-sub">Don't upload or type in any personal documents or ID numbers. Iroli only keeps this checklist.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-primary" id="pwSaveDream" onclick="App.pwSaveDream()">Save my Dream bursary</button><button class="btn btn-ghost" onclick="App.pwCancelDream()">Cancel</button></div>
  </div>`;
}
function pwBursaryDetailHTML(l){
  const st = pwBursaryStatus(l);
  const b = st.bursary;
  const docAns = b.docs || {};
  const app = b.application || {};
  return `
  ${pwHead(b.name, b.dream ? 'Added by you, not checked by Iroli.' : esc(b.provider || ''))}
  <div class="card" style="margin-bottom:16px;">
    <h3>Academic requirements</h3>
    ${b.academicNote ? `<p class="page-sub">${esc(b.academicNote)}</p>` : ''}
    ${st.academic.length ? `<ul class="pw-reqs">${st.academic.map(function(a){ return `<li><div class="pw-req-line">${pwStatusChip(a.status)}<b>${esc(a.label)}</b></div>${a.eval ? `<div class="pw-req-note">${esc(pwGroupStatusText(l, a.eval))}</div>` : (a.current != null ? `<div class="pw-req-note">Your average now: ${esc(a.current)}%${a.reason === 'fewMarks' ? ' (add all your marks)' : ''}.</div>` : '')}</li>`; }).join('')}</ul>`
      : `<p class="page-sub">${b.dream ? 'Add the academic requirements to your list below and answer them yourself.' : 'No marks are checked for this bursary. You need to be accepted for your programme.'}</p>`}
  </div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Other requirements</h3>
    <p class="page-sub">Answer for yourself. Your teacher can see these answers. We only ask whether you meet each one, never for details such as your family's income.</p>
    ${st.other.length ? st.other.map(function(c){ return `<div class="pw-answer">
      <span>${esc(c.label)}</span>
      <div class="filter-bar" role="group" aria-label="${esc(c.label)}">${[['yes','Yes'],['no','No'],['notsure','Not sure']].map(function(o){ return `<button class="chip-select ${c.answer === o[0] ? 'on' : ''}" aria-pressed="${c.answer === o[0]}" onclick="App.pwAnswer('${esc(c.id)}','${o[0]}')">${o[1]}</button>`; }).join('')}</div>
    </div>`; }).join('') : '<p class="page-sub">No other requirements listed.</p>'}
  </div>
  ${st.docs.length ? `<div class="card" style="margin-bottom:16px;">
    <h3>Documents checklist</h3>
    <p class="page-sub">Get these ready before you apply. Don't upload them here.</p>
    ${st.docs.map(function(d, i){ return `<div class="pw-answer"><span>${esc(d)}</span><div class="filter-bar" role="group" aria-label="${esc(d)}">${[['have','Have it'],['need','Need to get it'],['notsure','Not sure']].map(function(o){ return `<button class="chip-select ${docAns[d] === o[0] ? 'on' : ''}" aria-pressed="${docAns[d] === o[0]}" onclick="App.pwDoc(${i},'${o[0]}')">${o[1]}</button>`; }).join('')}</div></div>`; }).join('')}
  </div>` : ''}
  <div class="card" style="margin-bottom:16px;">
    <h3>Dates and conditions</h3>
    <p class="page-sub">${b.usualClosing ? 'Usually closes: ' + esc(b.usualClosing) + '. Check this year’s date.' : 'Check the closing date on the bursary’s website.'}</p>
    ${b.obligations ? `<p class="page-sub"><b>What you agree to:</b> ${esc(b.obligations)}</p>` : ''}
    ${b.officialUrl ? `<p class="page-sub">Website: <a href="${esc(b.officialUrl)}" target="_blank" rel="noopener noreferrer">${esc(b.officialUrl)}</a></p>` : ''}
    ${pwIsGrade12(l) ? `<div class="form-row"><label for="pwBApp">Your application</label><select id="pwBApp" onchange="App.pwSetApplication('bursary', 0, this.value)">${PW_APP_STATUSES.map(function(s){ return `<option value="${s[0]}" ${String(app.status || '') === s[0] ? 'selected' : ''}>${s[1]}</option>`; }).join('')}</select></div>` : ''}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn btn-ghost" onclick="App.pwChangeBursary()">Choose a different bursary</button>
    ${b.dream ? `<button class="btn btn-ghost" onclick="App.pwEditDream()">${icon('edit')} Edit details</button>` : ''}
  </div>
  ${b.dream ? '' : disclaimerHTML('Bursary details were checked for the ' + esc(b.cycle || '2027 intake') + ' and change every year. Confirm them on the bursary’s website before applying.')}`;
}

/* ---------- handlers (merged into App by app_handlers.js) ---------- */

// Pathway saves run one after another: a second tap while one is saving
// waits its turn instead of being dropped (each builds on the saved state).
let PW_SAVE_CHAIN = Promise.resolve(true);
function pwSavePathway(partial, what, btnSel){
  const done = btnSel ? busyButton(btnSel, 'Saving…') : function(){};
  const run = PW_SAVE_CHAIN.then(function(){ return saveLearnerOrRevert(partial, { what: what || 'your pathway' }); });
  PW_SAVE_CHAIN = run.catch(function(){ return false; });
  return run.then(function(ok){ done(); return ok; }, function(){ done(); return false; });
}
function pwWithPathway(fn){
  const l = ensureLearnerObj();
  const pw = JSON.parse(JSON.stringify(l.pathway || {}));
  fn(pw);
  return pw;
}
function pwLines(id, max){
  const el = document.getElementById(id);
  return (el ? el.value : '').split('\n').map(function(s){ return s.trim(); }).filter(Boolean).slice(0, max || 20).map(function(s){ return s.slice(0, 200); });
}

const PATHWAY_HANDLERS = {
  pwNotMyGrade(){ ROLLOVER_NOTICE = null; navigate('profile'); },
  pwDismissRollover(){ ROLLOVER_NOTICE = null; render(); },
  pwRetryProgrammes(){ PW_PROGRAMMES = undefined; render(); },

  // marks
  pwOpenMarks(year, term){
    const l = ensureLearnerObj();
    if(PATHWAY_DRAFT && PATHWAY_DRAFT.kind === 'marks' && ROUTE === 'marks'){
      const terms = (l.termMarks && l.termMarks[year] && l.termMarks[year].terms) || {};
      pwSwitchTerm(year, term || PW_TERMS.find(function(x){ return !(terms[x] && Object.keys(terms[x]).length); }) || '4');
      render(); return;
    }
    PATHWAY_DRAFT = pwMarksDraft(l, year, term || null);
    navigate('marks');
  },
  pwSetTerm(t){ if(!PATHWAY_DRAFT) return; pwSwitchTerm(PATHWAY_DRAFT.year, t); render(); },
  pwTryMarks(){ APS_DRAFT = null; navigate('aps'); },
  pwSetLanguage(which, v){ if(PATHWAY_DRAFT) PATHWAY_DRAFT.languages[which] = v || undefined; },
  pwSetMark(i, v){
    const l = ensureLearnerObj(); const k = pwLearnerSubjects(l)[i]; if(!k || !PATHWAY_DRAFT) return;
    if(v === '' || v == null || isNaN(Number(v))) delete PATHWAY_DRAFT.marks[k];
    else PATHWAY_DRAFT.marks[k] = clamp(Math.round(Number(v) * 10) / 10, 0, 100);
  },
  pwToggleSupport(i, on){
    const l = ensureLearnerObj(); const k = pwLearnerSubjects(l)[i]; if(!k || !PATHWAY_DRAFT) return;
    const s = PATHWAY_DRAFT.support.filter(function(x){ return x !== k; }); if(on) s.push(k); PATHWAY_DRAFT.support = s;
  },
  async pwSaveMarks(){
    const l = ensureLearnerObj(); const d = PATHWAY_DRAFT; if(!d) return;
    pwCaptureMarks(l);
    d.edits[d.year + '|' + d.term] = d.marks;
    const termMarks = JSON.parse(JSON.stringify(l.termMarks || {}));
    const thisYear = Number(l.gradeYear) || currentSchoolYear();
    Object.keys(d.edits).forEach(function(key){
      const parts = key.split('|'), yr = parts[0], term = parts[1];
      const y = termMarks[yr] || (termMarks[yr] = { grade: Number(l.grade) - (thisYear - Number(yr)), terms: {} });
      y.terms = y.terms || {};
      y.terms[term] = Object.assign({}, d.edits[key]);
    });
    const pathway = pwWithPathway(function(pw){
      pw.languages = { home: d.languages.home || null, fal: d.languages.fal || null };
      pw.supportSubjects = d.support.slice();
    });
    // The profile's latest marks (matching, the report, the academic profile)
    // follow the latest term; subjects that term has no mark for keep theirs.
    const latest = pwLatestEntry(Object.assign({}, l, { termMarks: termMarks }));
    const partial = { termMarks: termMarks, pathway: pathway };
    if(latest){
      const sm = JSON.parse(JSON.stringify(l.subjectMarks || {}));
      Object.keys(latest.marks).forEach(function(k){ sm[k] = { pct: latest.marks[k], term: todayISO() }; });
      partial.subjectMarks = sm;
    }
    const ok = await pwSavePathway(partial, 'your marks', '#pwSaveMarks');
    if(!ok) return;
    const n = Object.keys(d.edits).length;
    PATHWAY_DRAFT = null;
    toast(n > 1 ? 'Marks saved for ' + n + ' terms.' : 'Term ' + d.term + ' marks saved.');
    render();
  },

  // programmes
  pwSearch(v){
    PW_SEARCH.q = v;
    const el = document.getElementById('pwResults');
    if(!el || !Array.isArray(PW_PROGRAMMES)){ render(); return; }
    // Redraw only the results so the search box keeps focus while typing.
    const l = ensureLearnerObj(); const s = PW_SEARCH; const words = s.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const results = (words.length || s.type || s.place) ? PW_PROGRAMMES.filter(function(p){
      const hay = (p.courseName + ' ' + p.institution + ' ' + (p.faculty || '') + ' ' + (p.location || '')).toLowerCase();
      return words.every(function(w){ return hay.indexOf(w) >= 0; }) && (!s.type || p.typeOfInstitution === s.type) && (!s.place || p.location === s.place);
    }) : [];
    const slot = ROUTE_PARAM == null || ROUTE_PARAM === '' ? Math.min(pwGoals(l).length, PW_MAX_GOALS - 1) : Number(ROUTE_PARAM);
    el.innerHTML = pwResultsHTML(l, results, slot, words.length || s.type || s.place);
  },
  pwFilter(which, v){ PW_SEARCH[which] = v; render(); },
  async pwSaveGoal(id, slot){
    const l = ensureLearnerObj(); const p = pwProgrammeById(id); if(!p) return;
    const pathway = pwWithPathway(function(pw){
      const goals = (pw.goals || []).slice(0, PW_MAX_GOALS);
      const i = Math.min(Number(slot), goals.length, PW_MAX_GOALS - 1);
      goals[i] = pwSnapshot(p, l, null);
      pw.goals = goals;
    });
    if(await pwSavePathway({ pathway: pathway }, 'your programme goal')){ toast('Programme saved.'); navigate('pathway'); }
  },
  async pwRefreshGoal(i){
    const l = ensureLearnerObj(); const g = pwGoals(l)[i]; const p = g && pwProgrammeById(g.programmeId); if(!p) return;
    const pathway = pwWithPathway(function(pw){ pw.goals[i] = pwSnapshot(p, l, g); });
    if(await pwSavePathway({ pathway: pathway }, 'your programme goal')){ toast('Updated to the latest requirements.'); render(); }
  },
  async pwRemoveGoal(i){
    const l = ensureLearnerObj(); const g = pwGoals(l)[i]; if(!g) return;
    if(!confirm('Remove ' + g.courseName + ' from your goals?')) return;
    const pathway = pwWithPathway(function(pw){ pw.goals.splice(i, 1); });
    if(await pwSavePathway({ pathway: pathway }, 'your programme goals')){ toast('Programme removed.'); navigate('pathway'); }
  },
  async pwSetGoalField(i, field, v){
    let val = v === '' ? null : Number(v);
    if(val != null && isNaN(val)) return;
    if(field === 'intakeYear' && val != null) val = clamp(Math.round(val), 2026, 2040);
    const pathway = pwWithPathway(function(pw){ if(pw.goals && pw.goals[i]) pw.goals[i][field] = val; });
    if(await pwSavePathway({ pathway: pathway }, 'your programme goal')) render();
  },
  async pwSetApplication(kind, i, status){
    const pathway = pwWithPathway(function(pw){
      const target = kind === 'bursary' ? pw.bursary : (pw.goals || [])[i];
      if(target) target.application = status ? { status: status, date: todayISO() } : null;
    });
    if(await pwSavePathway({ pathway: pathway }, 'your application')) render();
  },

  // bursary
  pwChangeBursary(){ PATHWAY_DRAFT = { kind:'chooseBursary' }; render(); },
  pwCancelBursaryChoice(){ PATHWAY_DRAFT = null; render(); },
  async pwChooseBursary(id){
    const b = pwVisibleBursaries().find(function(x){ return x.id === id; }); if(!b) return;
    const pathway = pwWithPathway(function(pw){
      pw.bursary = { id: b.id, name: b.name, provider: b.provider, fields: b.fields, academicRules: b.academicRules || null, academicNote: b.academicNote || null,
        criteria: b.otherCriteria || [], documents: b.documents || [], usualClosing: b.usualClosing || null, obligations: b.obligations || null,
        officialUrl: b.officialUrl || null, cycle: b.cycle || null, verifiedOn: b.verifiedOn || null, savedAt: todayISO(), answers: {}, docs: {} };
    });
    if(await pwSavePathway({ pathway: pathway }, 'your bursary goal')){ PATHWAY_DRAFT = null; toast(b.name + ' saved as your bursary goal.'); render(); }
  },
  pwStartDream(){ PATHWAY_DRAFT = { kind:'dream' }; render(); window.scrollTo(0,0); },
  pwEditDream(){
    const b = pwData(ensureLearnerObj()).bursary || {};
    PATHWAY_DRAFT = { kind:'dream', name: b.name, provider: b.provider, officialUrl: b.officialUrl, usualClosing: b.usualClosing,
      requirements: (b.criteria || []).map(function(c){ return c.label; }), documents: b.documents || [] };
    render(); window.scrollTo(0,0);
  },
  pwCancelDream(){ PATHWAY_DRAFT = null; render(); },
  async pwSaveDream(){
    const name = (document.getElementById('pwDName').value || '').trim().slice(0, 120);
    if(!name){ toast('Add the bursary’s name.'); return; }
    let url = (document.getElementById('pwDUrl').value || '').trim().slice(0, 300);
    if(url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    const reqs = pwLines('pwDReq', 20), docs = pwLines('pwDDocs', 20);
    const l = ensureLearnerObj(); const old = pwData(l).bursary;
    const pathway = pwWithPathway(function(pw){
      const keepAnswers = old && old.dream ? (old.answers || {}) : {};
      const keepDocs = old && old.dream ? (old.docs || {}) : {};
      pw.bursary = { dream: true, id: 'dream', name: name, provider: (document.getElementById('pwDProv').value || '').trim().slice(0, 120),
        officialUrl: url || null, usualClosing: (document.getElementById('pwDClose').value || '').trim().slice(0, 60) || null,
        criteria: reqs.map(function(r, i){ return { id: 'r' + i, label: r, kind: 'other' }; }), documents: docs,
        academicRules: null, academicNote: null, savedAt: todayISO(), answers: keepAnswers, docs: keepDocs, application: old && old.dream ? old.application : null };
    });
    if(await pwSavePathway({ pathway: pathway }, 'your Dream bursary', '#pwSaveDream')){ PATHWAY_DRAFT = null; toast('Dream bursary saved.'); render(); }
  },
  async pwAnswer(id, v){
    const pathway = pwWithPathway(function(pw){ if(pw.bursary){ pw.bursary.answers = pw.bursary.answers || {}; pw.bursary.answers[id] = v; } });
    if(await pwSavePathway({ pathway: pathway }, 'your answer')) render();
  },
  async pwDoc(i, v){
    const pathway = pwWithPathway(function(pw){ if(pw.bursary){ const d = (pw.bursary.documents || [])[i]; if(d == null) return; pw.bursary.docs = pw.bursary.docs || {}; pw.bursary.docs[d] = v; } });
    if(await pwSavePathway({ pathway: pathway }, 'your checklist')) render();
  },
};
