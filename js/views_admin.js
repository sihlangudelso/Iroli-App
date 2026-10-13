function cohortStats(){
  const total = COHORT.length;
  const active = COHORT.filter(c=>c.licenseStatus==='active').length;
  const trial = total-active;
  const byGrade = {9:0,10:0,11:0,12:0};
  COHORT.forEach(c=>{ if(byGrade[c.grade]!=null) byGrade[c.grade]++; });
  const facCount = {}; FACULTIES.forEach(f=>facCount[f.id]=0);
  COHORT.forEach(c=>{
    if(c.assessmentCompletedAt){
      const top = bestSuitedCareers(c,1)[0];
      if(top) facCount[top.career.faculty] = (facCount[top.career.faculty]||0)+1;
    }
  });
  return { total, active, trial, byGrade, facCount };
}

function viewAdminHome(){
  const s = cohortStats();
  const maxFac = Math.max(1,...Object.values(s.facCount));
  return `
  ${pageHeadHTML(IS_SUPER_ADMIN?'Institute overview':'Class overview', IS_SUPER_ADMIN?'A snapshot of every learner using this Iroli Career Pathway workspace.':'A snapshot of the learners in your class(es).')}
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${s.total}</div><div class="l">Total learners</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--grass)"></div><div><div class="n">${s.active}</div><div class="l">Active licences</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--coral)"></div><div><div class="n">${s.trial}</div><div class="l">Trial access</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${myClasses().length}</div><div class="l">${IS_SUPER_ADMIN?'Classes':'Your classes'}</div></div></div>
  </div>
  <div class="grid grid-2">
    <div class="card">
      <h3>Learners by grade</h3>
      ${[9,10,11,12].map(g=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>Grade ${g}</span><span>${s.byGrade[g]}</span></div>
          <div class="aps-bar"><div style="width:${s.total? Math.round(s.byGrade[g]/s.total*100):0}%"></div></div>
        </div>`).join('')}
    </div>
    <div class="card">
      <h3>Top career-faculty interest (assessed learners)</h3>
      ${FACULTIES.map(f=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>${f.name}</span><span>${s.facCount[f.id]||0}</span></div>
          <div class="aps-bar"><div style="width:${Math.round((s.facCount[f.id]||0)/maxFac*100)}%;background:${f.color};"></div></div>
        </div>`).join('')}
    </div>
  </div>
  <div class="section-title"><h2>Get started</h2></div>
  <div class="grid grid-3">
    <button class="tile" style="border-top-color:var(--amber)" onclick="navigate('admin-classes')">${icon('users','tico')}<h3>${IS_SUPER_ADMIN?'Create a class':'Your classes'}</h3><p>${IS_SUPER_ADMIN?'Set up classes and licence seats for your learners.':'View your class codes and learner counts.'}</p></button>
    <button class="tile" style="border-top-color:var(--indigo)" onclick="navigate('admin-cohort')">${icon('chart','tico')}<h3>View cohort data</h3><p>See every learner\u2019s profile, matches and personality — export anytime.</p></button>
    <button class="tile" style="border-top-color:var(--teal)" onclick="App.togglePreview()">${icon('spark','tico')}<h3>Preview learner view</h3><p>See exactly what your learners experience.</p></button>
  </div>
  <div style="margin-top:24px;">${disclaimerHTML('Access requires signing in — nobody can see learner data or admin tools just by opening a link. Learners create their own account; Institute Admin and Class Admin access is granted separately, not by link-sharing (assign a class admin by email from Classes & Licences, or promote a super admin from the Supabase dashboard).')}</div>
  `;
}

function viewAdminClasses(){
  const mine = myClasses();
  return `
  ${pageHeadHTML('Classes & licences', IS_SUPER_ADMIN?'Create classes, generate join codes, manage licence seats, and assign class admins.':'Your classes, join codes, and licence seats.')}
  ${IS_SUPER_ADMIN? `
  <div class="card" style="margin-bottom:20px;">
    <h3>Create a new class</h3>
    <div class="grid grid-3">
      <div class="form-row"><label>Class name</label><input type="text" id="newClassName" placeholder="e.g. Grade 10A 2026"/></div>
      <div class="form-row"><label>Licence seats</label><input type="number" id="newClassSeats" value="35" min="1"/></div>
      <div class="form-row" style="display:flex;align-items:flex-end;"><button class="btn btn-primary" onclick="App.createClass()">${icon('plus')} Create class</button></div>
    </div>
  </div>` : ''}
  ${mine.length? mine.map(c=>{
    const members = COHORT.filter(l=>l.classId===c.id);
    const licensed = members.filter(l=>l.licenseStatus==='active').length;
    const classAdmin = CLASS_ADMINS.find(a=>a.id===c.classAdminId);
    return `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin-bottom:4px;">${esc(c.name)}</h3>
          <div class="page-sub">Code <span class="class-code">${esc(c.code)}</span> · ${members.length} learner(s) · ${licensed}/${c.seatLimit||'∞'} licensed seats used</div>
        </div>
        <div style="display:flex;gap:8px;align-self:flex-start;">
          <button class="btn btn-ghost btn-sm" onclick="navigate('admin-cohort','${c.id}')">View learners</button>
          ${IS_SUPER_ADMIN? `<button class="btn btn-ghost btn-sm" onclick="App.deleteClass('${c.id}')">${icon('trash')}</button>` : ''}
        </div>
      </div>
      ${IS_SUPER_ADMIN? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
        <div class="page-sub" style="margin-bottom:6px;">Licence seats (blank = unlimited)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input type="number" id="seats-${c.id}" min="1" placeholder="Unlimited" value="${c.seatLimit||''}" style="width:120px;"/>
          <button class="btn btn-ghost btn-sm" onclick="App.updateClassSeats('${c.id}', (document.getElementById('seats-${c.id}')||{}).value)">Update seats</button>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
        <div class="page-sub" style="margin-bottom:6px;">${classAdmin? `Class admin: <b>${esc(classAdmin.email)}</b>` : 'No class admin assigned yet.'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input type="email" id="assignEmail-${c.id}" placeholder="teacher@school.co.za" style="flex:1;min-width:200px;"/>
          <button class="btn btn-ghost btn-sm" onclick="App.assignClassAdmin('${c.id}', (document.getElementById('assignEmail-${c.id}')||{}).value)">${classAdmin?'Reassign':'Assign'} class admin</button>
        </div>
      </div>` : ''}
    </div>`;
  }).join('') : `<div class="empty-state">${icon('users')}<p>${IS_SUPER_ADMIN?'No classes yet — create your first class above.':'No classes assigned to you yet — ask your Institute Admin.'}</p></div>`}
  <div style="margin-top:10px;">${disclaimerHTML('Licence seats are tracked here for planning; Iroli Career Pathway does not process payments in-app. Activate a learner\u2019s seat from the Cohort tab once payment/invoicing has been arranged with your Iroli account manager.')}</div>
  `;
}

// Shared by viewAdminCohort() and App.exportCohortCSV() so the export can
// never drift from whatever's actually narrowed on screen (found in the
// pre-launch audit: the export used to ignore the search box and the
// faculty drill-through filter entirely).
function cohortRowsFiltered(facFilter, filterClass, search){
  let rows = COHORT.slice();
  if(facFilter){
    rows = rows.filter(l=>{
      if(l.grade!==9 || !l.assessmentCompletedAt) return false;
      const top = bestSuitedCareers(l,1)[0];
      return top && top.career.faculty===facFilter;
    });
  }
  // Composes with the faculty filter above rather than replacing it, so a
  // drill-through from an already class-filtered Dashboard stays scoped
  // to that class (found dropping it silently in the pre-launch audit).
  if(filterClass && filterClass!=='all') rows = rows.filter(l=>l.classId===filterClass);
  if(search) rows = rows.filter(l=> cohortLearnerName(l.id).toLowerCase().includes(search));
  return rows;
}

function viewAdminCohort(){
  // Accepts a plain classId/'all' (every existing call site) or an object
  // {fac, classId?} (the Grade 9 Dashboard's pathway-bar drill-through,
  // which carries its own active class filter alongside the faculty) --
  // same object-ROUTE_PARAM convention viewExplore/viewCareerDetail use.
  const facFilter = (ROUTE_PARAM && typeof ROUTE_PARAM==='object') ? ROUTE_PARAM.fac : null;
  const filterClass = (ROUTE_PARAM && typeof ROUTE_PARAM==='object') ? (ROUTE_PARAM.classId || 'all') : (ROUTE_PARAM || 'all');
  const search = (window.__cohortSearch||'').toLowerCase();
  let rows = cohortRowsFiltered(facFilter, filterClass, search);
  return `
  ${pageHeadHTML('Cohort data', 'Every learner\u2019s profile, personality, career matches and licence status — export any time.')}
  ${facFilter ? `<div class="disclaimer" style="margin-bottom:14px;">${icon('info','ic')}<div>Showing learners whose top career match is in <b>${esc(facultyById(facFilter).name)}</b>. <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="navigate('admin-cohort','all')">Clear filter</button></div></div>` : ''}
  <div class="filter-bar" style="justify-content:space-between;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="chip-select ${filterClass==='all'&&!facFilter?'on':''}" onclick="navigate('admin-cohort','all')">All classes</button>
      ${myClasses().map(c=>`<button class="chip-select ${filterClass===c.id?'on':''}" onclick="navigate('admin-cohort','${c.id}')">${esc(c.name)}</button>`).join('')}
    </div>
    <button class="btn btn-amber" onclick="App.exportCohortCSV('${filterClass}', ${facFilter?`'${facFilter}'`:'null'})">${icon('download')} Export CSV</button>
  </div>
  <div class="form-row" style="max-width:280px;"><input type="text" placeholder="Search learner name… (press Enter)" value="${esc(window.__cohortSearch||'')}" onchange="App.setCohortSearch(this.value)"/></div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Name</th><th>Grade</th><th>School</th><th>Class</th><th>Maths track</th><th>Personality</th><th>Top matches</th><th>Recommended subjects</th><th>Favourites</th><th>Licence</th><th></th>
    </tr></thead>
    <tbody>
      ${rows.length? rows.map(l=>{
        const cls = CLASSES.find(c=>c.id===l.classId);
        const top = l.assessmentCompletedAt ? bestSuitedCareers(l,3).map(m=>m.career.name).join(', ') : '—';
        const rec = adminSubjectRecFor(l);
        return `<tr>
          <td><a href="#" onclick="navigate('admin-learner','${l.id}');return false;"><b>${esc(cohortLearnerName(l.id))}</b></a></td>
          <td>${l.grade||'—'}</td>
          <td>${esc(l.school||'—')}</td>
          <td>${cls?esc(cls.name):'—'}</td>
          <td>${l.mathType==='Mathematics'?'Maths':(l.mathType==='MathLit'?'Maths Lit':'—')}</td>
          <td>${esc(hollandCode(l.riasec))}</td>
          <td style="max-width:220px;">${esc(top)}</td>
          <td style="max-width:220px;">${rec ? esc(adminRecSubjectsLine(rec)) : '—'}${rec && rec.differs && rec.differs.length ? ` <span class="badge badge-explore" title="${esc(rec.differs.join('; '))}">Differs from intended</span>` : ''}</td>
          <td>${(l.favourites||[]).length}</td>
          <td><span class="badge ${l.licenseStatus==='active'?'badge-strong':'badge-good'}">${l.licenseStatus==='active'?'Active':'Trial'}</span></td>
          <td>${IS_SUPER_ADMIN? `<button class="btn btn-ghost btn-sm" onclick="App.toggleLicense('${l.id}')">${l.licenseStatus==='active'?'Deactivate':'Activate'}</button>` : ''}</td>
        </tr>`;
      }).join('') : `<tr><td colspan="11" style="text-align:center;color:var(--muted);padding:30px;">No learners match yet.</td></tr>`}
    </tbody>
  </table></div>
  `;
}

function viewAdminLearnerDetail(id){
  const l = COHORT.find(c=>c.id===id);
  if(!l) return `${pageHeadHTML('Learner not found')}<div class="empty-state">${icon('users')}<p>This learner record could not be found.</p></div>`;
  const cls = CLASSES.find(c=>c.id===l.classId);
  const matches = l.assessmentCompletedAt ? bestSuitedCareers(l,5) : [];
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:16px;" onclick="navigate('admin-cohort')">${icon('chevron')} Back to cohort</button>
  ${pageHeadHTML(cohortLearnerName(l.id), `Grade ${l.grade||'—'} · ${esc(l.school||'No school set')}`)}
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Profile</h3>
      <div class="kv"><b>Class</b><span>${cls?esc(cls.name):'Not in a class'}</span></div>
      <div class="kv"><b>Maths track</b><span>${esc(l.mathType)||'—'}</span></div>
      <div class="kv"><b>Subjects</b><span>${esc((l.subjects||[]).join(', '))||'—'}</span></div>
      <div class="kv"><b>Personality (Holland code)</b><span>${esc(hollandCode(l.riasec))}</span></div>
      <div class="kv"><b>Licence</b><span>${l.licenseStatus==='active'?'Active':'Trial'}</span></div>
      ${IS_SUPER_ADMIN? `<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="App.toggleLicense('${l.id}')">${l.licenseStatus==='active'?'Deactivate licence':'Activate licence'}</button>` : ''}
    </div>
    <div class="card">
      <h3>Interest profile</h3>
      ${l.riasec ? RIASEC.map(d=>`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;"><span>${d.name}</span><span>${Math.round(l.riasec[d.id]||0)}%</span></div><div class="aps-bar"><div style="width:${Math.round(l.riasec[d.id]||0)}%"></div></div></div>`).join('') : '<p class="page-sub">Assessment not yet completed.</p>'}
    </div>
  </div>
  <div class="card" style="margin-bottom:18px;">
    <h3>Top career matches</h3>
    ${matches.length? matches.map(m=>careerRowHTML(m.career,m.score,l,m.category)).join('') : '<p class="page-sub">No assessment data yet.</p>'}
  </div>
  ${subjectChoiceAvailable(l) ? adminSubjectRecCardHTML(l) : ''}
  <div class="card">
    <h3>Saved favourites</h3>
    <div class="pill-list">${(l.favourites||[]).map(id=>{const c=CAREERS.find(x=>x.id===id);return c?`<span class="tag">${esc(c.name)}</span>`:'';}).join('') || '<span class="page-sub">None yet.</span>'}</div>
  </div>
  `;
}

// The learner's Subject Choice recommendation beside what they say they
// lean toward, so a teacher can see both before talking it through.
function adminSubjectRecCardHTML(l){
  const rec = adminSubjectRecFor(l);
  const intended = [l.intendedMathType==='Mathematics' ? 'Mathematics' : (l.intendedMathType==='MathLit' ? 'Mathematical Literacy' : null)]
    .concat(l.intendedSubjects||[]).filter(Boolean);
  const pairTitle = k=>SC_COPY.pairs[k].title.replace('?','');
  return `
  <div class="card" style="margin-bottom:18px;">
    <h3>Subject Choice recommendation</h3>
    ${!rec ? '<p class="page-sub">Subject Choice Assessment not yet completed.</p>'
      : rec.state!=='ready' ? '<p class="page-sub">Answers saved, but the personality assessment is needed before a recommendation can be made.</p>'
      : `
      ${!rec.complete ? `<p class="page-sub">Based on ${rec.answered} of ${rec.total} questions.</p>` : ''}
      <div class="kv"><b>Mathematics or Mathematical Literacy</b><span>${esc(rec.mathLabel)}</span></div>
      ${Object.keys(rec.pairs).map(k=>`<div class="kv"><b>${esc(pairTitle(k))}</b><span>${esc(rec.pairs[k])}</span></div>`).join('')}
      <div class="kv"><b>${rec.comboName ? 'Recommended combination' : 'Strongest matches'}</b><span>${rec.comboName ? `${esc(rec.comboName)}: ` : ''}${esc([rec.mathSubject].concat(rec.subjects).join(', '))}</span></div>
      ${rec.alsoStrong.length ? `<div class="kv"><b>Also strong matches</b><span>${esc(rec.alsoStrong.join(', '))}</span></div>` : ''}`}
    <div class="kv"><b>Learner intends to take</b><span>${esc(intended.join(', '))||'Not yet specified'}</span></div>
    ${rec && rec.differs && rec.differs.length ? `<div class="disclaimer" style="margin-top:10px;">${icon('info','ic')}<div>${rec.differs.map(esc).join('<br>')}<br>Worth talking through with the learner and their parent/guardian.</div></div>` : ''}
  </div>`;
}

function viewAdminCareers(){
  return `
  ${pageHeadHTML('Career library', `${CAREERS.length} careers seeded across ${FACULTIES.length} faculties. The data model supports adding more faculties, careers and real per-institution admission data later.`)}
  ${FACULTIES.map(f=>{
    const list = CAREERS.filter(c=>c.faculty===f.id);
    return `<div class="section-title"><h2>${f.name} <span class="tag" style="background:${f.color};color:#fff;box-shadow:inset 0 0 0 50px rgba(0,0,0,.24);">${list.length}</span></h2></div>
    ${list.map(c=>careerRowHTML(c,null,{favourites:[]})).join('') || '<p class="page-sub">No careers yet in this faculty — add some in the data model.</p>'}`;
  }).join('')}
  `;
}

/* ---------------- Subject Choice recommendations (admin) ---------------- */
// What the Subject Choice report recommended to a learner. Only the answers
// are stored, so this is worked out from the same answers, marks and
// personality results the learner's own report uses (buildSubjectChoiceReport,
// lrCombos) -- the admin side always says what the learner was told.
// Cached per learner object and updatedAt: the cohort table, dashboard and
// both exports ask for it on every render.
const ADMIN_SC_CACHE = new WeakMap();
function adminSubjectRecFor(l){ const c = adminSCEntry(l); return c ? c.rec : null; }
function adminSubjectReportFor(l){ const c = adminSCEntry(l); return c ? c.rep : null; }
function adminSCEntry(l){
  if(!l || l.exploringOnly || !scHasSavedAnswers(l)) return null;
  const hit = ADMIN_SC_CACHE.get(l);
  if(hit && hit.at===l.updatedAt) return hit;
  const rep = buildSubjectChoiceReport(l);
  const entry = { at:l.updatedAt, rep, rec: buildAdminSubjectRec(l, rep) };
  ADMIN_SC_CACHE.set(l, entry);
  return entry;
}
function buildAdminSubjectRec(l, rep){
  if(!rep.ready.personality) return { state:'needsPersonality' };
  const m = rep.mathChoice;
  const isMaths = id=>id==='mathematics' || id==='mathematicalLiteracy';
  const best = lrCombos(rep).best;
  // The best combination is the recommendation (as on the learner's report);
  // with no combination, their strongest individual matches stand in.
  const subjectIds = best ? best.subjects.filter(id=>!isMaths(id))
    : rep.top.filter(r=>!isMaths(r.id)).slice(0,3).map(r=>r.id);
  const pairs = {};
  Object.keys(rep.pairs).forEach(k=>{ if(rep.pairs[k].pick!=='either') pairs[k] = scPairLeanLabel(rep.pairs[k]); });
  return {
    state: 'ready',
    complete: rep.ready.complete, answered: rep.answered, total: rep.total,
    mathPick: m.pick, mathSupport: !!m.support, mathLabel: scMathLeanLabel(m),
    // The Maths slot of a subject list, named as the learner's report names
    // it (lrComboView): from the combination when it has a Maths slot.
    mathSubject: (best && best.labels.filter(lrIsMaths)[0]) || lrMathsLean(rep).label,
    pairs,
    comboName: best ? best.name : null,
    subjectIds,
    subjects: subjectIds.map(id=>SC_SUBJECTS[id].label),
    alsoStrong: rep.top.filter(r=>!isMaths(r.id) && subjectIds.indexOf(r.id)===-1).slice(0,3).map(r=>r.label),
    differs: intendedVsRecommended(l, rep),
  };
}
// Where what the learner says they lean toward goes against what their
// results currently support: the other side of a Maths / Maths Lit (or
// Physical / Technical Sciences, IT / CAT) decision, or a subject that needs
// Mathematics beside a Maths Lit recommendation. Only real decisions count --
// an intended subject that simply isn't in the best combination is not a
// difference worth flagging.
function intendedVsRecommended(l, rep){
  const out = [];
  const m = rep.mathChoice;
  const mathId = l.intendedMathType==='Mathematics' ? 'mathematics' : (l.intendedMathType==='MathLit' ? 'mathematicalLiteracy' : null);
  if(mathId && m.pick!=='either' && mathId!==m.pick) out.push(`Intends ${SC_SUBJECTS[mathId].label}; ${scMathLeanLabel(m)} recommended`);
  (l.intendedSubjects||[]).forEach(name=>{
    const id = SC_CAREER_SUBJECT_IDS[name];
    if(!id) return;
    const d = Object.keys(rep.pairs).map(k=>rep.pairs[k]).find(p=>p.demanding===id || p.easier===id);
    if(m.pick==='mathematicalLiteracy' && SC_SUBJECTS[id].mathRequirement==='strong') out.push(`Intends ${name}, which needs Mathematics; ${scMathLeanLabel(m)} recommended`);
    else if(d && d.pick!=='either' && d.pick!==id) out.push(`Intends ${name}; ${scPairLeanLabel(d)} recommended`);
  });
  return out;
}
// One short line for tables and the CSV: the Maths pick, then the rest.
function adminRecSubjectsLine(rec){
  if(!rec) return '';
  if(rec.state!=='ready') return 'Personality assessment needed';
  return [lrShort(rec.mathSubject)].concat(rec.subjects).join(', ');
}
function adminRecStatus(rec){
  if(!rec) return 'Not started';
  if(rec.state!=='ready') return 'Answers saved — personality assessment needed';
  return rec.complete ? 'Completed' : `Partly (${rec.answered} of ${rec.total} questions)`;
}

/* ---------------- Grade 9 school dashboard ---------------- */
// One aggregation pass over the Grade 9 slice of COHORT, computed fresh
// on every render (same convention as cohortStats() above and the
// existing CSV export -- nothing here is persisted; guidance_required/
// subject_conflict/academic_readiness are always-live computed values,
// never cached columns). Every dashboard section reads from this SAME
// object, so the overview tiles, the pathway bars, and the guidance table
// can never disagree with each other.
function buildSchoolDashboardData(classFilter){
  const rows = COHORT.filter(l=>l.grade===9 && (!classFilter || classFilter==='all' || l.classId===classFilter));
  const assessed = rows.filter(l=>l.assessmentCompletedAt);

  const enriched = assessed.map(l=>{
    const top = bestSuitedCareers(l,1)[0];
    const faculty = top ? facultyById(top.career.faculty) : null;
    if(!faculty) return null;
    return {
      learner: l, top, faculty,
      readiness: academicReadinessFor(l, faculty.id),
      conflict: subjectConflictForFaculty(l, faculty.id),
    };
  }).filter(Boolean);

  const pathwayDistribution = pathwayDistributionFrom(enriched, assessed.length);
  const subjectDemand = subjectDemandFrom(rows);
  const subjectRecs = subjectRecVsIntendedFrom(rows);
  const combinations = combinationCountsFrom(rows);
  const progress = progressByClassFrom(rows);
  const supportNeeds = supportNeedsFrom(rows);
  const guidanceRows = guidanceRowsFrom(enriched);
  const readinessByPathway = readinessCrossTabFrom(enriched);

  const overview = {
    totalLearners: rows.length,
    learnersAssessed: assessed.length,
    completionRate: rows.length ? Math.round(100*assessed.length/rows.length) : 0,
    guidanceRequired: rows.filter(l=>isGuidanceRequired(l) || recDiffers(l)).length,
    conflictCount: enriched.filter(e=>e.conflict && e.conflict.hasConflict).length,
    // Grade 10 planning headline numbers (also kept in snapshots, so a later
    // term can be compared with this one).
    subjectChoiceDone: progress.total.subjectChoice,
    mathsRecommended: subjectRecs.math.mathematics,
    mathLitRecommended: subjectRecs.math.mathematicalLiteracy,
    mathsUndecided: subjectRecs.math.either,
  };

  const insights = generateSchoolInsights({ overview, pathwayDistribution, subjectDemand, subjectRecs, supportNeeds, readinessByPathway, enriched });

  return { rows, assessed, enriched, overview, pathwayDistribution, subjectDemand, subjectRecs, combinations, progress, supportNeeds, guidanceRows, readinessByPathway, insights };
}

function pathwayDistributionFrom(enriched, assessedCount){
  const counts = {};
  enriched.forEach(e=>{ counts[e.faculty.id] = (counts[e.faculty.id]||0)+1; });
  const total = assessedCount || 1;
  return FACULTIES.map(f=>({ id:f.id, name:f.name, color:f.color, count: counts[f.id]||0 }))
    .filter(p=>p.count>0)
    .map(p=>({ ...p, pct: Math.round(100*p.count/total) }))
    .sort((a,b)=>b.count-a.count);
}

function subjectDemandFrom(rows){
  const withIntended = rows.filter(l=>l.intendedSubjects && l.intendedSubjects.length);
  const freq = {};
  withIntended.forEach(l=>l.intendedSubjects.forEach(s=>{ freq[s]=(freq[s]||0)+1; }));
  const list = Object.entries(freq).map(([subject,count])=>({
    subject, count, pct: withIntended.length ? Math.round(100*count/withIntended.length) : 0,
  }));
  // Maths track is tracked separately from intendedSubjects (mirroring
  // mathType's own split from `subjects`), but belongs in the same
  // "what are learners leaning toward" list the user asked for.
  const withMathIntent = rows.filter(l=>l.intendedMathType).length;
  const mathCounts = { Mathematics:0, 'Mathematical Literacy':0 };
  rows.forEach(l=>{ if(l.intendedMathType==='Mathematics') mathCounts.Mathematics++; else if(l.intendedMathType==='MathLit') mathCounts['Mathematical Literacy']++; });
  Object.entries(mathCounts).forEach(([subject,count])=>{
    if(count>0) list.push({ subject, count, pct: withMathIntent ? Math.round(100*count/withMathIntent) : 0 });
  });
  list.sort((a,b)=>b.count-a.count);
  const notYetSpecifiedCount = rows.filter(l=>(!l.intendedSubjects || !l.intendedSubjects.length) && !l.intendedMathType).length;
  return { list, withIntendedCount: withIntended.length, notYetSpecifiedCount };
}

function recDiffers(l){
  const rec = adminSubjectRecFor(l);
  return !!(rec && rec.differs && rec.differs.length);
}

// How many learners the Subject Choice report recommended each Grade 10
// subject to, beside how many say they intend to take it -- the gap is where
// subject conversations (and timetabling) need attention. Maths is counted
// from the Maths decision itself, so "talk through both" is its own number
// rather than being forced into either subject. Languages and the broad
// humanities slot are left out: every learner takes a language.
function subjectRecVsIntendedFrom(rows){
  const withRec = rows.map(l=>adminSubjectRecFor(l)).filter(r=>r && r.state==='ready');
  const recommended = {}, intended = {};
  const bump = (map, name)=>{ map[name] = (map[name]||0)+1; };
  const math = { mathematics:0, support:0, mathematicalLiteracy:0, either:0 };
  withRec.forEach(r=>{
    if(r.mathPick==='mathematics'){ math.mathematics++; if(r.mathSupport) math.support++; bump(recommended, 'Mathematics'); }
    else if(r.mathPick==='mathematicalLiteracy'){ math.mathematicalLiteracy++; bump(recommended, 'Mathematical Literacy'); }
    else math.either++;
    r.subjectIds.forEach(id=>{ const n = SC_SUBJECTS[id].fetNames; if(n.length===1) bump(recommended, n[0]); });
  });
  rows.forEach(l=>{
    (l.intendedSubjects||[]).forEach(s=>bump(intended, s));
    if(l.intendedMathType==='Mathematics') bump(intended, 'Mathematics');
    else if(l.intendedMathType==='MathLit') bump(intended, 'Mathematical Literacy');
  });
  const list = [...new Set(Object.keys(recommended).concat(Object.keys(intended)))]
    .map(subject=>({ subject, recommended: recommended[subject]||0, intended: intended[subject]||0 }))
    .sort((a,b)=>(b.recommended-a.recommended) || (b.intended-a.intended) || a.subject.localeCompare(b.subject));
  return {
    list, math,
    withRecCount: withRec.length,
    startedCount: rows.filter(l=>adminSubjectRecFor(l)).length,
    intendedCount: rows.filter(l=>(l.intendedSubjects && l.intendedSubjects.length) || l.intendedMathType).length,
    differsCount: rows.filter(recDiffers).length,
  };
}

// How many learners each recommended combination went to -- what a school
// needs to plan subject streams, classes and teachers.
function combinationCountsFrom(rows){
  const recs = rows.map(l=>adminSubjectRecFor(l)).filter(r=>r && r.state==='ready');
  const counts = {};
  recs.forEach(r=>{ const n = r.comboName || 'No combination yet'; counts[n] = (counts[n]||0)+1; });
  return Object.entries(counts).map(([name,count])=>({ name, count, pct: Math.round(100*count/recs.length) }))
    .sort((a,b)=>(b.count-a.count) || a.name.localeCompare(b.name));
}

// Each assessment's completion, per class, and who still has something to
// finish -- the follow-up list for teachers. "Grade 9 results" means the
// Mathematics result at least: without it there is no Maths recommendation.
const PROGRESS_STEPS = [
  { key:'personality',   label:'Personality assessment', done: l=>!!l.assessmentCompletedAt },
  { key:'subjectChoice', label:'Subject Choice',         done: l=>!!(l.subjectChoice && l.subjectChoice.completedAt) },
  { key:'results',       label:'Grade 9 results',        done: l=>scAreaPct(l, 'Mathematics')!=null },
];
function progressByClassFrom(rows){
  const tally = list=>{
    const t = { learners: list.length, all: 0 };
    PROGRESS_STEPS.forEach(s=>{ t[s.key] = list.filter(s.done).length; });
    t.all = list.filter(l=>PROGRESS_STEPS.every(s=>s.done(l))).length;
    return t;
  };
  const groups = {};
  rows.forEach(l=>{ (groups[l.classId||''] = groups[l.classId||''] || []).push(l); });
  const className = id=>{ const c = CLASSES.find(x=>x.id===id); return c ? c.name : 'No class'; };
  const byClass = Object.keys(groups).map(id=>({ name: className(id), ...tally(groups[id]) }))
    .sort((a,b)=>a.name.localeCompare(b.name, undefined, { numeric:true }));
  const outstanding = rows.map(l=>({
    learnerId: l.id, learnerName: cohortLearnerName(l.id), className: className(l.classId),
    missing: PROGRESS_STEPS.filter(s=>!s.done(l)).map(s=>s.label),
  })).filter(o=>o.missing.length)
    .sort((a,b)=>a.className.localeCompare(b.className, undefined, { numeric:true }) || a.learnerName.localeCompare(b.learnerName));
  return { byClass, total: tally(rows), outstanding };
}

// Where extra lessons are needed: learners interested in a subject (they
// intend to take it, or their Subject Choice answers show high interest)
// whose result in a Grade 9 learning area it builds on is below 50%.
// Grouped by subject and that learning area; only real results count.
const SUPPORT_BELOW = 50;
function supportAreaName(area){
  return { 'Economic and Management Sciences':'EMS', 'Language':'Languages', 'Overall':'Overall average' }[area] || area;
}
function supportNeedsFrom(rows){
  const groups = {};
  rows.forEach(l=>{
    const rep = adminSubjectReportFor(l);
    if(!rep) return;
    const intended = {};
    (l.intendedSubjects||[]).forEach(n=>{ const id = SC_CAREER_SUBJECT_IDS[n]; if(id) intended[id] = true; });
    if(l.intendedMathType==='Mathematics') intended.mathematics = true;
    if(l.intendedMathType==='MathLit') intended.mathematicalLiteracy = true;
    rep.results.forEach(r=>{
      if(SC_SUBJECTS[r.id].fetNames.length!==1) return;
      if(!intended[r.id] && r.interest.level!=='High') return;
      // Mathematical Literacy is built for a developing Mathematics result: it
      // counts only when its own readiness (which allows for that) is low too.
      if(r.id==='mathematicalLiteracy' && !(r.academic.score!=null && r.academic.score<SUPPORT_BELOW)) return;
      const low = (r.academic.inputs||[]).filter(i=>i.pct<SUPPORT_BELOW);
      if(!low.length) return;
      const weakest = low.reduce((a,b)=>b.pct<a.pct ? b : a);
      const key = r.id+'|'+weakest.area;
      const g = groups[key] = groups[key] || { subject: r.label, area: supportAreaName(weakest.area), learners: [] };
      g.learners.push({ learnerId: l.id, learnerName: cohortLearnerName(l.id), pct: weakest.pct, intends: !!intended[r.id] });
    });
  });
  return Object.values(groups).map(g=>({ ...g, count: g.learners.length }))
    .sort((a,b)=>(b.count-a.count) || a.subject.localeCompare(b.subject));
}

function guidanceRowsFrom(enriched){
  return enriched.map(e=>{
    const concern = (e.readiness && e.readiness.pct!=null && e.readiness.pct<50)
      ? `${e.readiness.subject} currently ${markBandLabel(e.readiness.pct)} (${e.readiness.pct}%)` : null;
    const hasIntended = e.learner.intendedSubjects && e.learner.intendedSubjects.length;
    const rec = adminSubjectRecFor(e.learner);
    const differs = (rec && rec.differs) || [];
    const action = (e.conflict && e.conflict.hasConflict) ? 'Discuss subject choice vs. stated career interest'
      : differs.length ? 'Discuss intended subjects vs. Subject Choice recommendation'
      : concern ? 'Consider additional academic support'
      : !hasIntended ? 'Confirm Grade 10 subject choices'
      : null;
    if(!action) return null;
    return {
      learnerId: e.learner.id,
      learnerName: cohortLearnerName(e.learner.id),
      pathway: e.faculty.name,
      interest: e.top.career.name,
      concern: concern || '—',
      planned: (e.conflict && e.conflict.hasConflict) ? e.conflict.plannedSubject : (hasIntended ? e.learner.intendedSubjects.join(', ') : 'Not yet specified'),
      conflict: [(e.conflict && e.conflict.hasConflict) ? e.conflict.reason : null].concat(differs).filter(Boolean).join('; ') || '—',
      recommended: rec ? adminRecSubjectsLine(rec) : 'Not yet completed',
      action,
    };
  }).filter(Boolean);
}

function readinessCrossTabFrom(enriched){
  const byFaculty = {};
  enriched.forEach(e=>{ (byFaculty[e.faculty.id] = byFaculty[e.faculty.id]||[]).push(e); });
  return FACULTIES.map(f=>{
    const subject = keySubjectFor(f.id);
    const list = byFaculty[f.id] || [];
    if(!subject || !list.length) return null; // no single representative subject, or no interested learners -- correctly omitted, not shown with a bogus row
    const withMark = list.map(e=>subjectMarkPct(e.learner, subject)).filter(p=>p!=null);
    return {
      pathwayName: f.name, subject, interested: list.length,
      above70: withMark.filter(p=>p>=70).length,
      mid: withMark.filter(p=>p>=50 && p<70).length,
      below50: withMark.filter(p=>p<50).length,
    };
  }).filter(Boolean);
}

// Every sentence here is built from the live `d` object computed above --
// never a hard-coded statement. A minimum-count guard (>=5) on the
// pathway-specific readiness insight avoids a dignity-sensitive "1
// learner has weak marks" sentence in a small cohort.
function generateSchoolInsights(d){
  const out = [];
  if(d.pathwayDistribution.length){
    const top = d.pathwayDistribution[0];
    out.push(`${esc(top.name)} is the most common career pathway among assessed Grade 9 learners, matching ${top.count} learner${top.count===1?'':'s'} (${top.pct}%).`);
  }
  if(d.overview.conflictCount>0){
    const byFacultyName = {};
    d.enriched.forEach(e=>{ if(e.conflict && e.conflict.hasConflict) byFacultyName[e.faculty.name] = (byFacultyName[e.faculty.name]||0)+1; });
    const worst = Object.entries(byFacultyName).sort((a,b)=>b[1]-a[1])[0];
    out.push(`${d.overview.conflictCount} learner${d.overview.conflictCount===1?'':'s'} currently show a potential subject-career conflict${worst?` — most concentrated in ${esc(worst[0])} (${worst[1]} learner${worst[1]===1?'':'s'})`:''}.`);
  }
  if(d.subjectRecs.differsCount>0){
    out.push(`${d.subjectRecs.differsCount} learner${d.subjectRecs.differsCount===1?' intends':'s intend'} to take a subject their Subject Choice results do not currently support — see the guidance table below.`);
  }
  if(d.subjectDemand.list.length){
    const top = d.subjectDemand.list[0];
    out.push(`${esc(top.subject)} is the most in-demand Grade 10 subject choice among learners who have specified their subjects, selected by ${top.count} (${top.pct}%).`);
  }
  d.supportNeeds.filter(g=>g.count>=5).slice(0,2).forEach(g=>{
    out.push(`${g.count} learners interested in ${esc(g.subject)} have ${esc(g.area)} results below ${SUPPORT_BELOW}% and may benefit from targeted support.`);
  });
  d.readinessByPathway.forEach(r=>{
    if(r.below50>=5) out.push(`${r.below50} learners interested in ${esc(r.pathwayName)} currently have ${esc(r.subject)} results below 50% and may benefit from targeted support.`);
  });
  return out;
}

function viewAdminDashboard(){
  // Plain classId/'all' route param, same convention as viewAdminCohort's
  // own filter (this route never receives the {fac} object form). Chips
  // only render once there's more than one class to choose between.
  const filterClass = ROUTE_PARAM || 'all';
  const mine = myClasses();
  const d = buildSchoolDashboardData(filterClass);
  return `
  ${pageHeadHTML('Grade 9 Dashboard', 'An aggregate view of your Grade 9 cohort — patterns and learners who may benefit from extra guidance, never final decisions.')}
  ${mine.length>1 ? `
  <div class="filter-bar">
    <button class="chip-select ${filterClass==='all'?'on':''}" onclick="navigate('admin-dashboard','all')">All classes</button>
    ${mine.map(c=>`<button class="chip-select ${filterClass===c.id?'on':''}" onclick="navigate('admin-dashboard','${c.id}')">${esc(c.name)}</button>`).join('')}
  </div>` : ''}
  ${IS_SUPER_ADMIN? `
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
    <button class="btn btn-amber" onclick="App.exportDashboardCSV('${filterClass}')">${icon('download')} Export CSV</button>
    <button class="btn btn-ghost" onclick="App.saveDashboardSnapshot()">${icon('check')} Save Snapshot</button>
  </div>` : ''}
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${d.overview.totalLearners}</div><div class="l">Grade 9 learners</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--grass)"></div><div><div class="n">${d.overview.completionRate}%</div><div class="l">Assessment completion</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${d.overview.guidanceRequired}</div><div class="l">Learners requiring guidance</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--coral)"></div><div><div class="n">${d.overview.conflictCount}</div><div class="l">Subject-career conflicts</div></div></div>
  </div>

  ${snapshotComparisonHTML(d.overview)}

  ${d.insights.length ? `
  <div class="section-title" style="margin-top:0;"><h2>School Insights</h2></div>
  ${d.insights.map(txt=>`<div class="disclaimer" style="margin-bottom:12px;">${icon('info','ic')}<div>${txt}</div></div>`).join('')}
  ` : ''}

  <div class="grid grid-2" style="margin-bottom:20px;">
    <div class="card">
      <h3>Career Pathway Distribution</h3>
      <p class="page-sub">Click a pathway to see its learners.</p>
      ${d.pathwayDistribution.length ? d.pathwayDistribution.map(p=>`
        <div style="margin-bottom:10px;cursor:pointer;" onclick="navigate('admin-cohort',{fac:'${p.id}', classId:'${filterClass}'})">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>${esc(p.name)}</span><span>${p.count} (${p.pct}%)</span></div>
          <div class="aps-bar"><div style="width:${p.pct}%;background:${p.color};"></div></div>
        </div>`).join('') : `<p class="page-sub">No assessed Grade 9 learners yet.</p>`}
    </div>
    <div class="card">
      <h3>Grade 10 Subjects: Recommended vs. Intended</h3>
      <p class="page-sub">Recommended: from ${d.subjectRecs.withRecCount} of ${d.overview.totalLearners} learners’ Subject Choice reports. Intended: what ${d.subjectRecs.intendedCount} learners say they lean toward.</p>
      ${d.subjectRecs.list.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Subject</th><th>Recommended</th><th>Intended</th></tr></thead>
        <tbody>${d.subjectRecs.list.map(s=>`<tr><td>${esc(s.subject)}</td><td>${s.recommended}</td><td>${s.intended}</td></tr>`).join('')}</tbody>
      </table></div>` : `<p class="page-sub">No Subject Choice reports or subject intentions yet.</p>`}
    </div>
  </div>

  ${grade10PlanningHTML(d)}

  ${d.readinessByPathway.length ? `
  <div class="card" style="margin-bottom:20px;">
    <h3>Academic Readiness by Pathway</h3>
    <p class="page-sub">How interested learners’ current results in each pathway’s key subject break down. Pathways with no single representative subject are omitted here, not shown with a misleading one.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Pathway</th><th>Key subject</th><th>Interested</th><th>≥70%</th><th>50–69%</th><th>&lt;50%</th></tr></thead>
      <tbody>
        ${d.readinessByPathway.map(r=>`<tr><td>${esc(r.pathwayName)}</td><td>${esc(r.subject)}</td><td>${r.interested}</td><td>${r.above70}</td><td>${r.mid}</td><td>${r.below50}</td></tr>`).join('')}
      </tbody>
    </table></div>
  </div>` : ''}

  ${assessmentProgressHTML(d.progress)}

  <div class="section-title"><h2>Learners Requiring Guidance</h2></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Learner</th><th>Career Pathway</th><th>Career Interest</th><th>Current Academic Concern</th><th>Recommended Subjects</th><th>Planned Subject</th><th>Potential Conflict</th><th>Recommended Action</th></tr></thead>
    <tbody>
      ${d.guidanceRows.length ? d.guidanceRows.map(r=>`
        <tr style="cursor:pointer;" onclick="navigate('admin-learner','${r.learnerId}')">
          <td><a href="#" onclick="event.preventDefault();navigate('admin-learner','${r.learnerId}');"><b>${esc(r.learnerName)}</b></a></td>
          <td>${esc(r.pathway)}</td>
          <td>${esc(r.interest)}</td>
          <td>${esc(r.concern)}</td>
          <td>${esc(r.recommended)}</td>
          <td>${esc(r.planned)}</td>
          <td>${esc(r.conflict)}</td>
          <td>${esc(r.action)}</td>
        </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px;">No learners currently flagged for guidance.</td></tr>`}
    </tbody>
  </table></div>
  ${disclaimerHTML('This view surfaces support opportunities based on current results and stated interests — it never makes final career or subject decisions for a learner.')}

  ${SNAPSHOTS.length ? `
  <div class="section-title"><h2>Snapshot History</h2></div>
  <div class="card">
    ${SNAPSHOTS.map(s=>{ const so = (s.data && s.data.overview) || {}; return `<div class="kv"><b>${s.label?esc(s.label):'Untitled snapshot'}</b><span>${esc(new Date(s.created_at).toLocaleDateString('en-ZA',{year:'numeric',month:'long',day:'numeric'}))} — ${so.totalLearners||0} learners, ${so.conflictCount||0} conflicts</span></div>`; }).join('')}
  </div>` : ''}
  `;
}

// Grade 10 planning: the Maths split as headline numbers, how many learners
// each recommended combination went to (subject streams, class sizes,
// teachers), and where extra lessons are needed.
function grade10PlanningHTML(d){
  const m = d.subjectRecs.math, n = d.subjectRecs.withRecCount;
  const pct = x=>n ? Math.round(100*x/n) : 0;
  return `
  <div class="section-title"><h2>Grade 10 Planning</h2></div>
  <p class="page-sub" style="margin-top:-6px;">From ${n} of ${d.overview.totalLearners} learners’ Subject Choice reports.</p>
  <div class="grid grid-3" style="margin-bottom:20px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${m.mathematics} <span style="font-size:14px;color:var(--muted);">(${pct(m.mathematics)}%)</span></div><div class="l">Mathematics recommended${m.support?` · ${m.support} with extra support`:''}</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${m.mathematicalLiteracy} <span style="font-size:14px;color:var(--muted);">(${pct(m.mathematicalLiteracy)}%)</span></div><div class="l">Maths Literacy recommended</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--teal)"></div><div><div class="n">${m.either} <span style="font-size:14px;color:var(--muted);">(${pct(m.either)}%)</span></div><div class="l">Maths choice to talk through</div></div></div>
  </div>
  <div class="grid grid-2" style="margin-bottom:20px;">
    <div class="card">
      <h3>Recommended Subject Combinations</h3>
      <p class="page-sub">How many learners each combination was recommended to.</p>
      ${d.combinations.length ? d.combinations.map(c=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:600;"><span>${esc(c.name)}</span><span>${c.count} (${c.pct}%)</span></div>
          <div class="aps-bar"><div style="width:${c.pct}%"></div></div>
        </div>`).join('') : `<p class="page-sub">No Subject Choice reports yet.</p>`}
    </div>
    <div class="card">
      <h3>Support Planning</h3>
      <p class="page-sub">Learners interested in a subject (they intend to take it, or show high interest) whose Grade 9 result in a learning area it builds on is below ${SUPPORT_BELOW}%.</p>
      ${d.supportNeeds.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Subject</th><th>Learning area below ${SUPPORT_BELOW}%</th><th>Learners</th></tr></thead>
        <tbody>${d.supportNeeds.slice(0,12).map(g=>`<tr><td>${esc(g.subject)}</td><td>${esc(g.area)}</td><td>${g.count}</td></tr>`).join('')}</tbody>
      </table></div>
      ${d.supportNeeds.length>12 ? `<p class="page-sub" style="margin-top:8px;">${d.supportNeeds.length-12} more in the Excel download, with the learners’ names.</p>` : ''}` : `<p class="page-sub">No learners currently below ${SUPPORT_BELOW}% in a subject they are interested in.</p>`}
    </div>
  </div>`;
}

// Completion of each assessment by class, and who still has something to
// finish. The list is long in a big school, so it opens at 15 names.
function assessmentProgressHTML(p){
  const pct = (x,t)=>t ? Math.round(100*x/t) : 0;
  const cell = (x,t)=>`${x} <span style="color:var(--muted);">(${pct(x,t)}%)</span>`;
  const row = (r, bold)=>`<tr${bold?' style="font-weight:700;"':''}><td>${esc(r.name)}</td><td>${r.learners}</td>${PROGRESS_STEPS.map(s=>`<td>${cell(r[s.key], r.learners)}</td>`).join('')}<td>${cell(r.all, r.learners)}</td></tr>`;
  const showAll = !!window.__showAllOutstanding;
  const list = showAll ? p.outstanding : p.outstanding.slice(0,15);
  return `
  <div class="section-title"><h2>Assessment Progress</h2></div>
  <div class="table-wrap" style="margin-bottom:14px;"><table>
    <thead><tr><th>Class</th><th>Learners</th>${PROGRESS_STEPS.map(s=>`<th>${esc(s.label)}</th>`).join('')}<th>All done</th></tr></thead>
    <tbody>${p.byClass.map(r=>row(r,false)).join('')}${p.byClass.length>1 ? row({ name:'All classes', ...p.total }, true) : ''}</tbody>
  </table></div>
  <div class="card" style="margin-bottom:20px;">
    <h3>Still to finish (${p.outstanding.length})</h3>
    ${p.outstanding.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Learner</th><th>Class</th><th>Still to do</th></tr></thead>
      <tbody>${list.map(o=>`<tr><td><a href="#" onclick="navigate('admin-learner','${o.learnerId}');return false;"><b>${esc(o.learnerName)}</b></a></td><td>${esc(o.className)}</td><td>${esc(o.missing.join(', '))}</td></tr>`).join('')}</tbody>
    </table></div>
    ${p.outstanding.length>15 ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="window.__showAllOutstanding=${!showAll};render();">${showAll ? 'Show fewer' : `Show all ${p.outstanding.length}`}</button>` : ''}`
    : '<p class="page-sub">Every learner has finished all three.</p>'}
  </div>`;
}

// Compares the live overview numbers against the most recent saved
// snapshot (SNAPSHOTS is sorted newest-first by loadDashboardSnapshots'
// own query). Renders nothing until at least one snapshot exists --
// there's nothing to compare yet otherwise.
function snapshotComparisonHTML(current){
  if(!SNAPSHOTS.length) return '';
  const prev = SNAPSHOTS[0];
  const po = prev.data.overview || {};
  const delta = (curr, old)=>{
    if(old==null) return '';
    const diff = curr - old;
    if(diff===0) return ' (no change)';
    return ` (${diff>0?'+':''}${diff} since last snapshot)`;
  };
  const dateStr = new Date(prev.created_at).toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });
  return `
  <div class="card" style="margin-bottom:20px;">
    <h3>Compared to your last snapshot${prev.label?` — "${esc(prev.label)}"`:''} (${esc(dateStr)})</h3>
    <div class="grid grid-2">
      <div class="kv"><b>Grade 9 learners</b><span>${current.totalLearners}${delta(current.totalLearners, po.totalLearners)}</span></div>
      <div class="kv"><b>Assessment completion</b><span>${current.completionRate}%${delta(current.completionRate, po.completionRate)}</span></div>
      <div class="kv"><b>Learners requiring guidance</b><span>${current.guidanceRequired}${delta(current.guidanceRequired, po.guidanceRequired)}</span></div>
      <div class="kv"><b>Subject-career conflicts</b><span>${current.conflictCount}${delta(current.conflictCount, po.conflictCount)}</span></div>
      <div class="kv"><b>Mathematics recommended</b><span>${current.mathsRecommended}${delta(current.mathsRecommended, po.mathsRecommended)}</span></div>
      <div class="kv"><b>Maths Literacy recommended</b><span>${current.mathLitRecommended}${delta(current.mathLitRecommended, po.mathLitRecommended)}</span></div>
    </div>
  </div>`;
}
