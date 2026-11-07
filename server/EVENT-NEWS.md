# Event discovery

`GET /city/event-news?q=ceramic%C4%83` searches the public event feed. `q` is optional and capped at 100 characters. The response contains articles, source health, `socialEnabled`, `updated_at` and `stale`.

Without credentials, the server reads Arad Culture / Aradon RSS and the official CMC Arad event listing. Each source can fail independently. Refresh results are cached for five minutes per search; concurrent requests for the same search share a fetch. The cache is bounded to 20 searches.

## Enable public web/social discovery

1. Create a Tavily API key at https://app.tavily.com/ (or a Brave Search API subscription at https://api-dashboard.search.brave.com/).
2. Set `TAVILY_API_KEY` or `BRAVE_SEARCH_API_KEY` in `server/.env` (never `.env.local` or an `EXPO_PUBLIC_` variable). Tavily takes priority when both exist.
3. Restart `npm run backend`.

Discovery performs four search requests per uncached query: official institutions, Facebook/Instagram/TikTok, small workshops/community events, and concerts/festivals/sport. Tavily uses basic search with automatic parameters disabled (four basic-search credits per uncached query). Account quotas and provider limits apply. This searches publicly indexed announcements; it does not access private profiles or guarantee coverage of every social post. No social login is needed. Publisher URLs remain attached to each article.

`source_kind` distinguishes allowlisted official institution domains, social networks and editorial/organiser websites. A social search result is not automatically an official announcement. `phase` is `now`, `upcoming`, `past`, `changed` or `unconfirmed`. Only explicit event start/end metadata determines “now”; publication dates and search snippets never imply a running event. Missing schedules remain unconfirmed. On the client, MyArad community events use their entered event times.

Known ambiguity: a publisher may omit machine-readable event dates or precise coordinates. Such articles remain readable and link to the original announcement, but are not labelled as happening now. Map locations require a matching known place or publisher-provided local coordinates.
