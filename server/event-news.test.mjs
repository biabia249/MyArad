import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventNews, parseFeed, eventMetadata, locateArticle } from './event-news.mjs';

test('RSS keeps source dates distinct from event dates and strips markup', () => {
  const [article] = parseFeed('<rss><item><title><![CDATA[Concert &amp; artă]]></title><link>https://aradculture.ro/concert</link><pubDate>Fri, 06 Nov 2026 12:00:00 GMT</pubDate><description><![CDATA[<p>La teatru</p><img src="https://aradculture.ro/a.jpg">]]></description></item></rss>', 'Cultură');
  assert.equal(article.title, 'Concert & artă');
  assert.equal(article.description, 'La teatru');
  assert.equal(article.starts_at, undefined);
  assert.equal(article.published_at, '2026-11-06T12:00:00.000Z');
});
test('only explicit event metadata supplies schedule and local coordinates', () => {
  const value = eventMetadata('<script type="application/ld+json">{"@graph":[{"@type":"MusicEvent","startDate":"2026-11-14T19:00:00+02:00","location":{"name":"Teatru","geo":{"latitude":46.17,"longitude":21.31}}}]}</script>');
  assert.equal(value.starts_at, '2026-11-14T19:00:00+02:00');
  assert.equal(value.confirmed_location.name, 'Teatru');
  assert.equal(locateArticle({ title: 'Concert în Arad', description: '' }, []).location, null);
});
test('refresh coalesces requests and marks unavailable feeds honestly', async () => {
  let count = 0;
  const feed = createEventNews(async () => { count++; return { ok: true, text: async () => '<rss><item><title>Concert</title><link>https://example.org/article</link></item></rss>' }; });
  const [a, b] = await Promise.all([feed([]), feed([])]);
  assert.equal(count, 3);
  assert.deepEqual(a, b);
  assert.equal(a.articles.length, 1);
  await feed([]);
  assert.equal(count, 3);
  const offline = await createEventNews(async () => { throw new Error('offline'); })([]);
  assert.equal(offline.stale, true);
  assert.equal(offline.updated_at, null);
});

test('partial publisher dates are unconfirmed instead of becoming January 1', () => {
  for (const date of ['2026','2026-01','1',null]) {
    const data={'@type':'Event',startDate:date,endDate:date};
    const parsed=eventMetadata(`<script type="application/ld+json">${JSON.stringify(data)}</script>`);
    assert.equal(parsed.starts_at,null);
    assert.equal(parsed.ends_at,null);
  }
});
