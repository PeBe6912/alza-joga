const CONTENT = `# Jóga na HALLU

> Rezervační web pro lekce jógy ve 3. patře budovy HALL, určené zaměstnancům Alzy a jejich hostům.

## Hlavní informace

- Místo: jógová místnost, 3. patro, budova HALL
- Lektoři: Daniela Šťastná a Petr Bena
- Délka skupinové lekce: 60 minut
- Kapacita skupinové lekce: maximálně 20 osob
- Vybavení: podložky a pomůcky jsou k dispozici na místě
- Cena: 150 Kč nebo dobrovolný příspěvek dle informací u konkrétní lekce
- Zrušení rezervace: nejpozději 24 hodin před začátkem lekce
- Kontakt: petr.bena@alza.cz

## Důležité stránky

- Web: https://joganahallu.cz/
- Cesta jógové praxe a milníky: https://joganahallu.cz/cesta-praxe
- Podmínky: https://joganahallu.cz/podminky
- Ochrana osobních údajů: https://joganahallu.cz/ochrana-osobnich-udaju
- XML sitemap: https://joganahallu.cz/sitemap.xml

## Aktuální lekce

Aktuální termíny, lektor, cena, jazyk, kapacita a dostupnost míst jsou vždy uvedeny na hlavní stránce a na veřejné stránce konkrétní lekce. Údaje u konkrétní lekce mají přednost před tímto souhrnem.
`;

export function onRequestGet() {
  return new Response(CONTENT, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
