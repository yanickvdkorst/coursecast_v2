-- ============================================================
-- 011_fix_function_search_path.sql
-- Pin a stable search_path on all SECURITY DEFINER functions.
--
-- WHY: Deleting an auth.users row cascades profiles → matches →
-- hole_results. That hole_results DELETE fires on_hole_result_change,
-- which runs update_match_status(). That function references `matches`,
-- `hole_results`, `courses` WITHOUT a schema prefix. When the delete is
-- run by the GoTrue auth admin (e.g. "Delete user" in the dashboard),
-- the session search_path does not include `public`, so the function
-- fails with:  relation "matches" does not exist (SQLSTATE 42P01)
-- and the whole user deletion aborts.
--
-- Pinning search_path = public makes the unqualified names always resolve,
-- and also clears Supabase's "function_search_path_mutable" warnings.
-- ============================================================

ALTER FUNCTION public.handle_new_user()                     SET search_path = public, pg_temp;
ALTER FUNCTION public.update_match_status()                 SET search_path = public, pg_temp;
ALTER FUNCTION public.update_competition_standings()        SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin()                            SET search_path = public, pg_temp;
ALTER FUNCTION public.is_match_participant(uuid)            SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_match_and_recompute(uuid, uuid) SET search_path = public, pg_temp;
