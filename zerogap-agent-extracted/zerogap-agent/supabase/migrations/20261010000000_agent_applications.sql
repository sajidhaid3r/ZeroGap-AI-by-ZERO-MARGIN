-- Application tracker written by the agent's save_to_tracker tool (only after the user approves).
create table if not exists public.agent_applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_ref     text not null,
  role        text not null,
  company     text not null,
  url         text,
  cover_note  text,
  status      text not null default 'planned',
  created_at  timestamptz not null default now()
);

alter table public.agent_applications enable row level security;

create policy "own rows: select" on public.agent_applications for select using (auth.uid() = user_id);
create policy "own rows: insert" on public.agent_applications for insert with check (auth.uid() = user_id);
create policy "own rows: update" on public.agent_applications for update using (auth.uid() = user_id);
create policy "own rows: delete" on public.agent_applications for delete using (auth.uid() = user_id);
