import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCompanyUrl, fetchCompanyPage, htmlToText, inferCompany } from "../src/lib/tailor/company";
import { unsupportedAdditions, lineChangeStats, keywordCoverage } from "../src/lib/tailor/guard";
import { buildQuestions } from "../src/lib/tailor/questions";
import { runIntake, runTailor, runRevise, runCheck } from "../src/lib/tailor/service";
import type { Answers, CompanyInfo, TailorInput } from "../src/lib/tailor/types";
import type { LLM } from "../src/lib/agent/types";

const RESUME = `MD SAJID HAIDER
Summary
Student who built web apps.
Skills
Python, React, SQL, Git
Projects
ZeroGap AI - built a career platform used by 120 students with React and TypeScript.
Education
B.E. Computer Science, 2027`;

const input = (over: Partial<TailorInput> = {}): TailorInput => ({
  originalResume: RESUME, currentResume: RESUME, jd: "We need Python, React and AWS. Fix grammar.", role: "SDE Intern", company: "Acme", ...over,
});
const answers: Answers = { scope: ["Grammar and spelling only"], depth: "Light touch: keep my wording, change only what the job needs", company_type: "Product-based", length: "Keep the length as it is" };
const llmOf = (...replies: unknown[]): LLM => { let i = 0; return async () => { const r = replies[Math.min(i++, replies.length - 1)]; if (r instanceof Error) throw r; return r; }; };
const html = (body: string, ct = "text/html") => new Response(body, { status: 200, headers: { "content-type": ct } });

test("URL validation blocks private, IP, credentialed and non-http addresses", () => {
  for (const bad of ["http://localhost/x", "https://127.0.0.1", "https://169.254.169.254/latest", "https://[::1]/", "ftp://example.com", "https://user:pw@example.com", "https://intranet", "https://db.internal", "https://example.com:8080", "not a url"]) {
    assert.throws(() => validateCompanyUrl(bad), undefined, bad);
  }
  assert.equal(validateCompanyUrl("acme.com").hostname, "acme.com"); // scheme optional
  assert.equal(validateCompanyUrl("https://www.acme.co.in/about").pathname, "/about");
});

test("fetch refuses redirects into private space and reports why", async () => {
  const f = (async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } })) as any;
  const r = await fetchCompanyPage("https://acme.com", f);
  assert.equal(r.ok, false);
  assert.match((r as any).reason, /Redirect blocked/);
});

test("fetch reads a page, strips scripts, handles non-HTML and errors", async () => {
  const page = `<html><head><title>Acme Cloud</title><meta name="description" content="We build a developer platform"></head><body><script>evil()</script><h1>Our product</h1><p>${"Acme builds software. ".repeat(10)}</p></body></html>`;
  const ok = await fetchCompanyPage("https://acme.com", (async () => html(page)) as any);
  assert.equal(ok.ok, true);
  assert.match((ok as any).text, /Acme builds software/);
  assert.doesNotMatch((ok as any).text, /evil/);
  assert.equal((await fetchCompanyPage("https://acme.com", (async () => html("%PDF", "application/pdf")) as any)).ok, false);
  assert.equal((await fetchCompanyPage("https://acme.com", (async () => new Response("x", { status: 500 })) as any)).ok, false);
  assert.equal((await fetchCompanyPage("https://acme.com", (async () => { throw new Error("dns"); }) as any)).ok, false);
});

test("company inference: name-only recall is never reported as high confidence", async () => {
  const c = await inferCompany({ name: "Acme" }, llmOf({ type: "product", confidence: "high", evidence: "I know it" }));
  assert.equal(c.pageFetched, false);
  assert.equal(c.confidence, "medium");
});

test("company inference: page read keeps high confidence; bad model output degrades to unknown/low", async () => {
  const page = `<html><title>Acme</title><body>${"We build and sell our own SaaS product. ".repeat(8)}</body></html>`;
  const fetched = await inferCompany({ name: "Acme", url: "acme.com" }, llmOf({ type: "product", confidence: "high", evidence: "SaaS product" }), (async () => html(page)) as any);
  assert.equal(fetched.pageFetched, true);
  assert.equal(fetched.confidence, "high");
  const broken = await inferCompany({ name: "Acme" }, llmOf({ nonsense: 1 }));
  assert.deepEqual([broken.type, broken.confidence], ["unknown", "low"]);
  const blocked = await inferCompany({ name: "Acme", url: "http://localhost" }, llmOf({ type: "product", confidence: "medium", evidence: "x" }));
  assert.match(blocked.pageNote!, /public website|valid/i);
});

test("guard: invented skills and numbers are caught; unchanged text is clean", () => {
  assert.deepEqual(unsupportedAdditions(RESUME, RESUME), []);
  const out = RESUME.replace("Python, React, SQL, Git", "Python, React, SQL, Git, AWS, Docker").replace("120 students", "5000 students");
  const found = unsupportedAdditions(RESUME, out);
  assert.ok(found.includes('skill "aws"') && found.includes('skill "docker"') && found.includes('number "5000"'));
});

test("guard: change statistics make 'keep everything the same' measurable", () => {
  assert.deepEqual(lineChangeStats(RESUME, RESUME), { changedLines: 0, totalLines: 9, pctChanged: 0 });
  const s = lineChangeStats(RESUME, RESUME.replace("Student who built web apps.", "Student who builds web apps."));
  assert.equal(s.changedLines, 1);
  const k = keywordCoverage(RESUME, "Python, React, AWS, Docker");
  assert.deepEqual(k!.missing.sort(), ["aws", "docker"]);
  assert.equal(k!.pct, 50);
});

test("questions: nothing preselected for scope; company type preselected only when confident", () => {
  const mk = (confidence: CompanyInfo["confidence"], type: CompanyInfo["type"]): CompanyInfo => ({ name: "A", type, confidence, evidence: "", pageFetched: true });
  const sure = buildQuestions(mk("high", "service"));
  assert.equal(sure.find((q) => q.id === "scope")!.default, undefined);
  assert.equal(sure.find((q) => q.id === "company_type")!.default, "Service-based or consulting");
  const unsure = buildQuestions(mk("low", "product"));
  assert.equal(unsure.find((q) => q.id === "company_type")!.default, undefined);
  assert.deepEqual(sure.map((q) => q.id), ["scope", "depth", "company_type", "length", "keep"]);
});

test("tailor: unchanged resume is returned as-is, JD gaps listed as not edited (deterministic)", async () => {
  const r = await runTailor(input(), answers, llmOf({ resume_text: RESUME, changes_made: ["No changes were needed"], not_edited: [] }));
  assert.equal(r.stats.pctChanged, 0);
  assert.equal(r.warnings.length, 0);
  assert.ok(r.not_edited.some((n) => /aws/i.test(n)), "AWS is in the JD but not the resume");
  assert.ok(!r.not_edited.some((n) => /react/i.test(n)), "React is on the resume");
});

test("tailor: a model that invents AWS or a metric gets flagged", async () => {
  const fake = RESUME.replace("Python, React, SQL, Git", "Python, React, SQL, Git, AWS").replace("120", "300");
  const r = await runTailor(input(), answers, llmOf({ resume_text: fake, changes_made: ["Added AWS"], not_edited: [] }));
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /aws/);
  assert.match(r.warnings[0], /"300"/);
});

test("revise: fabrication check compares to the ORIGINAL upload, not the previous version", async () => {
  const v1 = RESUME + "\nCertifications\nAWS Cloud Practitioner"; // slipped in earlier, not in the original
  const v2 = v1 + "\n"; // revision keeps it
  const r = await runRevise(input({ currentResume: v1 }), "fix a typo", undefined, llmOf({ resume_text: v2, changes_made: [], not_edited: [] }));
  assert.match(r.warnings[0], /aws/);
});

test("model failures: repaired once, then a clear error (no silent garbage)", async () => {
  const ok = await runTailor(input(), answers, llmOf({ bad: true }, { resume_text: RESUME, changes_made: [], not_edited: [] }));
  assert.equal(ok.resume_text.startsWith("MD SAJID"), true);
  await assert.rejects(runTailor(input(), answers, llmOf(new Error("503"))), /could not produce a usable answer/);
});

test("check mode: scores validated, deterministic coverage attached", async () => {
  const r = await runCheck(input(), null, llmOf({ ats_score: 68, trend_score: 55, summary: "Decent.", strengths: ["Projects"], weaknesses: ["No cloud"], keyword_gaps: ["aws"], suggestions: [] }));
  assert.equal(r.ats_score, 68);
  assert.deepEqual(r.coverage!.missing, ["aws"]);
  await assert.rejects(runCheck(input(), null, llmOf({ ats_score: 400, trend_score: 1, summary: "x" })), /usable answer/);
});

test("intake returns company info plus the full option set", async () => {
  const r = await runIntake({ company: "Acme" }, llmOf({ type: "startup", confidence: "medium", evidence: "small team" }));
  assert.equal(r.company.type, "startup");
  assert.equal(r.questions.length, 5);
  assert.equal(r.questions[2].default, "Startup");
});

test("htmlToText decodes entities and removes tags", () => {
  assert.equal(htmlToText("<p>A &amp; B</p><style>x{}</style>").text, "A & B");
});
