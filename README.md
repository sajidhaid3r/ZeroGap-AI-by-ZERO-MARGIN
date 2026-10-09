# 🚀 ZeroGap AI

> **Bridging the gap from student to industry-ready candidate** with AI-powered personalized micro-roadmaps, ATS-scored deterministic resume tailoring, predictive market trends, and automated 2-tier campus placement screening.

---

## 📌 Problem Statement

As engineering and computer science students entering college, we are filled with enthusiasm and a drive to master technology. However, we quickly encounter critical roadblocks:

1. **Conflicting & Overwhelming Guidance**: Asking seniors, mentors, or browsing online communities yields contradictory advice (e.g., *"Learn C++ for DSA first"*, *"No, start with Python"*, *"Focus on Web Development"*, *"No, AI/ML is the only way"*).
2. **Tutorial Hell & Wasted Resources**: Students spend hundreds of hours watching disjointed YouTube tutorials, buying unguided platform subscriptions, and working without clear milestone tracking, leading to burnout and zero tangible outcomes.
3. **No Unified Platform**: No single platform connects learning a skill directly to building a resume, tracking progress, evaluating ATS compatibility, and applying for relevant jobs or internships.
4. **Market Demand Uncertainty**: Students invest months into technologies without knowing whether a role is rising in industry demand or declining in the modern tech landscape.
5. **Inefficient Campus Hiring**: University placement departments struggle to screen and filter large student cohorts effectively for visiting tech companies and startups.

---

## 💡 The ZeroGap AI Solution

ZeroGap AI eliminates guidance overload, tutorial hell, and placement friction by serving as a unified, intelligent career launchpad:

* 🎯 **Personalized Micro-Roadmaps**: Select a target job role and instantly receive a structured, step-by-step roadmap tailored to your skill level, helping you build verifiable projects to feature on your resume.
* 📄 **Deterministic ATS Resume Parser & Agentic Tailor**: Evaluate resumes against real job descriptions using a rule-based deterministic engine for ATS scoring and keyword overlap. Use our AI agent to tailor resumes with natural language prompts (*"make it one page"*, *"enhance impact statements"*) with zero skill fabrication.
* 💼 **Opportunity Hub (Jobs & Internships)**: Search real-time internships, full-time jobs, hybrid, and remote roles filtered by skills, location, and salary (powered by live Adzuna API integration).
* 📈 **Predictive Market Trajectory & Localized Intelligence**: View probabilistic trajectory models predicting whether a job role will rise or fall based on historical and present tech market requirements.
* 🏛️ **Campus Partnership & Placement Screening**: 
  - **Round 1**: Automated Basic DSA & Aptitude screening.
  - **Round 2**: Interactive AI-driven Interview simulation.
  - **Outcome**: Shortlisted candidates proceed directly to partner companies; remaining candidates receive targeted improvement paths to prepare for the next round.

---

## 🛠️ Tech Stack

| Component | Technologies Used | Description |
|---|---|---|
| **Frontend Framework** | **TanStack Start**, **React 19**, **Vite** | SSR + SPA hybrid framework for ultra-fast render speeds and file-based routing. |
| **Styling & Design** | **Tailwind CSS v4**, **Radix UI**, **Lucide Icons**, **Framer Motion** | Dark-mode glassmorphic UI system with smooth micro-animations and responsive layouts. |
| **Backend & Edge** | **TanStack Server Functions**, **Cloudflare Workers** | Secure server-side execution, API endpoints, and isolated secret management. |
| **Database & Auth** | **Supabase** (PostgreSQL + RLS + Auth) | User session handling, persistent career tracker, and row-level security. |
| **AI & Agentic Engine** | **Google Gemini API** (`gemma-3-27b-it` / `gemini-1.5-flash`), **Groq** (`qwen/qwen3.8-27b`), **Anthropic Claude** | Open-weight and frontier LLM agents for resume tailoring, micro-roadmaps, and interview coaching. |
| **Deterministic Engine** | **Python Microservice** (`resume-analyzer/`), **Mammoth.js**, **PDF.js** | Rule-based text extraction, exact keyword matching, date math, and gap calculation without LLM hallucinations. |
| **Jobs Integration** | **Adzuna REST API** | Live job search with location, remote/hybrid, and salary filters. |
| **Testing & Quality** | **Bun / Node Test Suite**, **Zod**, **TypeScript** | End-to-end type safety, runtime schema validation, and 27+ automated pipeline tests. |

---

## ⚙️ Deterministic Pipeline Architecture

ZeroGap AI uses a **hybrid deterministic-agentic pipeline** to guarantee data accuracy, proven provenance, and zero hallucination of candidate qualifications:

```
[ Candidate Resume (PDF / DOCX / Text) ] + [ Target Job Description ]
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. DETERMINISTIC EXTRACTION & ANALYSIS PIPELINE                │
│  • Document Parsing (Mammoth.js / PDF.js / Python Engine)       │
│  • Exact Lexicon Overlap & ATS Score Calculation                │
│  • Date Math & Career Gap Detection                             │
│  • Anti-Fabrication Safeguard Matrix                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │ (Clean Structured JSON Metadata)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. AGENTIC DECISION & TAILORING ENGINE                         │
│  • Goal → Decide → Validate (Zod) → Execute Tool → Observe       │
│  • Company Type Classifier (Product / Service / Startup)        │
│  • Natural Language Instruction Processing (Layout/Text)        │
│  • Side-Effect Approval Gate (`save_to_tracker`)                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. VERIFIED OUTPUT & TRANSPARENCY REPORT                       │
│  • Diff-Style Line Change Audit (% lines modified)               │
│  • Unedited Missing Skills Report                               │
│  • Native Single-Click PDF Generation                           │
└───────────────────────────────┴─────────────────────────────────┘
```

### Key Safety & Reliability Guarantees:
1. **Zero-Hallucination Anti-Fabrication**: Any technical skill or numerical metric added during AI tailoring that was **absent from the original upload** is flagged immediately to the candidate. Missing job requirements are explicitly listed as unedited.
2. **Provenance & Source Tagging**: Every observation produced by the agent is tagged as `live` (e.g. Adzuna API, GitHub REST API) or `model estimate` (LLM inference).
3. **Approval Gate**: Persistent state changes (e.g. saving applications to Supabase) require explicit user approval before execution.

---

## 🚀 Setup Procedure & Local Installation

### Prerequisites
- **Node.js** (v18.0 or higher) or **Bun**
- **Git**
- **Python** 3.10+ *(optional, for running the Python resume-analyzer microservice)*

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/sajidhaid3r/ZeroGap-AI-by-ZERO-MARGIN.git
cd ZeroGap-AI-by-ZERO-MARGIN
```

---

### 2️⃣ Install Dependencies
```bash
npm install
```

---

### 3️⃣ Configure Environment Variables
Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

Add your credentials to `.env`:

```dotenv
# Gemini API Key (Primary LLM model for Gemma / Gemini agent)
GEMINI_API_KEY=your_gemini_api_key_here
TAILOR_LLM_MODEL=gemma-3-27b-it

# Groq API Key (Fallback open-weight model)
GROQ_API_KEY=your_groq_api_key_here

# Supabase Credentials (Database & Auth)
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Adzuna API (Live Job & Internship Listings)
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
```

---

### 4️⃣ Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the URL displayed in your terminal) to explore ZeroGap AI.

---

### 5️⃣ (Optional) Start the Python Resume Analyzer Microservice
```bash
cd resume-analyzer
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
python -m app.main
```

---

### 6️⃣ Run the Test Suite
Validate the deterministic pipeline and agent functionality:
```bash
npx tsx --test tests/*.test.ts
```

---

### 7️⃣ Build for Production
```bash
npm run build
npm run preview
```

---

## 📄 License
This project is open-source and released under the [MIT License](LICENSE).
