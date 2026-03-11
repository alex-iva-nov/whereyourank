-- Refresh onboarding age buckets for first-user MVP polish.
-- Legacy values stay temporarily allowed so existing profiles do not break.

alter table public.user_profiles
  drop constraint if exists user_profiles_age_bucket_check;

alter table public.user_profiles
  add constraint user_profiles_age_bucket_check
  check (
    age_bucket in (
      '13_18',
      '18_24',
      '25_29',
      '30_34',
      '35_39',
      '40_44',
      '45_49',
      '50_54',
      '55_59',
      '60_64',
      '65_69',
      '70_74',
      '75_79',
      '80_plus',
      '25_34',
      '35_44',
      '45_54',
      '55_plus'
    )
  );