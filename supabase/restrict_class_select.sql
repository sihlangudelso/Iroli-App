-- Restrict who can read class rows (and so their join codes).
--
-- Before: classes_select_authenticated let EVERY signed-in user read every class,
-- including its join code. A class code is how a school's paid seats are handed out,
-- so a learner on a trial could read all the codes (browser console or the REST API)
-- and join any class for free. That open rule was there for the old client-side join;
-- joining now goes through join_class_by_code() (add_secure_class_join.sql), which is
-- security definer and does not need it.
--
-- After: a class row is visible to
--   * institute admins (is_admin()),
--   * the class admin assigned to that class, and
--   * a learner who is already in that class (so Account can show the class name).
--
-- Safe to run more than once. Run it in the Supabase SQL Editor.

drop policy if exists "classes_select_authenticated" on public.classes;
drop policy if exists "classes_select_scoped" on public.classes;

create policy "classes_select_scoped"
  on public.classes for select
  using (
    public.is_admin()
    or "classAdminId" = auth.uid()
    or id = (select l."classId" from public.learners l where l.id = auth.uid())
  );
