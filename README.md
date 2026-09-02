# BehaviorLab

A behavioral-science simulation tool built with Next.js. BehaviorLab lets users explore how different behavioral interventions (nudges) affect participation rates in real-world scenarios — starting with urban recycling.

## Overview

BehaviorLab presents a scenario (e.g. increasing recycling participation among urban households) and offers a set of evidence-based interventions to choose from:

- **Default** — Make recycling the default option to reduce friction.
- **Reminder** — Send timely reminders about recycling schedules.
- **Social Proof** — Show neighborhood participation rates to leverage social norms.
- **Financial Incentive** — Provide monetary rewards for participation.
- **Loss Framing** — Frame non-recycling as a loss to tap into loss aversion.

Select an intervention, run the simulation, and instantly see the projected impact on participation rates.

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
