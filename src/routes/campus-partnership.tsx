import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { useNow } from "@/hooks/use-now";
import { getCurrentQuarter } from "@/lib/liveDate";

export const Route = createFileRoute("/campus-partnership")({
  head: () => ({ meta: [{ title: "Campus Partnership — ZeroGap AI" }] }),
  component: CampusPage,
});

const COMPANIES = [
  { name: "Microsoft India", focus: "AI/Cloud", offers: "Internships + tech talks" },
  { name: "Google India", focus: "Software / ML", offers: "STEP + summer interns" },
  { name: "Amazon Web Services", focus: "Cloud / DevOps", offers: "Apprenticeships + workshops" },
  { name: "Razorpay", focus: "FinTech", offers: "Engineering interns" },
  { name: "Zomato", focus: "Product / Backend", offers: "Internships + hackathons" },
  { name: "Swiggy", focus: "Data / ML", offers: "Data Science interns" },
  { name: "Flipkart", focus: "Backend / Mobile", offers: "GRiD challenge + interns" },
  { name: "Freshworks", focus: "SaaS / Frontend", offers: "Campus drives" },
  { name: "Postman", focus: "DevTools", offers: "Open-source mentorship" },
  { name: "Atlassian", focus: "Cloud / Java", offers: "Internships + certifications" },
  { name: "CRED", focus: "Mobile / Design", offers: "Premium interns" },
  { name: "Groww", focus: "FinTech / Backend", offers: "SDE Interns" },
];

function CampusPage() {
  const now = useNow(60_000);
  const currentPeriod = `Q${getCurrentQuarter(now)} ${now.getFullYear()}`;
  const [form, setForm] = useState({ college: "", contact: "", email: "", students: "", notes: "" });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // (No backend for inquiries — surface a thank-you. A real impl would email TPC or store leads.)
    setSent(true);
    toast.success("Request received. Our partnerships team will reach out within 48h.");
  };

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
            <GraduationCap className="size-3.5" /> 07 &mdash; CAMPUS PARTNERSHIP &amp; TPC BOARD
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
            Campus partnership.<em className="font-serif italic font-light text-primary ml-3 font-normal">Placement drives.</em>
          </h1>
          <p className="font-serif text-lg text-muted-foreground mt-3 max-w-3xl">
            Bring industry experts to your campus. Companies below partner with colleges to offer internships, orientations, and skill workshops &mdash; request a partnership and we&rsquo;ll coordinate.
          </p>
        </div>

        <h2 className="font-semibold text-2xl mb-4">Partner companies</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          {COMPANIES.map((c) => (
            <Card key={c.name} className="p-4 gradient-card border-border/60 hover:border-primary/50 transition">
              <div className="font-semibold">{c.name}</div>
              <Badge variant="outline" className="border-primary/40 text-primary text-xs mt-1">{c.focus}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{c.offers}</p>
            </Card>
          ))}
        </div>

        <Card className="p-8 gradient-card border-primary/40">
          <h2 className="text-2xl font-bold mb-2">Request a campus partnership</h2>
          <p className="text-sm text-muted-foreground mb-6">Fill the form — we'll connect you with our partner companies for orientations and internship drives.</p>

          {sent ? (
            <div className="text-center py-8">
              <CheckCircle2 className="size-12 text-success mx-auto mb-3" />
              <h3 className="font-semibold text-lg">Request submitted!</h3>
              <p className="text-sm text-muted-foreground mt-1">Our team will reach out within 48 hours.</p>
              <Button asChild className="mt-6 gradient-silver text-primary-foreground">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="college">College / University</Label>
                <Input id="college" required value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="IIT Delhi" />
              </div>
              <div>
                <Label htmlFor="contact">TPC Contact Name</Label>
                <Input id="contact" required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Dr. R. Sharma" />
              </div>
              <div>
                <Label htmlFor="email">Official Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tpc@college.edu" />
              </div>
              <div>
                <Label htmlFor="students">Approx. Eligible Students</Label>
                <Input id="students" type="number" required value={form.students} onChange={(e) => setForm({ ...form, students: e.target.value })} placeholder="500" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">What kind of partnership?</Label>
                <Textarea id="notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={`We're looking for an AI orientation week + internship drive in ${currentPeriod}…`} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="lg" className="gradient-silver text-primary-foreground w-full sm:w-auto">
                  <Send className="size-4 mr-2" /> Submit request
                </Button>
              </div>
            </form>
          )}
        </Card>
      </section>
    </PageShell>
  );
}
