"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getLabState, subscribeLabState } from "@/simulation/store";
import { GenerateProgress, generateScenario, getOrRequestCritique } from "@/simulation/client";
import { runCombinedSimulation, runSimulation } from "@/simulation/engine";
import { cleanTitle, formatPct, formatPp, hostname } from "@/simulation/format";
import {
  betBounds,
  buildHistogram,
  calibrationScore,
  efficiency,
  formatMoney,
  goalGain,
  meetsTarget,
  rankTitle,
  successChance,
  totalCost,
} from "@/simulation/game";
import { withReviewerEffects } from "@/simulation/review";
import { Critique, Intervention, Scenario } from "@/simulation/types";
import BetPanel from "@/components/BetPanel";
import InterventionRow from "@/components/InterventionRow";
import MissionMeter from "@/components/MissionMeter";
import PlinkoHistogram from "@/components/PlinkoHistogram";
import RedlineChart from "@/components/RedlineChart";
import ResultsLedger, { LedgerRow } from "@/components/ResultsLedger";
import ReviewerNotes from "@/components/ReviewerNotes";
import ScoreCard, { Score } from "@/components/ScoreCard";

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

type Phase = "plan" | "wait" | "strike" | "settle" | "drop" | "done";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Simulates the chosen portfolio as proposed and as the reviewer sees it, and scores the bet. */
function evaluate(
  scenario: Scenario,
  interventions: Intervention[],
  chosen: Intervention[],
  critique: Critique | null,
  bet: number,
  spent: number
) {
  const { baselineRate: baseline, direction, mission } = scenario;
  const proposed = runCombinedSimulation(baseline, chosen, { direction });
  if (!critique) return { proposed, adjusted: null, score: null };

  const adjustedAll = withReviewerEffects(interventions, critique);
  const adjustedChosen = chosen.map((c) => adjustedAll.find((i) => i.id === c.id) ?? c);
  const adjusted = runCombinedSimulation(baseline, adjustedChosen, { direction, keepSamples: true });

  const reviewedGain = goalGain(baseline, adjusted.medianRate, direction);
  const optimisticGain = goalGain(baseline, proposed.medianRate, direction);
  const score: Score = {
    missionMet: meetsTarget(adjusted.medianRate, mission.targetRate, direction),
    chance: successChance(adjusted.samples ?? [], mission.targetRate, direction),
    finalRate: adjusted.medianRate,
    target: mission.targetRate,
    bet,
    reviewedGain,
    optimisticGain,
    calibration: calibrationScore(bet, reviewedGain, optimisticGain),
    efficiencyLabel: `${Number(efficiency(reviewedGain, spent).toFixed(2))}pp per ${mission.budget.unit || mission.budget.currency}`,
    spentLabel: formatMoney(spent, mission.budget),
  };
  return { proposed, adjusted, score };
}

export default function Home() {
  const { scenario, interventions, critique, fromCache } = useSyncExternalStore(subscribeLabState, getLabState, getLabState);
  const [goal, setGoal] = useState(EXAMPLE_GOALS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [betOverride, setBetOverride] = useState<number | null>(null);
  const [lockedBet, setLockedBet] = useState(0);
  const [phase, setPhase] = useState<Phase>("plan");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<number[]>([]);
  const [progress, setProgress] = useState<GenerateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const runId = useRef(0);

  // Cancel any reveal in flight when the page unmounts.
  useEffect(() => {
    const id = runId;
    return () => {
      id.current++;
    };
  }, []);

  const building = progress !== null;
  const generated = scenario.source === "generated";
  const revealing = phase === "wait" || phase === "strike" || phase === "settle" || phase === "drop";
  const { baselineRate: baseline, direction, mission } = scenario;
  const sign = direction === "decrease" ? -1 : 1;

  const chosen = useMemo(() => interventions.filter((i) => selected.has(i.id)), [interventions, selected]);
  const spent = totalCost(chosen);
  const remaining = mission.budget.amount - spent;

  const proposed = useMemo(
    () => (chosen.length ? runCombinedSimulation(baseline, chosen, { direction }) : null),
    [chosen, baseline, direction]
  );
  const claim = proposed ? Math.max(0, goalGain(baseline, proposed.medianRate, direction)) : 0;
  const { max: betMax, step: betStep } = betBounds(baseline, direction, claim);
  const bet = Math.min(betMax, betOverride ?? Math.round(claim / betStep) * betStep);

  const outcome = useMemo(
    () => (phase === "plan" || chosen.length === 0 ? null : evaluate(scenario, interventions, chosen, critique, lockedBet, spent)),
    [phase, scenario, interventions, chosen, critique, lockedBet, spent]
  );

  const reset = () => {
    runId.current++;
    setSelected(new Set());
    setBetOverride(null);
    setPhase("plan");
    setRevealed(new Set());
    setShowMore(false);
  };

  const build = async (g: string, refresh = false) => {
    if (!g.trim() || building) return;
    setError(null);
    setReviewError(null);
    try {
      await generateScenario(g.trim(), undefined, undefined, setProgress, refresh);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario generation failed.");
    } finally {
      setProgress(null);
    }
  };

  const toggle = (id: string) => {
    if (revealing) return;
    const iv = interventions.find((i) => i.id === id);
    if (!iv) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id) && totalCost(interventions.filter((i) => prev.has(i.id))) + iv.cost <= mission.budget.amount) next.add(id);
      return next;
    });
    setBetOverride(null);
    setPhase("plan");
  };

  const choose = (ids: string[]) => {
    const picked: string[] = [];
    let sum = 0;
    for (const id of ids) {
      const iv = interventions.find((i) => i.id === id);
      if (iv && sum + iv.cost <= mission.budget.amount) {
        picked.push(id);
        sum += iv.cost;
      }
    }
    setSelected(new Set(picked));
    setBetOverride(null);
    setPhase("plan");
  };

  /** Reveal sequence: optimistic result, red pen through each card, meter shrinks, draws drop, score. */
  const lockInAndRun = async () => {
    if (chosen.length === 0 || revealing) return;
    const token = ++runId.current;
    const live = () => token === runId.current;
    const ids = chosen.map((c) => c.id);
    const betAtRun = bet;
    const spentAtRun = spent;
    setLockedBet(betAtRun);
    setReviewError(null);
    setPhase("wait");

    let review: Critique;
    try {
      review = await getOrRequestCritique();
    } catch (e) {
      if (!live()) return;
      setReviewError(e instanceof Error ? e.message : "Critical review failed.");
      setPhase("plan");
      return;
    }
    if (!live()) return;

    await sleep(900); // let the optimistic result sink in
    if (!live()) return;
    setPhase("strike");
    for (const id of ids) {
      if (!live()) return;
      if (!revealed.has(id)) {
        setRevealed((prev) => new Set(prev).add(id));
        await sleep(700);
      }
    }
    await sleep(300);
    if (!live()) return;
    setPhase("settle");
    await sleep(1400);
    if (!live()) return;
    setPhase("drop");
    await sleep(3000);
    if (!live()) return;
    finish(review, ids, betAtRun, spentAtRun);
  };

  const finish = (review: Critique, ids: string[], betAtRun: number, spentAtRun: number) => {
    const picked = interventions.filter((i) => ids.includes(i.id));
    const result = evaluate(scenario, interventions, picked, review, betAtRun, spentAtRun);
    if (result.score) setHistory((h) => [...h, result.score!.calibration]);
    setRevealed((prev) => new Set([...prev, ...ids]));
    setPhase("done");
  };

  const skip = () => {
    const review = getLabState().critique;
    if (!review) return;
    runId.current++;
    finish(review, chosen.map((c) => c.id), lockedBet, spent);
  };

  const retry = () => {
    setBetOverride(null);
    setPhase("plan");
    document.getElementById("iv-heading")?.scrollIntoView({ behavior: "smooth" });
  };

  const visibleCritique = useMemo(
    () =>
      critique && revealed.size > 0
        ? { ...critique, interventions: (critique.interventions ?? []).filter((c) => revealed.has(c.id)) }
        : null,
    [critique, revealed]
  );

  const rows = useMemo<LedgerRow[]>(() => {
    if (phase !== "done" || !critique || chosen.length === 0) return [];
    const adjustedAll = withReviewerEffects(interventions, critique);
    const options = { direction };
    const list: LedgerRow[] = chosen.map((iv) => ({
      key: iv.id,
      label: iv.name,
      optimistic: runSimulation(baseline, iv, options),
      adjusted: runSimulation(baseline, adjustedAll.find((i) => i.id === iv.id) ?? iv, options),
    }));
    return list;
  }, [phase, critique, chosen, interventions, baseline, direction]);

  // What the meter shows at each stage of the reveal.
  const meterValue =
    phase === "plan" || !outcome
      ? baseline
      : phase === "wait" || phase === "strike"
        ? outcome.proposed.medianRate
        : (outcome.adjusted ?? outcome.proposed).medianRate;
  const meterTone = phase === "plan" ? "plain" : phase === "wait" || phase === "strike" ? "optimistic" : "reviewed";
  const caption: Record<Phase, string> = {
    plan: chosen.length ? "Lock in your bet to run the simulation." : "Tick interventions to build a portfolio within budget.",
    wait: `The proposals say ${formatPct(meterValue)}. Now the skeptical reviewer reads the evidence…`,
    strike: "The red pen goes through each proposal…",
    settle: "Adjusting to the reviewer's ranges…",
    drop: "Drawing 5,000 possible outcomes…",
    done: outcome?.score?.missionMet ? "The target holds up under scrutiny." : "The target does not survive the reviewer.",
  };

  const histogram = useMemo(
    () =>
      outcome?.adjusted?.samples
        ? buildHistogram(outcome.adjusted.samples, { target: mission.targetRate, baseline, direction })
        : null,
    [outcome, mission.targetRate, baseline, direction]
  );

  const steps = [
    { label: "Goal", done: generated },
    { label: "Spend", done: selected.size > 0 },
    { label: "Bet and reveal", done: phase === "done" },
  ];
  const current = steps.findIndex((s) => !s.done);
  const avgCalibration = history.length ? history.reduce((s, n) => s + n, 0) / history.length : 0;
  const [firstSentence, ...rest] = scenario.context.split(/(?<=[.!?])\s+/);
  const spentPct = Math.min(100, (spent / mission.budget.amount) * 100);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-6 border-b-2 border-ink pb-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">BehaviorLab</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Beat the skeptic: spend a budget on nudges, bet on what they will really deliver, then watch a reviewer
          test your portfolio.
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
          <input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="min-w-0 flex-1 border border-ink bg-white/60 px-3 py-2" />
          <button type="submit" disabled={!goal.trim() || building || revealing} className="bg-ink px-5 py-2 font-medium text-paper disabled:opacity-40">
            Build scenario
          </button>
        </form>

        {!building && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            Try:
            {EXAMPLE_GOALS.map((g) => (
              <button
                key={g}
                disabled={revealing}
                onClick={() => {
                  setGoal(g);
                  void build(g);
                }}
                className="border border-rule px-2 py-0.5 hover:border-ink hover:text-ink disabled:opacity-40"
              >
                {g}
              </button>
            ))}
          </p>
        )}

        {building && (
          <ol className="mt-3 space-y-0.5 font-mono text-xs" aria-live="polite">
            <li className="text-muted">✓ Searching the web for evidence</li>
            <li className={progress?.stage === "searching" ? "text-muted/40" : progress?.stage === "drafting" ? "text-ink" : "text-muted"}>
              {progress?.stage === "searching"
                ? "○ Drafting interventions, budget and costs"
                : progress?.stage === "drafting"
                  ? `● Read ${progress.sourceCount} sources. Drafting interventions, budget and costs…`
                  : "✓ Drafted interventions, budget and costs"}
            </li>
            <li className={progress?.stage === "calibrating" ? "text-ink" : "text-muted/40"}>
              {progress?.stage === "calibrating" ? "● Setting a target the evidence could support…" : "○ Setting a target the evidence could support"}
            </li>
          </ol>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-pen">
            {error}
          </p>
        )}
      </section>

      {!generated && !building && (
        <p className="border-y border-rule py-8 text-center text-muted">
          Pick an example goal above, or type your own, to build a mission with a budget.
        </p>
      )}

      {generated && (
        <>
          <section aria-label="Mission" className="mb-10 border-y-2 border-ink py-5">
            <p className="font-mono text-xs uppercase tracking-wide text-muted">Mission</p>
            <h2 className="font-display text-2xl leading-tight sm:text-3xl">{scenario.goal}</h2>
            <p className="mt-1">
              <span className="font-mono tabular-nums">
                {formatPct(baseline)} → {formatPct(mission.targetRate)}
              </span>{" "}
              within {mission.horizonMonths} months · budget{" "}
              <span className="font-mono tabular-nums">{formatMoney(mission.budget.amount, mission.budget)}</span>
            </p>

            <div className="mt-5">
              <MissionMeter
                baseline={baseline}
                target={mission.targetRate}
                value={meterValue}
                direction={direction}
                betRate={chosen.length ? baseline + sign * bet : null}
                extras={[baseline + sign * claim]}
                tone={meterTone}
                verdict={phase === "done" && outcome?.score ? (outcome.score.missionMet ? "met" : "missed") : null}
              />
              <p className="mt-2 text-sm italic text-muted" aria-live="polite">
                {caption[phase]}
                {(phase === "strike" || phase === "settle" || phase === "drop") && (
                  <button onClick={skip} className="ml-3 not-italic underline underline-offset-2">
                    Skip
                  </button>
                )}
              </p>
            </div>

            <p className="mt-4 text-sm text-muted">
              {scenario.target} · baseline{" "}
              <span className={scenario.baselineBasis === "assumed" ? "text-pen" : ""}>
                {scenario.baselineBasis === "assumed" ? "⚠ " : ""}
                {BASIS_LABEL[scenario.baselineBasis]}
              </span>
              . {firstSentence}
              {rest.length > 0 && (
                <>
                  {showMore && <> {rest.join(" ")}</>}{" "}
                  <button onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="underline decoration-rule underline-offset-2">
                    {showMore ? "Show less" : "Read more"}
                  </button>
                </>
              )}
            </p>
            {fromCache && (
              <p className="mt-2 font-mono text-xs text-muted">
                Loaded from cache, no API calls made.{" "}
                <button
                  onClick={() => void build(scenario.goal, true)}
                  disabled={building || revealing}
                  className="underline underline-offset-2 disabled:opacity-40"
                >
                  Rebuild with fresh research
                </button>
              </p>
            )}
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

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
            <section aria-labelledby="iv-heading">
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <h2 id="iv-heading" className="font-display text-2xl">
                  Spend the budget
                </h2>
                <p className="font-mono text-xs text-muted">tick the nudges you can afford</p>
              </div>

              <div className="mb-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-xs tabular-nums">
                  <span>
                    Spent {formatMoney(spent, mission.budget)} of {formatMoney(mission.budget.amount, mission.budget)}
                  </span>
                  <span className={remaining <= 0 ? "text-pen" : "text-muted"}>{formatMoney(Math.max(0, remaining), mission.budget)} left</span>
                </div>
                <div className="mt-1 h-2 border border-ink/60 bg-white/40" role="img" aria-label={`${Math.round(spentPct)}% of the budget spent`}>
                  <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${spentPct}%` }} />
                </div>
                <p className="mt-1 text-xs italic text-muted">Costs and budget are illustrative planning assumptions, not sourced figures.</p>
              </div>

              <ul className="border-b border-rule">
                {interventions.map((iv, i) => {
                  const over = spent + iv.cost > mission.budget.amount;
                  return (
                    <InterventionRow
                      key={iv.id}
                      index={i}
                      intervention={iv}
                      direction={direction}
                      selected={selected.has(iv.id)}
                      onToggle={toggle}
                      review={revealed.has(iv.id) ? critique?.interventions?.find((c) => c.id === iv.id) : undefined}
                      costLabel={formatMoney(iv.cost, mission.budget)}
                      blockedReason={revealing ? "reveal in progress" : over ? "over budget" : undefined}
                    />
                  );
                })}
              </ul>
            </section>

            <aside className="space-y-8 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
              {chosen.length > 0 && phase === "plan" && (
                <BetPanel
                  claim={claim}
                  bet={bet}
                  max={betMax}
                  step={betStep}
                  spent={formatMoney(spent, mission.budget)}
                  disabled={building}
                  onChange={setBetOverride}
                  onLock={() => void lockInAndRun()}
                />
              )}
              {chosen.length === 0 && (
                <p className="text-sm text-muted">Choose one or more interventions to build a portfolio. Then bet on what it will deliver.</p>
              )}
              {reviewError && (
                <p role="alert" className="text-sm text-pen">
                  {reviewError}
                </p>
              )}

              <RedlineChart interventions={interventions} direction={direction} critique={visibleCritique} selectedIds={selected} />

              {histogram && (phase === "drop" || phase === "done") && outcome?.score && (
                <PlinkoHistogram histogram={histogram} target={mission.targetRate} successShare={outcome.score.chance} />
              )}

              {phase === "done" && outcome?.score && (
                <ScoreCard score={outcome.score} rank={rankTitle(avgCalibration)} runs={history.length} avgCalibration={avgCalibration} onRetry={retry} />
              )}

              {phase === "done" && critique && (
                <>
                  <ReviewerNotes critique={critique} interventions={interventions} onSelectCombination={choose} />
                  {rows.length > 0 && (
                    <details>
                      <summary className="font-display text-lg">Per-intervention numbers</summary>
                      <div className="mt-3">
                        <ResultsLedger rows={rows} baselineRate={baseline} direction={direction} reviewing={false} />
                      </div>
                    </details>
                  )}
                </>
              )}
              {phase === "done" && (
                <p className="font-mono text-xs text-muted">
                  Gains are percentage points toward the goal. Your bet {formatPp(lockedBet)}.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
