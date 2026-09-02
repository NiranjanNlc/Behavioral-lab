export interface Intervention {
  id: string;
  name: string;
  description: string;
  effect: number; // percentage points
  mechanism: string;
}

export interface Scenario {
  goal: string;
  target: string;
  baselineRate: number; // percentage
}

export interface SimulationResult {
  intervention: Intervention;
  baselineRate: number;
  predictedRate: number;
  absoluteChange: number;
  relativeChange: number; // as a fraction, e.g. 0.357 for 35.7%
}
