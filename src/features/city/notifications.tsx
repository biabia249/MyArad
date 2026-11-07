import { useCallback, useEffect, useRef, useState } from "react";
type Item = {
  id: string;
  kind: string;
  fullName: string;
  username: string;
  created_at: string;
  seen: number;
  preview?: string | null;
};
type Inbox = { unread: number; items: Item[] };
export function Notifications({
  api,
  ro,
  onOpen,
}: {
  api: <T>(path: string, value?: object) => Promise<T>;
  ro: boolean;
  onOpen: () => void;
  onEnablePush: () => Promise<void>;
}) {
  const [inbox, setInbox] = useState<Inbox>({ unread: 0, items: [] }),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const known = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<Item | null>(null);
  const control = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!control.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      5400,
    );
    return () => clearTimeout(timer);
  }, [toast]);
  const refresh = useCallback(async () => {
    const r = await api<Inbox>("/city/social/notifications");
    setInbox(r);
    setError("");
  }, [api]);
  useEffect(() => {
    let active = true;
    const load = () => {
      if (document.hidden || pending.current) return;
      pending.current = true;
      void api<Inbox>("/city/social/notifications")
        .then((r) => {
          if (active) {
            const arrived = known.current
              ? r.items.find(
                  (n) =>
                    !n.seen &&
                    !known.current!.has(n.id) &&
                    n.kind === "message",
                )
              : null;
            known.current = new Set(r.items.map((n) => n.id));
            if (arrived) setToast(arrived);
            else
              setToast((current) =>
                current && r.items.some((n) => n.id === current.id && !n.seen)
                  ? current
                  : null,
              );
            setInbox(r);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        }).finally(() => { pending.current = false; });
    };
    load();
    const timer = setInterval(load, 5000);
    window.addEventListener("focus", load);
    window.addEventListener("myarad:notifications-changed", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("myarad:notifications-changed", load);
    };
  }, [api]);
  return (
    <div className="notification-control" ref={control}>
      {toast && (
        <aside
          key={toast.id}
          className="message-toast"
          role="status"
          aria-live="polite"
        >
          <strong>{toast.fullName}</strong>
          <p className="message-toast-preview">
            {toast.preview ||
              (ro ? "Ți-a trimis un mesaj nou" : "Sent you a new message")}
          </p>
          <button
            onClick={() => {
              setToast(null);
              onOpen();
            }}
          >
            {ro ? "Vezi mesajele" : "View messages"}
          </button>
          <button
            aria-label={ro ? "Închide notificarea" : "Dismiss notification"}
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </aside>
      )}
      <button
        className="notification-bell"
        aria-label={ro ? `Notificări${inbox.unread ? `, ${inbox.unread} necitite` : ''}` : `Notifications${inbox.unread ? `, ${inbox.unread} unread` : ''}`}
        aria-expanded={open}
        aria-controls="notification-inbox"
        onClick={() => {
          setOpen(!open);
          void refresh().catch((e) => setError(e.message));
        }}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9 21h6" />
        </svg>
        {inbox.unread > 0 && (
          <span className="notification-badge">
            {inbox.unread > 99 ? "99+" : inbox.unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id="notification-inbox"
          className="notification-popover"
          aria-label={ro ? "Notificări recente" : "Recent notifications"}
        >
          <header>
            <strong>{ro ? "Notificări" : "Notifications"}</strong>
            <button
              aria-label={ro ? "Închide" : "Close"}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          {error && <p role="alert">{error}</p>}
          {inbox.unread > 0 && (
            <button
              onClick={() => {
                void api("/city/social/notifications", {
                  ids: inbox.items.filter((n) => !n.seen).map((n) => n.id),
                })
                  .then(refresh)
                  .catch((e) => setError(e.message));
              }}
            >
              {ro ? "Marchează ca citite" : "Mark as read"}
            </button>
          )}
          {!inbox.items.length && (
            <p>
              {ro
                ? "Ești la zi. Cererile și mesajele noi vor apărea aici."
                : "You’re all caught up. New requests and messages will appear here."}
            </p>
          )}
          {inbox.items.map((n) => (
            <button
              className={"notification-item " + (!n.seen ? "unread" : "")}
              key={n.id}
              onClick={() => {
                void api("/city/social/notifications", { ids: [n.id] })
                  .then(() => {
                    setOpen(false);
                    onOpen();
                  })
                  .catch((e) => setError(e.message));
              }}
            >
              <strong>{n.fullName}</strong>
              <span>
                {n.kind === "request"
                  ? ro
                    ? "Ți-a trimis o cerere de prietenie"
                    : "Sent you a friend request"
                  : n.kind === "accepted"
                    ? ro
                      ? "A acceptat cererea de prietenie"
                      : "Accepted your friend request"
                    : ro
                      ? "Ți-a trimis un mesaj"
                      : "Sent you a message"}
              </span>
              <small>
                {new Date(n.created_at).toLocaleString(ro ? "ro-RO" : "en-GB")}
              </small>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
