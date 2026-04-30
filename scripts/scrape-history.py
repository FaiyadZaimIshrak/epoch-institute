"""
One-time build script. Generates data/history.json from Wikipedia's On This Day API.
Run: python scripts/scrape-history.py
Takes ~30 minutes (0.5s delay x 366 days).
"""
import json, re, time, urllib.request, urllib.error, os, sys

MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
]
DAYS_IN_MONTH = [31,29,31,30,31,30,31,31,30,31,30,31]

HEADERS = {
    'User-Agent': 'EpochInstituteHistoryScraper/1.0 (build script; research@the-epoch-institute.org)',
    'Accept': 'application/json'
}

def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode('utf-8')
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
            else:
                raise
    return None

def clean_text(t):
    t = re.sub(r'\[[\w\d\s,]+\]', '', t or '')
    return re.sub(r'\s+', ' ', t).strip()

def make_title(text):
    t = re.sub(r'^(The |A |An )', '', text, flags=re.IGNORECASE)
    m = re.search(r',|\s[—–]\s', t)
    if m and 4 < m.start() < 80:
        t = t[:m.start()].strip()
    words = t.split()
    if len(words) > 9:
        t = ' '.join(words[:9])
    return t.strip().rstrip('.,;')

def make_description(text):
    cleaned = clean_text(text)
    m = re.match(r'^(.+?[.!?])(?:\s|$)', cleaned)
    desc = m.group(1) if m else cleaned
    words = desc.split()
    if len(words) > 22:
        desc = ' '.join(words[:20]) + '.'
    return desc.strip()

def format_year(year):
    if isinstance(year, int):
        return f'{abs(year)} BCE' if year < 0 else str(year)
    return str(year)

def scrape_day(month, day):
    url = f'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}'
    try:
        body = fetch(url)
        data = json.loads(body)
        events = data.get('events', [])
        result = []
        for ev in events:
            if not isinstance(ev.get('year'), int) or not ev.get('text'):
                continue
            cleaned = clean_text(ev['text'])
            title = make_title(cleaned)
            desc  = make_description(ev['text'])
            if len(title) < 4 or len(desc) < 10:
                continue
            result.append({
                'year':        ev['year'],
                'yearDisplay': format_year(ev['year']),
                'title':       title,
                'description': desc
            })
        result.sort(key=lambda e: e['year'])
        return result
    except Exception as e:
        print(f'  Error on {MONTHS[month-1]} {day}: {e}', file=sys.stderr)
        return []

def main():
    output = {}
    total  = 0
    start  = time.time()

    for m in range(1, 13):
        for d in range(1, DAYS_IN_MONTH[m-1] + 1):
            key    = f'{m:02d}-{d:02d}'
            events = scrape_day(m, d)
            output[key] = events
            total += len(events)
            print(f'Scraped {MONTHS[m-1]:>10} {d:2d}  —  {len(events)} events')
            sys.stdout.flush()
            time.sleep(0.5)

    out_dir  = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'history.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    elapsed = (time.time() - start) / 60
    print(f'\nDone — {total} events across 366 days in {elapsed:.1f} min')
    print(f'Saved to {os.path.abspath(out_path)}')

if __name__ == '__main__':
    main()
