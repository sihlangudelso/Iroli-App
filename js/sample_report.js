/* The public example uses the same report as the learner app, without an account. */
(() => {
  const marks = {
    'Home Language': 76,
    'First Additional Language': 71,
    'Mathematics': 85,
    'Natural Sciences': 88,
    'Social Sciences': 78,
    'Economic and Management Sciences': 67,
    'Technology': 80,
    'Creative Arts': 64,
  };
  const interests = {
    mathematics: 5, physicalSciences: 5, lifeSciences: 5, geography: 4,
    informationTechnology: 4, engineeringGraphicsAndDesign: 4,
    mathematicalLiteracy: 3, agriculturalSciences: 3, computerApplicationsTechnology: 3,
  };
  const learner = {
    grade: 9,
    riasec: { R: 72, I: 92, A: 50, S: 52, E: 48, C: 76 },
    assessmentCompletedAt: '2026-09-30',
    workStyle: { teamVsSolo: 25, structureVsFlexible: 25, leadVsSupport: 50, detailVsBigPicture: 25, routineVsVariety: 75 },
    grade9Report: {
      term: 3,
      subjects: Object.fromEntries(Object.entries(marks).map(([area, pct]) => [area, { pct }])),
    },
    subjectChoice: {
      answers: Object.fromEntries(SC_QUESTIONS.map(question => [question.id, interests[question.primary] ?? 2])),
    },
  };
  const report = buildLearnerReport(learner);
  report.meta.name = 'Sample learner';
  report.meta.date = null;
  document.getElementById('sample-report').innerHTML = learnerReportHTML(learner, report, { sample: true });
})();
