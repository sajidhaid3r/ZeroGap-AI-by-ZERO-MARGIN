import { useEffect, useState } from "react";

type Props = {
  words: string[];
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
  className?: string;
};

export function TypewriterRotator({ words, typeMs = 60, deleteMs = 35, holdMs = 1800, className = "" }: Props) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"type" | "hold" | "delete">("type");

  useEffect(() => {
    const word = words[idx % words.length];
    let timer: number;
    if (phase === "type") {
      if (text.length < word.length) {
        timer = window.setTimeout(() => setText(word.slice(0, text.length + 1)), typeMs);
      } else {
        timer = window.setTimeout(() => setPhase("delete"), holdMs);
      }
    } else if (phase === "delete") {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(word.slice(0, text.length - 1)), deleteMs);
      } else {
        setIdx((i) => (i + 1) % words.length);
        setPhase("type");
      }
    }
    return () => clearTimeout(timer);
  }, [text, phase, idx, words, typeMs, deleteMs, holdMs]);

  return (
    <span
      className={className}
      aria-live="polite"
      aria-label={words.join(", ")}
    >
      <span className="text-gradient-silver">{text}</span>
      <span className="tw-cursor">|</span>
    </span>
  );
}
