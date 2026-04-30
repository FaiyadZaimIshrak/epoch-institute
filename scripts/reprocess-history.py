"""
Reprocesses data/history.json using the Anthropic API.
Pass 1: filters insignificant events.
Pass 2: rewrites surviving entries for quality.

Run: python scripts/reprocess-history.py
Saves a checkpoint every 5 days so the run can be safely interrupted and resumed.
"""
import json, os, sys, time, threading, concurrent.futures, re
import anthropic

ROOT  = os.path.join(os.path.dirname(__file__), '..')
SRC   = os.path.join(ROOT, 'data', 'history.json')
DST   = SRC   # overwrite in-place
CKPT  = os.path.join(ROOT, 'data', '_reprocess_checkpoint.json')

# ── API key resolution ────────────────────────────────────────────────────────
# Priority: command-line arg > ANTHROPIC_API_KEY env var > interactive prompt
def resolve_api_key():
    if len(sys.argv) > 1 and sys.argv[1].startswith('sk-'):
        return sys.argv[1]
    key = os.environ.get('ANTHROPIC_API_KEY', '').strip()
    if key:
        return key
    try:
        import getpass
        key = getpass.getpass('Enter ANTHROPIC_API_KEY: ').strip()
    except Exception:
        key = input('Enter ANTHROPIC_API_KEY: ').strip()
    if not key:
        sys.exit('Error: no API key provided.')
    return key

MODEL       = 'claude-haiku-4-5-20251001'
MAX_WORKERS = 3    # keep well inside token-rate limits
RETRY_LIMIT = 4
CKPT_EVERY  = 5    # save checkpoint every N completed days

SYSTEM = """You are a historical data editor for The Epoch Institute, a scholarly research organisation. You receive a list of historical events for one calendar date. Perform two tasks in order:

─── TASK 1 · FILTER ───────────────────────────────────────────────────────────
REMOVE events that are:
• Small-scale modern incidents with no lasting impact (local bombings killing a handful of people, minor court rulings, small plane crashes, regional power outages, local floods, minor train crashes)
• Deaths or births of minor public figures — ONLY keep deaths/births of people who genuinely changed history: heads of state, groundbreaking scientists, legendary artists or writers, major military commanders, religious founders or reformers
• Sports results, match wins, or tournament outcomes UNLESS a genuine cultural landmark (first modern Olympics, first FIFA World Cup, etc.)
• Routine political appointments with no wider consequence (ambassador appointments, minor ministerial reshuffles)
• Local or municipal events of no national or international significance
• Routine ecclesiastical appointments (bishop ordinations, local clergy events)
• Duplicate or near-duplicate events (keep the richer version)

KEEP events that are:
• Political: founding of nations, revolutions, coups, landmark treaties, declarations of independence, coronations of historically significant rulers, elections that shifted world history
• Military: notable battles, sieges, invasions, surrenders, armistices — anything that influenced a war's outcome or shifted the balance of power, from ancient times to the present
• Scientific & technological: all notable firsts and breakthroughs — first flight, Moon landing, discovery of DNA, nuclear test, first satellite, printing press, internet launch, first heart transplant, and comparable milestones
• Natural disasters: major events with significant death tolls or civilisational impact (Pompeii, 1906 San Francisco earthquake, Krakatoa, Tunguska, etc.). Exclude minor or localised events
• Cultural: publication of landmark literary works, premiere of world-changing films or musical works, founding moments of major world religions, establishment of significant institutions, first modern Olympics, first FIFA World Cup, and comparable historic firsts
• Exploration: voyages of discovery, first crossings of continents or oceans, founding of major cities or colonies that shaped civilisation

─── TASK 2 · REWRITE ──────────────────────────────────────────────────────────
For EVERY surviving event, fix these specific quality issues:

1. TRUNCATED TITLES — Many titles end mid-phrase (e.g. "For the first time", "Ceres", "Twenty-year-old Francis"). Rewrite every title to be a complete, meaningful phrase of 6–10 words that tells the reader what happened. Do not use gerunds as a crutch — write declarative phrases.

2. TRUNCATED DESCRIPTIONS — Many descriptions are cut off mid-sentence (ending with "...and the United Kingdom of Great" or "...standing at a height of"). Complete every truncated sentence so it is grammatically correct and factually complete.

3. DESCRIPTIONS THAT COPY THE TITLE — If the description merely restates the title, rewrite it to add genuine context: why it mattered, what came next, or what made it historically significant.

4. VAGUE OR BARE DESCRIPTIONS — Where a description is too sparse, add one sentence of historical significance. Example: "The French Republican Calendar is abolished." → "Napoleon abolished the French Republican Calendar on this day, restoring the Gregorian calendar and marking the end of the Revolution's attempt to remake time itself."

5. VOICE AND SPELLING — Write in The Epoch Institute's voice: scholarly but accessible, engaging, and illuminating. British spelling throughout (civilisation, colour, organised, recognised, honour, programme, metre, defence). Use present tense for descriptions where possible. Titles should be in title case.

─── OUTPUT FORMAT ─────────────────────────────────────────────────────────────
Return ONLY a JSON array. No markdown fences, no commentary, no extra fields.
Each object must have exactly these four fields:
  "year"        — integer (negative for BCE)
  "yearDisplay" — string e.g. "45 BCE" or "1969"
  "title"       — string, 6–10 words, complete declarative phrase
  "description" — string, 1–2 complete sentences with historical context
"""


def strip_fences(text):
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def validate_events(raw):
    """Return cleaned list; skip malformed entries."""
    out = []
    for ev in raw:
        if not isinstance(ev, dict):
            continue
        if not isinstance(ev.get('year'), int):
            continue
        if not ev.get('title') or not ev.get('description') or not ev.get('yearDisplay'):
            continue
        out.append({
            'year':        ev['year'],
            'yearDisplay': str(ev['yearDisplay']),
            'title':       str(ev['title']).strip(),
            'description': str(ev['description']).strip(),
        })
    return out


def process_day(client, day_key, events):
    """Call the API to filter and rewrite one day's events. Returns validated list."""
    user_msg = 'Date: ' + day_key + '\nEvents:\n' + json.dumps(events, ensure_ascii=False)

    for attempt in range(RETRY_LIMIT):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=8000,
                system=SYSTEM,
                messages=[{'role': 'user', 'content': user_msg}],
            )
            text = strip_fences(resp.content[0].text)
            raw  = json.loads(text)
            if not isinstance(raw, list):
                raise ValueError('Response is not a JSON array')
            return validate_events(raw)

        except json.JSONDecodeError as e:
            if attempt < RETRY_LIMIT - 1:
                time.sleep(2 ** attempt)
                continue
            print(f'  JSON error {day_key} (attempt {attempt+1}): {e}', file=sys.stderr)
            return None   # signals failure

        except anthropic.RateLimitError:
            wait = 45 * (attempt + 1)
            print(f'  Rate limit — {day_key} sleeping {wait}s…', file=sys.stderr)
            time.sleep(wait)

        except anthropic.APIStatusError as e:
            if e.status_code == 529:   # overloaded
                wait = 20 * (attempt + 1)
                print(f'  API overloaded — {day_key} sleeping {wait}s…', file=sys.stderr)
                time.sleep(wait)
            else:
                print(f'  API error {day_key}: {e}', file=sys.stderr)
                if attempt == RETRY_LIMIT - 1:
                    return None
                time.sleep(5)

        except Exception as e:
            print(f'  Error {day_key}: {e}', file=sys.stderr)
            if attempt < RETRY_LIMIT - 1:
                time.sleep(3)
            else:
                return None

    return None


def main():
    start = time.time()

    with open(SRC, encoding='utf-8') as f:
        data = json.load(f)

    all_days     = sorted(data.keys())
    total_before = sum(len(v) for v in data.values())

    # Load checkpoint
    if os.path.exists(CKPT):
        with open(CKPT, encoding='utf-8') as f:
            output = json.load(f)
        print(f'Resuming checkpoint: {len(output)}/{len(all_days)} days already done')
    else:
        output = {}

    days_todo = [d for d in all_days if d not in output]
    print(f'Total events before:  {total_before:,}')
    print(f'Days to process:      {len(days_todo)} of {len(all_days)}')
    print(f'Model:                {MODEL}')
    print(f'Workers:              {MAX_WORKERS}')
    print()

    api_key  = resolve_api_key()
    client   = anthropic.Anthropic(api_key=api_key)
    lock     = threading.Lock()
    failures = []
    counter  = [len(output)]   # mutable int

    def process_and_store(day_key):
        events = data[day_key]
        result = process_day(client, day_key, events)
        with lock:
            if result is None:
                failures.append(day_key)
                output[day_key] = events   # keep originals on failure
            else:
                output[day_key] = result
            counter[0] += 1
            n = counter[0]
            kept    = len(output[day_key])
            dropped = len(events) - kept if result is not None else 0
            status  = '(FAILED — originals kept)' if result is None else f'{kept} kept, {dropped} dropped'
            print(f'  [{n:3d}/{len(all_days)}] {day_key}  {status}')
            sys.stdout.flush()
            if n % CKPT_EVERY == 0:
                with open(CKPT, 'w', encoding='utf-8') as f:
                    json.dump(output, f, ensure_ascii=False)

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(process_and_store, d): d for d in days_todo}
        for fut in concurrent.futures.as_completed(futures):
            try:
                fut.result()
            except Exception as e:
                print(f'  Unhandled thread error: {e}', file=sys.stderr)

    # Ensure every day is present
    for d in all_days:
        if d not in output:
            output[d] = data[d]

    # Write final sorted output
    final = {k: output[k] for k in sorted(output.keys())}
    with open(DST, 'w', encoding='utf-8') as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    # Clean up checkpoint on clean run
    if not failures and os.path.exists(CKPT):
        os.remove(CKPT)

    # ── Report ────────────────────────────────────────────────────────────────
    total_after = sum(len(v) for v in final.values())
    thin_days   = sorted([(k, len(v)) for k, v in final.items() if 0 < len(v) < 3], key=lambda x: x[0])
    empty_days  = [k for k, v in final.items() if len(v) == 0]
    elapsed     = (time.time() - start) / 60

    print()
    print('=' * 55)
    print(f'Events before filtering: {total_before:,}')
    print(f'Events after filtering:  {total_after:,}')
    print(f'Events removed:          {total_before - total_after:,}  '
          f'({100*(total_before-total_after)/total_before:.1f}%)')
    print(f'Days with < 3 events:    {len(thin_days)}')
    if thin_days:
        for k, n in thin_days:
            print(f'    {k}: {n} event(s)')
    if empty_days:
        print(f'Empty days ({len(empty_days)}): {", ".join(empty_days)}')
    if failures:
        print(f'FAILED days ({len(failures)}) — originals kept: {", ".join(failures)}')
    print(f'Elapsed: {elapsed:.1f} min')
    print(f'Saved to {os.path.abspath(DST)}')


if __name__ == '__main__':
    main()
