# Career DNA

A career questionnaire that works like a music recommendation engine. It doesn't match people straight to job titles. It builds a **DNA profile of 25 working attributes** from 150 questions, then matches it against about 930 general, niche and O*NET-catalog careers. It highlights the **top 5 career paths** and lets people browse every match, grouped by field. Each career comes with pay, growth and break-in information.

## How it works

| Stage | Questions | Basis |
|---|---|---|
| Dealbreakers | 7 | Hard filters: schedule, training (including none), physical (including a sit/stand mix), danger, outdoors, medical, discovery level |
| What intrigues you | 66 | Micro-tasks rated from "not for me" to "intriguing" (high-pressure tasks use a stress scale instead), spread across the 14 **COPS** interest clusters |
| How you're wired | 28 | Two-sided sliders on the four **Myers-Briggs** axes (7 per axis) |
| Your work world | 24 | Agree/disagree statements about values and environment |
| Deep dive | 25 | **Adaptive**: picked from a pool of 51 based on the person's strongest signals so far |

**Matching** (`src/features/careers/match.ts`)
1. Dealbreakers remove careers outright. On the results page, people can also **sort** (best match, highest pay, fastest growth) and **filter** by minimum match %, minimum salary, remote vs on-site, and commuting/travel. The page shows how many careers were removed and why.
2. Each remaining career is scored on DNA fit, weighted by how strongly the person feels about each attribute. It gets a bonus where both are high (shared energy) and a penalty where the career leans on something that drains the person.
3. The **discovery dial** (Familiar / Balanced / Hidden gems) tilts results toward or away from obscure careers.
4. Careers are grouped into paths and diversified (maximal marginal relevance), so the top paths aren't near-duplicates. Every path is still returned, so people can open "Show all".
5. The full list is grouped into 13 fields with compact rows. Clicking a career opens a side panel with pay, outlook, training, fit reasons, daily tasks and steps to break in.

**Career data** combines two sources:
- **Hand-curated careers** (`src/features/careers/data-niche.ts`, `data-general.ts`): 180 careers, 89 of them niche, with hand-written tasks and break-in steps.
- **The O\*NET catalog** (`src/features/careers/generated/onet.json`, generated): about 750 more occupations, including O\*NET's specialized titles such as Critical Care Nurses and Robotics Technicians. Each one's DNA is derived from O\*NET interests, knowledge, work activities, work context and work styles.

Pay, growth, employment and training for **both** come from the latest BLS Employment Projections (currently 2025 wages and 2025–35 projections). Employment size also drives each career's obscurity, so small occupations surface as "hidden gems".

### Refreshing the data

```bash
npm run data:import
```

1. O\*NET CSVs download automatically into `data/raw/onet-31_0/`. Set `ONET_VERSION` to use a newer release.
2. BLS blocks scripted downloads, so first save https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx from a browser to `data/raw/bls-occupation.xlsx`. BLS updates it each September.
3. The script writes `src/features/careers/generated/onet.json`. Commit that file; `data/raw/` is gitignored.

Curated careers that are exactly an O\*NET occupation carry an `onetCode`, so the importer doesn't duplicate them. `DEBUG_DUPES=1 npm run data:import` lists everything it skipped as a duplicate.

O\*NET data is used under CC BY 4.0. The attribution is shown on the results page (`src/features/careers/DataNote.tsx`).

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
