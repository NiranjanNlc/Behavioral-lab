# BehaviorLab

An evidence-based behavioral nudge simulator. Enter any policy goal and BehaviorLab researches the evidence, proposes interventions with uncertainty ranges, simulates them probabilistically, and has a skeptical reviewer challenge the result. Everything is also exposed to external AI agents through WebMCP.

> Before implementing a policy, which behavioral interventions are most likely to work, how uncertain is that, and how strong is the evidence?

## How it works

1. **Evidence discovery (Tavily).** Searches the web for behavioral-science research and policy experiments relevant to the goal.
2. **Scenario generation (Nemotron Super).** Builds a scenario with the target population, a baseline rate, and five interventions. Each has a low/medium/high effect estimate (percentage points), assumptions, and citations. An intervention is labelled **research-backed** only if it cites a returned source; otherwise it is a **hypothesis**. The baseline is labelled `user`, `evidence`, or `assumed`.
3. **Probabilistic simulation (`src/simulation/engine.ts`).** Runs 5,000 seeded Monte Carlo trials sampling a triangular distribution over each effect range. Reports the expected, median, 5th/95th percentile, worst and best case, and probability of improvement. Combined nudges are simulated with a 20% diminishing-returns discount per extra nudge.
4. **Critical review (Nemotron 3 Ultra).** Acts as a skeptical policy reviewer: evidence strength, comparability of the research to the target population, realism of the effect range, concerns, a realistic range of its own, and recommended combinations. The UI can apply the reviewer's ranges to the simulation.

Without API keys the app still runs, using an illustrative recycling scenario (all hypotheses, assumed baseline).

## Quick start

Prerequisites: Node.js 18+ and npm, a [Tavily](https://tavily.com) API key, and a [Nebius Token Factory](https://tokenfactory.nebius.com) API key.

```bash
git clone <repo-url>
cd Behavioral-lab
npm install
cp .env.example .env.local   # then add your two keys
npm run dev
```

Open <http://localhost:3000>, keep or edit the policy goal, and click **Build scenario** (takes about 20 seconds). Then:

1. Select an intervention and click **RUN SIMULATION**.
2. Click **CRITICAL REVIEW** (about 10 seconds) to get the skeptical assessment.
3. Click **Apply reviewer's ranges to simulation** and run again to see the more conservative result.

Restart `npm run dev` after changing `.env.local`.

## Configuration

Set in `.env.local` (see `.env.example`). Keys are only read by the server routes `/api/scenario` and `/api/critique`.

| Variable | Required | Default |
| --- | --- | --- |
| `TAVILY_API_KEY` | yes | |
| `NEBIUS_API_KEY` | yes | |
| `NEBIUS_BASE_URL` | no | `https://api.tokenfactory.nebius.com/v1` |
| `NEBIUS_SUPER_MODEL` | no | `nvidia/nemotron-3-super-120b-a12b` |
| `NEBIUS_ULTRA_MODEL` | no | `nvidia/Nemotron-3-Ultra-550b-a55b` |

Model IDs must exist on your Nebius account. List them with:

```bash
curl -s https://api.tokenfactory.nebius.com/v1/models -H "Authorization: Bearer $NEBIUS_API_KEY"
```

A "model does not exist" (404) error means the ID needs overriding.

## WebMCP tools

Registered in the browser on page load via `document.modelContext`, so any WebMCP-compatible agent can drive the app. Tools operate on the active scenario, which is shared with the UI.

| Tool | Purpose |
| --- | --- |
| `generate_scenario` | Define a goal (optional `target`, `baselineRate`); runs Tavily + Nemotron Super and replaces the active scenario. |
| `get_scenario` | Active goal, target, baseline (and its basis), context, and sources. |
| `list_interventions` | The five interventions with effect ranges, evidence type/strength, assumptions, citations. |
| `run_simulation` | Monte Carlo simulation of one intervention (`interventionId`, optional `trials`). |
| `compare_interventions` | Ranks 2+ interventions with uncertainty ranges; `includeCombination` also simulates them together. |
| `explain_result` | Nemotron Ultra's critical assessment of an intervention, its realistic range, and recommended combinations. |

Intervention IDs are generated per scenario. Use the ids from `list_interventions`.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm start       # run the production build
npm test        # Jest unit tests
npm run lint    # ESLint
```

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Goal input, scenario, simulation, review UI
│   └── api/
│       ├── scenario/route.ts # POST: Tavily + Nemotron Super -> scenario
│       └── critique/route.ts # POST: Nemotron Ultra -> critique
├── components/               # InterventionCard, SimulationResults, CritiquePanel
├── server/                   # Server-only: config, tavily, nebius client, scenario, critique
├── simulation/
│   ├── engine.ts             # Monte Carlo engine
│   ├── data.ts               # Offline fallback scenario
│   ├── store.ts              # Active scenario shared by the UI and WebMCP tools
│   ├── client.ts             # Browser helpers that call the API routes
│   └── types.ts
└── webmcp/                   # Tool definitions and registration
```

## Limitations

- Effect ranges are model-generated estimates grounded in whatever Tavily retrieves. They are not causal predictions, and the simulation says so.
- Baselines are often assumed, since many contexts have no measured rate. The UI flags this.
- Results vary between generations. The reviewer's ranges are a second opinion, not ground truth.
- Evidence is frequently from other countries. Check the reviewer's comparability notes.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, `@mcp-b/webmcp-polyfill`, Jest 30, ESLint 9.

## License

[MIT](LICENSE)
