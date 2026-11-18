/* ============================================================
   GRADE 11-12 PATHWAY: the logic (no screens here; see views_pathway.js)

   Compares a learner's term marks with the entry requirements of the
   programmes they saved (a snapshot of courseRequirements) and with their
   bursary goal. Pure functions over plain data, so they can be tested in
   Node with every one of the 1,410 real programmes.

   How the programme data is written (owner-supplied, 2026 cycle):
   subjectRequirements = { "English HL": 5, "English FAL": 5,
                           "Mathematics": 5, "Mathematics Literacy": 7, ... }
   The value is an NSC level (1-7; a few rows say 6.5). Keys that are
   different forms of the same requirement are ALTERNATIVES:
     - language: English HL / FAL / SAL, Afrikaans FAL, Home Language (any),
       Second Additional Language (any)
     - Mathematics / Mathematics Literacy / Technical Mathematics
     - Physical Sciences / Technical Sciences
   Any other subject is required on its own -- unless a row lists more
   elective subjects than a learner can take (31 rows list 4-12, e.g. every
   commerce and humanities subject), which can only mean "these subjects
   count", so those are shown as a list to check, never as all required.

   Wording rule for everything built from this: "currently meeting the
   academic minimum requirements", never a promise of a place.
   ============================================================ */

const PW_LANGUAGES = ['English','Afrikaans','isiZulu','isiXhosa','isiNdebele','Sepedi (Sesotho sa Leboa)','Sesotho','Setswana','siSwati','Tshivenda','Xitsonga'];
const PW_TERMS = ['1','2','3','4'];
const PW_MAX_GOALS = 3;
// The NSC level boundaries as percentages (see NSC_LEVELS in data.js).
const PW_LEVEL_MIN = { 1:0, 2:30, 3:40, 4:50, 5:60, 6:70, 7:80 };
// A learner takes three electives besides languages, Maths and LO; a row that
// lists more than this many is a list of subjects that count, not all of them.
const PW_MAX_ELECTIVES = 3;

const PW_LANG_KEYS = ['English HL','English FAL','English SAL','Afrikaans FAL','Home Language (any)','Second Additional Language (any)'];
const PW_MATH_KEYS = ['Mathematics','Mathematics Literacy','Technical Mathematics'];
const PW_SCI_KEYS = ['Physical Sciences','Technical Sciences'];
// Programme-data subject names that differ from the names learners pick.
const PW_SUBJECT_ALIASES = {
  'LO': ['Life Orientation'],
  'Mathematics Literacy': ['Mathematical Literacy'],
  'Consumer Studies and Hospitality': ['Consumer Studies','Hospitality Studies'],
  'Technology': ['Civil Technology','Electrical Technology','Mechanical Technology'],
};

// Minimum percentage for an NSC level; 6.5 reads as 75%.
function pwLevelMinPct(level){
  const lv = Number(level);
  if(!(lv >= 1)) return 0;
  const base = Math.min(7, Math.floor(lv));
  return Math.round(PW_LEVEL_MIN[base] + (lv - base) * 10);
}
function pwLevelOf(pct){ return nscLevel(pct); }
function pwIsWholeLevel(level){ return Number(level) % 1 === 0; }

/* ---------- the learner's subjects and marks ---------- */

// Every subject the learner takes, by the keys their marks are saved under
// (the same keys as subjectMarks: 'Mathematics' or 'Mathematical Literacy',
// 'Home Language', 'First Additional Language', 'Life Orientation', and their
// electives).
function pwLearnerSubjects(l){
  if(!l) return [];
  const out = [];
  out.push(l.mathType === 'MathLit' ? 'Mathematical Literacy' : 'Mathematics');
  out.push('Home Language', 'First Additional Language', 'Life Orientation');
  (l.subjects || []).forEach(function(s){ if(out.indexOf(s) < 0) out.push(s); });
  return out;
}
function pwSubjectLabel(l, key){
  const langs = (l && l.pathway && l.pathway.languages) || {};
  if(key === 'Home Language') return langs.home ? langs.home + ' Home Language' : 'Home Language';
  if(key === 'First Additional Language') return langs.fal ? langs.fal + ' First Additional Language' : 'First Additional Language';
  return key;
}

// All saved terms, oldest first: [{ year, grade, term, marks:{key:pct} }].
// Only terms with at least one mark count.
function pwTermEntries(l){
  const tm = (l && l.termMarks) || {};
  const out = [];
  Object.keys(tm).sort().forEach(function(year){
    const y = tm[year] || {};
    const terms = y.terms || {};
    PW_TERMS.forEach(function(t){
      const marks = terms[t] || {};
      const clean = {};
      Object.keys(marks).forEach(function(k){
        const v = marks[k];
        if(v !== null && v !== '' && v !== undefined && !isNaN(Number(v))) clean[k] = clamp(Number(v), 0, 100);
      });
      if(Object.keys(clean).length) out.push({ year: Number(year), grade: y.grade || null, term: t, marks: clean });
    });
  });
  return out;
}
function pwLatestEntry(l){ const e = pwTermEntries(l); return e.length ? e[e.length - 1] : null; }
function pwPreviousEntry(l){ const e = pwTermEntries(l); return e.length > 1 ? e[e.length - 2] : null; }
function pwEntryLabel(e){ return e ? ((e.grade ? 'Grade ' + e.grade + ', ' : '') + 'Term ' + e.term + ' ' + e.year) : ''; }
// The marks the comparison uses: the latest term, falling back to the
// profile's latest marks (subjectMarks) when no term has been entered yet.
function pwCurrentMarks(l){
  const e = pwLatestEntry(l);
  if(e) return { marks: e.marks, source: 'term', entry: e };
  const sm = (l && l.subjectMarks) || {};
  const marks = {};
  Object.keys(sm).forEach(function(k){ if(sm[k] && sm[k].pct != null && sm[k].pct !== '') marks[k] = clamp(Number(sm[k].pct), 0, 100); });
  return { marks: marks, source: Object.keys(marks).length ? 'profile' : 'none', entry: null };
}

/* ---------- reading one requirement against the learner ---------- */

// Which of the learner's subject keys can meet a programme-data key, and
// whether we know enough to say. Returns { key, unknownLanguage, unsupported }.
function pwMatchKey(l, reqKey){
  const taken = pwLearnerSubjects(l);
  const langs = (l && l.pathway && l.pathway.languages) || {};
  function lang(which, language){
    const chosen = langs[which];
    if(!chosen) return { key: null, unknownLanguage: true };
    return { key: chosen === language ? (which === 'home' ? 'Home Language' : 'First Additional Language') : null };
  }
  switch(reqKey){
    case 'English HL': return lang('home', 'English');
    case 'English FAL': {
      // English as a Home Language meets an English First Additional Language requirement.
      const hl = lang('home', 'English'); if(hl.key) return hl;
      const fal = lang('fal', 'English');
      return { key: fal.key, unknownLanguage: hl.unknownLanguage || fal.unknownLanguage };
    }
    case 'Afrikaans FAL': {
      const hl = lang('home', 'Afrikaans'); if(hl.key) return hl;
      const fal = lang('fal', 'Afrikaans');
      return { key: fal.key, unknownLanguage: hl.unknownLanguage || fal.unknownLanguage };
    }
    case 'Home Language (any)': return { key: 'Home Language' };
    // Iroli does not record second additional languages.
    case 'English SAL': case 'Second Additional Language (any)': return { key: null, unsupported: true };
  }
  const names = PW_SUBJECT_ALIASES[reqKey] || [reqKey];
  for(let i = 0; i < names.length; i++){ if(taken.indexOf(names[i]) >= 0) return { key: names[i] }; }
  return { key: null };
}

// Splits a programme's subjectRequirements into requirement groups:
// [{ id, label, kind:'language'|'maths'|'science'|'subject'|'options', options:[{reqKey, level}] }]
function pwRequirementGroups(subjectRequirements){
  const req = subjectRequirements || {};
  const keys = Object.keys(req).filter(function(k){ return Number(req[k]) > 0; });
  const groups = [];
  function opts(list){ return list.filter(function(k){ return keys.indexOf(k) >= 0; }).map(function(k){ return { reqKey: k, level: Number(req[k]) }; }); }
  const lang = opts(PW_LANG_KEYS);
  if(lang.length) groups.push({ id: 'language', label: 'Language', kind: 'language', options: lang });
  const maths = opts(PW_MATH_KEYS);
  if(maths.length) groups.push({ id: 'maths', label: maths.length > 1 ? 'Mathematics (or an alternative)' : maths[0].reqKey, kind: 'maths', options: maths });
  if(keys.indexOf('LO') >= 0) groups.push({ id: 'lo', label: 'Life Orientation', kind: 'subject', options: opts(['LO']) });
  const electives = keys.filter(function(k){ return PW_LANG_KEYS.indexOf(k) < 0 && PW_MATH_KEYS.indexOf(k) < 0 && k !== 'LO'; });
  const sci = electives.filter(function(k){ return PW_SCI_KEYS.indexOf(k) >= 0; });
  const others = electives.filter(function(k){ return PW_SCI_KEYS.indexOf(k) < 0; });
  const electiveCount = others.length + (sci.length ? 1 : 0);
  if(electiveCount > PW_MAX_ELECTIVES){
    groups.push({ id: 'options', label: 'Other subjects that count', kind: 'options', options: opts(electives) });
  } else {
    if(sci.length) groups.push({ id: 'science', label: sci.length > 1 ? 'Physical Sciences (or Technical Sciences)' : sci[0], kind: 'science', options: opts(PW_SCI_KEYS) });
    others.sort().forEach(function(k){ groups.push({ id: 'subj:' + k, label: k, kind: 'subject', options: [{ reqKey: k, level: Number(req[k]) }] }); });
  }
  return groups;
}

// One requirement group against the learner's current marks.
// status: 'met' | 'unmet' | 'notTaken' | 'check'
function pwEvaluateGroup(l, group, marks){
  const tried = group.options.map(function(o){
    const m = pwMatchKey(l, o.reqKey);
    const pct = m.key != null && marks[m.key] != null ? marks[m.key] : null;
    return { reqKey: o.reqKey, level: o.level, key: m.key, pct: pct, unknownLanguage: !!m.unknownLanguage, unsupported: !!m.unsupported,
             minPct: pwLevelMinPct(o.level), exact: pwIsWholeLevel(o.level) };
  });
  const takenOpts = tried.filter(function(t){ return t.key != null; });
  const metOpts = takenOpts.filter(function(t){ return t.pct != null && t.pct >= t.minPct; });
  const res = { group: group, options: tried, status: 'check', reason: '', best: null };

  if(group.kind === 'options'){
    // A list of subjects that count: check the ones the learner takes.
    const low = takenOpts.filter(function(t){ return t.pct != null && t.pct < t.minPct; });
    res.best = low[0] || metOpts[0] || takenOpts[0] || null;
    if(low.length){ res.status = 'unmet'; res.reason = 'below'; }
    else { res.status = 'check'; res.reason = 'optionsList'; }
    return res;
  }
  if(metOpts.length){
    // The option with the most room, for display.
    metOpts.sort(function(a, b){ return (b.pct - b.minPct) - (a.pct - a.minPct); });
    res.best = metOpts[0];
    if(!res.best.exact){ res.status = 'check'; res.reason = 'halfLevel'; return res; }
    res.status = 'met'; return res;
  }
  if(takenOpts.length){
    const withMark = takenOpts.filter(function(t){ return t.pct != null; });
    if(!withMark.length){ res.best = takenOpts[0]; res.status = 'check'; res.reason = 'noMark'; return res; }
    // Closest to its target.
    withMark.sort(function(a, b){ return (a.minPct - a.pct) - (b.minPct - b.pct); });
    res.best = withMark[0]; res.status = 'unmet'; res.reason = 'below'; return res;
  }
  if(tried.some(function(t){ return t.unknownLanguage; })){ res.status = 'check'; res.reason = 'language'; return res; }
  if(tried.every(function(t){ return t.unsupported; })){ res.status = 'check'; res.reason = 'secondLanguage'; return res; }
  res.status = 'notTaken'; res.reason = 'notTaken';
  return res;
}

/* ---------- APS and a university's own score ---------- */

// The general APS estimate (best six subjects, excluding Life Orientation).
function pwAPS(marks){
  const m = {};
  Object.keys(marks || {}).forEach(function(k){ m[k] = marks[k]; });
  return computeAPSFromMarks(m);
}
function pwOwnScoreName(goal){
  const s = goal && goal.institutionScores;
  if(!s) return null;
  const k = Object.keys(s)[0];
  return k ? { name: k, value: Number(s[k]) } : null;
}
// { status, needed, current, own, gap }
function pwEvaluateAPS(l, goal, marks){
  const own = pwOwnScoreName(goal);
  if(own){
    const entered = goal.ownScore != null && goal.ownScore !== '' ? Number(goal.ownScore) : null;
    if(entered == null) return { kind: 'own', status: 'check', reason: 'ownScore', needed: own.value, name: own.name };
    return { kind: 'own', status: entered >= own.value ? 'met' : 'unmet', needed: own.value, current: entered, name: own.name, gap: Math.max(0, own.value - entered) };
  }
  const needed = goal && goal.apsScore != null && goal.apsScore !== '' ? Number(goal.apsScore) : null;
  if(needed == null) return { kind: 'none', status: 'check', reason: 'noAps' };
  const a = pwAPS(marks);
  if(a.count < 6) return { kind: 'aps', status: 'check', reason: 'fewMarks', needed: needed, current: a.aps, counted: a.count };
  return { kind: 'aps', status: a.aps >= needed ? 'met' : 'unmet', needed: needed, current: a.aps, gap: Math.max(0, needed - a.aps), counted: a.count };
}
// Which subjects, each raised to the next NSC level (the smallest step that
// actually raises the APS first), would close an APS gap. Works on a copy
// and recounts the best six each time, so a subject outside the best six is
// only suggested when raising it really adds a point. [{ key, pct, toPct }]
function pwApsSuggestions(marks, gap){
  if(!(gap > 0)) return [];
  const m = {}; Object.keys(marks || {}).forEach(function(k){ m[k] = marks[k]; });
  const out = [], used = {};
  let aps = pwAPS(m).aps;
  const target = aps + gap;
  for(let n = 0; n < 12 && aps < target; n++){
    let best = null;
    Object.keys(m).forEach(function(k){
      if(k === 'Life Orientation' || used[k]) return;
      const lv = nscLevel(m[k]); if(lv >= 7) return;
      const to = PW_LEVEL_MIN[lv + 1];
      const trial = Object.assign({}, m); trial[k] = to;
      const gain = pwAPS(trial).aps - aps;
      if(gain <= 0) return;
      const step = to - m[k];
      if(!best || step < best.step) best = { key: k, pct: m[k], toPct: to, step: step };
    });
    if(!best) break;
    out.push({ key: best.key, pct: best.pct, toPct: best.toPct });
    used[best.key] = true; m[best.key] = best.toPct; aps = pwAPS(m).aps;
  }
  return out;
}

/* ---------- one saved programme goal ---------- */

function pwEvaluateGoal(l, goal, marks){
  marks = marks || pwCurrentMarks(l).marks;
  const groups = pwRequirementGroups(goal.subjectRequirements).map(function(g){ return pwEvaluateGroup(l, g, marks); });
  const aps = pwEvaluateAPS(l, goal, marks);
  const all = groups.map(function(g){ return g.status; }).concat([aps.status]);
  const counts = { met: 0, unmet: 0, notTaken: 0, check: 0 };
  all.forEach(function(s){ counts[s]++; });
  let overall;
  if(counts.unmet || counts.notTaken) overall = 'unmet';
  else if(counts.check) overall = 'check';
  else overall = 'met';
  return { goal: goal, groups: groups, aps: aps, counts: counts, overall: overall };
}
function pwGoals(l){ return ((l && l.pathway && l.pathway.goals) || []).slice(0, PW_MAX_GOALS); }

// Plain-language status line for a goal (never a promise of admission).
function pwOverallText(ev){
  const n = ev.counts.unmet + ev.counts.notTaken;
  if(ev.overall === 'met') return 'Currently meeting the academic minimum requirements';
  if(ev.overall === 'unmet') return 'Not yet meeting ' + n + ' academic requirement' + (n === 1 ? '' : 's');
  return 'Some requirements need checking';
}

/* ---------- targets: what to aim for, and which goals it supports ---------- */

// [{ key, current, target, gap, supports:[goal names], previous, change }]
function pwTargets(l){
  const cur = pwCurrentMarks(l);
  const prev = pwPreviousEntry(l);
  const goals = pwGoals(l);
  const map = {};
  goals.forEach(function(goal, gi){
    const ev = pwEvaluateGoal(l, goal, cur.marks);
    ev.groups.forEach(function(g){
      if(g.group.kind === 'options') return;
      // The option the learner takes (the best one if several).
      const o = g.best || g.options.filter(function(x){ return x.key != null; })[0];
      if(!o || o.key == null) return;
      const t = map[o.key] || (map[o.key] = { key: o.key, target: 0, supports: [] });
      if(o.minPct > t.target) t.target = o.minPct;
      const name = pwGoalShortName(goal);
      if(t.supports.indexOf(name) < 0) t.supports.push(name);
    });
  });
  const keys = pwLearnerSubjects(l);
  return keys.map(function(k){
    const t = map[k] || { key: k, target: null, supports: [] };
    const current = cur.marks[k] != null ? cur.marks[k] : null;
    const previous = prev && prev.marks[k] != null ? prev.marks[k] : null;
    return {
      key: k, current: current, target: t.target || null, supports: t.supports,
      gap: (t.target && current != null) ? Math.max(0, t.target - current) : null,
      previous: previous, change: (current != null && previous != null && cur.source === 'term') ? Math.round((current - previous) * 10) / 10 : null,
    };
  });
}
function pwGoalShortName(goal){ return (goal.courseName || 'Programme') + ' (' + pwShortInstitution(goal.institution) + ')'; }
function pwShortInstitution(name){
  const m = /\(([^)]+)\)/.exec(name || '');
  if(m) return m[1];
  const known = { 'University of Pretoria':'UP', 'University of the Witwatersrand':'Wits', 'University of Cape Town':'UCT', 'University of Johannesburg':'UJ',
    'Stellenbosch University':'SU', 'University of KwaZulu-Natal':'UKZN', 'North West University':'NWU', 'University of Free State':'UFS',
    'Nelson Mandela University':'NMU', 'University of the Western Cape':'UWC', 'Rhodes University':'RU', 'Tshwane University of Technology':'TUT' };
  return known[name] || name || '';
}

// Subjects that need attention: the learner asked for support, or the mark
// is below what one of their goals needs. [{ key, asked, belowTarget }]
function pwSupportSubjects(l){
  const asked = ((l && l.pathway && l.pathway.supportSubjects) || []);
  return pwTargets(l).filter(function(t){ return asked.indexOf(t.key) >= 0 || (t.gap != null && t.gap > 0); })
    .map(function(t){ return { key: t.key, asked: asked.indexOf(t.key) >= 0, belowTarget: t.gap != null && t.gap > 0, gap: t.gap, target: t.target }; });
}

/* ---------- bursary goal ---------- */

// Academic rules: { minAverage, subjects:{ reqKey: level } } using the same
// alternative groups as programmes.
function pwBursaryAcademic(l, rules, marks){
  marks = marks || pwCurrentMarks(l).marks;
  const out = [];
  if(!rules) return out;
  if(rules.minAverage != null){
    const vals = Object.keys(marks).filter(function(k){ return k !== 'Life Orientation'; }).map(function(k){ return marks[k]; });
    if(vals.length < 6) out.push({ label: 'Average of ' + rules.minAverage + '% (excluding Life Orientation)', status: 'check', reason: 'fewMarks', current: vals.length ? Math.round(vals.reduce(function(a, b){ return a + b; }, 0) / vals.length) : null, needed: rules.minAverage });
    else {
      const a = Math.round(vals.reduce(function(x, y){ return x + y; }, 0) / vals.length * 10) / 10;
      out.push({ label: 'Average of ' + rules.minAverage + '% (excluding Life Orientation)', status: a >= rules.minAverage ? 'met' : 'unmet', current: a, needed: rules.minAverage });
    }
  }
  if(rules.subjects){
    pwRequirementGroups(rules.subjects).forEach(function(g){
      const ev = pwEvaluateGroup(l, g, marks);
      out.push({ label: pwGroupText(l, ev), status: ev.status, reason: ev.reason, eval: ev });
    });
  }
  return out;
}
function pwBursaryOther(goal){
  const answers = (goal && goal.answers) || {};
  const crit = (goal && goal.criteria) || [];
  return crit.map(function(c){
    const a = answers[c.id];
    return { id: c.id, label: c.label, kind: c.kind, status: a === 'yes' ? 'met' : (a === 'no' ? 'unmet' : 'check'), answer: a || null };
  });
}
function pwBursaryStatus(l){
  const b = l && l.pathway && l.pathway.bursary;
  if(!b) return null;
  const academic = pwBursaryAcademic(l, b.academicRules);
  const other = pwBursaryOther(b);
  const all = academic.concat(other);
  const counts = { met: 0, unmet: 0, notTaken: 0, check: 0 };
  all.forEach(function(x){ counts[x.status]++; });
  const docs = b.documents || [];
  const docAnswers = b.docs || {};
  const docsHave = docs.filter(function(d){ return docAnswers[d] === 'have'; }).length;
  return { bursary: b, academic: academic, other: other, counts: counts, docs: docs, docsHave: docsHave,
           overall: (counts.unmet || counts.notTaken) ? 'unmet' : (counts.check ? 'check' : 'met') };
}

/* ---------- wording for one requirement group ---------- */

function pwOptionText(l, o){
  const name = o.reqKey === 'LO' ? 'Life Orientation' : o.reqKey.replace(' HL', ' Home Language').replace(' FAL', ' First Additional Language').replace(' SAL', ' Second Additional Language');
  return name + ' level ' + o.level + ' (' + (pwIsWholeLevel(o.level) ? '' : 'about ') + o.minPct + '%)';
}
function pwGroupText(l, ev){
  const opts = ev.options.map(function(o){ return pwOptionText(l, o); });
  if(ev.group.kind === 'options') return 'Subjects that count: ' + opts.join(', ');
  return opts.length > 1 ? opts.slice(0, -1).join(', ') + ' or ' + opts[opts.length - 1] : opts[0];
}
// A short explanation of a group's status for the learner.
function pwGroupStatusText(l, ev){
  const b = ev.best;
  switch(ev.reason){
    case 'language': return 'Tell us which languages you take to check this.';
    case 'secondLanguage': return 'Iroli does not record second additional languages. Check this with the university.';
    case 'notTaken': return 'Not one of your subjects. Check with the university whether there is another way in.';
    case 'noMark': return 'Add your ' + pwSubjectLabel(l, b.key) + ' mark to check this.';
    case 'halfLevel': return 'Your ' + b.pct + '% looks enough, but this level is unusual. Confirm it with the university.';
    case 'optionsList': return 'Several subjects are listed. Check with the university which of yours count.';
    case 'below': return pwSubjectLabel(l, b.key) + ': ' + b.pct + '% now, ' + b.minPct + '% needed (' + Math.round((b.minPct - b.pct) * 10) / 10 + '% to go).';
  }
  if(ev.status === 'met' && b) return pwSubjectLabel(l, b.key) + ': ' + b.pct + '%, needs ' + b.minPct + '%.';
  return '';
}
