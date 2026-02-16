import { cn } from "@/lib/utils";

interface LummaLogoProps {
  className?: string;
}

export function LummaLogo({ className }: LummaLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 128 128" className="h-9 w-9" role="img" aria-label="Lumma logo">
        <defs>
          <linearGradient id="lummaCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5EE9FF" />
            <stop offset="100%" stopColor="#C6FF5C" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="112" height="112" rx="24" fill="#0E1116" />
        <circle cx="64" cy="64" r="32" fill="url(#lummaCore)" />
        <circle cx="64" cy="64" r="18" fill="#0E1116" />
        <path d="M89 33L101 15L111 27L95 43Z" fill="#F7F4EA" />
        <path d="M95 43L111 27L98 51Z" fill="#5EE9FF" />
        <circle cx="95" cy="43" r="4" fill="#C6FF5C" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight text-lumma-ink">Lumma</span>
    </div>
  );
}

