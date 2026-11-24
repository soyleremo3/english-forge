-- EnglishForge Aşama 1 çekirdek şema (docs/SPEC.md bölüm 11)
-- words: paylaşılan katalog. Herkes okur, yalnızca service role yazar (RLS politikası yok = yazma yok).
-- Diğer bütün tablolar: user_id = auth.uid().

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  freezes_available smallint not null default 0
    check (freezes_available between 0 and 2),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- words (paylaşılan katalog)
-- ---------------------------------------------------------------------------
create table public.words (
  id bigint generated always as identity primary key,
  lemma text not null check (char_length(lemma) between 1 and 100),
  pos text,
  tr_meanings text[] not null default '{}',
  en_alternatives text[] not null default '{}',
  en_definition text,
  example_en text,
  example_tr text,
  source text not null check (source in ('ngsl', 'nawl', 'book', 'manual')),
  rank integer,
  cefr text check (cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Liste kelimeleri (NGSL/NAWL) tekil; seed betiği tekrar çalışınca kopya oluşmaz.
create unique index words_list_lemma_pos_key
  on public.words (source, lemma, pos) nulls not distinct
  where source in ('ngsl', 'nawl');
create index words_source_rank_idx on public.words (source, rank);
create index words_lemma_lower_idx on public.words (lower(lemma));
create index words_created_by_idx on public.words (created_by);

-- ---------------------------------------------------------------------------
-- user_words (kullanıcının kelime durumu + FSRS kartı)
-- ---------------------------------------------------------------------------
create table public.user_words (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_id bigint not null references public.words (id) on delete cascade,
  status text not null default 'new'
    check (status in ('new', 'learning', 'review', 'known', 'suspended')),
  -- FSRS alanları (ts-fsrs Card)
  due timestamptz,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  introduced_on date,
  custom_tr text[],
  accepted_answers text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, word_id)
);

create index user_words_word_id_idx on public.user_words (word_id);
create index user_words_user_status_idx on public.user_words (user_id, status);
create index user_words_user_due_idx on public.user_words (user_id, due)
  where status in ('learning', 'review');
create index user_words_user_introduced_idx on public.user_words (user_id, introduced_on);

-- ---------------------------------------------------------------------------
-- review_logs
-- ---------------------------------------------------------------------------
create table public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_word_id bigint not null references public.user_words (id) on delete cascade,
  kind text not null
    check (kind in ('learn', 'review', 'group_quiz', 'daily_test', 'typed_review')),
  rating smallint check (rating between 1 and 4),
  direction text check (direction in ('tr_en', 'en_tr')),
  answer text check (char_length(answer) <= 500),
  result text check (result in ('correct', 'almost', 'wrong')),
  ai_checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index review_logs_user_created_idx on public.review_logs (user_id, created_at desc);
create index review_logs_user_word_idx on public.review_logs (user_word_id, created_at desc);

-- ---------------------------------------------------------------------------
-- study_days
-- ---------------------------------------------------------------------------
create table public.study_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  study_date date not null,
  tasks jsonb not null default '{}'::jsonb,
  daily_test_score numeric(5, 2) check (daily_test_score between 0 and 100),
  xp integer not null default 0,
  completed_at timestamptz,
  frozen boolean not null default false,
  minutes integer not null default 0,
  primary key (user_id, study_date)
);

-- ---------------------------------------------------------------------------
-- quiz_attempts
-- ---------------------------------------------------------------------------
create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('group', 'daily', 'error_review')),
  study_date date not null,
  items jsonb not null default '[]'::jsonb,
  score numeric(5, 2) check (score between 0 and 100),
  created_at timestamptz not null default now()
);

create index quiz_attempts_user_date_idx on public.quiz_attempts (user_id, study_date);

-- ---------------------------------------------------------------------------
-- sentences
-- ---------------------------------------------------------------------------
create table public.sentences (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_id bigint references public.words (id) on delete set null,
  text text not null check (char_length(text) between 1 and 1000),
  ai_feedback jsonb,
  corrected text,
  ok boolean,
  created_at timestamptz not null default now()
);

create index sentences_user_created_idx on public.sentences (user_id, created_at desc);
create index sentences_word_id_idx on public.sentences (word_id);

-- ---------------------------------------------------------------------------
-- badges
-- ---------------------------------------------------------------------------
create table public.badges (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

-- ---------------------------------------------------------------------------
-- ai_usage
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  feature text not null,
  model text,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_day_idx on public.ai_usage (user_id, day);

-- ---------------------------------------------------------------------------
-- Yetkiler ve RLS
-- ---------------------------------------------------------------------------
revoke all on
  public.profiles, public.words, public.user_words, public.review_logs,
  public.study_days, public.quiz_attempts, public.sentences, public.badges,
  public.ai_usage
from anon, authenticated;

grant select on public.words to anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.user_words, public.review_logs, public.study_days,
  public.quiz_attempts, public.sentences, public.badges, public.ai_usage
to authenticated;

alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.user_words enable row level security;
alter table public.review_logs enable row level security;
alter table public.study_days enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.sentences enable row level security;
alter table public.badges enable row level security;
alter table public.ai_usage enable row level security;

-- words: herkes okur. insert/update/delete politikası yok, yalnızca service role (RLS'i atlar) yazar.
create policy "words: herkes okur" on public.words
  for select to anon, authenticated using (true);

create policy "profiles: sahibi" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_words: sahibi" on public.user_words
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "review_logs: sahibi" on public.review_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "study_days: sahibi" on public.study_days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "quiz_attempts: sahibi" on public.quiz_attempts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "sentences: sahibi" on public.sentences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "badges: sahibi" on public.badges
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "ai_usage: sahibi" on public.ai_usage
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
