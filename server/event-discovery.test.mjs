import test from 'node:test';
import assert from 'node:assert/strict';
import { eventPhase, sourceKind, parseOfficialListing, discoverEvents } from './event-discovery.mjs';
import { plain } from './event-news.mjs';

test('current and upcoming classification uses event times, never article publication', () => {
  const now = Date.parse('2026-11-07T12:00:00Z');
  assert.equal(eventPhase({ starts_at: '2026-11-07T13:00:00+02:00', ends_at: '2026-11-07T15:00:00+02:00' }, now), 'now');
  assert.equal(eventPhase({ starts_at: '2026-11-08T19:00:00+02:00' }, now), 'upcoming');
  assert.equal(eventPhase({ published_at: '2026-11-07T12:00:00Z' }, now), 'unconfirmed');
  assert.equal(eventPhase({ starts_at: '2026-11-07T10:00:00Z' }, now), 'unconfirmed');
  assert.equal(eventPhase({ starts_at: '2026-11-08T19:00:00+02:00', event_status: 'https://schema.org/EventCancelled' }, now), 'changed');
});
test('official labels use an exact host allowlist', () => {
  assert.equal(sourceKind('https://www.cmcarad.ro/public/ro/evenimente'), 'official');
  assert.equal(sourceKind('https://cmcarad.ro.example.com/'), 'editorial');
  assert.equal(sourceKind('https://www.facebook.com/events/123'), 'social');
});
test('official listing ignores external links and deduplicates article anchors', () => {
  const html = '<a href="/public/ro/eveniment/1016/targ">Târgul de Crăciun din Arad</a><a href="/public/ro/eveniment/1016/targ">Târgul de Crăciun din Arad</a><a href="https://evil.example/public/ro/eveniment/1/a">Anunț fals în afara sursei</a>';
  const result = parseOfficialListing(html, plain);
  assert.equal(result.length, 1);
  assert.equal(result[0].source_kind, 'official');
});
test('search covers niche and major events without marking social results official', async () => {
  const queries = [];
  const result = await discoverEvents(async (url) => {
    queries.push(new URL(url).searchParams.get('q'));
    return JSON.stringify({ web: { results: [{ url: 'https://www.facebook.com/events/123', title: 'Atelier în Arad', description: 'Atelier mic pentru comunitate' }] } });
  }, plain, 'ceramică', 'test-key');
  assert.equal(queries.length, 4);
  assert.ok(queries.some((q) => q.includes('atelier')));
  assert.ok(queries.every((q) => q.includes('ceramică')));
  assert.ok(result.articles.every((a) => a.source_kind === 'social'));
  assert.equal((await discoverEvents(() => { throw new Error('must not fetch'); }, plain, '', '')).sources[0].configured, false);
});

test('Tavily uses authenticated POST and normalizes result content', async () => {
  let calls = 0;
  const result = await discoverEvents(async (url, headers, options) => {
    calls++;
    assert.equal(url, 'https://api.tavily.com/search');
    assert.equal(headers.Authorization, 'Bearer test-key');
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    assert.equal(body.search_depth, 'basic');
    assert.equal(body.auto_parameters, false);
    return JSON.stringify({ results: [{ url: 'https://www.facebook.com/events/1', title: 'Atelier Arad', content: 'Atelier de ceramică în Arad' }] });
  }, plain, 'ceramică', 'test-key', 'tavily');
  assert.equal(calls, 4);
  assert.equal(result.articles[0].description, 'Atelier de ceramică în Arad');
  assert.ok(result.sources.every((s) => s.ok && s.provider === 'tavily'));
});
