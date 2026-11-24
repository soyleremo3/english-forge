-- İşlev kelimeleri (the, of, and ...) kart olarak gelmez, seviye tespitinde gösterilmez.
alter table public.words add column is_function_word boolean not null default false;
