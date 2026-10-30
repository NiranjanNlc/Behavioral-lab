import { formatPp } from "@/simulation/format";

interface Props {
  claim: number;
  bet: number;
  max: number;
  step: number;
  spent: string;
  disabled: boolean;
  onChange: (v: number) => void;
  onLock: () => void;
}

/** The hook: the user bets how much of the proposed gain they will actually get, before seeing anything. */
export default function BetPanel({ claim, bet, max, step, spent, disabled, onChange, onLock }: Props) {
  return (
    <section aria-labelledby="bet-heading">
      <h3 id="bet-heading" className="font-display text-lg">
        Place your bet
      </h3>
      <p className="text-sm text-muted">
        The proposals claim about <span className="font-mono text-proposal">{formatPp(claim)}</span> for {spent}. How
        much will you actually get?
      </p>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={bet}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Your bet: expected gain in percentage points"
          className="h-2 flex-1 cursor-pointer accent-[#c2410c]"
        />
        <output className="w-16 text-right font-mono text-lg font-medium tabular-nums text-pen">{formatPp(bet)}</output>
      </div>
      <button onClick={onLock} disabled={disabled} className="mt-3 w-full bg-ink px-5 py-3 font-medium text-paper disabled:opacity-40">
        Lock in bet and run simulation
      </button>
    </section>
  );
}
