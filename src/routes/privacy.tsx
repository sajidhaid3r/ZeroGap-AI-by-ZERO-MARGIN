import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useNow } from "@/hooks/use-now";
import { formatLiveDate } from "@/lib/liveDate";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ZeroGap AI" },
      { name: "description", content: "How ZeroGap AI handles your data — in plain English. We never sell your data, never store raw resume files, and use no-training AI APIs." },
      { property: "og:title", content: "Privacy Policy — ZeroGap AI" },
      { property: "og:description", content: "Plain-English privacy policy for Indian students using ZeroGap AI." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const now = useNow();

  return (
    <PageShell>
      <main className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        <div className="mb-10 border-b border-border/60 pb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">GOVERNANCE &middot; PRIVACY POLICY</p>
          <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
            Privacy policy.<em className="font-serif italic font-light text-primary ml-3 font-normal">Plain English.</em>
          </h1>
          <p className="font-serif text-sm text-muted-foreground mt-2">Last updated: {formatLiveDate(now)}</p>
        </div>

        <Section title="1. What we collect">
          <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-foreground/85">
            <li>Your name, email, college name, city, and state (on signup)</li>
            <li>Resume text — extracted temporarily for analysis, not stored permanently</li>
            <li>ATS scores and analysis results (stored in your profile)</li>
            <li>Anonymized usage data (pages visited, features used)</li>
          </ul>
        </Section>

        <Section title="2. What we never do">
          <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-foreground/85">
            <li>We never sell your data to third parties</li>
            <li>We never store your raw resume file permanently</li>
            <li>We never share your individual scores with other users (only anonymized aggregates for leaderboards)</li>
          </ul>
        </Section>

        <Section title="3. How AI processing works">
          <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-foreground/85">
            <li>Resume text is sent to our AI provider for analysis</li>
            <li>This text is not used to train AI models — we use APIs with no-training agreements</li>
            <li>Text is deleted from our AI provider's servers after processing</li>
          </ul>
        </Section>

        <Section title="4. Your rights">
          <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-foreground/85">
            <li>Request all data we hold about you: <a href="mailto:hello@zerogap.ai">hello@zerogap.ai</a></li>
            <li>Delete your account and all data: Settings → Delete Account</li>
            <li>Export your data: Settings → Export My Data</li>
          </ul>
        </Section>

        <Section title="5. Cookies">
          <p className="text-[15px] text-foreground/85">We use only essential cookies (your authentication session) and no tracking cookies.</p>
        </Section>

        <Section title="6. Contact">
          <p className="text-[15px] text-foreground/85">
            Questions? Email <a href="mailto:privacy@zerogap.ai">privacy@zerogap.ai</a>.
          </p>
        </Section>

        <p className="text-center text-xs text-muted-foreground mt-16">Made with ❤️ for Indian students</p>
      </main>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl mb-3">{title}</h2>
      {children}
    </section>
  );
}
