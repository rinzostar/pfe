-- Run this in Supabase SQL editor.
-- This script sets up the tables and DISABLES all security (RLS) for maximum simplicity.

create table if not exists profiles (
  id uuid primary key references auth.users(id),
  role text check (role in ('admin','professor','student')),
  full_name text,
  email text,
  banned boolean default false
);

create table if not exists semesters (
  id serial primary key,
  level text,
  year_code text,
  semester_code text,
  label text
);

insert into semesters (level, year_code, semester_code, label) values
('Licence','L1','S1','Licence 1 - S1'),
('Licence','L1','S2','Licence 1 - S2'),
('Licence','L2','S3','Licence 2 - S3'),
('Licence','L2','S4','Licence 2 - S4'),
('Licence','L3','S5','Licence 3 - S5'),
('Licence','L3','S6','Licence 3 - S6'),
('Master','M1','S1','Master 1 - S1'),
('Master','M1','S2','Master 1 - S2'),
('Master','M2','S3','Master 2 - S3'),
('Doctorat','D','R','Doctorat - Research')
on conflict do nothing;

create table if not exists modules (
  id serial primary key,
  semester_id int references semesters(id),
  name text,
  owner_id uuid references profiles(id)
);

create table if not exists courses (
  id serial primary key,
  module_id int references modules(id),
  title text,
  content text default '',
  yt_url text,
  created_at timestamptz default now()
);

alter table courses add column if not exists content text default '';

create table if not exists attachments (
  id serial primary key,
  course_id int references courses(id),
  file_path text,
  file_name text
);

create table if not exists favorites (
  user_id uuid references profiles(id),
  course_id int references courses(id),
  primary key (user_id, course_id)
);

create table if not exists posts (
  id serial primary key,
  author_id uuid references profiles(id),
  content text,
  link text,
  file_path text,
  created_at timestamptz default now()
);

create table if not exists reports (
  id serial primary key,
  post_id int references posts(id),
  reporter_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists livestreams (
  id uuid primary key default gen_random_uuid(),
  module_id int references modules(id),
  host_id uuid references profiles(id),
  room_name text,
  status text default 'live',
  started_at timestamptz default now()
);

create table if not exists chat_messages (
  id bigserial primary key,
  livestream_id uuid references livestreams(id),
  sender_id uuid references profiles(id),
  message text,
  created_at timestamptz default now()
);

-- DISABLE RLS ON EVERYTHING
-- This makes the database a "Wild West" where anyone can do anything. 🤠
alter table profiles disable row level security;
alter table semesters disable row level security;
alter table modules disable row level security;
alter table courses disable row level security;
alter table attachments disable row level security;
alter table favorites disable row level security;
alter table posts disable row level security;
alter table reports disable row level security;
alter table livestreams disable row level security;
alter table chat_messages disable row level security;

-- Storage is usually public if buckets are created as public, but these commands help
-- (Run these in the SQL editor to ensure storage is also wide open)
-- UPDATE storage.buckets SET public = true WHERE id IN ('course-files', 'post-files');

