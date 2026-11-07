import { ProfileCard, type CitizenProfile } from "./profile-card";
import { useCallback, useEffect, useState } from "react";
import type { CityProps, Language, Place, CityEvent } from "./types";

type Plan = {
  id: string;
  title: string;
  venue: string;
  lat: number;
  lng: number;
  starts_at: string;
  ends_at: string;
};
type Schedule = {
  profile?: CitizenProfile;
  username: string;
  fullName: string;
  public: boolean;
  followers: number;
  following: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  plans: Plan[];
};
const words = {
  ro: {
    title: "Programul meu",
    publicTitle: "Program public",
    subtitle: "Mai puține lucruri uitate. Mai mult timp pentru oraș.",
    private: "Doar tu poți vedea acest program.",
    visible:
      "Oricine are linkul poate vedea întregul tău program, inclusiv locurile și orele.",
    publish: "Program public",
    empty: "Încă nu ai planuri aici.",
    hint: "Alege un loc sau un eveniment de pe hartă și adaugă-l în program.",
    remove: "Elimină",
    preview: "Vezi pagina publică",
    login: "Intră în cont",
    add: "Adaugă în programul meu",
    start: "Data și ora",
    end: "Până la",
    save: "Salvează planul",
    cancel: "Renunță",
    saved: "Adăugat în program.",
    retry: "Reîncearcă",
    signout: "Ieși din cont",
    privacy: "Confidențialitate",
  },
  en: {
    title: "My schedule",
    publicTitle: "Public schedule",
    subtitle: "A little less planning. A little more city.",
    private: "Only you can see this schedule.",
    visible:
      "Anyone with the link can see your entire schedule, including places and times.",
    publish: "Public schedule",
    empty: "No plans here yet.",
    hint: "Choose a place or event on the map and add it to your schedule.",
    remove: "Remove",
    preview: "View public page",
    login: "Sign in",
    add: "Add to my schedule",
    start: "Date and time",
    end: "Until",
    save: "Save plan",
    cancel: "Cancel",
    saved: "Added to your schedule.",
    retry: "Retry",
    signout: "Sign out",
    privacy: "Privacy",
  },
};
export function ScheduleView({
  lang,
  props,
  username,
}: {
  lang: Language;
  props: CityProps;
  username?: string;
}) {
  const t = words[lang];
  const [schedule, setSchedule] = useState<Schedule | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await props.onRequest(
      username
        ? `/city/citizens/${encodeURIComponent(username)}`
        : "/city/schedule",
      null,
    );
    if (r.ok) {
      setSchedule(JSON.parse(r.data));
      setError("");
    } else setError(r.error || "Connection failed");
  }, [props, username]);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
  }, [load]);
  async function change(path: string, data: object) {
    setBusy(true);
    try {
      const r = await props.onRequest(path, JSON.stringify(data));
      if (!r.ok) throw new Error(r.error);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="schedule-page">
      <div className="schedule-title">
        <span className="eyebrow">
          MYARAD / {username ? t.publicTitle : t.title}
        </span>
        <h1>
          {username ? schedule?.fullName || username : t.title}
          <span>.</span>
        </h1>
        <p>{t.subtitle}</p>
      </div>
      {!username && !props.userName ? (
        <div className="schedule-empty">
          <p>{t.hint}</p>
          <button className="primary" onClick={() => void props.onSignIn()}>
            {t.login}
          </button>
        </div>
      ) : (
        <>
          {schedule && (
            <ProfileCard
              name={schedule.fullName}
              username={schedule.username}
              profile={schedule.profile || {}}
              plans={schedule.plans}
              editable={!username}
              followers={schedule.followers || 0}
              following={schedule.following || 0}
              isFollowing={!!schedule.isFollowing}
              canFollow={!!username && !!props.userName && !schedule.isOwnProfile}
              busy={busy}
              onFollow={(following) =>
                change(
                  `/city/citizens/${encodeURIComponent(schedule.username)}/follow`,
                  { following },
                )
              }
              lang={lang}
              props={props}
              onSaved={load}
            />
          )}
          <div className="schedule-privacy">
            {!username && (
              <>
                <div>
                  <h3>{t.privacy}</h3>
                  <p>{schedule?.public ? t.visible : t.private}</p>
                </div>
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={schedule?.public || false}
                    disabled={busy || !schedule}
                    onChange={(e) =>
                      void change("/city/schedule/visibility", {
                        public: e.target.checked,
                      })
                    }
                  />
                  {t.publish}
                </label>
                {schedule?.public && (
                  <button
                    className="secondary"
                    onClick={() =>
                      void props.onNavigate(`/citizen/${schedule.username}`)
                    }
                  >
                    {t.preview} ↗
                  </button>
                )}
              </>
            )}
            {username && (
              <span>
                @{schedule?.username || username} · {t.publicTitle}
              </span>
            )}
          </div>
          {error && (
            <div role="alert" className="schedule-error">
              {error} <button onClick={() => void load()}>{t.retry}</button>
            </div>
          )}
          <div className="schedule-list">
            {schedule?.plans.length ? (
              schedule.plans.map((p) => (
                <article className="plan-card" key={p.id}>
                  <div className="plan-date">
                    <strong>{new Date(p.starts_at).getDate()}</strong>
                    <span>
                      {new Date(p.starts_at).toLocaleDateString(
                        lang === "ro" ? "ro-RO" : "en-GB",
                        { month: "short" },
                      )}
                    </span>
                  </div>
                  <div>
                    <time>
                      {new Date(p.starts_at).toLocaleString(
                        lang === "ro" ? "ro-RO" : "en-GB",
                        {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}{" "}
                      –{" "}
                      {new Date(p.ends_at).toLocaleTimeString(
                        lang === "ro" ? "ro-RO" : "en-GB",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </time>
                    <h3>{p.title}</h3>
                    <p>{p.venue}</p>
                    <button
                      className="text-button"
                      onClick={() =>
                        void props.onDirections(p.lat, p.lng, "walking", "")
                      }
                    >
                      {lang === "ro" ? "Cum ajung?" : "Get directions"} ↗
                    </button>
                  </div>
                  {!username && (
                    <button
                      className="remove-plan"
                      disabled={busy}
                      onClick={() =>
                        void change(`/city/schedule/remove/${p.id}`, {})
                      }
                    >
                      {t.remove}
                    </button>
                  )}
                </article>
              ))
            ) : (
              <div className="schedule-empty">
                <h2>{t.empty}</h2>
                <p>{t.hint}</p>
                <button
                  className="primary"
                  onClick={() => void props.onNavigate("/map")}
                >
                  {lang === "ro" ? "Deschide harta" : "Explore the map"}
                </button>
              </div>
            )}
          </div>
          {!username && props.userName && (
            <button
              className="text-button"
              onClick={() =>
                void props
                  .onSignOut()
                  .then(load)
                  .catch((e) => setError(e.message))
              }
            >
              {t.signout}
            </button>
          )}
        </>
      )}
    </section>
  );
}
export function AddPlan({
  item,
  lang,
  props,
  onDone,
}: {
  item: Place | CityEvent;
  lang: Language;
  props: CityProps;
  onDone: () => void;
}) {
  const t = words[lang];
  const [createdAt] = useState(() => Date.now());
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const local = (d: Date) =>
    new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <section className="add-plan">
      <button
        className="secondary"
        onClick={() => {
          if (!props.userName) {
            void props.onSignIn();
            return;
          }
          setOpen(!open);
        }}
      >
        ＋ {t.add}
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            void props
              .onRequest(
                "/city/schedule",
                JSON.stringify({
                  ...("starts_at" in item
                    ? { event_id: item.id }
                    : { place_id: item.id }),
                  starts_at: new Date(String(f.get("start"))).toISOString(),
                  ends_at: new Date(String(f.get("end"))).toISOString(),
                }),
              )
              .then((r) => {
                if (!r.ok) setError(r.error || "Connection failed");
                else {
                  setOpen(false);
                  onDone();
                }
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            {t.start}
            <input
              type="datetime-local"
              name="start"
              required
              defaultValue={local(
                "starts_at" in item
                  ? new Date(item.starts_at)
                  : new Date(createdAt + 3600000),
              )}
            />
          </label>
          <label>
            {t.end}
            <input
              type="datetime-local"
              name="end"
              required
              defaultValue={local(
                "ends_at" in item
                  ? new Date(item.ends_at)
                  : new Date(createdAt + 7200000),
              )}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={busy}>
            {t.save}
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            {t.cancel}
          </button>
        </form>
      )}
    </section>
  );
}
