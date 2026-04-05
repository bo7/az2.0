interface AvatarBubbleProps {
  message: string;
  contextLine?: string;
  isThinking?: boolean;
}

export default function AvatarBubble({
  message,
  contextLine,
  isThinking,
}: AvatarBubbleProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div className="size-16 overflow-hidden rounded-full bg-muted shadow-md">
        <img
          src="/avatar.svg"
          alt="Assistent"
          className="size-full object-cover"
        />
      </div>

      {/* Speech bubble */}
      <div className="relative w-full rounded-2xl border border-border bg-card p-4 shadow-sm">
        {/* Triangle pointing up */}
        <div className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card" />

        {isThinking ? (
          <div className="flex items-center justify-center gap-1 py-1">
            <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        ) : (
          <>
            <p className="text-base text-foreground">{message}</p>
            {contextLine && (
              <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
