import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, Cpu, EyeOff, FileText, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/privacy-ocr")({
  head: () => ({ meta: [{ title: "Privacy-First OCR — ZeroGap AI" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell>
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-3">
            <Lock className="size-3" /> Privacy-First Architecture
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Your resume never leaves your laptop.</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl">
            Resumes contain phone numbers, addresses, and college IDs — sensitive PII that should never end up on a remote server. ZeroGap performs all text extraction and PII scrubbing <span className="text-primary">privately on your device</span>.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Cpu, t: "On-Device Processing", d: "All OCR runs locally in your browser. No cloud upload required." },
            { icon: EyeOff, t: "PII Scrubbing", d: "Phone, email, address, and college IDs are detected and masked before any analysis." },
            { icon: ShieldCheck, t: "Zero Telemetry", d: "We never log raw resume content. Only abstract scoring metrics ever leave your machine." },
          ].map((x) => (
            <Card key={x.t} className="p-6 gradient-card border-border/60">
              <x.icon className="size-7 text-primary mb-3" />
              <div className="font-semibold">{x.t}</div>
              <p className="text-sm text-muted-foreground mt-1">{x.d}</p>
            </Card>
          ))}
        </div>

        <Card className="p-8 gradient-card border-border/60 mb-8">
          <h2 className="text-2xl font-bold mb-4">How the local pipeline works</h2>
          <div className="space-y-4">
            {[
              { n: "01", t: "File ingest", d: "Your file is read into memory. It is never written to disk or uploaded." },
              { n: "02", t: "OCR in browser", d: "Text extraction runs locally using ONNX Runtime in the browser — no cloud dependency, no battery drain from network polling." },
              { n: "03", t: "PII detection", d: "A lightweight named-entity model identifies phone numbers, emails, addresses, and IDs. These are masked locally." },
              { n: "04", t: "Abstracted scoring", d: "Only the de-identified text is scored for ATS friendliness. Raw PII never crosses the network boundary." },
              { n: "05", t: "Compact model footprint", d: "All models are quantized and optimized, keeping the entire stack under a 128 MB memory footprint." },
            ].map((s) => (
              <div key={s.n} className="flex gap-4 p-4 rounded-xl bg-background/40 border border-border/60">
                <div className="text-2xl font-display font-bold text-primary/60 shrink-0">{s.n}</div>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8 gradient-card border-primary/40 text-center">
          <FileText className="size-10 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">Try it on your resume</h2>
          <p className="text-muted-foreground mb-6">Upload privately. Score instantly. Improve in 48 hours.</p>
          <Button asChild className="gradient-silver text-primary-foreground" size="lg">
            <Link to="/resume-analysis">Analyze my resume <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
        </Card>
      </section>
    </PageShell>
  );
}
