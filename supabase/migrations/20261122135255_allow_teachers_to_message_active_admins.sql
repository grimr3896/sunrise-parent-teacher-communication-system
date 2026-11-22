-- Allow teachers to see active parent and administrator profiles.
-- This lets the teacher message composer offer administrator recipients.
-- Admins retain visibility of all profiles; other users can still see themselves.

drop policy if exists "Users and admins can view profiles" on public.profiles;

create policy "Users and admins can view profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.current_role()) = 'admin'::public.app_role
  or (
    (select private.current_role()) = 'teacher'::public.app_role
    and is_active = true
    and role in ('parent'::public.app_role, 'admin'::public.app_role)
  )
);
