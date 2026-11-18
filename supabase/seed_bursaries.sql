-- ============================================================
-- Starter bursary list for the Grade 11-12 Pathway.
--
-- Run in the Supabase SQL editor AFTER add_pathway.sql. Safe to run again:
-- each bursary is inserted or updated by its id.
--
-- Researched 18 Nov 2026 for the 2027 intake, mostly from bursary listing
-- sites. Every row starts with active = false, so learners do not see it
-- until the owner has checked it on the bursary's official site (the
-- "Starter Bursary Check" sheet). To publish a checked bursary, correct the
-- row below if needed, set active to true and verifiedOn to the date you
-- checked it, and run this file again. Admins see unchecked bursaries in the
-- app (labelled "Not checked yet") so they can review them.
--
-- academicRules uses the same subject names and NSC levels as the programme
-- data (courseRequirements.subjectRequirements). Subjects listed together in
-- one group are alternatives, e.g. Mathematics level 5 OR Mathematics
-- Literacy level 7. minAverage is a percentage excluding Life Orientation.
-- ============================================================

insert into public.bursaries
  (id, name, provider, fields, "academicRules", "academicNote", "otherCriteria", documents,
   "usualClosing", obligations, "officialUrl", cycle, "verifiedOn", active, "sortOrder")
values
('nsfas', 'NSFAS', 'National Student Financial Aid Scheme',
 'Any qualification at a public university or TVET college',
 null,
 'You need to be accepted for your programme.',
 '[{"id":"citizen","label":"South African citizen or permanent resident","kind":"citizenship"},
   {"id":"income","label":"Household income within the NSFAS limit (R350,000 a year, or R600,000 for applicants with a disability)","kind":"income"}]'::jsonb,
 '["Certified copy of your ID","Signed NSFAS consent form"]'::jsonb,
 '31 October', null, 'https://www.nsfas.org.za', '2027 intake', null, false, 10),

('isfap', 'ISFAP', 'Ikusasa Student Financial Aid Programme',
 'Approved high-demand fields such as Engineering, Health Sciences, IT and Accountancy',
 null,
 'You need first-year admission at an approved public institution.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"},
   {"id":"income","label":"Household income within the ISFAP limit (up to R600,000 a year)","kind":"income"},
   {"id":"need","label":"Able to show financial need","kind":"other"}]'::jsonb,
 '["Certified copy of your ID"]'::jsonb,
 '31 October', null, null, '2027 intake', null, false, 20),

('funza-lushaka', 'Funza Lushaka', 'Department of Basic Education',
 'Teaching (B.Ed), especially Maths, Science, Technology, indigenous languages and Foundation Phase',
 null,
 'You need a bachelor''s pass and an offer for a B.Ed at a public university.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"},
   {"id":"age","label":"Under 30 when applying","kind":"age"},
   {"id":"clearance","label":"Criminal record clearance","kind":"other"}]'::jsonb,
 '["Certified copy of your ID"]'::jsonb,
 'January', 'Teach at a public school for one year for each year funded, or repay the bursary.',
 'https://www.eservices.gov.za', '2027 intake', null, false, 30),

('thuthuka', 'SAICA Thuthuka', 'South African Institute of Chartered Accountants',
 'Chartered Accountancy (CA stream BCom)',
 '{"subjects":{"Mathematics":5}}'::jsonb,
 'Grade 11 Mathematics 60% (level 5) or more. Mathematical Literacy and Technical Mathematics are not accepted.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"},
   {"id":"group","label":"In the bursary''s eligibility group (Black African or Coloured)","kind":"group"},
   {"id":"income","label":"Household income within the Thuthuka limit (R350,000 a year)","kind":"income"},
   {"id":"nbt","label":"Registered for or written the National Benchmark Tests (NBT)","kind":"other"}]'::jsonb,
 '["Certified copy of your ID","Grade 11 final results","Proof of university application","Signed Thuthuka consent form"]'::jsonb,
 '31 August', null, null, '2027 intake', null, false, 40),

('allan-gray-orbis', 'Allan Gray Orbis Foundation Fellowship', 'Allan Gray Orbis Foundation',
 'Most degrees at partner universities (not Medicine, Veterinary Science or Dentistry)',
 '{"minAverage":70,"subjects":{"Mathematics":5,"Mathematics Literacy":7}}'::jsonb,
 'Grade 11 average of 70% or more (excluding Life Orientation), and Mathematics 60% or Mathematical Literacy 80%.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"},
   {"id":"age","label":"21 or younger in the year you apply","kind":"age"}]'::jsonb,
 '["Certified copy of your ID","Certified Grade 11 final results"]'::jsonb,
 '30 April (during Grade 12)', null, 'https://allangrayorbis.org', '2027 intake', null, false, 50),

('sasol', 'Sasol bursary', 'Sasol',
 'Engineering and science',
 '{"subjects":{"Mathematics":6,"Physical Sciences":6,"English HL":5,"English FAL":5}}'::jsonb,
 'Mathematics and Physical Sciences level 6 (70%), English level 5 (60%). Mathematical Literacy and Technical Mathematics are not accepted.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"}]'::jsonb,
 '["Certified copy of your ID","Latest results"]'::jsonb,
 null, null, 'https://www.sasolbursaries.com', '2027 intake', null, false, 60),

('csir-sasol', 'CSIR-Sasol Foundation bursary', 'CSIR and Sasol Foundation',
 'Science and engineering',
 '{"subjects":{"Mathematics":6,"Physical Sciences":6,"English HL":5,"English FAL":5}}'::jsonb,
 'English level 5, Mathematics level 6, Physical Sciences level 6.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"}]'::jsonb,
 '["Certified copy of your ID","Latest results"]'::jsonb,
 null, null, 'https://www.csir.co.za/careers/students-graduates/bursaries/sasol-foundation-bursary', '2027 intake', null, false, 70),

('eskom', 'Eskom bursary', 'Eskom',
 'Engineering degree or diploma, IT and other fields',
 '{"minAverage":60,"subjects":{"Mathematics":5,"Physical Sciences":5,"English HL":4,"English FAL":4}}'::jsonb,
 'About Mathematics level 5, Physical Sciences level 5 and English level 4, with a 60% average for degrees. Mathematical Literacy is not accepted.',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"},
   {"id":"no-other","label":"Not holding another bursary","kind":"other"}]'::jsonb,
 '["Certified copy of your ID","Latest results"]'::jsonb,
 '22 September', 'You may need to work for Eskom after you finish studying.', null, '2027 intake', null, false, 80),

('sanral', 'SANRAL bursary', 'South African National Roads Agency',
 'Civil Engineering and IT',
 '{"minAverage":70}'::jsonb,
 'A matric average of about 70%.',
 '[{"id":"need","label":"Able to show financial need","kind":"other"},
   {"id":"no-other","label":"Not receiving other bursary funding","kind":"other"},
   {"id":"age","label":"Under 35","kind":"age"}]'::jsonb,
 '["Certified copy of your ID","Certified results","Proof of university application or acceptance"]'::jsonb,
 '30 September', null, null, '2027 intake', null, false, 90),

('transnet', 'Transnet bursary', 'Transnet',
 'Engineering, technical and non-technical fields',
 '{"subjects":{"Mathematics":5,"Physical Sciences":5,"English HL":5,"English FAL":5}}'::jsonb,
 'English, Mathematics and Physical Sciences level 5 (60%).',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"}]'::jsonb,
 '["Certified copy of your ID","Latest Grade 12 results"]'::jsonb,
 '31 July', 'Work for Transnet for one year for each year funded.', null, '2027 intake', null, false, 100),

('nedbank', 'Nedbank External Bursary', 'Nedbank',
 'STEM and green economy',
 '{"minAverage":65,"subjects":{"Mathematics":1}}'::jsonb,
 'An average of 65% or more, and you must take Mathematics (not Mathematical Literacy).',
 '[{"id":"citizen","label":"South African citizen","kind":"citizenship"},
   {"id":"need","label":"Able to show financial need","kind":"other"}]'::jsonb,
 '["Certified copy of your ID","Grade 11 final results","Grade 12 mid-year results"]'::jsonb,
 '31 August', null, null, '2027 intake', null, false, 110)

on conflict (id) do update set
  name = excluded.name, provider = excluded.provider, fields = excluded.fields,
  "academicRules" = excluded."academicRules", "academicNote" = excluded."academicNote",
  "otherCriteria" = excluded."otherCriteria", documents = excluded.documents,
  "usualClosing" = excluded."usualClosing", obligations = excluded.obligations,
  "officialUrl" = excluded."officialUrl", cycle = excluded.cycle,
  "verifiedOn" = excluded."verifiedOn", active = excluded.active, "sortOrder" = excluded."sortOrder";
