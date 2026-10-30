# BehaviorLab: demo video script

**Hackathon:** Nebius x NVIDIA Global AI Hackathon (Devpost).
**Target length:** 2:50. Secondary sources say the video must be under 3 minutes; confirm on the official rules page, and use the 2:00 cut at the bottom if the limit is shorter.
**Tracks:** Best Apps and Agents, Best Use of Tavily, Most Valuable Feedback.

The judging criteria reported for this hackathon are four equal parts: Technological Implementation, Design, Potential Impact, Quality of the Idea. Each scene below says which one it earns.

---

## Why this example

**Increase organ donor registration.** Every judge has ticked that box at a licensing office, so there is nothing to explain. It also has a famous headline, "make it the default and almost everyone signs up", that falls apart under scrutiny. Run through BehaviorLab, the reviewer cuts the proposed effects by about ten times, says the default idea has no empirical support in organ donation, and points to active choice at the service desk as the one option that holds up. That is the story: *the exciting answer is not the one that survives.* The baseline also comes from cited evidence, not an assumption, so the demo reads as grounded.

Nepal VAT filing stays in the app as an example chip. Use it as a ten-second cameo (Scene 8) to show the tool works for any goal and any country.

## Before you record

- [ ] Build **Increase organ donor registration** once so it is cached, then **do not delete `.cache/`**. Numbers on screen will then be identical on every take. The page says "Loaded from cache" with a rebuild link; that is fine, and you can say so.
- [ ] For one take of Scene 2, use **Rebuild with fresh research** so the live progress (searching, reading sources, drafting, setting a target) is on camera. Cut it to about 8 seconds.
- [ ] Record against the production build (`npm run build && npm start`) so the Next.js dev badge and the dev-only WebMCP indicator are not in frame.
- [ ] Browser at 1300px wide, zoom 110%. Close other tabs. Keep `.env.local` and the terminal with keys out of frame.
- [ ] Read the actual numbers off your own screen and replace the `[brackets]` below. The figures come from one test run (picking Active choice, Performance feedback and the banner ads) and will differ if you rebuild with fresh research or choose other interventions.
- [ ] Do not claim an external agent calling the tools unless you have tested one. Scene 7 has an honest fallback.

---

## Script

### Scene 1: The problem (0:00–0:15) · *Quality of the Idea, Impact*
**Screen:** the empty page: title, goal box, example chips. Land on the chip **Increase organ donor registration**.
**Narration:**
> "Before a tax office, a ministry or an NGO rolls out a policy, someone has to decide: which option do we fund? Think of the donor box at the licensing office. Reminders, simpler forms, incentives? Today that's a guess, or a long report nobody has time to read. BehaviorLab turns that decision into something you can test in minutes: pick a goal, spend a budget, and see what actually holds up."

### Scene 2: Evidence, not guesses (0:15–0:40) · *Technological Implementation*
**Screen:** click **Increase organ donor registration**. Show the progress lines: searching the web, "Read [N] sources", drafting, setting a target.
**Narration:**
> "This is BehaviorLab. I give it a goal everyone knows: get more people to register as organ donors. Tavily searches the web for behavioral-science research. Nemotron Super, running on Nebius Token Factory, reads those sources and drafts five interventions, each with a low, medium and high effect, citations, and a cost. Anything it can't back with a source is labelled a hypothesis."

**Screen:** point at the "hypothesis" dots on the default opt-in card and at the baseline line ("from cited evidence").
> "Ideas without a source are flagged as hypotheses, and it tells me whether the starting rate is measured or assumed. Here it is measured: [fifty-three] percent."

### Scene 3: A mission with a budget (0:40–1:00) · *Design, Quality of the Idea*
**Screen:** the Mission block: `[53%] → [59.6%] within 12 months · budget USD [28] thousand`. Tick **Active choice**, **Performance feedback** and the **banner ads** (USD [16] thousand); the dearer cards grey out "over budget".
**Narration:**
> "Every goal becomes a mission: lift registration from [fifty-three] to about [sixty] percent, with [twenty-eight] thousand dollars. I can't afford everything, so I have to choose. Active choice at the desk, feedback for staff, and some cheap banner ads."

### Scene 4: Place your bet (1:00–1:15) · *Design*
**Screen:** the bet panel: "The proposals claim about [12]pp." Drag the slider down to about [5pp]. Click **Lock in bet and run simulation**.
**Narration:**
> "Before I see anything, I bet. The proposals claim about twelve points. How much will I really get? I'll bet five."

### Scene 5: The reveal (1:15–1:55) · *Design, Technological Implementation*
**Screen, in order** (the app paces this itself; talk over it):
1. The meter fills past the target. 
2. The red pen strikes each proposal, one card at a time; the red reviewer range and ⚠ concern appear.
3. The meter shrinks back. 
4. The histogram dots drop; the target line sits in the middle of them.

**Narration:**
> "The optimistic simulation says this is a win. Then a second model, Nemotron 3 Ultra, acts as a skeptical reviewer, and the red pen goes through each proposal. The banner ads: the reviewer says the claimed effect is inflated about ten times against the very study it cites. The meter shrinks from about [sixty-five] percent to just under [sixty]. These dots are five thousand simulated outcomes, so instead of one number I get a distribution, and the share past the line is my real chance of success: [forty-nine] percent."

### Scene 6: The score (1:55–2:15) · *Design, Potential Impact*
**Screen:** the score card: mission result, chance of success, calibration, efficiency, rank. Click **Swap one intervention and try again**.
**Narration:**
> "I'm scored on whether the mission holds up, and on calibration: how close my bet was to what the evidence supports. I bet five, the evidence said about six and a half. The point isn't to win. It's to learn to distrust optimistic numbers. And that famous default opt-in? The reviewer found no empirical support for it in organ donation. Let me swap one intervention and try again."

### Scene 7: Any agent can use it (2:15–2:35) · *Technological Implementation, Potential Impact*
**Screen:** a slide listing the six WebMCP tools: `generate_scenario`, `get_scenario`, `list_interventions`, `run_simulation`, `compare_interventions`, `explain_result`.
**Narration:**
> "Everything here is also exposed through WebMCP. Any compatible AI agent can set a policy goal, pull evidence, run the simulation, compare options and ask the reviewer for a critique. The page and the agent share the same scenario."

*Only if you have tested it:* cut to a short clip of an agent calling `run_simulation` on the open page. *Otherwise* stay on the slide.

### Scene 8: Under the hood (2:35–2:50) · *Technological Implementation*
**Screen:** a clean architecture slide (optional five-second cameo first: click the chip **Increase on-time VAT filing among Nepali SMEs** and say "Same tool, any goal: here it is on-time tax filing in Nepal."; cut this if you are over time): Goal → Tavily → Nemotron Super → Monte Carlo engine → Nemotron 3 Ultra → WebMCP, with "Nebius Token Factory" underneath, and "cached: repeat goals take under a second".
**Narration:**
> "Tavily for evidence, Nemotron Super on Nebius to draft, a Monte Carlo engine to simulate, Nemotron 3 Ultra to challenge it. Responses are cached, so a repeated goal costs nothing and takes under a second."

### Scene 9: Close (2:50–2:55)
**Screen:** the title and the tagline.
> "Before you implement a policy: simulate it, and then try to break it. BehaviorLab."

---

## 2:00 cut
Drop Scene 7's slide to one sentence, merge Scenes 3 and 4 (show budget and bet in one pass), cut Scene 8 to a single line over Scene 6, and skip the retry click.

## Devpost text

**Tagline:** Beat the skeptic: spend a budget on behavioral interventions, bet on what they'll deliver, then watch a second model try to break your plan.

**What it does.** You enter a policy goal. Tavily finds behavioral-science evidence, Nemotron Super drafts five interventions with effect ranges, citations and costs, and a Monte Carlo engine simulates the outcome. Nemotron 3 Ultra reviews the proposal as a skeptic. You play it as a game: choose interventions within a budget, bet on the gain, then watch the reviewer strike down optimistic estimates and see the real chance of hitting the target.

**How we built it.** Next.js 16, TypeScript. Tavily search for evidence. Nemotron Super and Nemotron 3 Ultra through Nebius Token Factory's OpenAI-compatible API. A seeded Monte Carlo engine with triangular effect distributions, goal direction and diminishing returns for combined interventions. Six WebMCP tools so other agents can drive it. A server cache (memory plus disk, with in-flight de-duplication) so repeated goals make no API calls. 70 unit tests.

**Challenges.** Models propose effect sizes far larger than the literature supports (a reminder at +20pp where meta-analyses say 3–8pp), so the second model's job became the product. Costs and targets are generated, so we validate them: the budget can never afford everything, and the target is set from the reviewer-adjusted evidence so the game is winnable.

**What's next.** Real measured baselines from administrative data, a daily seeded scenario, and a "spot the flaw" mode.

**Built with:** Nebius Token Factory, NVIDIA Nemotron (Super and Ultra), Tavily, WebMCP, Next.js, TypeScript.

## Draft feedback for "Most Valuable Feedback"
Grounded in what happened building this; edit to taste and submit through whatever channel the hackathon specifies.

- **Nebius:** I guessed a Nemotron model ID from the naming of the Super model and got a 404 (`model_not_found`). Listing `/v1/models` showed the real ID (`nvidia/Nemotron-3-Ultra-550b-a55b`), which is capitalised differently from Super (`nvidia/nemotron-3-super-120b-a12b`). A documented naming convention, or a "did you mean" in the 404 body, would have saved a debugging round.
- **Nebius:** the Ultra review takes roughly 10–40 seconds for a structured JSON answer, which is long for an interactive flow. Streaming the JSON, or guidance on a faster setting, would help.
- **Tavily:** result titles often carry noise (`FINAL KP#2: …`, `(PDF) …`, site suffixes). A cleaned `title` or a separate `site_name` field would remove the need to post-process.
- **Tavily:** a baseline-rate query for a small country returned mostly generic results; a `country` hint on search would help locate local statistics.
