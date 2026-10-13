/* ============================================================
   ONE-PAGE CLASS SUMMARY (PDF) FOR THE SMT / SGB

   The Grade 9 Dashboard's numbers for the classes on screen, on one A4
   page: headline numbers, the Maths recommendation split, career pathways,
   recommended combinations, recommended vs. intended subjects, assessment
   progress, support planning and the school insights.

   Aggregates only -- no learner names: this page is meant for a meeting
   (an SGB includes parents), not for follow-up. The names live in the
   dashboard and its Excel download.

   Drawn as real text with jsPDF (the same pinned, hash-checked library
   the learner report's "Download PDF" loads -- rdLoadLib / RD_LIBS), so
   the text can be selected and searched, the file is small, and it is
   always exactly one page: every list is capped, and the insights stop
   where the page does.

   Test hook: csBuildPDF(d, filterClass) returns the jsPDF document.
   ============================================================ */

const CS = {
  page: { w: 210, h: 297, m: 14 },
  c: { ink: [26, 23, 51], muted: [94, 90, 120], line: [230, 227, 243], track: [236, 233, 246], tint: [241, 236, 255],
       indigo: [90, 75, 224], blue: [85, 112, 255], violet: [155, 111, 227], pink: [221, 100, 204], white: [255, 255, 255] },
  maxRows: 6,
};

// Helvetica in a PDF only has the Windows-1252 characters: entities from the
// (HTML-escaped) insight sentences are decoded and anything else is replaced.
function csText(s){
  return String(s == null ? '' : s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->').replace(/ /g, ' ')
    .replace(/[^\u0000-ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, '');
}
function csHex(hex){
  const h = String(hex || '').replace('#', '');
  return h.length === 6 ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] : CS.c.indigo;
}

function csBuildPDF(d, filterClass){
  const P = CS.page, C = CS.c, W = P.w - 2 * P.m;
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const scope = exportScopeName(filterClass);
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setProperties({ title: 'Grade 9 Class Summary — ' + scope, subject: 'Iroli Career Pathway', creator: 'Iroli Career Pathway' });

  const fill = function(c){ doc.setFillColor(c[0], c[1], c[2]); };
  const color = function(c){ doc.setTextColor(c[0], c[1], c[2]); };
  const font = function(size, bold, c){ doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); color(c || C.ink); };
  const text = function(s, x, y, opts){ doc.text(csText(s), x, y, opts || {}); };
  // Cuts a label to fit a width, with an ellipsis.
  const fit = function(s, w){
    s = csText(s);
    if(doc.getTextWidth(s) <= w) return s;
    while(s.length > 1 && doc.getTextWidth(s + '…') > w) s = s.slice(0, -1);
    return s.replace(/\s+$/, '') + '…';
  };
  const bar = function(x, y, w, h, pct, c){
    fill(C.track); doc.rect(x, y, w, h, 'F');
    const fw = Math.max(0, Math.min(1, pct / 100)) * w;
    if(fw > 0){ fill(c); doc.rect(x, y, fw, h, 'F'); }
  };
  const heading = function(s, x, y, w){
    font(10.5, true); text(s, x, y);
    doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.3); doc.line(x, y + 1.8, x + w, y + 1.8);
    return y + 6.5;
  };
  const note = function(s, x, y){ font(8, false, C.muted); text(s, x, y); return y + 4.5; };
  // A list of labelled bars: [{ label, value, pct, color }].
  const barList = function(rows, x, y, w, empty){
    if(!rows.length) return note(empty, x, y);
    rows.forEach(function(r){
      font(8.5, false); const val = csText(r.value);
      const vw = doc.getTextWidth(val);
      text(fit(r.label, w - vw - 3), x, y);
      text(val, x + w, y, { align: 'right' });
      bar(x, y + 1.3, w, 1.6, r.pct, r.color || C.indigo);
      y += 6.6;
    });
    return y;
  };
  // A small table: headers, rows, column widths (numbers right-aligned).
  const table = function(headers, rows, x, y, widths, empty){
    font(7.5, true, C.muted);
    let cx = x;
    headers.forEach(function(h, i){ i ? text(h, cx + widths[i], y, { align: 'right' }) : text(h, cx, y); cx += widths[i]; });
    y += 4.4;
    if(!rows.length) return note(empty, x, y);
    rows.forEach(function(r, ri){
      if(ri % 2 === 0){ fill(C.tint); doc.rect(x - 1, y - 3.2, widths.reduce(function(a, b){ return a + b; }, 0) + 2, 4.6, 'F'); }
      font(8.5, !!r.bold);
      let cx2 = x;
      r.cells.forEach(function(v, i){
        if(i) text(String(v), cx2 + widths[i], y, { align: 'right' });
        else text(fit(v, widths[0] - 2), cx2, y);
        cx2 += widths[i];
      });
      y += 4.6;
    });
    return y;
  };

  /* ---- header band ---- */
  const bandH = 25;
  fill(C.indigo); doc.rect(0, 0, P.w, bandH, 'F');
  // the brand gradient as a thin strip under the band
  const strip = [C.blue, C.violet, C.pink];
  for(let i = 0; i < 60; i++){
    const t = i / 59, seg = t < 0.5 ? 0 : 1, u = seg ? (t - 0.5) * 2 : t * 2;
    const a = strip[seg], b = strip[seg + 1];
    fill([0, 1, 2].map(function(k){ return Math.round(a[k] + (b[k] - a[k]) * u); }));
    doc.rect(i * P.w / 60, bandH, P.w / 60 + 0.2, 1.4, 'F');
  }
  font(8.5, true, C.white); text('IROLI CAREER PATHWAY', P.m, 9);
  font(16, true, C.white); text('Grade 9 Class Summary', P.m, 17.5);
  font(9, false, C.white); text(scope + '  ·  ' + today, P.w - P.m, 17.5, { align: 'right' });

  /* ---- headline numbers ---- */
  const o = d.overview, m = d.subjectRecs.math, nRec = d.subjectRecs.withRecCount;
  const pctOf = function(x, t){ return t ? Math.round(100 * x / t) : 0; };
  let y = bandH + 7;
  const tiles = [
    [String(o.totalLearners), 'Grade 9 learners'],
    [o.completionRate + '%', 'Personality assessment done'],
    [String(nRec), 'Subject Choice reports'],
    [String(o.guidanceRequired), 'Learners requiring guidance'],
  ];
  const tw = (W - 3 * 4) / 4;
  tiles.forEach(function(t, i){
    const x = P.m + i * (tw + 4);
    fill(C.tint); doc.roundedRect(x, y, tw, 17, 2, 2, 'F');
    font(16, true, C.indigo); text(t[0], x + 4, y + 8.5);
    font(7.5, false, C.muted); text(fit(t[1], tw - 8), x + 4, y + 13.5);
  });
  y += 24;

  /* ---- Maths recommendation ---- */
  y = heading('Mathematics or Mathematical Literacy (recommended)', P.m, y, W);
  if(nRec){
    const parts = [[m.mathematics, C.indigo], [m.mathematicalLiteracy, C.pink], [m.either, C.track]];
    let x = P.m;
    parts.forEach(function(p){ const w = W * p[0] / nRec; if(w > 0){ fill(p[1]); doc.rect(x, y - 1, w, 4, 'F'); } x += w; });
    y += 8;
    const legend = [
      [C.indigo, 'Mathematics: ' + m.mathematics + ' (' + pctOf(m.mathematics, nRec) + '%)' + (m.support ? ', ' + m.support + ' with extra support' : '')],
      [C.pink, 'Maths Literacy: ' + m.mathematicalLiteracy + ' (' + pctOf(m.mathematicalLiteracy, nRec) + '%)'],
      [C.track, 'To talk through: ' + m.either + ' (' + pctOf(m.either, nRec) + '%)'],
    ];
    x = P.m; font(8.5, false);
    legend.forEach(function(l){ fill(l[0]); doc.rect(x, y - 2.6, 3, 3, 'F'); text(l[1], x + 4.5, y); x += doc.getTextWidth(csText(l[1])) + 11; });
    y += 9;
  } else y = note('No Subject Choice reports yet.', P.m, y) + 4;

  /* ---- pathways | combinations ---- */
  const half = (W - 6) / 2, xR = P.m + half + 6;
  const yTop = y;
  let yL = heading('Top career pathways', P.m, yTop, half);
  yL = barList(d.pathwayDistribution.slice(0, CS.maxRows).map(function(p){
    return { label: p.name, value: p.count + ' (' + p.pct + '%)', pct: p.pct, color: csHex(p.color) };
  }), P.m, yL, half, 'No assessed learners yet.');
  let yR = heading('Recommended subject combinations', xR, yTop, half);
  yR = barList(d.combinations.slice(0, CS.maxRows).map(function(c){
    return { label: c.name, value: c.count + ' (' + c.pct + '%)', pct: c.pct, color: C.violet };
  }), xR, yR, half, 'No Subject Choice reports yet.');
  y = Math.max(yL, yR) + 3;

  /* ---- recommended vs intended subjects (two side-by-side tables) ---- */
  y = heading('Grade 10 subjects: recommended vs. intended', P.m, y, W);
  const subj = d.subjectRecs.list.slice(0, 2 * CS.maxRows);
  const sw = [half - 38, 20, 18];
  const left = subj.slice(0, CS.maxRows), right = subj.slice(CS.maxRows);
  const rowsOf = function(list){ return list.map(function(s){ return { cells: [s.subject, s.recommended, s.intended] }; }); };
  const ySa = table(['Subject', 'Recommended', 'Intended'], rowsOf(left), P.m, y, sw, 'No subjects recorded yet.');
  const ySb = right.length ? table(['Subject', 'Recommended', 'Intended'], rowsOf(right), xR, y, sw, '') : y;
  y = Math.max(ySa, ySb) + 4;

  /* ---- progress | support planning ---- */
  const yTop2 = y;
  yL = heading('Assessment progress', P.m, yTop2, half);
  const prog = d.progress, many = prog.byClass.length > CS.maxRows - 1;
  // With more classes than fit, only the total (the dashboard and Excel have every class).
  const total = { r: Object.assign({ name: 'All classes' }, prog.total), bold: true };
  const progRows = many ? [total]
    : prog.byClass.map(function(r){ return { r: r, bold: false }; }).concat(prog.byClass.length > 1 ? [total] : []);
  const pw = [half - 68, 13, 16, 13, 13, 13];
  yL = table(['Class', 'Learners', 'Personality', 'Subjects', 'Results', 'All done'], progRows.map(function(x){
    const r = x.r, p = function(v){ return pctOf(v, r.learners) + '%'; };
    return { bold: x.bold, cells: [r.name, r.learners, p(r.personality), p(r.subjectChoice), p(r.results), p(r.all)] };
  }), P.m, yL, pw, 'No learners yet.');
  yL = note(prog.outstanding.length + ' learner' + (prog.outstanding.length === 1 ? ' has' : 's have') + ' something still to finish.', P.m, yL + 1);
  yR = heading('Support planning (below ' + SUPPORT_BELOW + '%)', xR, yTop2, half);
  yR = table(['Subject (learning area)', 'Learners'], d.supportNeeds.slice(0, CS.maxRows).map(function(g){
    return { cells: [g.subject + ' (' + g.area + ')', g.count] };
  }), xR, yR, [half - 18, 18], 'No learners below ' + SUPPORT_BELOW + '% in a subject they are interested in.');
  y = Math.max(yL, yR) + 3;

  /* ---- insights, as many as fit above the footer ---- */
  const footTop = P.h - P.m - 12;
  if(d.insights.length && y + 14 < footTop){
    y = heading('Key insights', P.m, y, W);
    font(8.5, false);
    for(let i = 0; i < d.insights.length; i++){
      // (the dashboard's pointer to its own table means nothing on paper)
      const lines = doc.splitTextToSize(csText(d.insights[i]).replace(/ — see the guidance table below/, ''), W - 5);
      if(y + lines.length * 3.9 > footTop) break;
      fill(C.indigo); doc.circle(P.m + 1, y - 1.1, 0.7, 'F');
      color(C.ink); doc.text(lines, P.m + 4, y, { lineHeightFactor: 1.3 });
      y += lines.length * 3.9 + 1.4;
    }
  }

  /* ---- footer ---- */
  doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.3); doc.line(P.m, footTop + 1, P.w - P.m, footTop + 1);
  font(7.5, false, C.muted);
  doc.text(doc.splitTextToSize(csText('This view surfaces support opportunities based on current results and stated interests — it never makes final career or subject decisions for a learner.'), W), P.m, footTop + 5.5);
  text('Iroli Career Pathway  ·  ' + today, P.m, P.h - P.m + 2);
  return doc;
}

let CS_BUSY = false;
async function downloadClassSummaryPDF(filterClass, btn){
  if(CS_BUSY) return;
  CS_BUSY = true;
  const label = btn ? btn.innerHTML : null;
  if(btn){ btn.disabled = true; btn.textContent = 'Preparing PDF…'; }
  try {
    await rdLoadLib(RD_LIBS.find(function(l){ return l.global === 'jspdf'; }));
    const doc = csBuildPDF(buildSchoolDashboardData(filterClass), filterClass);
    doc.save('iroli-grade9-class-summary-' + exportScopeSlug(filterClass) + '-' + todayISO().slice(0, 10) + '.pdf');
    toast('Class summary downloaded.');
  } catch(err){
    console.error(err);
    toast('Could not create the PDF — check your connection and try again.');
  } finally {
    CS_BUSY = false;
    if(btn){ btn.disabled = false; btn.innerHTML = label; }
  }
}
