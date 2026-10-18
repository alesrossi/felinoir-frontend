"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Check, Pencil, Share2, TriangleAlert, X } from "lucide-react";
import { useLang } from "@/lib/lang";
import { PosterImage } from "@/components/ui/poster-image";
import { CinemaPageNav } from "@/app/cinemas/[id]/cinema-page-nav";
import { moviePath } from "@/lib/structured-data/constants";
import { downloadShowingIcs } from "@/lib/showing-actions";
import { lobbyErrorText, lobbyRequest, rememberName, rememberedName, type LobbyResult } from "@/lib/lobby-client";
import type { ApiLobby, ApiLobbyParticipant } from "@/lib/api/lobbies";

const POLL_MS = 1000;

const fieldClass =
  "w-full rounded-xl bg-foreground/[0.05] px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 ring-1 ring-inset ring-foreground/10 outline-none focus:ring-2 focus:ring-roman/50";
const iconButton = "btn-roman grid size-8 shrink-0 place-items-center rounded-full active:scale-[0.92]";

/** "venerdì 17 ottobre" from a Rome wall clock, independent of the device's timezone. */
function formatDate(datetime: string, locale: string): string {
  const [y, mo, d] = datetime.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}

export function LobbyView({ id, initial }: { id: string; initial: ApiLobby | null }) {
  const { t, locale } = useLang();
  const [lobby, setLobby] = useState<ApiLobby | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(initial?.version ?? 0);

  /** Apply a lobby from any source, ignoring anything older than what's shown. */
  const apply = useCallback((next: ApiLobby) => {
    if (next.version < versionRef.current) return;
    versionRef.current = next.version;
    setLobby(next);
  }, []);

  // Poll every second while the tab is visible; 304 when nothing changed.
  useEffect(() => {
    if (!initial) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    async function poll() {
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/lobbies/${id}?ifVersion=${versionRef.current}`, { cache: "no-store" });
          if (res.status === 200) apply(await res.json());
          else if (res.status === 404) { setLobby(null); stopped = true; }
        } catch {}
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    }
    timer = setTimeout(poll, POLL_MS);
    const onVisible = () => { if (!document.hidden) { clearTimeout(timer); poll(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [id, initial, apply]);

  /** Run a change; returns true on success. Errors show under the list. */
  const run = useCallback(async (req: Promise<LobbyResult>): Promise<boolean> => {
    setError(null);
    const res = await req;
    if (res.ok) { apply(res.lobby); return true; }
    if (res.status === 404 && res.error === "not_found") {
      // Either the lobby or the participant is gone — the next poll will tell which.
      versionRef.current = 0;
    }
    setError(lobbyErrorText(t, res.error));
    return false;
  }, [apply, t]);

  if (!lobby) return <LobbyMissing />;

  const s = lobby.screening;
  const title = locale === "en" ? (s.movieTitleEn ?? s.movieTitle) : s.movieTitle;
  const time = s.datetime.slice(11, 16);
  const dateLabel = formatDate(s.datetime, locale);
  const filmHref = s.movieId != null ? moviePath({ id: s.movieId, slug: s.movieSlug ?? undefined }) : null;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <CinemaPageNav />

      {/* Event */}
      <header className="mt-4 flex gap-4">
        <PosterImage
          primary={s.posterUrl ?? undefined}
          alt=""
          className="w-24 aspect-[2/3] shrink-0 rounded-lg object-cover ring-1 ring-foreground/10 shadow-lg"
          placeholderClassName="w-24 aspect-[2/3] shrink-0 rounded-lg bg-foreground/[0.06]"
        />
        <div className="min-w-0 pt-1">
          <h1 className="font-serif text-2xl font-medium leading-tight tracking-[-0.015em] text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm font-medium text-foreground/80">{s.cinemaName}</p>
          <p className="mt-0.5 text-sm text-foreground/60">
            <span className="capitalize">{dateLabel}</span> · <span className="tabular-nums">{time}</span>
          </p>
          <div className="mt-2 flex gap-1">
            {s.isOV && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-roman-muted ring-1 ring-inset ring-roman/35">OV</span>}
            {s.is3D && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-foreground/60 ring-1 ring-inset ring-foreground/20">3D</span>}
          </div>
        </div>
      </header>

      {!s.available && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {t.lobby.unavailable}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ShareButton title={`${title} · ${s.cinemaName}`} text={`${dateLabel}, ${time}`} />
        {s.bookingUrl && (
          <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-roman inline-flex h-9 items-center gap-1 rounded-full pl-4 pr-3 text-sm font-medium active:scale-[0.97]">
            {t.cinema.book}
            <ArrowUpRight className="size-3.5" />
          </a>
        )}
        {filmHref && (
          <Link href={filmHref} className="btn-roman inline-flex h-9 items-center rounded-full px-4 text-sm font-medium active:scale-[0.97]">
            {t.lobby.filmPage}
          </Link>
        )}
        <button
          onClick={() => downloadShowingIcs(
            { id: s.screeningId ?? 0, datetime: s.datetime, time, isOV: s.isOV, is3D: s.is3D, bookingUrl: s.bookingUrl },
            { movieTitle: title, cinemaName: s.cinemaName },
          )}
          aria-label={t.schedule.addToCalendar}
          title={t.schedule.addToCalendar}
          className="btn-roman grid size-9 place-items-center rounded-full active:scale-[0.92]"
        >
          <CalendarPlus className="size-4" />
        </button>
      </div>

      <NoteBlock note={lobby.note} onSave={(note) => run(lobbyRequest("PATCH", `/${id}`, { note }))} />

      {/* People */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">{t.lobby.going(lobby.participants.length)}</h2>

        {!lobby.meId && (
          <JoinForm onJoin={(name) => run(lobbyRequest("POST", `/${id}/participants`, { name }))} showClaimHint={lobby.participants.length > 0} />
        )}

        {lobby.participants.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">{t.lobby.empty}</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {lobby.participants.map((p) => (
              <ParticipantRow
                key={p.id}
                p={p}
                canClaim={!lobby.meId}
                onClaim={() => run(lobbyRequest("POST", `/${id}/participants/${p.id}/claim`))}
                onRename={(name) => run(lobbyRequest("PATCH", `/${id}/participants/${p.id}`, { name }))}
                onRemove={() => run(lobbyRequest("DELETE", `/${id}/participants/${p.id}`))}
              />
            ))}
          </ul>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-roman-muted">{error}</p>}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------

function ShareButton({ title, text }: { title: string; text: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (e) {
        if ((e as DOMException).name === "AbortError") return; // user closed the sheet
      }
    }
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={share} className="btn-roman-on inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold active:scale-[0.97]">
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? t.lobby.copied : t.lobby.share}
    </button>
  );
}

function NoteBlock({ note, onSave }: { note: string; onSave: (note: string) => Promise<boolean> }) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  if (editing) {
    return (
      <form
        className="mt-5 space-y-2"
        onSubmit={async (e) => { e.preventDefault(); if (await onSave(draft.trim())) setEditing(false); }}
      >
        <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} rows={3} placeholder={t.lobby.notePlaceholder} aria-label={t.lobby.note} className={`${fieldClass} resize-none`} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="btn-roman h-8 rounded-full px-3.5 text-sm font-medium">{t.lobby.cancel}</button>
          <button type="submit" className="btn-roman-on h-8 rounded-full px-3.5 text-sm font-semibold">{t.lobby.save}</button>
        </div>
      </form>
    );
  }

  const start = () => { setDraft(note); setEditing(true); };
  return note ? (
    <div className="mt-5 flex items-start gap-3 rounded-xl bg-foreground/[0.04] px-4 py-3">
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{note}</p>
      <button onClick={start} aria-label={t.lobby.editNote} title={t.lobby.editNote} className={`${iconButton} -mr-1.5 -mt-1`}>
        <Pencil className="size-3.5" />
      </button>
    </div>
  ) : (
    <button onClick={start} className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted transition">
      <Pencil className="size-3.5" />
      {t.lobby.addNote}
    </button>
  );
}

function JoinForm({ onJoin, showClaimHint }: { onJoin: (name: string) => Promise<boolean>; showClaimHint: boolean }) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(rememberedName()); }, []);

  return (
    <form
      className="mt-3 rounded-2xl bg-roman/[0.06] p-4 ring-1 ring-inset ring-roman/15 dark:bg-foreground/[0.04] dark:ring-foreground/10"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        if (await onJoin(name.trim())) rememberName(name);
        setBusy(false);
      }}
    >
      <p className="text-sm font-semibold text-foreground">{t.lobby.areYouGoing}</p>
      <div className="mt-2.5 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t.lobby.yourName} aria-label={t.lobby.yourName} className={fieldClass} />
        <button type="submit" disabled={!name.trim() || busy} className="btn-roman-on h-10 shrink-0 rounded-full px-5 text-sm font-semibold active:scale-[0.97] disabled:opacity-50">
          {t.lobby.join}
        </button>
      </div>
      {showClaimHint && <p className="mt-2.5 text-xs text-foreground/55">{t.lobby.claimHint}</p>}
    </form>
  );
}

function ParticipantRow({
  p, canClaim, onClaim, onRename, onRemove,
}: {
  p: ApiLobbyParticipant;
  canClaim: boolean;
  onClaim: () => Promise<boolean>;
  onRename: (name: string) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.name);

  return (
    <li className={`flex items-center gap-3 rounded-xl px-3 py-2 ${p.isMe ? "bg-roman/10 ring-1 ring-inset ring-roman/25 dark:bg-black/40 dark:ring-foreground/10" : "bg-foreground/[0.04]"}`}>
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-roman/15 text-sm font-semibold uppercase text-roman-muted">
        {p.name.trim().charAt(0)}
      </span>

      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={async (e) => { e.preventDefault(); if (draft.trim() && (await onRename(draft.trim()))) setEditing(false); }}
        >
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} aria-label={t.lobby.rename} className={`${fieldClass} py-1.5`} />
          <button type="submit" aria-label={t.lobby.save} className={iconButton}><Check className="size-3.5" /></button>
          <button type="button" onClick={() => setEditing(false)} aria-label={t.lobby.cancel} className={iconButton}><X className="size-3.5" /></button>
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {p.name}
            {p.isMe && <span className="ml-1.5 text-xs font-normal text-foreground/50">({t.lobby.you})</span>}
          </span>
          {canClaim && (
            <button onClick={onClaim} className="btn-roman h-8 shrink-0 rounded-full px-3 text-xs font-semibold active:scale-[0.96]">
              {t.lobby.itsMe}
            </button>
          )}
          <button onClick={() => { setDraft(p.name); setEditing(true); }} aria-label={t.lobby.rename} title={t.lobby.rename} className={iconButton}>
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => { if (p.isMe || window.confirm(t.lobby.removeConfirm(p.name))) onRemove(); }}
            aria-label={p.isMe ? t.lobby.leave : t.lobby.remove}
            title={p.isMe ? t.lobby.leave : t.lobby.remove}
            className={iconButton}
          >
            <X className="size-3.5" />
          </button>
        </>
      )}
    </li>
  );
}

function LobbyMissing() {
  const { t } = useLang();
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <CinemaPageNav />
      <div className="mt-16 text-center">
        <h1 className="font-serif text-2xl font-medium tracking-[-0.015em] text-foreground">{t.lobby.missingTitle}</h1>
        <p className="mt-2 text-sm text-foreground/60">{t.lobby.missingHint}</p>
        <Link href="/" className="btn-roman mt-6 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium active:scale-[0.97]">
          {t.lobby.toHome}
        </Link>
      </div>
    </main>
  );
}
