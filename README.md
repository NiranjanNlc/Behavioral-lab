# BehaviorLab

A behavioral-science simulation tool built with Next.js. BehaviorLab lets users explore how different behavioral interventions (nudges) affect participation rates in real-world scenarios — starting with urban recycling.

## Overview

Enter any behavioral or policy goal (e.g. *Increase on-time VAT filing among Nepali SMEs*). BehaviorLab:

1. **Discovers evidence** with Tavily (behavioral-science research, policy experiments).
2. **Generates a scenario** with Nemotron Super: five interventions, each with low/medium/high effect estimates, citations, and assumptions. Each is labelled *research-backed* or *hypothesis*.
3. **Simulates** with a Monte Carlo engine (5,000 trials over triangular effect distributions): expected, median, 5th/95th percentile, worst/best case, probability of improvement, and combined-nudge runs with diminishing returns.
4. **Critiques** with Nemotron 3 Ultra acting as a skeptical reviewer: evidence strength, comparability, realism, and recommended combinations.

Without API keys the app falls back to an illustrative recycling scenario (all hypotheses).

## Configuration

Create `.env.local` (keys stay server-side, used only by `/api/scenario` and `/api/critique`):

```
TAVILY_API_KEY=...
NEBIUS_API_KEY=...
# optional overrides
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_SUPER_MODEL=nvidia/nemotron-3-super-120b-a12b
NEBIUS_ULTRA_MODEL=nvidia/Nemotron-3-Ultra-550b-a55b
```

Verify the model IDs against your Nebius console.

## WebMCP tools

`generate_scenario`, `get_scenario`, `list_interventions`, `run_simulation`, `compare_interventions`, `explain_result`.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4
- **WebMCP:** Integrated via `@mcp-b/webmcp-polyfill` and `@mcp-b/webmcp-types`
- **Testing:** Jest 30 with `ts-jest` and `jest-environment-jsdom`
- **Linting:** ESLint 9

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone <repo-url>
cd WEBMCP\ CHALLENGE
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Production

```bash
npm run build
npm start
```

### Testing

```bash
npx jest
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & layout
│   ├── page.tsx          # Main simulation UI
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── InterventionCard.tsx
│   └── SimulationResults.tsx
├── simulation/           # Simulation engine & data
│   ├── engine.ts         # Core simulation logic
│   ├── data.ts           # Scenarios & interventions
│   ├── types.ts          # TypeScript types
│   └── __tests__/        # Engine tests
└── webmcp/               # WebMCP integration
    ├── register.ts
    ├── tools.ts
    ├── types.ts
    ├── WebMCPProvider.tsx
    └── __tests__/        # WebMCP tests
```

## License

This project is licensed under the [MIT License](LICENSE).
