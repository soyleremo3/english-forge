-- 1) İtirazla kabul edilen cevaplar yöne göre ayrılır (SPEC 5.6, 11).
--    accepted_answers_en: TR→EN sorularında kabul edilen İngilizce cevaplar
--    accepted_answers_tr: EN→TR sorularında kabul edilen Türkçe cevaplar
alter table public.user_words
  add column accepted_answers_en text[] not null default '{}',
  add column accepted_answers_tr text[] not null default '{}';

-- Eski tek liste boştu; yine de kayıt varsa İngilizce listeye taşı (yön bilinmiyor).
update public.user_words
  set accepted_answers_en = accepted_answers
  where cardinality(accepted_answers) > 0;

alter table public.user_words drop column accepted_answers;

-- 2) Yeni kelime kuyruğu: kullanıcının hiç kaydı olmayan NGSL kelimeleri, sıklık sırasıyla.
--    İşlev kelimeleri ve Türkçe anlamı boş kelimeler kuyruğa girmez (SPEC 5.1).
--    security invoker: RLS geçerli, auth.uid() çağıranın kendisi.
create or replace function public.next_fresh_words(p_limit integer)
returns setof public.words
language sql
stable
security invoker
set search_path = ''
as $$
  select w.*
  from public.words w
  where w.source = 'ngsl'
    and not w.is_function_word
    and cardinality(w.tr_meanings) > 0
    and not exists (
      select 1 from public.user_words uw
      where uw.word_id = w.id and uw.user_id = (select auth.uid())
    )
  order by w.rank nulls last, w.id
  limit greatest(least(p_limit, 100), 0);
$$;

revoke all on function public.next_fresh_words(integer) from public, anon;
grant execute on function public.next_fresh_words(integer) to authenticated;
