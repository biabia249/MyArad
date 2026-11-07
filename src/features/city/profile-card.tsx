import { useState } from "react";
import type { CityProps, Language } from "./types";
import { ProfileConnections } from './profile-connections';
export type CitizenProfile = {
  bio?: string;
  location?: string;
  interests?: string;
  photo?: string;
};
export function ProfileCard({
  name,
  username,
  profile,
  plans,
  editable,
  friends,
  lang,
  props,
  onSaved,
}: {
  name: string;
  username: string;
  profile: CitizenProfile;
  plans: { venue: string; starts_at: string }[];
  editable: boolean;
  friends: number;
  lang: Language;
  props: CityProps;
  onSaved: () => Promise<void>;
}) {
  const ro = lang === "ro";
  const [editing, setEditing] = useState(false),
    [photo, setPhoto] = useState(profile.photo || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="citizen-profile">
      <div className="profile-identity">
        <div className="profile-avatar">
          {profile.photo ? (
            <img src={profile.photo} alt={name} />
          ) : (
            <span>
              {name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
          )}
        </div>
        <div>
          <span className="profile-handle">@{username}</span>
          <h2>{name}</h2>
          {profile.location && (
            <p className="profile-location">⌖ {profile.location}</p>
          )}
        </div>
        {editable && (
          <button
            className="secondary"
            onClick={() => {
              setPhoto(profile.photo || "");
              setEditing(!editing);
            }}
          >
            {ro ? "Editează profilul" : "Edit profile"}
          </button>
        )}

      </div>
      <p className="profile-bio">
        {profile.bio ||
          (editable
            ? ro
              ? "Spune-le celorlalți câte ceva despre tine."
              : "Tell people a little about yourself."
            : "")}
      </p>
      {profile.interests && (
        <div className="profile-interests">
          {profile.interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s, i) => (
              <span key={i}>{s}</span>
            ))}
        </div>
      )}
      <div className="profile-stats">
        <span>
          <strong>{plans.length}</strong>
          {ro ? "planuri" : "plans"}
        </span>
        <span>
          <strong>{new Set(plans.map((p) => p.venue)).size}</strong>
          {ro ? "locuri" : "places"}
        </span>
      </div>
      <ProfileConnections key={`${username}-${friends}`} username={username} friends={friends} props={props} lang={lang} />
      {editing && (
        <form
          className="profile-editor"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            void props
              .onRequest(
                "/city/profile",
                JSON.stringify({
                  fullName: f.get("fullName"),
                  bio: f.get("bio"),
                  location: f.get("location"),
                  interests: f.get("interests"),
                  photo,
                }),
              )
              .then(async (r) => {
                if (!r.ok) throw new Error(r.error);
                await onSaved();
                setEditing(false);
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            {ro
              ? "Fotografie · PNG, JPEG sau WebP, maximum 1 MB"
              : "Photo · PNG, JPEG or WebP, up to 1 MB"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1048576) {
                  setError(
                    ro
                      ? "Fotografia trebuie să aibă maximum 1 MB."
                      : "Photo must be under 1 MB.",
                  );
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setPhoto(String(reader.result));
                  setError("");
                };
                reader.onerror = () =>
                  setError(
                    ro ? "Nu pot citi fotografia." : "Unable to read photo.",
                  );
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {photo && (
            <div className="photo-preview">
              <img src={photo} alt="Preview" />
              <button type="button" onClick={() => setPhoto("")}>
                {ro ? "Elimină fotografia" : "Remove photo"}
              </button>
            </div>
          )}
          <label>
            {ro ? "Nume" : "Name"}
            <input
              name="fullName"
              defaultValue={name}
              required
              maxLength={100}
            />
          </label>
          <label>
            {ro ? "Despre mine" : "About me"}
            <textarea
              name="bio"
              defaultValue={profile.bio}
              maxLength={500}
              placeholder={
                ro
                  ? "Locuri preferate, pasiuni, lucruri care te aduc în oraș…"
                  : "Favourite places, interests, what brings you into the city…"
              }
            />
          </label>
          <label>
            {ro ? "Localitate / cartier" : "City / neighbourhood"}
            <input
              name="location"
              defaultValue={profile.location}
              maxLength={80}
            />
          </label>
          <label>
            {ro
              ? "Interese, separate prin virgulă"
              : "Interests, separated by commas"}
            <input
              name="interests"
              defaultValue={profile.interests}
              maxLength={160}
              placeholder="cafea, muzică, bicicletă"
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "…" : ro ? "Salvează profilul" : "Save profile"}
          </button>
        </form>
      )}
    </section>
  );
}
