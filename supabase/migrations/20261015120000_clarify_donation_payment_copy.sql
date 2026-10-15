update public.instructors
set payment_note = 'Doporučený příspěvek je 150 Kč, jeho výše je ale jen na tobě. Platba prostřednictvím QR kódu směřuje přímo na účet organizace Dobrý anděl.'
where payment_mode = 'donation';

update public.lessons
set payment_note = 'Doporučený příspěvek je 150 Kč, jeho výše je ale jen na tobě. Platba prostřednictvím QR kódu směřuje přímo na účet organizace Dobrý anděl.'
where payment_mode = 'donation';
