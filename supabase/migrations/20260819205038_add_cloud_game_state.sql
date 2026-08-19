alter table public.profiles
  add column if not exists game_state jsonb;

alter table public.profiles
  add constraint profiles_game_state_object
  check (
    game_state is null
    or (jsonb_typeof(game_state) = 'object' and pg_column_size(game_state) <= 131072)
  );

grant update(game_state) on public.profiles to authenticated;
