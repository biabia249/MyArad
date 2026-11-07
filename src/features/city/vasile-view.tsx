import { useEffect, useRef, useState } from "react";
import "./vasile.css";
type Recommendation = {
  place_id: string;
  name: string;
  address: string;
  locality: string;
  reason: string;
};
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  recommendations: Recommendation[];
};
type Api = <T>(path: string, value?: object) => Promise<T>;
export function VasileView({
  api,
  lang,
  signedIn,
  onSignIn,
  onPlace,
}: {
  api: Api;
  lang: string;
  signedIn: boolean;
  onSignIn: () => void;
  onPlace: (id: string) => void;
}) {
  const ro = lang === "ro";
  const [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(""),
    [clearing, setClearing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void api<{ messages: Message[] }>("/city/vasile/history")
      .then((r) => {
        if (active) setMessages(r.messages);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, signedIn]);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "end",
    });
  }, [messages, pending]);
  async function send(value = draft) {
    const text = value.trim();
    if (!text || busy || loading) return;
    setBusy(true);
    setError("");
    setDraft("");
    setPending(text);
    try {
      const r = await api<{ messages: Message[] }>("/city/vasile/chat", {
        message: text,
      });
      setMessages((old) => [...old, ...r.messages]);
    } catch (e) {
      setError((e as Error).message);
      setDraft(text);
    } finally {
      setPending("");
      setBusy(false);
    }
  }
  if (!signedIn)
    return (
      <section className="vasile-page">
        <div className="vasile-heading">
          <span className="vasile-monogram">V</span>
          <div>
            <span className="eyebrow">MYARAD · VASILE</span>
            <h1>
              {ro ? "Hai să găsim un loc." : "Let’s find your next stop."}
            </h1>
            <p>
              {ro
                ? "Intră în cont și întreabă-l pe Vasile unde merită să mergi."
                : "Sign in and ask Vasile where to go next."}
            </p>
          </div>
        </div>
        <button className="primary" onClick={onSignIn}>
          {ro ? "Intră în cont" : "Sign in"}
        </button>
      </section>
    );
  return (
    <section className="vasile-page">
      <header className="vasile-heading">
        <span className="vasile-monogram">V</span>
        <div>
          <span className="eyebrow">
            {ro ? "ASISTENTUL MYARAD" : "YOUR MYARAD GUIDE"}
          </span>
          <h1>Vasile</h1>
          <p>
            {ro
              ? "Locuri din Arad, pe gustul tău."
              : "Places in Arad, picked for you."}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            className="vasile-clear"
            disabled={busy}
            onClick={() => setClearing(!clearing)}
          >
            {ro ? "Șterge conversația" : "Clear conversation"}
          </button>
        )}
      </header>
      {clearing && (
        <div className="vasile-confirm">
          <p>
            {ro
              ? "Ștergi istoricul conversației tale cu Vasile?"
              : "Delete your conversation history with Vasile?"}
          </p>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void api("/city/vasile/clear", {})
                .then(() => {
                  setMessages([]);
                  setClearing(false);
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            {ro ? "Da, șterge" : "Yes, delete"}
          </button>
          <button onClick={() => setClearing(false)}>
            {ro ? "Renunță" : "Cancel"}
          </button>
        </div>
      )}
      <div
        className="vasile-chat-scroll"
        role="log"
        aria-label={ro ? "Conversația cu Vasile" : "Conversation with Vasile"}
        aria-live="polite"
        aria-busy={busy}
      >
        {loading ? (
          <p>{ro ? "Se încarcă conversația…" : "Loading your conversation…"}</p>
        ) : (
          !messages.length &&
          !pending && (
            <div className="vasile-welcome">
              <h2>
                {ro
                  ? "Cu ce ai chef să începi?"
                  : "What are you in the mood for?"}
              </h2>
              <p>
                {ro
                  ? "O cafea, o plimbare sau un loc pe care încă nu l-ai descoperit? Spune-mi ce cauți."
                  : "Coffee, a walk, or somewhere you haven’t discovered yet? Tell me what you’re looking for."}
              </p>
              <div className="vasile-suggestions">
                {(ro
                  ? [
                      "Unde pot bea o cafea?",
                      "Vreau o plimbare în natură",
                      "Ce pot vedea în Arad?",
                    ]
                  : [
                      "Where can I get coffee?",
                      "I’d like a walk in nature",
                      "What can I visit in Arad?",
                    ]
                ).map((q) => (
                  <button key={q} disabled={busy} onClick={() => void send(q)}>
                    {q} →
                  </button>
                ))}
              </div>
            </div>
          )
        )}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`vasile-message ${message.role}`}
          >
            <strong>
              {message.role === "assistant" ? "Vasile" : ro ? "Tu" : "You"}
            </strong>
            <p>{message.content}</p>
            {message.recommendations?.length > 0 && (
              <div className="vasile-recommendations">
                {message.recommendations.map((place) => (
                  <button
                    key={place.place_id}
                    className="vasile-place-card"
                    onClick={() => onPlace(place.place_id)}
                  >
                    <span>
                      <strong>{place.name}</strong>
                      <small>
                        {[place.locality, place.address]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      <p>{place.reason}</p>
                    </span>
                    <span className="vasile-card-arrow" aria-hidden="true">
                      ↗
                    </span>
                    <span className="vasile-card-label">
                      {ro ? "Vezi locul" : "View place"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
        {pending && (
          <>
            <article className="vasile-message user">
              <strong>{ro ? "Tu" : "You"}</strong>
              <p>{pending}</p>
            </article>
            <article className="vasile-message assistant vasile-thinking">
              <span className="vasile-typing" aria-hidden="true">
                •••
              </span>
              <span>
                {ro
                  ? "Vasile caută câteva idei…"
                  : "Vasile is finding a few ideas…"}
              </span>
            </article>
          </>
        )}
        <div ref={end} />
      </div>
      {error && (
        <p className="vasile-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="vasile-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="vasile-message">
          {ro ? "Întreabă-l pe Vasile" : "Ask Vasile"}
        </label>
        <div>
          <textarea
            id="vasile-message"
            maxLength={2000}
            rows={2}
            required
            disabled={busy || loading}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              ro
                ? "Ce ți-ar plăcea să faci în Arad?"
                : "What would you like to do in Arad?"
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="primary"
            disabled={busy || loading || !draft.trim()}
          >
            {busy ? "…" : ro ? "Trimite" : "Send"}
          </button>
        </div>
        <small>
          {ro
            ? "Recomandări din catalogul MyArad. Conversația este salvată în contul tău."
            : "Recommendations from the MyArad catalog. This conversation is saved to your account."}
        </small>
      </form>
    </section>
  );
}
