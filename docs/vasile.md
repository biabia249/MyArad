# Vasile, the MyArad assistant

Vasile has a dedicated `/vasile` page on web and native. Sign-in is required.
Recommendations use the current `server/data-sources/places.json` catalog, not the
Desktop export or private app data. Tapping a recommendation opens
`/map?place=<catalog-id>` in the app and selects its existing details panel.

The Python retrieval vocabulary and ranking are adapted from the supplied
`ai.py`. The missing hard-coded JSON filename and startup indentation were fixed.
The Python service binds only to 127.0.0.1:8000 and is accessed through the Node
API's authenticated `/city/vasile/*` routes. Groq generates structured responses;
Python validates them against retrieved IDs, and Node resolves IDs back to real
catalog metadata. Unknown locations are discarded instead of linked.

Set this in the ignored `server/.env` file:

```dotenv
GROQ_API_KEY=your_key
GROQ_MODEL=openai/gpt-oss-20b
```

The key is server-side only; never use `EXPO_PUBLIC_GROQ_API_KEY`. User questions,
recent conversation context and relevant public place facts are sent to Groq.
Private messages between citizens, account emails and private plans are not used
as recommendation context.

`~/start-myarad.sh` installs the pinned Python requirements into
`.cache/vasile-venv`, then starts Vasile with the other services. Restart that
launcher after changing the key. No GPU is used. For manual development:

```bash
python3 -m venv .cache/vasile-venv
.cache/vasile-venv/bin/pip install -r server/vasile/requirements.txt
node --use-system-ca --env-file-if-exists=server/.env server/vasile/start.mjs
npm run backend
```

History is stored per user in `city_vasile_messages`, separate from social chat.
Only its owner can fetch or clear it. The UI restores the latest 120 messages;
all saved messages remain in SQLite until the owner clears the conversation.
Failed provider calls do not insert partial turns. Each user may send eight
messages per minute and have one request in flight. Context sent to Groq is
bounded separately from stored history.

Checks:

```bash
node --test server/vasile.test.mjs
.cache/vasile-venv/bin/python -m unittest server.vasile.test_agent
npm run lint
npx tsc --noEmit
```

Groq structured-output documentation: https://console.groq.com/docs/structured-outputs
