import test from 'node:test';
import assert from 'node:assert/strict';
import { czechSalutation } from '../supabase/functions/_shared/http.ts';

test('all currently used first names receive personal Czech greetings', () => {
  const names = {
    Barbora: 'Barboro', Dagmar: 'Dagmar', Daniela: 'Danielo', Eva: 'Evo', Iva: 'Ivo', Ivana: 'Ivano',
    Jakub: 'Jakube', Jan: 'Jane', Jaroslava: 'Jaroslavo', Katarina: 'Katarino', Klára: 'Kláro',
    Kryštof: 'Kryštofe', Lenka: 'Lenko', Lukáš: 'Lukáši', Martina: 'Martino', Monika: 'Moniko',
    Nikola: 'Nikolo', Ondřej: 'Ondřeji', Pavel: 'Pavle', Petr: 'Petře', Renata: 'Renato',
    Tereza: 'Terezo', Václav: 'Václave', Veronika: 'Veroniko', Zdeňka: 'Zdeňko',
  };
  for (const [name, vocative] of Object.entries(names)) {
    assert.equal(czechSalutation(`${name} Příjmení`), `Ahoj ${vocative}`);
    assert.equal(czechSalutation(`${name.toLocaleUpperCase('cs-CZ')} Příjmení`), `Ahoj ${vocative}`);
    const ascii = name.normalize('NFD').replace(/\p{M}/gu, '');
    assert.equal(czechSalutation(`${ascii} Příjmení`), `Ahoj ${vocative}`);
  }
});

test('honorifics, punctuation, normalization and safe informal fallback', () => {
  assert.equal(czechSalutation(' Ing. Kryštof Fric, Ph.D. '), 'Ahoj Kryštofe');
  assert.equal(czechSalutation('Krys\u030ctof Fric'), 'Ahoj Kryštofe');
  assert.equal(czechSalutation('Katarína Szabová'), 'Ahoj Kataríno');
  for (const unknown of ['', null, undefined, 'Neznámá Přezdívka', '<script>alert(1)</script>', 'constructor', 'toString']) {
    assert.equal(czechSalutation(unknown), 'Ahoj');
  }
});
