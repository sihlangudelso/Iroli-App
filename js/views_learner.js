
// The school-profile form, editing a copy (PROFILE_DRAFT) so that tapping a
// grade or "just exploring" by mistake changes nothing until Save.
function ensureProfileDraft(){
  const l = ensureLearnerObj();
  if(!PROFILE_DRAFT){
    PROFILE_DRAFT = { grade: l.grade || null, school: l.school || '', mathType: l.mathType || null,
      subjects: (l.subjects || []).slice(), exploringOnly: l.exploringOnly };
  }
  return PROFILE_DRAFT;
}
function viewOnboarding(isEdit){
  const l = ensureLearnerObj();
  const d = ensureProfileDraft();
  const grade = d.grade || '';
  const mathType = d.mathType || '';
  const subjects = d.subjects || [];
  // Also true for a pre-exploringOnly-column record that already has
  // grade+school set -- otherwise such a learner got an unwanted "are you
  // a school learner?" re-prompt specifically on the 'profile' edit route
  // (found in the pre-launch audit), since exploringOnly is undefined on
  // their record, not false.
  const pathChosen = d.exploringOnly === true || d.exploringOnly === false || !!(l.grade && l.school);
  return `
  <div style="max-width:640px;margin:0 auto;">
    ${isEdit ? `<button class="btn btn-ghost btn-sm" style="margin-bottom:12px;" onclick="navigate('account')">${icon('chevron')} Back to Account</button>` : ''}
    <div style="text-align:center;margin-bottom:26px;">
      <img class="brand-mark-img" src="assets/logo-mark.png" alt="Iroli"/>
      <h1>${isEdit?'Your school details':'Welcome to Iroli Career Pathway'}</h1>
      <p class="page-sub" style="margin:0 auto;">${isEdit ? 'Your grade, school and subjects. Nothing changes until you save.' : 'Find careers that fit you, and the subjects and pathways to get there.'}</p>
    </div>

    ${!isEdit && d.exploringOnly !== false ? `
    <div class="grid grid-2" style="margin-bottom:22px;gap:12px;">
      <button class="tile" style="border-top-color:var(--indigo);padding:16px;" onclick="App.startExploring('assessment')">${icon('spark','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Personality Assessment</h3><p class="page-sub" style="margin:0;">${RIASEC_QUESTIONS.length + STRENGTH_KEYS.length} quick questions to find your interests and strengths.</p></button>
      <button class="tile" style="border-top-color:var(--teal);padding:16px;" onclick="App.startExploring('matches')">${icon('target','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Career Matching</h3><p class="page-sub" style="margin:0;">See which careers fit you best, ranked by fit.</p></button>
      <button class="tile" style="border-top-color:var(--sky);padding:16px;" onclick="App.startExploring('explore')">${icon('search','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Explore Careers</h3><p class="page-sub" style="margin:0;">Browse every career, with real degree requirements.</p></button>
      <button class="tile" style="border-top-color:var(--coral);padding:16px;" onclick="App.startExploring('marks')">${icon('calc','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">APS Calculator</h3><p class="page-sub" style="margin:0;">Estimate your university admission score from your marks.</p></button>
    </div>
    ` : ''}

    ${!pathChosen ? `
    <div class="card">
      <h3 style="margin-bottom:4px;">Are you currently a Grade 9\u201312 learner at school?</h3>
      <p class="page-sub" style="margin-bottom:14px;">This tailors your report to your grade.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="App.chooseOnboardingPath(false)">Yes, I\u2019m a school learner</button>
        <button class="btn btn-ghost" onclick="App.chooseOnboardingPath(true)">No, I\u2019m just exploring</button>
      </div>
    </div>
    ` : d.exploringOnly ? `
    <div class="card">
      <h3>${isEdit ? 'Using Iroli without a school' : 'You\u2019re all set'}</h3>
      <p class="page-sub" style="margin-bottom:14px;">${isEdit ? 'Save to use Iroli without a grade or school. Your saved results stay.' : 'No school details needed. You can add a school later in Account.'}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="App.chooseOnboardingPath(false)">Actually, I\u2019m a school learner</button>
        <button class="btn btn-primary" onclick="App.saveOnboarding()">${icon('check')} ${isEdit ? 'Save' : 'Continue'}</button>
      </div>
    </div>
    ` : `
    <div class="card">
      ${isEdit ? '' : `<div class="form-row">
        <label>Your name</label>
        <input type="text" value="${esc(ME.name)||'Learner'}" disabled/>
        <div class="hint">From your Iroli account.</div>
      </div>`}
      <div class="form-row">
        <label>Grade</label>
        <div class="filter-bar">
          ${[9,10,11,12].map(g=>`<button class="chip-select ${Number(grade)===g?'on':''}" aria-pressed="${Number(grade)===g}" onclick="App.setGrade(${g})">Grade ${g}</button>`).join('')}
        </div>
        ${isEdit && l.grade && Number(grade)!==Number(l.grade) ? `<div class="hint">Changing from Grade ${esc(l.grade)} to Grade ${esc(grade)}. ${Number(grade)===9 ? 'Grade 9 learners choose subjects later, so your saved subjects will be cleared when you save.' : ''}</div>` : ''}
      </div>
      <div class="form-row">
        <label for="ob_school">School name</label>
        <input type="text" id="ob_school" placeholder="e.g. Iroli High School" value="${esc(d.school||'')}"/>
      </div>
      ${Number(grade)>9 ? `
      <div class="form-row">
        <label>Mathematics or Mathematical Literacy?</label>
        <div class="filter-bar">
          <button class="chip-select ${mathType==='Mathematics'?'on':''}" aria-pressed="${mathType==='Mathematics'}" onclick="App.setMathType('Mathematics')">Mathematics</button>
          <button class="chip-select ${mathType==='MathLit'?'on':''}" aria-pressed="${mathType==='MathLit'}" onclick="App.setMathType('MathLit')">Mathematical Literacy</button>
        </div>
      </div>
      <div class="form-row">
        <label>Your other subjects (besides your two languages, Life Orientation and Maths)</label>
        ${SUBJECT_GROUPS.map(g=>`
          <div style="margin:12px 0 6px;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;">${g.group}</div>
          <div class="check-grid">
            ${g.subjects.map(s=>`<label class="check-item">
                <input type="checkbox" class="subject-check" value="${esc(s)}" ${subjects.includes(s)?'checked':''}/>
                <span style="flex:1;">${esc(s)}</span>
              </label>`).join('')}
          </div>
        `).join('')}
      </div>` : (grade ? `
      <div class="disclaimer">${icon('info','ic')}<div>No need to pick subjects yet: that comes after the Subject Choice Assessment.</div></div>
      ` : '')}
      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="App.chooseOnboardingPath(true)">Actually, I\u2019m just exploring</button>
        <button class="btn btn-primary" onclick="App.saveOnboarding()">${icon('check')} ${isEdit ? 'Save' : 'Save & continue'}</button>
      </div>
    </div>
    `}
  </div>`;
}

// Home: what to do next, a short snapshot, and the top three matches. Every
// other job has its own menu item, so nothing here repeats the menu.
function homeNextSteps(l){
  const steps = [];
  const school = !l.exploringOnly;
  const g9 = isGrade9Learner(l);
  const thisYear = Number(l.gradeYear) || currentSchoolYear();
  const yearTerms = (l.termMarks && l.termMarks[thisYear] && l.termMarks[thisYear].terms) || {};
  const hasTermMarks = Object.keys(yearTerms).some(function(t){ return Object.keys(yearTerms[t]||{}).length; });
  const hasMarks = g9 ? !!l.grade9Report : (hasTermMarks || Object.keys(l.subjectMarks||{}).length > 0);
  if(school && !hasMarks) steps.push({ text: g9 ? 'Add your Grade 9 report results.' : 'Add your marks for this term.', route:'marks', label: 'Add marks' });
  if(!l.assessmentCompletedAt) steps.push({ text:'Take the personality assessment to find careers that suit you.', route:'assessment', label:'Start' });
  if(subjectChoiceAvailable(l) && !(l.subjectChoice && l.subjectChoice.completedAt)) steps.push({ text:'Take the Subject Choice Assessment to see which Grade 10 subjects fit you.', route:'subject-choice', label:'Start' });
  if(pathwayOpen(l) && isProLearner(l)){
    const pw = pwNextSteps(l)[0];
    if(pw) steps.push({ html: pw.html, action: pw.action, label: pw.label || 'Open My Pathway' });
  }
  if(l.assessmentCompletedAt && !l.viewedMatches) steps.push({ text:'Look through your best career matches.', route:'matches', label:'See matches' });
  if(l.assessmentCompletedAt && !(l.favourites||[]).length) steps.push({ text:'Save the careers you like, so you can compare them.', route:'matches', label:'Browse' });
  if(school && hasMarks && !g9 && !hasTermMarks) steps.push({ text:'Add this term\u2019s marks so your results stay current.', route:'marks', label:'Update marks' });
  if(l.assessmentCompletedAt) steps.push({ text:'Read your report and talk it through with a teacher or parent.', route:'report', label:'My Report' });
  return steps.slice(0, 3);
}
function viewHome(){
  const l = ensureLearnerObj();
  const matches = bestSuitedCareers(l, 3);
  const steps = homeNextSteps(l);
  const { steps: done, pct } = progressState(l);
  const doneCount = done.filter(s=>s.done).length;
  return `
  ${pageHeadHTML('Welcome back, ' + ((ME.name||'there').split(' ')[0]))}
  ${pwRolloverBannerHTML()}
  ${PREVIEW_MODE?`<div class="disclaimer" style="margin-bottom:18px;display:block;">
    <div style="display:flex;gap:10px;align-items:flex-start;">${icon('info','ic')}<div>You are previewing the learner experience as an admin. Nothing here is saved to shared learner data, and joining or leaving a class is switched off.</div></div>
    <div class="filter-bar" style="margin:12px 0 0;align-items:center;"><span class="page-sub" style="margin:0 4px 0 0;">Preview as:</span>${[['9','Grade 9'],['10','Grade 10'],['11','Grade 11'],['12','Grade 12'],['explore','Just exploring']].map(o=>`<button class="chip-select ${(l.exploringOnly?'explore':String(l.grade))===o[0]?'on':''}" onclick="App.previewAs('${o[0]}')">${o[1]}</button>`).join('')}</div>
  </div>`:''}
  <div class="card pw-next" style="margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;">
      <h3 style="margin:0;">What to do next</h3>
      <span class="page-sub" style="margin:0;">${doneCount} of ${done.length} getting-started steps done</span>
    </div>
    <div class="aps-bar" style="margin:10px 0 4px;"><div style="width:${pct}%"></div></div>
    ${steps.length ? `<ol class="pw-steps">${steps.map(s=>`<li><span>${s.html || esc(s.text)}</span><button class="btn btn-ghost btn-sm" onclick="${s.action || `navigate('${s.route}')`}">${esc(s.label)}</button></li>`).join('')}</ol>`
      : `<p class="page-sub" style="margin:8px 0 0;">You\u2019re up to date. Keep your marks current each term.</p>`}
  </div>
  <div class="grid grid-2" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${l.exploringOnly?'Exploring':'Grade '+(l.grade||'\u2014')}</div><div class="l">${l.exploringOnly?'Not currently in school':esc(l.school||'No school set')}</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${(l.favourites||[]).length}</div><div class="l">Saved careers</div></div></div>
  </div>
  <div class="section-title"><h2>Your top career matches</h2>${matches.length ? `<button class="btn btn-ghost btn-sm" onclick="navigate('matches')">See all</button>` : ''}</div>
  ${matches.length ? matches.map(m=>careerRowHTML(m.career, m.score, l, m.category, {route:'home'})).join('') : `<div class="empty-state">${icon('target')}<p>Take the <a href="#" onclick="navigate('assessment');return false;">personality assessment</a> to see your best-suited careers.</p></div>`}
  `;
}
function academicProfileHTML(l){
  const p = buildAcademicProfile(l);
  if(!p) return '';
  return `
  <div class="card" style="margin-bottom:20px;">
    <h3>Your academic profile</h3>
    <p class="page-sub">Based on your latest entered marks — this reflects where you are right now, not what you’re capable of.</p>
    ${p.primaryDomain ? `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:var(--t-violet);border-radius:14px;padding:12px 16px;margin:12px 0;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--on-violet);">Primary strength area</div>
        <div style="font-family:var(--font-head);font-weight:700;font-size:16px;">${esc(p.primaryDomain.domain.name)}</div>
        ${p.secondaryDomain ? `<div class="page-sub" style="margin:2px 0 0;">Secondary: ${esc(p.secondaryDomain.domain.name)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('report','profile')">${icon('chevron')} See full profile</button>
    </div>` : ''}
    <div class="grid grid-2" style="margin-top:10px;">
      <div>
        <h4 style="margin-bottom:8px;">Strongest subjects</h4>
        ${p.strongest.map((e,i)=>`<div class="kv"><b>${i+1}. ${esc(e.subject)}</b><span>${e.pct}%</span></div>`).join('')}
        ${p.areasOfStrength.length? `<div class="pill-list" style="margin-top:10px;">${p.areasOfStrength.map(a=>`<span class="pill rec">${esc(a)}</span>`).join('')}</div>` : ''}
      </div>
      <div>
        <h4 style="margin-bottom:8px;">${p.toStrengthen.length? 'Subjects to strengthen' : 'Keep it up'}</h4>
        ${p.toStrengthen.length
          ? p.toStrengthen.map(e=>`<div class="kv"><b>${esc(e.subject)}</b><span>${e.pct}%</span></div>`).join('')
          : `<p class="page-sub">No subjects currently below 50% — nice work.</p>`}
      </div>
    </div>
  </div>`;
}

/* ---------------- Your Learner Profile ---------------- */
function viewLearnerProfile(){
  const l = ensureLearnerObj();
  const p = buildAcademicProfile(l);
  const sub = (!p || !p.primaryDomain)
    ? 'Combines your report results, interests and work style into one picture.'
    : 'Combining your report results, interests and work style — a starting point, not a fixed label.';
  return `${pageHeadHTML('Your Learner Profile', sub)}${learnerProfileBodyHTML(l)}`;
}
// Split out from viewLearnerProfile so the redesigned report's "My
// Profile" tab (js/views_report.js) can reuse the exact same content
// without a duplicate page header nested inside the report's own shell.
function learnerProfileBodyHTML(l){
  const p = buildAcademicProfile(l);
  if(!p || !p.primaryDomain){
    const entry = resultsEntryLinkHTML(l);
    return `<div class="empty-state">${icon('target')}<p>Not enough information yet — ${entry ? 'enter your ' + entry + ' or complete' : 'complete'} the <a href="#" onclick="navigate('assessment');return false;">personality assessment</a> to build your profile.</p></div>`;
  }
  const riasec = l.riasec || {};
  const topInterests = RIASEC.filter(d=>(riasec[d.id]||0)>=65);
  const topMatches = bestSuitedCareers(l, 3);
  const pathways = [...new Set([...p.primaryDomain.domain.pathways, ...(p.secondaryDomain?p.secondaryDomain.domain.pathways:[])])];
  // Leads with the plain-language headline (top 3 strongest domains + a
  // generated sentence) before the percentage-driven cards below -- the
  // underlying scores still show, just not first and not dominant.
  const topDomains = computeStrengthDomains(l).filter(d=>d.hasEvidence).slice(0,3);

  return `
  ${topDomains.length ? `
  <div class="card" style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Your strongest areas</div>
    <div class="pill-list" style="margin-bottom:12px;">${topDomains.map(d=>`<span class="pill rec">${esc(d.domain.name)}</span>`).join('')}</div>
    <p style="margin:0;">You tend to enjoy ${esc(joinBlends(topDomains.map(d=>d.domain.blend)))}.</p>
  </div>` : ''}

  <div class="card" style="margin-bottom:18px;">
    <div class="grid grid-2">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);">Primary strength area</div>
        <div style="font-family:var(--font-head);font-weight:800;font-size:22px;color:var(--link);">${esc(p.primaryDomain.domain.name)}</div>
      </div>
      ${p.secondaryDomain ? `<div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);">Secondary strength area</div>
        <div style="font-family:var(--font-head);font-weight:800;font-size:22px;">${esc(p.secondaryDomain.domain.name)}</div>
      </div>` : ''}
    </div>
  </div>

  ${p.entries.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>What your report shows</h3>
    <p class="page-sub">Your strongest current subjects are:</p>
    ${p.strongest.map(e=>`<div class="kv"><b>${esc(e.subject)}</b><span>${e.pct}% — ${markBandLabel(e.pct)}</span></div>`).join('')}
    ${p.toStrengthen.length ? `<p class="page-sub" style="margin-top:10px;">${p.toStrengthen.map(e=>esc(e.subject)).join(', ')} ${p.toStrengthen.length>1?'are':'is'} currently ${markBandLabel(p.toStrengthen[0].pct)} — this describes where you are right now, not what you’re capable of.</p>` : ''}
  </div>` : ''}

  ${topInterests.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>What your personality assessment shows</h3>
    <p class="page-sub">You show strong interest in:</p>
    <div class="pill-list">${topInterests.map(d=>`<span class="pill rec">${esc(d.name)}</span>`).join('')}</div>
  </div>` : ''}

  <div class="card" style="margin-bottom:18px;">
    <h3>Career areas to explore</h3>
    <div class="pill-list">${pathways.map(pw=>`<span class="tag">${esc(pw)}</span>`).join('')}</div>
  </div>

  ${topMatches.length ? `
  <div class="section-title" style="margin-top:0;"><h2>Top career matches right now</h2></div>
  ${topMatches.map(m=>careerRowHTML(m.career,m.score,l,m.category,{route:'report', param:'profile'})).join('')}
  ` : ''}

  ${(function(){
    const src = reportSubjectSource(l);
    const heading = isGrade9Learner(l) ? 'Grade 10 subjects that may suit you' : 'Subjects that may suit you';
    if(src.kind === 'assessment'){
      return `<div class="card" style="margin:18px 0;">
        <h3>${heading}</h3>
        <p class="page-sub">From your Subject Choice Assessment.</p>
        <div class="pill-list" style="margin-bottom:12px;">${src.report.top.slice(0, 3).map(r=>`<span class="pill rec">${esc(r.label)}</span>`).join('')}</div>
        <button class="btn btn-primary" onclick="navigate('subject-choice')">${icon('compass')} See your full subject report</button>
      </div>`;
    }
    if(!subjectChoiceAvailable(l)) return '';
    return `<div class="card" style="margin:18px 0;">
      <h3>${heading}</h3>
      <p class="page-sub">The Subject Choice Assessment looks at what you enjoy, how you naturally work and how you are performing.</p>
      <button class="btn btn-primary" onclick="navigate('subject-choice')">${icon('compass')} Open the Subject Choice Assessment</button>
    </div>`;
  })()}
  `;
}

/* ---------------- Grade 9 Report Results + Work Style ---------------- */
function ensureGrade9Draft(){
  const l = ensureLearnerObj();
  if(!GRADE9_DRAFT){
    const g = l.grade9Report;
    const marks = {};
    (g && g.subjects ? Object.keys(g.subjects) : []).forEach(k=>{ marks[k] = g.subjects[k].pct; });
    const ws = {};
    WORK_STYLE_QUESTIONS.forEach(q=>{
      const saved = l.workStyle && l.workStyle[q.key];
      ws[q.key] = saved!=null ? Math.round(saved/25)+1 : 0; // 0-100 saved -> 1-5 slider; 0 = not yet answered
    });
    GRADE9_DRAFT = {
      step: 1,
      term: (g && g.term) || 'Term 4 / Final',
      socialSciencesSplit: !!(g && g.socialSciencesSplit),
      marks,
      creativeArtsFocus: (g && g.creativeArtsFocus) || [],
      workStyle: ws,
    };
    GRADE9_DRAFT.__base = JSON.stringify(GRADE9_DRAFT); // see draftTouched()
  }
  return GRADE9_DRAFT;
}
// Has at least one mark been typed in? (A blank box doesn't count.)
function grade9HasMark(d){
  return Object.keys(d.marks).some(k=>d.marks[k]!=null && d.marks[k]!=='');
}
function grade9MarkInputHTML(d, subjectLabel){
  const v = d.marks[subjectLabel];
  return `<input type="number" class="grade9-mark" min="0" max="100" placeholder="%" style="width:64px;" value="${v!=null?v:''}" onchange="App.grade9SetMark('${esc(subjectLabel)}', this.value)"/>`;
}
function viewGrade9Report(){
  const d = ensureGrade9Draft();
  const l = ensureLearnerObj();
  if(d.step===1) return grade9ReportStepHTML(d, l);
  return grade9WorkStyleStepHTML(d, l);
}
function grade9ReportStepHTML(d, l){
  return `
  ${pageHeadHTML('Grade 9 Report Results', 'Step 1 of 2 — enter your latest marks. Skip any you don’t have yet.')}
  <div class="card">
    <div class="form-row">
      <label>Report period</label>
      <select onchange="App.grade9SetTerm(this.value)">
        ${['Term 1','Term 2','Term 3','Term 4 / Final'].map(t=>`<option value="${esc(t)}" ${d.term===t?'selected':''}>${esc(t)}</option>`).join('')}
      </select>
    </div>
    ${GRADE9_SUBJECTS.map(s=>{
      if(s.id==='social-sciences'){
        return `<div class="form-row">
          <label>${esc(s.label)}</label>
          <div class="filter-bar" style="margin-bottom:8px;">
            <button class="chip-select ${!d.socialSciencesSplit?'on':''}" onclick="App.grade9SetSocialSplit(false)">One combined mark</button>
            <button class="chip-select ${d.socialSciencesSplit?'on':''}" onclick="App.grade9SetSocialSplit(true)">Geography & History separately</button>
          </div>
          ${d.socialSciencesSplit
            ? s.splitInto.map(sub=>`<div class="mark-row"><span>${esc(sub)}</span>${grade9MarkInputHTML(d,sub)}</div>`).join('')
            : `<div class="mark-row"><span>${esc(s.label)}</span>${grade9MarkInputHTML(d,s.label)}</div>`}
        </div>`;
      }
      if(s.id==='creative-arts'){
        return `<div class="form-row">
          <label>${esc(s.label)}</label>
          <div class="mark-row"><span>Overall mark</span>${grade9MarkInputHTML(d,s.label)}</div>
          <div class="hint" style="margin:8px 0 6px;">Which focus areas did this include? (optional, pick up to 2)</div>
          <div class="filter-bar">
            ${s.focusOptions.map(a=>`<button class="chip-select ${d.creativeArtsFocus.includes(a)?'on':''}" onclick="App.grade9ToggleCreativeFocus('${esc(a)}')">${esc(a)}</button>`).join('')}
          </div>
        </div>`;
      }
      return `<div class="form-row"><div class="mark-row"><span>${esc(s.label)}</span>${grade9MarkInputHTML(d,s.label)}</div></div>`;
    }).join('')}
    <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="navigate('home')">Finish later</button>
      <button class="btn btn-primary" onclick="App.grade9Step(2)">Next: How you like to work</button>
    </div>
  </div>`;
}
function grade9WorkStyleStepHTML(d, l){
  const allAnswered = WORK_STYLE_QUESTIONS.every(q=>d.workStyle[q.key]>0);
  return `
  ${pageHeadHTML('Grade 9 Report Results', 'Step 2 of 2 — a few quick questions about how you like to work — there are no right answers. Tap a number or drag the dot.')}
  <div class="card">
    ${WORK_STYLE_QUESTIONS.map(q=>{
      const answered = d.workStyle[q.key]>0;
      // What each stop means, for screen readers (the ends are shown above the slider).
      const texts = ['Much closer to: '+q.left, 'A little closer to: '+q.left, 'Right in the middle', 'A little closer to: '+q.right, 'Much closer to: '+q.right];
      return `<div class="slider-row ${answered?'':'unanswered'}">
        <div class="sl-top"><span>${esc(q.left)}</span><span>${esc(q.right)}</span></div>
        ${snapSliderHTML({ kind:'g9', id:q.key, value:d.workStyle[q.key], label:q.left+' or '+q.right, texts:texts, bipolar:true })}
      </div>`;
    }).join('')}
    <div style="margin-top:8px;display:flex;gap:10px;">
      <button class="btn btn-ghost" onclick="App.grade9Step(1)">Back</button>
      <button class="btn btn-primary" ${allAnswered?'':'disabled'} onclick="App.grade9Submit()">${icon('check')} Save my results</button>
    </div>
  </div>`;
}

/* ---------------- Assessment ---------------- */
const ASSESS_STYLES = ['likert','dots','slider','emoji'];
function assessStyleFor(step){ return ASSESS_STYLES[step % ASSESS_STYLES.length]; }
const RIASEC_SCALE = ['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'];
const STRENGTH_SCALE = ['Not a strength','A little','Somewhat','Strong','A real strength'];
const RIASEC_EMOJI = ['😠','🙁','😐','🙂','😄'];

// kind: 'riasec' and 'strength' are the personality assessment's two parts; 'subject' is a
// Subject Choice question -- the same widgets, with that assessment's own scale and handler.
function assessWidgetHTML(step, kind, value){
  const style = assessStyleFor(step);
  const sub = kind==='subject';
  const labels = sub ? SC_CONFIG.scaleLabels : (kind==='strength' ? STRENGTH_SCALE : RIASEC_SCALE);
  const choose = sub ? 'App.subjectChoiceChoose' : 'App.assessChoose';
  // Every option carries data-v and sits in a data-answer-group, so the shared
  // pickAnswer() (js/answer_inputs.js) can play the pick animation on it before
  // the next question slides in.
  if(style==='dots'){
    return `<div class="scale-dots">
      <div class="scale-dots-row" data-answer-group data-dim="1">${[1,2,3,4,5].map(n=>`<button class="dot-btn ${value===n?'on':''}" data-v="${n}" aria-pressed="${value===n}" aria-label="${n} — ${esc(labels[n-1])}" onclick="${choose}(${step},${n},this)">${n}</button>`).join('')}</div>
      <div class="scale-dots-caps"><span>${labels[0]}</span><span>${labels[4]}</span></div>
    </div>`;
  }
  if(style==='slider'){
    // An untouched slider shows its thumb parked on the middle stop, hollow, as
    // a hint -- but no answer exists until the learner taps or drags, and
    // tapping the middle stop answers 3 (a native range input could not: it only
    // reports a change). See snapSliderHTML() in js/answer_inputs.js.
    return snapSliderHTML({ kind: sub ? 'sc' : 'assess', id:step, value:value, label:'Your answer, from 1 to 5', texts:labels, showCaption:true });
  }
  if(style==='emoji'){
    if(kind==='strength'){
      // A conventional cumulative star rating (button N fills stars 1..N) --
      // one glyph per hit target, not a 5-glyph string per button, so
      // nothing overflows/overlaps at any button size.
      return `<div class="star-scale" data-answer-group data-cumulative="1">${[1,2,3,4,5].map(n=>`<button class="star-btn ${value>=n?'on':''}" data-v="${n}" aria-pressed="${value>=n}" onclick="${choose}(${step},${n},this)" aria-label="${esc(labels[n-1])}">${value>=n?'★':'☆'}</button>`).join('')}</div>`
    }
    return `<div class="emoji-scale" data-answer-group data-dim="1">${RIASEC_EMOJI.map((e,i)=>`<button class="emoji-btn ${value===i+1?'on':''}" data-v="${i+1}" aria-pressed="${value===i+1}" onclick="${choose}(${step},${i+1},this)" title="${esc(labels[i])}" aria-label="${esc(labels[i])}"><span>${e}</span></button>`).join('')}</div>`;
  }
  // Subject Choice's answers are phrases ("Definitely not me"), too long for five across a phone.
  return `<div class="likert ${sub ? 'long' : ''}" data-answer-group data-dim="1">${labels.map((lb,i)=>`<button class="${value===i+1?'on':''}" data-v="${i+1}" aria-pressed="${value===i+1}" onclick="${choose}(${step},${i+1},this)">${lb}</button>`).join('')}</div>`;
}

function ensureAssessDraft(){
  const l = ensureLearnerObj();
  if(!ASSESSMENT_DRAFT){
    ASSESSMENT_DRAFT = {
      step:0, dir:'fwd',
      answers: l.riasecRaw ? [...l.riasecRaw] : Array(RIASEC_QUESTIONS.length).fill(0),
      // Mapped (not spread) so a learner whose saved strengthsRaw predates a
      // STRENGTH_KEYS expansion gets the new trailing categories padded to
      // 0 (not yet answered) instead of leaving them undefined -- same
      // reset-not-neutral sentinel as `answers` above, and STRENGTH_KEYS is
      // append-only specifically so this positional padding stays safe.
      strengths: STRENGTH_KEYS.map((_,i)=> (l.strengthsRaw && l.strengthsRaw[i]!=null) ? l.strengthsRaw[i] : 0),
    };
  }
  return ASSESSMENT_DRAFT;
}
function viewAssessment(){
  const l = ensureLearnerObj();
  const d = ensureAssessDraft();
  // Already done: the Assessments page shows the result and the retake button.
  if(l.assessmentCompletedAt && d.step===0 && !d.retaking){
    return viewAssessments();
  }
  const TOTAL_R = RIASEC_QUESTIONS.length, TOTAL_S = STRENGTH_KEYS.length, TOTAL = TOTAL_R + TOTAL_S;
  const step = d.step;

  if(step >= TOTAL){
    return `
    ${pageHeadHTML('Nice work!', 'You’ve answered every question.')}
    <div class="card q-anim" style="text-align:center;padding:40px 24px;">
      ${icon('trophy')}
      <h3 style="margin-top:10px;">All ${TOTAL} questions done</h3>
      <p class="page-sub">Ready to see how your interests, personality and strengths line up with real careers?</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
        <button class="btn btn-ghost" onclick="App.assessGoto(${TOTAL-1},'back')">Back</button>
        <button class="btn btn-primary" onclick="App.assessSubmit()">${icon('check')} See my results</button>
      </div>
    </div>`;
  }

  const inStrengths = step >= TOTAL_R;
  const pct = Math.round(step/TOTAL*100);
  const animClass = 'q-anim' + (d.dir==='back' ? ' back' : '');
  const headTitle = inStrengths ? 'Rate your strengths' : 'Personality assessment';
  const headSub = inStrengths
    ? `Strength ${step-TOTAL_R+1} of ${TOTAL_S} — rate yourself honestly, from not a strength to a real strength.`
    : `Question ${step+1} of ${TOTAL_R} — answer honestly, there are no wrong answers.`;
  const qLabel = inStrengths ? `STRENGTH ${step-TOTAL_R+1} OF ${TOTAL_S}` : `QUESTION ${step+1} OF ${TOTAL_R}`;
  const qText = inStrengths ? STRENGTH_KEYS[step-TOTAL_R].label : RIASEC_QUESTIONS[step].text;
  const value = inStrengths ? d.strengths[step-TOTAL_R] : d.answers[step];
  const kind = inStrengths ? 'strength' : 'riasec';
  // Every question style must be genuinely answered before continuing --
  // strength questions and slider questions used to be waved through
  // regardless, which let a slider's greyed-out midpoint (or a strength
  // question of any style) get silently skipped with no real answer.
  const canContinue = !!value;

  return `
  ${pageHeadHTML(headTitle, headSub)}
  ${step===0 ? `
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
    <p style="font-size:15px;">${TOTAL} quick questions, about 6 minutes. Your answers shape your career matches. <a href="help.html#interests" target="_blank" rel="noopener">How it works</a></p>
  </div>
  ` : ''}
  ${step===0 && l.miniAssessment ? `
  <div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>You already told us you're drawn to <strong>${esc(miniAnswerLabel('interest', l.miniAssessment.answers.interest))}</strong> and enjoy <strong>${esc(miniAnswerLabel('activity', l.miniAssessment.answers.activity))}</strong> — this builds on that with a lot more detail, so no need to repeat yourself.</div></div>
  ` : ''}
  ${step===TOTAL_R ? `
  <div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>Nice progress — interest questions done. Just ${TOTAL_S} quick strength ratings to go.</div></div>
  ` : ''}
  <div class="aps-bar" style="margin-bottom:18px;"><div style="width:${pct}%"></div></div>
  <div class="card ${animClass}">
    <div class="qcard" style="margin-bottom:8px;">
      <div class="qn">${qLabel}</div>
      <div class="qt" style="font-size:19px;margin:10px 0 4px;">${esc(qText)}</div>
    </div>
    ${assessWidgetHTML(step, kind, value)}
    <div style="display:flex;gap:10px;margin-top:22px;justify-content:center;">
      ${step>0?`<button class="btn btn-ghost" onclick="App.assessBack()">Back</button>`:''}
      <button class="btn btn-primary" ${canContinue?'':'disabled'} onclick="App.assessNext()">Continue</button>
    </div>
  </div>`;
}
function paramLiteral(v){
  if(v==null) return 'null';
  if(typeof v==='object') return '{'+Object.entries(v).map(([k,val])=>`${k}:${paramLiteral(val)}`).join(',')+'}';
  return `'${String(v).replace(/'/g,"\\'")}'`;
}
// `origin` ({route, param}) is where the View button's Back button should
// return to -- defaults to Explore Careers when the caller doesn't know/
// care where it is (found in the pre-launch audit: every call site except
// the Report tabs omitted this, so Back always landed on Explore no
// matter where the learner actually came from -- Favourites, Matches,
// Home, Learner Profile, Assessment Results, a Cluster, the APS tool).
function careerRowHTML(career, score, l, category, origin){
  const fac = facultyById(career.faculty);
  const isFav = (l.favourites||[]).includes(career.id);
  const meta = category ? MATCH_CATEGORIES[category] : null;
  const label = meta ? {t:meta.label, c:meta.badge} : (score!=null ? matchLabel(score) : null);
  const target = { id: career.id, from: origin || { route:'explore' } };
  return `
  <div class="career-row">
    <div class="left">
      <div class="fac-dot" style="background:${fac.color}">${fac.tag}</div>
      <div style="min-width:0;">
        <h4>${esc(career.name)}</h4>
        <div class="sub">${fac.name}</div>
      </div>
    </div>
    <div class="right">
      ${label?`<span class="badge ${label.c}">${score}% · ${label.t}</span>`:''}
      <button class="btn btn-ghost btn-sm" title="${isFav?'Remove from favourites':'Save'}" onclick="App.toggleFav('${career.id}',event)">${icon('heart', isFav?'ic fav-on':'ic')}</button>
      <button class="btn btn-primary btn-sm" onclick="navigate('career',${paramLiteral(target)})">View</button>
    </div>
  </div>`;
}
const MATCH_GROUP_ORDER = [
  ['strong', 'Strong matches', 'Your interests, strengths and current academic performance all line up with these.'],
  ['academic', 'Academic strength matches', 'You’re already performing well in subjects these careers value, even if you hadn’t considered them yet.'],
  ['interest', 'Interest matches', 'You show strong interest here — your subjects or marks may need some development to fully back it up.'],
  ['possible', 'Possible pathways', 'Not a clear match yet on interest or academics — still genuinely worth exploring, especially this early on.'],
  ['low', 'Also worth browsing', 'Less aligned with your profile today, but never hidden — every career here is worth a look.'],
];
function viewMatches(){
  const l = ensureLearnerObj();
  const fac = ROUTE_PARAM || 'all';
  let matches = computeMatches(l);
  if(fac!=='all') matches = matches.filter(m=>m.career.faculty===fac);
  const grouped = l.assessmentCompletedAt;
  return `
  ${careersHeadHTML('matches', l.assessmentCompletedAt
      ? 'All ' + CAREERS.length + ' careers, grouped by how your interests, strengths, subjects and marks line up.'
      : 'Ordered by your subjects for now. <a href="#" onclick="navigate(\'assessment\');return false;">Take the personality assessment</a> to rank them by your interests and strengths too.')}
  <div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>A match score reflects <b>fit</b> with your interests, strengths, subjects and marks — it is not a guarantee of admission. Meeting a programme’s minimum requirements doesn’t guarantee acceptance, especially for competitive programmes — always confirm on the institution’s own site.</div></div>
  <div class="filter-bar">
    <button class="chip-select ${fac==='all'?'on':''}" onclick="navigate('matches','all')">All faculties</button>
    ${FACULTIES.map(f=>`<button class="chip-select ${fac===f.id?'on':''}" onclick="navigate('matches','${f.id}')">${f.name}</button>`).join('')}
  </div>
  ${grouped
    ? MATCH_GROUP_ORDER.map(([key,title,sub])=>{
        const list = matches.filter(m=>m.category===key);
        if(!list.length) return '';
        return `<div class="section-title"><h2>${title}</h2></div><p class="page-sub" style="margin-top:-10px;margin-bottom:12px;">${sub}</p>${list.map(m=>careerRowHTML(m.career,m.score,l,m.category,{route:'matches', param:fac})).join('')}`;
      }).join('')
    : matches.map(m=>careerRowHTML(m.career,m.score,l,null,{route:'matches', param:fac})).join('')}
  `;
}
function viewExplore(){
  const l = ensureLearnerObj();
  const fac = ROUTE_PARAM && typeof ROUTE_PARAM==='object' ? ROUTE_PARAM.fac : (ROUTE_PARAM||'all');
  return `
  ${careersHeadHTML('explore', 'Browse all ' + CAREERS.length + ' careers.')}
  ${fac==='all' && !EXPLORE_SEARCH ? dsDiscoverHTML(l) : ''}
  <button class="btn btn-ghost btn-sm" style="margin-bottom:14px;" onclick="navigate('clusters')">${icon('layers')} Not sure where to start? Browse by career cluster instead</button>
  <div class="filter-bar">
    <button class="chip-select ${fac==='all'?'on':''}" onclick="navigate('explore','all')">All faculties</button>
    ${FACULTIES.map(f=>`<button class="chip-select ${fac===f.id?'on':''}" onclick="navigate('explore','${f.id}')">${f.name}</button>`).join('')}
    <input type="text" id="exploreSearch" placeholder="Search careers by name…" value="${esc(EXPLORE_SEARCH)}" oninput="App.filterExplore(this.value)"/>
  </div>
  <div class="filter-bar">
    <select style="width:auto;min-width:170px;" onchange="App.setExploreFilter('pathway',this.value)">
      <option value="">Any pathway type</option>
      ${PATHWAY_TYPES.map(t=>`<option value="${esc(t)}" ${EXPLORE_FILTERS.pathway===t?'selected':''}>${esc(t)}</option>`).join('')}
    </select>
    <button class="chip-select ${EXPLORE_FILTERS.mathRequired?'on':''}" onclick="App.toggleExploreFilter('mathRequired')">Maths required</button>
    <button class="chip-select ${EXPLORE_FILTERS.mathLitOk?'on':''}" onclick="App.toggleExploreFilter('mathLitOk')">Maths Lit accepted</button>
    <button class="chip-select ${EXPLORE_FILTERS.physSciRequired?'on':''}" onclick="App.toggleExploreFilter('physSciRequired')">Physical Sciences required</button>
    <button class="chip-select ${EXPLORE_FILTERS.uot?'on':''}" onclick="App.toggleExploreFilter('uot')">University of Technology option</button>
    ${(EXPLORE_FILTERS.pathway||EXPLORE_FILTERS.mathRequired||EXPLORE_FILTERS.mathLitOk||EXPLORE_FILTERS.physSciRequired||EXPLORE_FILTERS.uot) ? `<button class="btn btn-ghost btn-sm" onclick="App.clearExploreFilters()">${icon('close')} Clear filters</button>` : ''}
  </div>
  <div id="exploreResults">${exploreResultsHTML(fac, l)}</div>
  `;
}
function viewClusters(){
  return `
  ${pageHeadHTML('Explore career clusters', 'Twenty broad fields of work — a different way to browse than by faculty, useful if you don’t know where to start.')}
  <div class="grid grid-3">
    ${CLUSTERS.map(cl=>`
      <button class="tile" style="border-top-color:var(--indigo);" onclick="navigate('cluster','${cl.id}')">
        <h3 style="font-size:15px;">${esc(cl.name)}</h3>
        <p style="font-size:12.5px;">${esc(cl.overview)}</p>
      </button>`).join('')}
  </div>
  `;
}
function viewClusterDetail(id){
  const cl = clusterById(id);
  const l = ensureLearnerObj();
  if(!cl) return `${pageHeadHTML('Cluster not found')}<div class="empty-state">${icon('search')}<p>That cluster couldn’t be found.</p></div>`;
  const careers = cl.exampleCareerIds.map(cid=>CAREERS.find(c=>c.id===cid)).filter(Boolean);
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:16px;" onclick="navigate('clusters')">${icon('chevron')} Back</button>
  ${pageHeadHTML(cl.name, cl.overview)}
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Common interests</h3>
      <div class="pill-list">${cl.commonInterests.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>
    </div>
    <div class="card">
      <h3>Useful school subjects</h3>
      <div class="pill-list">${cl.usefulSubjects.map(x=>`<span class="pill rec">${esc(x)}</span>`).join('')}</div>
    </div>
  </div>
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Typical study routes</h3>
      <ul>${cl.studyRoutes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3>Qualification options</h3>
      <ul>${cl.qualificationOptions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    </div>
  </div>
  <div class="section-title"><h2>Example careers</h2></div>
  ${careers.map(c=>careerRowHTML(c,null,l,null,{route:'cluster',param:id})).join('')}
  `;
}
function exploreResultsHTML(fac, l){
  let list = CAREERS.slice();
  if(fac && fac!=='all') list = list.filter(c=>c.faculty===fac);
  const f = EXPLORE_FILTERS;
  if(f.pathway) list = list.filter(c=>c.pathways.some(p=>p.type===f.pathway));
  if(f.mathRequired) list = list.filter(c=>c.requiredSubjects.includes('Mathematics'));
  if(f.mathLitOk) list = list.filter(c=>!c.requiredSubjects.includes('Mathematics'));
  if(f.physSciRequired) list = list.filter(c=>c.requiredSubjects.includes('Physical Sciences'));
  if(f.uot) list = list.filter(c=>(c.institutions.utech||[]).length>0);
  const q = EXPLORE_SEARCH.trim().toLowerCase();
  if(q) list = list.filter(c=>c.name.toLowerCase().includes(q) || c.blurb.toLowerCase().includes(q) || c.applicationNotes.toLowerCase().includes(q));
  if(!list.length) return `<div class="empty-state">${icon('search')}<p>No careers match ${q?`“${esc(EXPLORE_SEARCH)}”`:'these filters'}.</p><button class="btn btn-ghost btn-sm" onclick="App.clearExploreFilters()">Clear filters</button></div>`;
  return list.map(c=>careerRowHTML(c,null,l,null,{route:'explore', param:fac})).join('');
}

function viewCareerDetail(param){
  // Accepts a plain id (a bare career id, falls back to Explore Careers)
  // or {id, from:{route, param}} -- every careerRowHTML row and the
  // Report tabs' own "View Career" links pass the real origin now, so
  // Back returns to wherever the visit actually came from (found
  // defaulting to Explore for every non-Report origin in the pre-launch
  // audit -- Favourites, Matches, Home, Profile, Assessment, a Cluster,
  // the APS tool).
  const id = (param && typeof param==='object') ? param.id : param;
  const from = (param && typeof param==='object' && param.from) ? param.from : { route:'explore' };
  const career = CAREERS.find(c=>c.id===id);
  const l = ensureLearnerObj();
  if(!career) return `${pageHeadHTML('Career not found')}<div class="empty-state">${icon('search')}<p>That career couldn\u2019t be found.</p></div>`;
  const fac = facultyById(career.faculty);
  const ev = evaluateCareer(l, career);
  const score = ev.score;
  const meta = ev.category ? MATCH_CATEGORIES[ev.category] : null;
  const label = meta ? {t:meta.label, c:meta.badge} : matchLabel(score);
  const isFav = (l.favourites||[]).includes(career.id);
  const inCompare = (l.compare||[]).includes(career.id);
  const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(career.videoQuery);
  dsMarkViewed(career.id);
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:16px;" onclick="navigate(${paramLiteral(from.route)}${from.param!=null?`,${paramLiteral(from.param)}`:''})">${icon('chevron')} Back</button>
  <div class="detail-hero" style="background:linear-gradient(135deg, ${fac.color}, #14172A);">
    <span class="badge badge-faculty" style="background:rgba(255,255,255,.18);">${fac.name}</span>
    <h1>${esc(career.name)}</h1>
    <p>${esc(career.blurb)}</p>
    <span class="badge ${label.c}" style="background:rgba(255,255,255,.9);">${score}% · ${label.t} for you</span>
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Why this may (or may not) suit you</h3>
    ${dsFitMetersHTML(l, ev)}
    ${careerExplanationHTML(l, career, ev)}
  </div>

  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>A day in the life</h3>
      <p>${esc(career.dayInLife)}</p>
    </div>
    <div class="card">
      <h3>Required, recommended & related NSC subjects</h3>
      <div class="pill-list">
        ${career.requiredSubjects.map(s=>`<span class="pill req">${esc(s)} (required)</span>`).join('')}
        ${career.recommendedSubjects.map(s=>`<span class="pill rec">${esc(s)} (recommended)</span>`).join('')}
        ${(career.relatedSubjects||[]).map(s=>`<span class="pill">${esc(s)} (related)</span>`).join('')}
      </div>
      ${!career.requiredSubjects.length ? `<p class="page-sub" style="margin-top:8px;">No specific NSC subject is a strict requirement for this pathway — check individual programme/employer requirements.</p>` : ''}
    </div>
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Recommended marks</h3>
    ${career.recommendedMarks.map(m=>`<div class="kv"><b>${esc(m.subject)}</b><span>${m.pct}%+ recommended</span></div>`).join('')}
    <h3 style="margin-top:16px;">APS guidance</h3>
    <div class="kv"><b>Typical APS range</b><span>${career.apsGuidance.typical}</span></div>
    <p class="page-sub">${esc(career.apsGuidance.note)}</p>
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Qualification pathways</h3>
    ${career.pathways.map(p=>`<div class="kv"><b>${p.type}</b><span>${esc(p.qualification)} — ${esc(p.duration)}</span></div>`).join('')}
  </div>

  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Universities commonly offering this</h3>
      <div class="pill-list">${career.institutions.universities.map(u=>`<span class="tag">${esc(u)}</span>`).join('') || '<span class="page-sub">See TVET note.</span>'}</div>
      ${career.institutions.utech.length?`<h4 style="margin-top:14px;">Universities of Technology</h4><div class="pill-list">${career.institutions.utech.map(u=>`<span class="tag">${esc(u)}</span>`).join('')}</div>`:''}
    </div>
    <div class="card">
      <h3>TVET college route</h3>
      <p class="page-sub">${career.institutions.tvet ? TVET_NOTE : 'This career pathway is primarily university-based, though bridging certificates may exist at some TVET colleges.'}</p>
    </div>
  </div>

  ${courseLinksSectionHTML(career.id)}

  <div class="card" style="margin-bottom:18px;">
    <h3>Application requirements</h3>
    <p>${esc(career.applicationNotes)}</p>
    ${disclaimerHTML()}
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Videos & resources</h3>
    <div class="pill-list">
      <a class="btn btn-ghost btn-sm" href="${ytUrl}" target="_blank" rel="noopener">${icon('search')} Search career videos</a>
      <a class="btn btn-ghost btn-sm" href="https://www.dhet.gov.za" target="_blank" rel="noopener">${icon('building')} Dept. of Higher Education & Training</a>
      <a class="btn btn-ghost btn-sm" href="https://www.nsfas.org.za" target="_blank" rel="noopener">${icon('coin')} NSFAS funding info</a>
    </div>
  </div>

  ${(()=>{ const related = relatedCareersFor(career); return related.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Related careers</h3>
    <div class="pill-list">${related.map(c=>`<button class="tag" style="cursor:pointer;border:0;font:inherit;" onclick="navigate('career',${paramLiteral({ id:c.id, from:from })})">${esc(c.name)}</button>`).join('')}</div>
  </div>` : ''; })()}

  <div style="display:flex;gap:10px;">
    <button class="btn ${isFav?'btn-primary':'btn-ghost'}" onclick="App.toggleFav('${career.id}')">${icon('heart')} ${isFav?'Saved':'Save career'}</button>
    <button class="btn ${inCompare?'btn-primary':'btn-ghost'}" onclick="App.toggleCompare('${career.id}')">${icon('layers')} ${inCompare?'In compare':'Add to compare'}</button>
  </div>
  `;
}

/* ---------------- APS Calculator ---------------- */
function ensureApsDraft(){
  const l = ensureLearnerObj();
  if(!APS_DRAFT){
    const maths = l.mathType==='MathLit' ? 'Mathematical Literacy' : 'Mathematics';
    const marks = {};
    // A school learner starts from the marks saved on My Marks (so nothing is
    // typed twice); otherwise from their last calculation, or a blank list.
    // Plain &&-guards, not ?./?? -- no build step, so modern syntax would
    // stop this file parsing on older browsers.
    const saved = (!l.exploringOnly && Number(l.grade) > 9) ? pwCurrentMarks(l) : null;
    const priorMarks = (saved && saved.source !== 'none') ? saved.marks : (l.apsLast && l.apsLast.marksMap);
    const subjectsList = priorMarks ? Object.keys(priorMarks)
      : [...new Set(['Life Orientation', maths, 'Home Language', 'First Additional Language', ...(l.subjects||[])])].slice(0,7);
    subjectsList.forEach(s=> marks[s] = (priorMarks && priorMarks[s]!=null) ? priorMarks[s] : '');
    APS_DRAFT = { subjects: subjectsList, marks, extra:'' };
    APS_DRAFT.__base = JSON.stringify(APS_DRAFT); // see draftTouched()
  }
  return APS_DRAFT;
}
function viewAPS(){
  const d = ensureApsDraft();
  const l = ensureLearnerObj();
  const result = l.apsLast && l.apsLast.aps!=null ? l.apsLast : null;
  return `
  ${!l.exploringOnly && Number(l.grade) > 9 ? `<button class="btn btn-ghost btn-sm" style="margin-bottom:12px;" onclick="navigate('marks')">${icon('chevron')} Back to My Marks</button>` : ''}
  ${pageHeadHTML(!l.exploringOnly && Number(l.grade) > 9 ? 'Try different marks' : 'APS Calculator', !l.exploringOnly && Number(l.grade) > 9 ? 'See how your APS changes if your marks change. Your saved marks stay as they are.' : 'Estimate your Admission Point Score from the National Senior Certificate 7-point scale.')}
  <p class="page-sub">Your APS out of 42, using the common "best 6 subjects, excluding Life Orientation" method most South African universities start from. Every university has its own exact rules, so always confirm on their official calculator too.</p>
  <div class="card" style="margin-bottom:18px;">
    <h3>Enter your subject marks (%)</h3>
    ${d.subjects.map((s,i)=>`
      <div class="form-row" style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;">${esc(s)}</div>
        <input type="number" min="0" max="100" style="width:100px;" value="${d.marks[s]}" onchange="App.apsSetMark('${s.replace(/'/g,"\\'")}', this.value)"/>
        <button class="btn btn-ghost btn-sm" onclick="App.apsRemoveSubject('${s.replace(/'/g,"\\'")}')">${icon('close')}</button>
      </div>`).join('')}
    <div class="form-row" style="display:flex;gap:10px;">
      <select id="apsAddSelect" style="flex:1;">
        <option value="">Add another subject…</option>
        ${SA_SUBJECTS.filter(s=>!d.subjects.includes(s)).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="App.apsAddSubject()">${icon('plus')} Add</button>
    </div>
    <button class="btn btn-primary" style="margin-top:8px;" onclick="App.apsCompute()">Calculate my APS</button>
  </div>
  ${result ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your estimated APS: <span style="color:var(--link);">${result.aps} / 42</span></h3>
    <div class="aps-bar" style="margin:10px 0 16px;"><div style="width:${Math.round(result.aps/42*100)}%"></div></div>
    <div class="table-wrap"><table><thead><tr><th>Subject</th><th>%</th><th>NSC Level</th><th>Counted?</th></tr></thead><tbody>
      ${result.rows.sort((a,b)=>b.level-a.level).map(r=>`<tr><td>${esc(r.subject)}</td><td>${r.pct}%</td><td>${r.level}</td><td>${r.subject!=='Life Orientation'?'Yes':'Excluded from most APS totals'}</td></tr>`).join('')}
    </tbody></table></div>
    ${disclaimerHTML('This APS uses the common "best 6 subjects excluding Life Orientation" method. Some universities include Life Orientation at reduced weight, use an 8-subject total, or run their own points scale (often out of a different maximum) — always confirm on the specific university\u2019s official APS/points calculator.')}
    <h4 style="margin-top:16px;">Careers your APS estimate may support</h4>
    ${CAREERS.filter(c=>{
      const lo = parseInt(c.apsGuidance.typical); return !isNaN(lo) && result.aps >= lo-4;
    }).slice(0,6).map(c=>careerRowHTML(c,null,l,null,{route:'aps'})).join('') || '<p class="page-sub">Add more subject marks to see suggestions.</p>'}
  </div>` : ''}
  `;
}

/* ---------------- Careers: tabs, saved careers and compare ---------------- */
const CAREER_TABS = [['matches','Best matches'], ['explore','All careers'], ['favourites','Saved']];
function careersHeadHTML(active, sub){
  const l = ensureLearnerObj();
  const n = (l.favourites||[]).length;
  return `${pageHeadHTML('Careers', sub)}
  <div class="filter-bar tabs-bar" role="tablist" aria-label="Careers">
    ${CAREER_TABS.map(t=>`<button class="chip-select ${active===t[0]?'on':''}" role="tab" aria-selected="${active===t[0]}" onclick="navigate('${t[0]}')">${t[1]}${t[0]==='favourites' && n ? ' (' + n + ')' : ''}</button>`).join('')}
  </div>
  ${dsTrailHTML()}`;
}
// Saved careers, with up to three of them side by side.
function viewSaved(){
  const l = ensureLearnerObj();
  const favs = (l.favourites||[]).map(id=>CAREERS.find(c=>c.id===id)).filter(Boolean);
  const cmp = (l.compare||[]).map(id=>CAREERS.find(c=>c.id===id)).filter(Boolean);
  return `
  ${careersHeadHTML('favourites', 'Careers you\u2019ve saved. Tick up to three to compare them side by side.')}
  ${favs.length ? favs.map(c=>{
      const ev = evaluateCareer(l,c), on = (l.compare||[]).includes(c.id);
      return `<div class="saved-row">${careerRowHTML(c, ev.score, l, ev.category, {route:'favourites'})}
        <label class="saved-compare"><input type="checkbox" ${on?'checked':''} onchange="App.toggleCompare('${c.id}')"/> Compare</label></div>`;
    }).join('')
    : `<div class="empty-state">${icon('heart')}<p>No saved careers yet. Tap the heart on any career to save it here.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="navigate('matches')">See your best matches</button></div>`}
  ${cmp.length ? compareTableHTML(l, cmp) : (favs.length > 1 ? '<p class="page-sub" style="margin-top:12px;">Tick two or three careers above to compare them.</p>' : '')}
  `;
}
function compareTableHTML(l, items){
  const rows = [
    ['Faculty', c=>facultyById(c.faculty).name],
    ['Required subjects', c=>[...c.requiredSubjects.map(s=>s+' (required)'), ...c.recommendedSubjects.map(s=>s+' (recommended)')].join(', ') || '\u2014'],
    ['Typical APS', c=>c.apsGuidance.typical],
    ['Main qualification', c=>c.pathways[0].qualification+' \u2014 '+c.pathways[0].duration],
    ['TVET route?', c=>c.institutions.tvet?'Yes':'Mainly university'],
    ['Your match score', c=>scoreCareer(l,c)+'%'],
  ];
  return `
  <div class="section-title"><h2>Side by side</h2></div>
  <div class="table-wrap"><table>
    <thead><tr><th></th>${items.map(c=>`<th>${esc(c.name)} <button class="btn btn-ghost btn-sm" aria-label="Remove ${esc(c.name)} from compare" onclick="App.toggleCompare('${c.id}')">${icon('close')}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label,fn])=>`<tr><td><b>${label}</b></td>${items.map(c=>`<td>${esc(fn(c))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

/* ---------------- Assessments ---------------- */
// Where every assessment is started, continued or retaken. Results live in
// My Report, so this page only says where each one stands.
function viewAssessments(){
  const l = ensureLearnerObj();
  const info = personalityTypeInfo(l);
  const inProgress = !l.assessmentCompletedAt && ASSESSMENT_DRAFT && (ASSESSMENT_DRAFT.step > 0);
  const scOn = subjectChoiceAvailable(l);
  const scDone = !!(l.subjectChoice && l.subjectChoice.completedAt);
  const scStarted = !scDone && SUBJECT_CHOICE_DRAFT && SUBJECT_CHOICE_DRAFT.step > 0;
  return `
  ${pageHeadHTML('Assessments', 'Short question sets about you. Your results appear in My Report.')}
  <div class="grid grid-2">
    <div class="card">
      <span class="badge ${l.assessmentCompletedAt ? 'badge-strong' : 'badge-good'}">${l.assessmentCompletedAt ? 'Done' : (inProgress ? 'In progress' : 'Not started')}</span>
      <h3 style="margin-top:10px;">Personality Assessment</h3>
      <p class="page-sub">${RIASEC_QUESTIONS.length + STRENGTH_KEYS.length} questions about what you enjoy and what you\u2019re good at. It shapes your career matches and your report.</p>
      ${info ? `<p style="margin:0 0 12px;">Your personality type: <b>${esc(info.code)}</b> \u2014 ${esc(info.top.map(d=>d.name).join(' and '))}.</p>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${l.assessmentCompletedAt
          ? `<button class="btn btn-primary" onclick="navigate('report')">See my results</button><button class="btn btn-ghost" onclick="App.assessRetake();navigate('assessment')">Retake</button>`
          : `<button class="btn btn-primary" onclick="navigate('assessment')">${inProgress ? 'Continue' : 'Start'}</button>`}
      </div>
    </div>
    ${scOn ? `<div class="card">
      <span class="badge ${scDone ? 'badge-strong' : 'badge-good'}">${scDone ? 'Done' : (scStarted ? 'In progress' : 'Not started')}</span>
      <h3 style="margin-top:10px;">Subject Choice Assessment</h3>
      <p class="page-sub">For choosing your Grade 10 subjects: what you enjoy, how you work and how you\u2019re doing in each subject.</p>
      ${isGrade9Learner(l) && !l.grade9Report && !scDone ? `<p class="page-sub">Add your <a href="#" onclick="navigate('marks');return false;">Grade 9 report results</a> first, so it can use your marks.</p>` : ''}
      <button class="btn ${scDone ? 'btn-primary' : 'btn-primary'}" onclick="navigate('subject-choice')">${scDone ? 'See my subject report' : (scStarted ? 'Continue' : 'Start')}</button>
    </div>` : ''}
  </div>`;
}

/* ---------------- My Marks ---------------- */
// The one place a learner enters marks: the Grade 9 report form for Grade 9,
// term marks (with the APS from them) for Grade 10-12, and the APS
// calculator for someone exploring without a school.
function viewMarks(){
  const l = ensureLearnerObj();
  if(l.exploringOnly) return viewAPS();
  if(isGrade9Learner(l)) return viewGrade9Report();
  return viewTermMarks();
}

/* ---------------- Account ---------------- */
// Everything about the learner's account in one place: details, school and
// subjects, class, licence and plan, email, password. Each card keeps its
// own button because each saves differently (details at once, email only
// after confirmation, password needs the current one).
function viewAccount(){
  const l = ensureLearnerObj();
  const cls = CLASSES.find(c=>c.id===l.classId);
  const maths = l.mathType==='Mathematics' ? 'Mathematics' : (l.mathType==='MathLit' ? 'Mathematical Literacy' : null);
  const pro = l.plan === 'pro';
  return `
  ${pageHeadHTML('Account', 'Your details, school, class and plan.')}
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Your details</h3>
      <div class="form-row"><label for="myName">Name</label><input type="text" id="myName" value="${esc(ME.name||'')}"/></div>
      <div class="form-row"><label for="myCell">Cell number (optional)</label><input type="tel" id="myCell" placeholder="e.g. 082 123 4567" value="${esc(l.cellNumber||'')}"/></div>
      <button class="btn btn-primary" onclick="App.saveMyDetails()">Save details</button>
    </div>
    <div class="card">
      <h3>School</h3>
      ${l.exploringOnly
        ? `<p class="page-sub">You\u2019re using Iroli to explore, without a school.</p>
           <button class="btn btn-ghost" onclick="navigate('profile')">Add my school</button>`
        : `<div class="kv"><b>Grade</b><span>${esc(l.grade || '\u2014')}${l.gradeYear ? ' (' + esc(l.gradeYear) + ')' : ''}</span></div>
           <div class="kv"><b>School</b><span>${esc(l.school || '\u2014')}</span></div>
           ${Number(l.grade) > 9 ? `<div class="kv"><b>Maths</b><span>${esc(maths || 'Not chosen')}</span></div>
           <div class="kv"><b>Other subjects</b><span>${esc((l.subjects||[]).join(', ') || 'None chosen')}</span></div>` : ''}
           <button class="btn btn-ghost" style="margin-top:8px;" onclick="navigate('profile')">${icon('edit')} Edit school details</button>`}
    </div>
  </div>
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Class</h3>
      ${cls ? `
        <p style="margin-bottom:4px;"><b>${esc(cls.name)}</b></p>
        <div class="page-sub" style="margin-bottom:14px;">Class code: <span class="class-code">${esc(cls.code)}</span></div>
        ${PREVIEW_MODE ? '' : `<button class="btn btn-ghost btn-sm" onclick="App.leaveClass()">Leave class</button>`}
      ` : (PREVIEW_MODE ? `
        <p class="page-sub">Joining a class is switched off while you preview, so no real class seat is used.</p>
      ` : `
        <p class="page-sub">Ask your teacher or Iroli admin for your class code.</p>
        <div class="form-row"><label for="joinCode" class="sr-only">Class code</label><input type="text" id="joinCode" placeholder="e.g. 7F3KQ" style="text-transform:uppercase;"/></div>
        <button class="btn btn-primary" onclick="App.joinClass()">Join class</button>
      `)}
    </div>
    <div class="card">
      <h3>Licence and plan</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span class="badge ${l.licenseStatus==='active'?'badge-strong':'badge-good'}">${l.licenseStatus==='active'?'Active licence':'Trial access'}</span>
        <span class="badge badge-good">${pro ? 'Pro plan' : 'Standard plan'}</span>
      </div>
      <p class="page-sub" style="margin-top:12px;">${l.licenseStatus==='active'
        ? '' : 'Join your class with your school\u2019s class code.'}
        <a href="pricing.html" target="_blank" rel="noopener">See pricing</a></p>
    </div>
  </div>
  <div class="grid grid-2">
    <div class="card">
      <h3>Email address</h3>
      <p class="page-sub">Current: <b>${esc(ME.email||'')}</b></p>
      <div class="form-row"><label for="myEmail">New email</label><input type="email" id="myEmail" placeholder="new@example.com"/></div>
      <button class="btn btn-primary" onclick="App.changeEmail()">Update email</button>
      <p class="page-sub" style="margin-top:10px;margin-bottom:0;">We\u2019ll send a confirmation link to your new address. The change only happens once you click it.</p>
    </div>
    <div class="card">
      <h3>Change password</h3>
      <div class="form-row"><label for="curPass">Current password</label><input type="password" id="curPass" placeholder="Your current password"/></div>
      <div class="form-row"><label for="newPass1">New password</label><input type="password" id="newPass1" placeholder="At least 6 characters"/></div>
      <div class="form-row"><label for="newPass2">Confirm new password</label><input type="password" id="newPass2" placeholder="Re-enter your new password"/></div>
      <button class="btn btn-primary" onclick="App.changePassword()">Update password</button>
    </div>
  </div>
  `;
}

// Forced landing screen for any learner past onboarding whose
// licenseStatus isn't 'active' yet (see learnerGate() and render())
// -- offers both activation paths side by side: joining a class (the
// code itself is the payment proof, see join_class_by_code()) or
// individual activation via the super admin, matching pricing.html's own
// "Contact us to activate" pattern exactly.
// What each welcome-screen card opens, for the activation screen's wording.
const ACTIVATE_WANTED_LABELS = { assessment:'the Personality Assessment', matches:'Career Matching', explore:'Explore Careers', marks:'the APS Calculator' };
function viewActivateAccount(){
  const firstName = (ME.name||'there').split(' ')[0];
  const wanted = ACTIVATE_WANTED && ACTIVATE_WANTED_LABELS[ACTIVATE_WANTED];
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:12px;" onclick="navigate('onboarding')">${icon('chevron')} Back to the start</button>
  ${pageHeadHTML('Activate your account')}
  <div class="card" style="margin-bottom:20px;">
    <h3>Hi ${esc(firstName)}, you're almost ready</h3>
    <p class="page-sub" style="margin:0;">${wanted ? 'To open ' + esc(wanted) + ', activate your account first.' : 'Access to the assessments, career matches and your full report needs an active licence first.'} There are two ways to get activated:</p>
  </div>
  <div class="grid grid-2">
    <div class="card">
      <h3>Have a class code?</h3>
      <p class="page-sub">Enter the class code from your school.</p>
      <div class="form-row"><input type="text" id="joinCode" placeholder="e.g. 7F3KQ" style="text-transform:uppercase;"/></div>
      <button class="btn btn-primary" style="width:100%;" onclick="App.joinClass()">Join class</button>
    </div>
    <div class="card">
      <h3>No class code?</h3>
      <p class="page-sub">Individual access is available too \u2014 see <a href="pricing.html" target="_blank" rel="noopener">pricing</a>, then contact us to activate your account.</p>
      <a href="mailto:info@iroli.co.za?subject=Iroli%20Career%20Pathway%20-%20Activate%20my%20account&body=My%20account%20email%3A%20${encodeURIComponent(ME.email||'')}" class="btn btn-ghost" style="width:100%;text-align:center;">Contact us to activate</a>
    </div>
  </div>
  <p class="page-sub" style="text-align:center;margin-top:18px;">Already activated? <a href="#" onclick="recheckActivation(true);return false;">Check again</a></p>
  `;
}
