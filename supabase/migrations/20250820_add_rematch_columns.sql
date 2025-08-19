-- Rematch handshake columns
alter table if exists public.rooms
  add column if not exists rematch_white boolean default false,
  add column if not exists rematch_black boolean default false,
  add column if not exists rematch_until timestamptz;
