import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Heart, Sparkles, GraduationCap, MapPin } from "lucide-react";
import { useAuth, logActivity } from "@/lib/auth";
import { localDb } from "@/lib/local-db";

export const Route = createFileRoute("/confidence-coach")({
  head: () => ({ meta: [{ title: "Confidence Coach — ZeroGap AI" }] }),
  component: CoachPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I keep getting rejected from internships 😔",
  "How do I learn React in 2 weeks?",
  "I feel like giving up on tech",
  "Help me prepare for a Google interview",
];

const MOODS = [
  { emoji: "😔", label: "Rejected", prompt: "I'm feeling really down after a rejection. Can you help me bounce back?" },
  { emoji: "😕", label: "Confused", prompt: "I'm confused about what to learn next. Can you guide me?" },
  { emoji: "😐", label: "Okay", prompt: "I'm doing okay but want to push myself. Where should I focus?" },
  { emoji: "🙂", label: "Motivated", prompt: "I'm motivated! Give me a challenging plan for this week." },
  { emoji: "🔥", label: "Ready", prompt: "I'm ready to grind. Hit me with the highest-leverage moves for an internship." },
];

const TOPICS = [
  { label: "Rejection Recovery", prompt: "I just got rejected from an internship. Help me process it and bounce back with a clear plan." },
  { label: "Upskilling Plan", prompt: "Build me a focused 30-day upskilling plan based on my profile." },
  { label: "Interview Prep", prompt: "How should I prepare for my next technical interview? Give me a checklist." },
  { label: "Motivation Boost", prompt: "I need a quick motivation boost. Remind me why I started." },
  { label: "Skill Roadmap", prompt: "Map out the most in-demand skills right now and how I should sequence learning them." },
];

function CoachPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name?: string | null; college?: string | null; city?: string | null } | null>(null);
  const [latestGaps, setLatestGaps] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const analyses = localDb.getAnalyses(user.id);
    const latest = analyses[0];
    const gaps = (latest?.missing_keywords as string[] | null) ?? [];
    setLatestGaps(gaps.slice(0, 6));
    setProfile({ display_name: (user as any).display_name, college: null, city: null });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming || !user) return;
    const userMsg: Msg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      if (!res.ok || !res.body) {
        throw new Error("Coach is taking a break, try again in a moment.");
      }
      // parse Groq/OpenAI SSE: choices[0].delta.content
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }

      if (acc) await logActivity("coach_chat");
    } catch (e: any) {
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: "Coach is taking a break, try again in a moment." }]);
    } finally {
      setStreaming(false);
    }
  };

  if (authLoading || !user) return null;
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "friend";

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
            <Heart className="size-3.5" /> 05 &mdash; CONFIDENCE COACH &amp; MENTORSHIP
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
            Confidence coach.<em className="font-serif italic font-light text-primary ml-3 font-normal">Empathetic mentor.</em>
          </h1>
          <p className="font-serif text-muted-foreground mt-2 max-w-2xl text-base">
            An empathetic AI mentor that validates your rejection frustration, pinpoints skill gaps, and gives you a step-by-step path forward.
          </p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* LEFT: context */}
          <div className="space-y-4">
            <Card className="p-5 gradient-card border-border/60">
              <div className="text-xs text-primary uppercase tracking-wider mb-2">You</div>
              <div className="font-semibold">{name}</div>
              {profile?.college && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><GraduationCap className="size-3" /> {profile.college}</div>}
              {profile?.city && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3" /> {profile.city}</div>}
            </Card>

            <Card className="p-5 gradient-card border-border/60">
              <div className="text-xs text-primary uppercase tracking-wider mb-3">Mood check-in</div>
              <div className="grid grid-cols-5 gap-1">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    title={m.label}
                    onClick={() => send(m.prompt)}
                    disabled={streaming}
                    className="aspect-square rounded-lg border border-border hover:border-primary/60 hover:bg-primary/5 text-2xl transition disabled:opacity-50"
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </Card>

            {latestGaps.length > 0 && (
              <Card className="p-5 gradient-card border-border/60">
                <div className="text-xs text-primary uppercase tracking-wider mb-3">Your skill gaps</div>
                <div className="flex flex-wrap gap-1.5">
                  {latestGaps.map((g) => (
                    <span key={g} className="text-[11px] px-2 py-0.5 rounded-full border border-warning/40 text-warning">{g}</span>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-5 gradient-card border-border/60">
              <div className="text-xs text-primary uppercase tracking-wider mb-3">Quick topics</div>
              <div className="space-y-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => send(t.prompt)}
                    disabled={streaming}
                    className="w-full text-left text-sm px-3 py-2 rounded-md border border-border hover:border-primary/60 hover:text-primary transition disabled:opacity-50"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT: chat */}
          <Card className="gradient-card border-border/60 flex flex-col h-[75vh] min-h-[500px]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Sparkles className="size-10 text-primary mb-3" />
                  <h3 className="font-semibold text-lg">Hey {name}, I'm here to help.</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-1">Tell me what's blocking you. Rejections, anxiety, skill gaps — let's break it down together.</p>
                  <div className="mt-6 grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {STARTERS.map((s) => (
                      <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-lg border border-border hover:border-primary/60 text-sm transition">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
                  {m.role === "assistant" && (
                    <div className="size-7 shrink-0 rounded-full gradient-silver flex items-center justify-center text-[10px] font-bold text-primary-foreground">ZG</div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "gradient-silver text-primary-foreground" : "bg-background/60 border border-border/60"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-strong:text-primary">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="size-7 shrink-0 rounded-full gradient-silver flex items-center justify-center text-[10px] font-bold text-primary-foreground">ZG</div>
                  <div className="bg-background/60 border border-border/60 rounded-2xl px-4 py-3 text-sm text-muted-foreground">typing…</div>
                </div>
              )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border/60 p-4 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell me what's on your mind…"
                disabled={streaming}
              />
              <Button type="submit" disabled={streaming || !input.trim()} className="gradient-silver text-primary-foreground">
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
