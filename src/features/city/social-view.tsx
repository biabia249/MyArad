import { useCallback, useEffect, useRef, useState } from "react";
export type Person = {
  username: string;
  fullName: string;
  photo: string;
  bio?: string;
  status?: string;
  incoming?: boolean;
};
type Message = { id: string; body: string; sender: string; created_at: string };
type Api = <T>(path: string, value?: object) => Promise<T>;
export function Avatar({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="social-avatar">
      {person.photo && !failed ? (
        <img src={person.photo} alt="" onError={() => setFailed(true)} />
      ) : (
        person.fullName.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
export function SocialView({
  api,
  lang,
  signedIn,
  onSignIn,
  onProfile,
}: {
  api: Api;
  lang: string;
  signedIn: boolean;
  onSignIn: () => void;
  onProfile: (username: string) => void;
}) {
  const ro = lang === "ro";
  const [query, setQuery] = useState(""),
    [users, setUsers] = useState<Person[]>([]),
    [friends, setFriends] = useState<Person[]>([]),
    [selected, setSelected] = useState<Person | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const r = await api<{ users: Person[] }>("/city/social/friends");
    setFriends(r.users);
  }, [api]);
  useEffect(() => {
    if (!signedIn) return;
    const controller = { active: true };
    const timer = setTimeout(() => {
      void Promise.all([
        api<{ users: Person[] }>(
          "/city/social/users?q=" + encodeURIComponent(query),
        ),
        api<{ users: Person[] }>("/city/social/friends"),
      ])
        .then(([u, f]) => {
          if (controller.active) {
            setUsers(u.users);
            setFriends(f.users);
            setError("");
          }
        })
        .catch((e) => {
          if (controller.active) setError(e.message);
        });
    }, 300);
    return () => {
      controller.active = false;
      clearTimeout(timer);
    };
  }, [api, query, signedIn]);
  const peer = selected?.username;
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    const timer = setInterval(() => {
      void refresh().catch((e) => {
        if (active) setError(e.message);
      });
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [signedIn, refresh]);
  useEffect(() => {
    if (!peer) return;
    let active = true;
    const load = () => {
      void api<{ messages: Message[] }>("/city/social/messages/" + peer)
        .then((r) => {
          if (active) setMessages(r.messages);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    };
    load();
    const timer = setInterval(load, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [peer, api]);
  const readMessages = useRef(new Set<string>());
  useEffect(() => {
    if (!peer) return;
    let active = true;
    const markRead = () => {
      if (document.visibilityState !== "visible") return;
      const ids = messages
        .filter((m) => m.sender === peer && !readMessages.current.has(m.id))
        .map((m) => m.id);
      if (!ids.length) return;
      void api("/city/social/read/" + peer, { ids })
        .then(() => {
          ids.forEach((id) => readMessages.current.add(id));
          if (active)
            window.dispatchEvent(new Event("myarad:notifications-changed"));
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    window.addEventListener("focus", markRead);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", markRead);
      window.removeEventListener("focus", markRead);
    };
  }, [peer, messages, api]);
  async function act(person: Person, action: string) {
    setBusy(true);
    setError("");
    try {
      await api("/city/social/friend/" + person.username, { action });
      await refresh();
      if (action === "remove" && peer === person.username) setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!signedIn)
    return (
      <section className="social-page">
        <h1>{ro ? "Oamenii din Arad" : "People in Arad"}</h1>
        <p>
          {ro
            ? "Intră în cont pentru a găsi prieteni și a vorbi cu ei."
            : "Sign in to find friends and chat."}
        </p>
        <button className="primary" onClick={onSignIn}>
          {ro ? "Autentificare" : "Sign in"}
        </button>
      </section>
    );
  function row(person: Person) {
    const relationship = friends.find((f) => f.username === person.username);
    return (
      <article className="social-person" key={person.username}>
        <Avatar person={person} />
        <div className="social-person-info">
          <strong>{person.fullName}</strong>
          <small>@{person.username}</small>
          {person.bio && <p>{person.bio}</p>}
          <button onClick={() => onProfile(person.username)}>
            {ro ? "Program public" : "Public schedule"}
          </button>
        </div>
        <div className="social-person-actions">
          {relationship?.status === "accepted" ? (
            <>
              <button
                className="primary"
                onClick={() => {
                  setMessages([]);
                  setSelected(person);
                  setError("");
                }}
              >
                {ro ? "Mesaj" : "Message"}
              </button>
              <button
                disabled={busy}
                onClick={() => void act(person, "remove")}
              >
                {ro ? "Șterge prietenia" : "Unfriend"}
              </button>
            </>
          ) : relationship ? (
            <>
              {relationship.incoming && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void act(person, "accept")}
                >
                  {ro ? "Acceptă" : "Accept"}
                </button>
              )}
              <small>
                {relationship.incoming
                  ? ro
                    ? "Cerere primită"
                    : "Incoming request"
                  : ro
                    ? "Cerere trimisă"
                    : "Request sent"}
              </small>
              <button
                disabled={busy}
                onClick={() => void act(person, "remove")}
              >
                {relationship.incoming
                  ? ro
                    ? "Refuză"
                    : "Decline"
                  : ro
                    ? "Anulează"
                    : "Cancel"}
              </button>
            </>
          ) : (
            <button disabled={busy} onClick={() => void act(person, "request")}>
              {ro ? "Adaugă prieten" : "Add friend"}
            </button>
          )}
        </div>
      </article>
    );
  }
  return (
    <section className="social-page">
      <div className="eyebrow">MYARAD · {ro ? "COMUNITATE" : "COMMUNITY"}</div>
      <h1>{ro ? "Ne vedem în oraș." : "See you around town."}</h1>
      <p>
        {ro
          ? "Găsește oameni, faceți planuri și păstrați legătura."
          : "Find people, make plans and stay in touch."}
      </p>
      {error && (
        <p role="alert" className="social-error">
          {error}
        </p>
      )}
      <div className="social-layout">
        <div>
          <label className="social-search">
            {ro ? "Caută după nume sau username" : "Search by name or username"}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ro ? "Pe cine cauți?" : "Who are you looking for?"}
            />
          </label>
          {query.trim() ? (
            <>
              <h2>{ro ? "Rezultate" : "Results"}</h2>
              {users.map(row)}
              {!users.length && (
                <p>{ro ? "Niciun utilizator găsit." : "No users found."}</p>
              )}
            </>
          ) : (
            <>
              <h2>{ro ? "Prieteni și cereri" : "Friends and requests"}</h2>
              {friends.map(row)}
              {!friends.length && (
                <p>
                  {ro
                    ? "Caută un nume mai sus pentru prima cerere de prietenie."
                    : "Search a name above to send your first friend request."}
                </p>
              )}
              <h2>{ro ? "Descoperă oameni" : "Discover people"}</h2>
              {users
                .filter((u) => !friends.some((f) => f.username === u.username))
                .map(row)}
            </>
          )}
        </div>
        <aside className="social-chat">
          {selected ? (
            <>
              <header>
                <Avatar person={selected} />
                <strong>{selected.fullName}</strong>
                <button
                  aria-label={ro ? "Închide conversația" : "Close conversation"}
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </header>
              <div className="social-messages" aria-live="polite">
                {messages.length ? (
                  messages.map((m) => (
                    <article
                      key={m.id}
                      className={m.sender === selected.username ? "" : "mine"}
                    >
                      <p>{m.body}</p>
                      <small>
                        {new Date(m.created_at).toLocaleString(
                          ro ? "ro-RO" : "en-GB",
                        )}
                      </small>
                    </article>
                  ))
                ) : (
                  <p>{ro ? "Spune salut!" : "Say hello!"}</p>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (busy || !draft.trim()) return;
                  setBusy(true);
                  setError("");
                  void api("/city/social/messages/" + selected.username, {
                    body: draft,
                  })
                    .then(async () => {
                      setDraft("");
                      const r = await api<{ messages: Message[] }>(
                        "/city/social/messages/" + selected.username,
                      );
                      setMessages(r.messages);
                    })
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                <label className="social-compose">
                  {ro ? "Mesaj" : "Message"}
                  <textarea
                    maxLength={2000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    required
                  />
                </label>
                <button className="primary" disabled={busy || !draft.trim()}>
                  {ro ? "Trimite" : "Send"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>
                {ro
                  ? "O conversație bună începe cu un salut."
                  : "A good conversation starts with hello."}
              </h2>
              <p>
                {ro
                  ? "Selectează un prieten pentru a deschide chatul."
                  : "Select a friend to open the chat."}
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
