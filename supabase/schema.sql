-- Run this whole file in Supabase Dashboard -> SQL Editor -> New query -> Run

-- 1. Profiles (extra info beyond auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  field_of_study text,
  goals text,
  wake_time time default '07:00',
  sleep_time time default '23:00',
  travel_minutes int default 30,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2. Weekly timetable (recurring classes)
create table if not exists timetable_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null,
  end_time time not null,
  subject text not null,
  color text default '#F2A65A',
  created_at timestamptz default now()
);

alter table timetable_events enable row level security;
create policy "Users manage their own timetable" on timetable_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Tasks (today / pending / later / done)
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  notes text,
  task_date date not null default current_date,
  start_time time,
  end_time time,
  status text not null default 'pending' check (status in ('pending','done','skipped','later')),
  priority text default 'normal' check (priority in ('low','normal','high')),
  original_date date,           -- first date it was created for, kept for "later" restore
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Users manage their own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Daily completion log (for dashboard charts, one row per day, cached)
create table if not exists daily_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  stat_date date not null,
  tasks_total int default 0,
  tasks_done int default 0,
  unique (user_id, stat_date)
);

alter table daily_stats enable row level security;
create policy "Users manage their own stats" on daily_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- helpful indexes
create index if not exists tasks_user_date_idx on tasks (user_id, task_date);
create index if not exists timetable_user_day_idx on timetable_events (user_id, day_of_week);
