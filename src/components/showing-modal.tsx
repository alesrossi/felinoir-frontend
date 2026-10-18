"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Share2, Check, CalendarPlus, ArrowUpRight, ArrowLeft, UserPlus, Plus } from "lucide-react";
import { PosterImage } from "@/components/ui/poster-image";
import { useLang } from "@/lib/lang";
import { downloadShowingIcs, showingShareText, type ShareableShowing } from "@/lib/showing-actions";
import { lobbyErrorText, lobbyRequest, rememberName, rememberedName } from "@/lib/lobby-client";

// ---------------------------------------------------------------------------
// One day's screenings of one film at one cinema, with book / share / calendar
// per time. Shared by the cinema schedule and the film page (map + list).
// ---------------------------------------------------------------------------

export interface ShowingModalProps {
  /** Header line — the film on a cinema's page, the cinema on a film's page. */
  title: string;
  /** Formatted date, e.g. "venerdì 16 ottobre". */
  dateLabel: string;
  posterUrl?: string;
  posterFallbackUrl?: string;
  /** Used for the shared text and the calendar event. */
  movieTitle?: string;
  cinemaName: string;
  cinemaWebsite?: string;
  showings: ShareableShowing[];
  /** The time the user clicked, highlighted in the list. */
  selectedId?: number;
  onClose: () => void;
}

const iconButton =
  "btn-roman grid size-8 place-items-center rounded-full active:scale-[0.92]";

export function ShowingModal({
  title,
  dateLabel,
  posterUrl,
  posterFallbackUrl,
  movieTitle,
  cinemaName,
  cinemaWebsite,
  showings,
  selectedId,
  onClose,
}: ShowingModalProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  // The showing an event is being organised for; swaps the list for the
  // "what kind of event" step, then for the lobby form.
  const [inviting, setInviting] = useState<ShareableShowing | null>(null);
  const [inviteStep, setInviteStep] = useState<"choose" | "lobby">("choose");
  const { t, locale } = useLang();

  function startInvite(s: ShareableShowing) {
    setInviting(s);
    setInviteStep("choose");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (inviting && inviteStep === "lobby") setInviteStep("choose");
      else if (inviting) setInviting(null);
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, inviting, inviteStep]);

  const context = { movieTitle, cinemaName };

  function copy(s: ShareableShowing) {
    navigator.clipboard.writeText(showingShareText(s, { ...context, dateLabel, locale })).catch(() => {});
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex w-full max-w-sm max-h-[85vh] flex-col rounded-2xl bg-popover p-5 shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-4 shrink-0">
          <PosterImage
            primary={posterUrl}
            fallback={posterFallbackUrl}
            alt=""
            className="w-12 aspect-[2/3] shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
            placeholderClassName="w-12 aspect-[2/3] shrink-0 rounded-md bg-foreground/[0.06]"
          />
          <div className="min-w-0 pt-0.5">
            <p className="font-serif text-lg font-medium leading-tight tracking-[-0.01em] text-foreground">{title}</p>
            <p className="mt-1 text-sm capitalize text-foreground/60">{dateLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-roman -mr-1 -mt-1 ml-auto grid size-8 shrink-0 place-items-center rounded-full active:scale-[0.92]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {inviting && inviteStep === "choose" ? (
          <EventTypePicker onBack={() => setInviting(null)} onLobby={() => setInviteStep("lobby")} />
        ) : inviting ? (
          <InviteForm showing={inviting} dateLabel={dateLabel} onBack={() => setInviteStep("choose")} />
        ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {showings.map((s) => {
            const href = s.bookingUrl ?? cinemaWebsite;
            const isCopied = copiedId === s.id;
            const isSelected = s.id === selectedId;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  // Dark mode: a darker grey instead of red, so the red buttons on
                  // the row don't sit red-on-red.
                  isSelected
                    ? "bg-roman/10 ring-1 ring-inset ring-roman/30 dark:bg-black/40 dark:ring-foreground/10"
                    : "bg-foreground/[0.04]"
                }`}
              >
                <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{s.time}</span>
                <span className="flex gap-1">
                  {s.isOV && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-roman-muted ring-1 ring-inset ring-roman/35">OV</span>}
                  {s.is3D && <span className="rounded px-1 text-[10px] font-bold tracking-wide text-foreground/60 ring-1 ring-inset ring-foreground/20">3D</span>}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => startInvite(s)}
                    aria-label={t.lobby.invite}
                    title={t.lobby.invite}
                    className={iconButton}
                  >
                    <UserPlus className="size-3.5" />
                  </button>
                  <button
                    onClick={() => copy(s)}
                    aria-label={t.cinema.copy}
                    title={t.cinema.copy}
                    className={iconButton}
                  >
                    {isCopied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
                  </button>
                  <button
                    onClick={() => downloadShowingIcs(s, context)}
                    aria-label={t.schedule.addToCalendar}
                    title={t.schedule.addToCalendar}
                    className={iconButton}
                  >
                    <CalendarPlus className="size-3.5" />
                  </button>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-roman inline-flex h-8 items-center gap-1 rounded-full pl-3 pr-2.5 text-xs font-semibold active:scale-[0.96]"
                    >
                      {t.cinema.book}
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event type step — pick what to organise. Only the lobby exists so far.
// ---------------------------------------------------------------------------

function EventTypePicker({ onBack, onLobby }: { onBack: () => void; onLobby: () => void }) {
  const { t } = useLang();
  const circle = "grid size-16 place-items-center rounded-full active:scale-[0.94] transition";
  return (
    <div className="flex flex-col gap-5 animate-in fade-in-0 duration-200">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t.lobby.back} className="btn-roman grid size-8 place-items-center rounded-full active:scale-[0.92]">
          <ArrowLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{t.lobby.organize}</p>
      </div>
      {/* Event types first; the plain lobby ("Invite friends") always stays last. */}
      <div className="flex justify-center gap-8 pb-2">
        <div className="flex flex-col items-center gap-2">
          {/* Placeholder — does nothing yet. Same name in both languages. */}
          <button type="button" aria-label="Uscite Romane" className={`btn-roman ${circle} text-lg font-semibold tracking-wide`}>
            UR
          </button>
          <span className="text-xs font-medium text-foreground/70">Uscite Romane</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button type="button" autoFocus onClick={onLobby} aria-label={t.lobby.invite} className={`btn-roman ${circle}`}>
            <Plus className="size-7" />
          </button>
          <span className="text-xs font-medium text-foreground/70">{t.lobby.invite}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite step — creates a lobby for one showing and opens it
// ---------------------------------------------------------------------------

const fieldClass =
  "w-full rounded-xl bg-foreground/[0.05] px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 ring-1 ring-inset ring-foreground/10 outline-none focus:ring-2 focus:ring-roman/50";

function InviteForm({ showing, dateLabel, onBack }: { showing: ShareableShowing; dateLabel: string; onBack: () => void }) {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setName(rememberedName()); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await lobbyRequest("POST", "", { screeningId: showing.id, name: name.trim(), note: note.trim() || undefined });
    if (res.ok) {
      rememberName(name);
      router.push(`/e/${res.lobby.id}`);
      return; // keep the button busy while the page loads
    }
    setError(lobbyErrorText(t, res.error));
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 animate-in fade-in-0 duration-200">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t.lobby.back} className="btn-roman grid size-8 place-items-center rounded-full active:scale-[0.92]">
          <ArrowLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{t.lobby.invite}</p>
        <p className="ml-auto text-sm tabular-nums text-foreground/60">
          <span className="capitalize">{dateLabel}</span> · {showing.time}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-foreground/60">{t.lobby.inviteHint}</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder={t.lobby.yourName}
        aria-label={t.lobby.yourName}
        className={fieldClass}
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={t.lobby.notePlaceholder}
        aria-label={t.lobby.noteOptional}
        className={`${fieldClass} resize-none`}
      />
      {error && <p role="alert" className="text-sm text-roman-muted">{error}</p>}
      <button
        type="submit"
        disabled={!name.trim() || busy}
        className="btn-roman-on h-10 rounded-full text-sm font-semibold active:scale-[0.98] disabled:opacity-50"
      >
        {t.lobby.create}
      </button>
    </form>
  );
}
