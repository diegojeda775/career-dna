# Career DNA

A career questionnaire that works like a music recommendation engine. It doesn't match people straight to job titles. It builds a **DNA profile of 25 working attributes** from 150 questions, then recommends up to **5 career paths** made of niche careers that share that DNA. Each career comes with pay, growth and break-in information.

## How it works

| Stage | Questions | Basis |
|---|---|---|
| Dealbreakers | 7 | Hard filters: schedule, training, physical, danger, outdoors, medical, discovery level |
| Energy or drain | 66 | Micro-tasks rated from "drains me" to "energizes me", spread across the 14 **COPS** interest clusters |
| How you're wired | 28 | Two-sided sliders on the four **Myers-Briggs** axes (7 per axis) |
| Your work world | 24 | Agree/disagree statements about values and environment |
| Deep dive | 25 | **Adaptive**: picked from a pool of 51 based on the person's strongest signals so far |

**Matching** (`src/features/careers/match.ts`)
1. Dealbreakers remove careers outright. On the results page, people can also **sort** (best match, highest pay, fastest growth) and **filter** by minimum salary, remote vs on-site, and commuting/travel. The page shows how many careers were removed and why.
2. Each remaining career is scored on DNA fit, weighted by how strongly the person feels about each attribute. It gets a bonus where both are high (shared energy) and a penalty where the career leans on something that drains the person.
3. The **discovery dial** (Familiar / Balanced / Hidden gems) tilts results toward or away from obscure careers.
4. Careers are grouped into paths and diversified (maximal marginal relevance), so the 5 paths aren't near-duplicates.

**Career data** (`src/features/careers/data.ts`) holds 89 niche careers in 29 paths. Each one maps to a **parent SOC/O\*NET occupation**, which supplies the official pay and outlook figures, and links out to My Next Move and BLS.

> ⚠️ The pay and growth figures are approximate national numbers for the parent occupation (BLS OEWS May 2023, Projections 2023–33), entered by hand. Check them against BLS before launch, and refresh them yearly.

## Setup

```bash
npm install
npm run db:up        # local Postgres in Docker on port 5433
npm run db:push      # create tables
npm run dev
```

Copy `.env.example` to `.env` and fill in your Clerk keys. Users are created in the database automatically on first sign-in, so no webhook is needed.

## Checks

```bash
npm run test:matching   # simulated personas must land in sensible paths
npm run typecheck
```

## Extending

- **Add a career**: add an entry to `CAREERS` with a `path`, parent `soc`, stats, conditions and a sparse `dna` map (0–1 per attribute). Conditions such as `physical`, `travel`, `danger` and `outdoor` fill in the related DNA automatically.
- **Add a question**: add it to `questions.ts` with `weights` on the dimensions. For a deep-dive probe, also list the `probe` dimensions that should trigger it.
- **Bulk data**: a natural next step is an import script that pulls O\*NET Interests and Work Context and BLS OEWS/Projections, so the stats refresh automatically.
