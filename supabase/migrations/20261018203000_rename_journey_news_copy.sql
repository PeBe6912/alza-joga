update public.news_items
set
  summary = 'Nová Cesta jógové praxe připomíná společné milníky bez závodění a bez tlaku.',
  body = 'V účtu nově uvidíš počet skutečně absolvovaných lekcí, svůj aktuální status a cestu k dalšímu milníku. Pokud budeš chtít, můžeš si zvolit veřejné jméno a dobrovolně se zobrazit mezi prvními 20 účastníky na stránce Cesta jógové praxe. Statusy nehodnotí pokročilost, flexibilitu ani úroveň jógy. Připomínají jen čas, který jsme společně strávili na podložce.'
where title = 'Každá lekce je krok na cestě';
