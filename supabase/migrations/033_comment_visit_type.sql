-- Lightweight visit type for school staff comments / visit reports
alter table public.school_staff_comments
  add column if not exists visit_type text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'school_staff_comments_visit_type_check'
  ) then
    alter table public.school_staff_comments
      add constraint school_staff_comments_visit_type_check
      check (visit_type is null or visit_type in ('school', 'scholarship'));
  end if;
end $$;

comment on column public.school_staff_comments.visit_type is
  'school = บันทึกตรวจเยี่ยมโรงเรียน; scholarship = บันทึกตรวจเยี่ยมนักเรียนทุน';
