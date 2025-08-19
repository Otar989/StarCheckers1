-- Создаем перечисляемые типы для статусов и цветов
create type game_status as enum ('waiting', 'playing', 'finished');
create type piece_color as enum ('white', 'black');

-- Создаем основные таблицы
create table if not exists public.rooms (
  id text primary key,
  status game_status not null default 'waiting',
  host_color piece_color not null default 'white',
  board_state jsonb not null,
  turn piece_color not null default 'white',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  move jsonb not null,
  created_at timestamptz default now()
);

-- Создаем функцию для обновления updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Создаем триггер для обновления updated_at
drop trigger if exists set_updated_at on public.rooms;
create trigger set_updated_at
  before update on public.rooms
  for each row
  execute procedure public.set_updated_at();

-- Включаем Realtime для таблиц
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.moves;

-- Создаем политики безопасности RLS
alter table public.rooms enable row level security;
alter table public.moves enable row level security;

create policy "Anyone can view rooms"
  on public.rooms for select
  to anon
  using (true);

create policy "Anyone can insert rooms"
  on public.rooms for insert
  to anon
  with check (true);

create policy "Anyone can update rooms"
  on public.rooms for update
  to anon
  using (true);

create policy "Anyone can view moves"
  on public.moves for select
  to anon
  using (true);

create policy "Anyone can insert moves"
  on public.moves for insert
  to anon
  with check (true);
