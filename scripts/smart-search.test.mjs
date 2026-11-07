import test from 'node:test';
import assert from 'node:assert/strict';
import { smartSearchScore } from '../src/features/city/smart-search.ts';
test('handles accents, transpositions, missing letters and reordered words', () => {
  for (const query of ['ghiorc lac', 'lacul ghioroc', 'lac ghirooc', 'GHÍOROC']) assert.ok(smartSearchScore(query, 'Lacul Ghioroc') > 0, query);
});
test('understands common intent and school aliases', () => {
  assert.ok(smartSearchScore('vreau o cafea', 'Cafeneaua X', 'cafe') > 0);
  assert.ok(smartSearchScore('scoala8', 'Generală 8') > 0);
  assert.ok(smartSearchScore('muzeee', 'Muzeul de Artă') > 0);
});
test('does not silently change numbers or return unrelated locations', () => {
  assert.equal(smartSearchScore('scoala 18', 'Generală 8'), 0);
  assert.equal(smartSearchScore('ghioroc', 'Moneasa'), 0);
  assert.ok(smartSearchScore('Lacul Ghioroc', 'Lacul Ghioroc') > smartSearchScore('lac ghirooc', 'Lacul Ghioroc'));
});
