import Image from "next/image";
import { Coffee, Lightbulb, Mail } from "lucide-react";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const links = [
  { icon: Coffee,       label: "Support on Ko-fi",   href: "https://ko-fi.com/alesrossi" },
  { icon: Lightbulb,    label: "Suggestion box",      href: "https://freesuggestionbox.com/pub/bpvsjwk" },
  { icon: LinkedinIcon, label: "LinkedIn",            href: "https://www.linkedin.com/in/alessandro-rossi-448294205/" },
  { icon: Mail,         label: "Email",               href: "mailto:alessandro0024@gmail.com" },
];

export default function FooterSection() {
  return (
    <footer className="mt-16 pb-36">
      <div className="mx-auto max-w-6xl px-4">
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-muted-foreground">
            Felinoir.it | Created by <span className="text-foreground/70">Alessandro Rossi</span>
          </span>
          <div className="flex items-center gap-4">
            {links.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center gap-3 py-3">
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" aria-label="Visita The Movie Database (apre in una nuova scheda)">
            <Image
              src="/tmdb-logo.svg"
              alt="The Movie Database"
              width={80}
              height={11}
              className="opacity-60 hover:opacity-100 transition-opacity"
            />
          </a>
          <span className="text-xs text-muted-foreground/60">
            This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
          </span>
        </div>
      </div>
    </footer>
  );
}
