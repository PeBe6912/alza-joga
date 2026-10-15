alter table public.instructors
  add column if not exists practice_quote text not null default '';

update public.instructors
set practice_quote = 'Ve svých lekcích aktivně asistuji cvičícím, využívám éterické oleje a zpěv manter. Jsem zvědavá na vaši jógovou cestu a budu se na vás těšit.'
where name = 'Daniela Šťastná'
  and practice_quote = '';

update public.instructors
set practice_quote = 'V roce 2026 jsem v Ubudu na Bali dokončil 200hodinový kurz pro učitele power a vinyasa jógy. Chci vytvářet lekce, na kterých se lidé cítí podporováni a zároveň přiměřeně vyzváni. Nejbližší je mi strong slow flow.'
where name = 'Petr Bena'
  and practice_quote = '';
