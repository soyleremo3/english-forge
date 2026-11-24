-- Liste kelimeleri (source, lemma) ile tekil. Seed betiği bu kısıtla upsert yapar.
-- Eski kısmi indeks (source, lemma, pos) ON CONFLICT ile kullanılamıyordu ve pos değişirse kopya üretebiliyordu.
drop index if exists public.words_list_lemma_pos_key;
alter table public.words add constraint words_source_lemma_key unique (source, lemma);
