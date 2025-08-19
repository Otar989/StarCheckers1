create table if not exists rooms (
  id text primary key,
  status text not null check (status in ('waiting','playing','finished')) default 'waiting',
  host_color text not null check (host_color in ('white','black')) default 'white',
  board_state jsonb not null,
  turn text not null check (turn in ('white','black')) default 'white',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists moves (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  move jsonb not null,
  created_at timestamptz default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at on rooms;
create trigger trg_set_updated_at before update on rooms
for each row execute procedure set_updated_at();
