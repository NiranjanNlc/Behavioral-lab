"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { getLabState, subscribeLabState } from "@/simulation/store";
import { GenerateProgress, generateScenario, getOrRequestCritique } from "@/simulation/client";
import { runCombinedSimulation, runSimulation } from "@/simulation/engine";
import { cleanTitle, formatPct, hostname } from "@/simulation/format";
import { withReviewerEffects } from "@/simulation/review";
import InterventionRow from "@/components/InterventionRow";
import RedlineChart from "@/components/RedlineChart";
import ResultsLedger, { LedgerRow } from "@/components/ResultsLedger";
import ReviewerNotes from "@/components/ReviewerNotes";

const EXAMPLE_GOALS = [
  "Increase on-time VAT filing among Nepali SMEs",
  "Increase vaccination uptake in rural districts",
  "Reduce teen vaping",
  "Increase household recycling participation",
];

const BASIS_LABEL = {
  user: "provided by you",
  evidence: "from cited evidence",
  assumed: "assumed, not measured",
} as const;

export default function Home() {
  const { scenario, interventions, critique } = useSyncExternalStore(subscribeLabState, getLabState, getLabState);
  const [goal, setGoal] = useState(EXAMPLE_GOALS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ran, setRan] = useState(false);
  const [progress, setProgress] = useState<GenerateProgress | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const building = progress !== null;
  const generated = scenario.source === "generated";

  const build = async (g: string) => {
    if (!g.trim() || building) return;
    setError(null);
    setReviewError(null);
    try {
      await generateScenario(g.trim(), undefined, undefined, setProgress);
      setSelected(new Set());
      setRan(false);
      setShowMore(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario generation failed.");
    } finally {
      setProgress(null);
    }
  };

  const review = async () => {
    setReviewing(true);
    setReviewError(null);
    try {
      await getOrRequestCritique();
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Critical review failed.");
    } finally {
      setReviewing(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Running the simulation also starts the skeptical review automatically.
  const run = () => {
    setRan(true);
    if (!critique && !reviewing) void review();
  };

  const chosen = useMemo(() => interventions.filter((i) => selected.has(i.id)), [interventions, selected]);

  const rows = useMemo<LedgerRow[]>(() => {
    if (!ran || chosen.length === 0) return [];
    const { baselineRate, direction } = scenario;
    const options = { direction };
    const adjustedAll = critique ? withReviewerEffects(interventions, critique) : null;
    const adjustedOf = (id: string) => adjustedAll?.find((i) => i.id === id);

    const list: LedgerRow[] = chosen.map((iv) => {
      const adj = adjustedOf(iv.id);
      return {
        key: iv.id,
        label: iv.name,
        optimistic: runSimulation(baselineRate, iv, options),
        adjusted: adj ? runSimulation(baselineRate, adj, options) : null,
      };
    });
    if (chosen.length > 1) {
      const adj = chosen.map((iv) => adjustedOf(iv.id)).filter((i): i is NonNullable<typeof i> => !!i);
      list.push({
        key: "combined",
        label: `Together: ${chosen.map((c) => c.name).join(" + ")}`,
        optimistic: runCombinedSimulation(baselineRate, chosen, options),
        adjusted: adj.length === chosen.length ? runCombinedSimulation(baselineRate, adj, options) : null,
      });
    }
    return list;
  }, [ran, chosen, scenario, interventions, critique]);

  const steps = [
    { label: "Goal", done: generated },
    { label: "Interventions", done: selected.size > 0 },
    { label: "Stress-test", done: !!critique },
  ];
  const current = steps.findIndex((s) => !s.done);

  const [firstSentence, ...rest] = scenario.context.split(/(?<=[.!?])\s+/);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-6 border-b-2 border-ink pb-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">BehaviorLab</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Which nudges are most likely to work for a policy goal, how uncertain is that, and how strong is the
          evidence?
        </p>
      </header>

      <ol className="mb-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.label} aria-current={i === current ? "step" : undefined} className={i === current ? "font-semibold text-ink" : "text-muted"}>
            <span className={`mr-2 inline-flex h-5 w-5 items-center justify-center border ${s.done ? "border-ink bg-ink text-paper" : "border-current"}`}>
              {s.done ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <section aria-labelledby="goal-label" className="mb-10">
        <label id="goal-label" htmlFor="goal" className="font-mono text-xs uppercase tracking-wide text-muted">
          Policy goal
        </label>
        <form
          className="mt-1 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void build(goal);
          }}
        >
          <input
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="min-w-0 flex-1 border border-ink bg-white/60 px-3 py-2"
          />
          <button
            type="submit"
            disabled={!goal.trim() || building}
            className="bg-ink px-5 py-2 font-medium text-paper disabled:opacity-40"
          >
            Build scenario
          </button>
        </form>

        {!building && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            Try:
            {EXAMPLE_GOALS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGoal(g);
                  void build(g);
                }}
                className="border border-rule px-2 py-0.5 hover:border-ink hover:text-ink"
              >
                {g}
              </button>
            ))}
          </p>
        )}

        {building && (
          <ol className="mt-3 space-y-0.5 font-mono text-xs" aria-live="polite">
            <li className="text-muted">✓ Searching the web for evidence</li>
            <li className={progress?.stage === "drafting" ? "text-ink" : "text-muted/40"}>
              {progress?.stage === "drafting"
                ? `● Read ${progress.sourceCount} sources. Drafting interventions and estimating the baseline…`
                : "○ Drafting interventions and estimating the baseline"}
            </li>
          </ol>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-pen">
            {error}
          </p>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div>
          <section aria-label="Scenario" className="mb-8">
            {!generated && (
              <p className="mb-2 font-mono text-xs text-pen">
                Illustrative demo scenario. Build your own above to ground it in evidence.
              </p>
            )}
            <h2 className="font-display text-2xl leading-tight">{scenario.goal}</h2>
            <p className="mt-1 text-muted">{scenario.target}</p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
              <span className="font-mono text-3xl font-medium tabular-nums">{formatPct(scenario.baselineRate)}</span>
              <span className="font-mono text-xs text-muted">
                baseline today · goal is to {scenario.direction} it
              </span>
              <span
                className={`font-mono text-xs ${scenario.baselineBasis === "assumed" ? "text-pen" : "text-muted"}`}
              >
                {scenario.baselineBasis === "assumed" ? "⚠ " : ""}
                {BASIS_LABEL[scenario.baselineBasis]}
              </span>
            </p>
            <p className="mt-3 text-[0.95rem]">
              {firstSentence}
              {rest.length > 0 && (
                <>
                  {showMore && <> {rest.join(" ")}</>}{" "}
                  <button
                    onClick={() => setShowMore((v) => !v)}
                    aria-expanded={showMore}
                    className="text-muted underline decoration-rule underline-offset-2"
                  >
                    {showMore ? "Show less" : "Read more"}
                  </button>
                </>
              )}
            </p>
            {scenario.sources.length > 0 && (
              <details className="mt-2 text-sm text-muted">
                <summary>{scenario.sources.length} sources</summary>
                <ul className="mt-1 space-y-0.5">
                  {scenario.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-2 hover:decoration-ink">
                        {cleanTitle(s.title, s.url)}
                      </a>{" "}
                      <span className="font-mono text-xs">{hostname(s.url)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section aria-labelledby="iv-heading">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h2 id="iv-heading" className="font-display text-2xl">
                Interventions
              </h2>
              <p className="font-mono text-xs text-muted">tick one or more to compare</p>
            </div>
            <ul className="border-b border-rule">
              {interventions.map((iv, i) => (
                <InterventionRow
                  key={iv.id}
                  index={i}
                  intervention={iv}
                  direction={scenario.direction}
                  selected={selected.has(iv.id)}
                  onToggle={toggle}
                  review={critique?.interventions?.find((c) => c.id === iv.id)}
                />
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <RedlineChart
            interventions={interventions}
            direction={scenario.direction}
            critique={critique}
            selectedIds={selected}
          />

          <div>
            <button
              onClick={run}
              disabled={selected.size === 0}
              className="w-full bg-ink px-5 py-3 font-medium text-paper disabled:opacity-40"
            >
              {selected.size === 0
                ? "Select an intervention to simulate"
                : `Run simulation${selected.size > 1 ? ` for ${selected.size} interventions` : ""}`}
            </button>
            {ran && !critique && reviewing && (
              <p className="mt-2 font-mono text-xs text-muted" aria-live="polite">
                ● Reviewer checking citations and effect sizes…
              </p>
            )}
            {reviewError && (
              <p role="alert" className="mt-2 text-sm text-pen">
                {reviewError}{" "}
                <button onClick={() => void review()} className="underline underline-offset-2">
                  Retry review
                </button>
              </p>
            )}
          </div>

          {rows.length > 0 && (
            <ResultsLedger
              rows={rows}
              baselineRate={scenario.baselineRate}
              direction={scenario.direction}
              reviewing={reviewing}
            />
          )}

          {critique && (
            <ReviewerNotes
              critique={critique}
              interventions={interventions}
              onSelectCombination={(ids) => {
                setSelected(new Set(ids));
                setRan(true);
              }}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
