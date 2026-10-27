# Makes the daily History Crossword puzzles (12 x 12) from scripts/crossword-words.tsv and APPENDS them to
# scripts/crosswords.tsv, which is never rewritten: once published, a day's puzzle never changes.
#   & scripts\make-crosswords.ps1 [-Count 365]
# A puzzle has 13-18 answers, every one crossing another and all joined together; no two answers lie side by side
# (no stray two-letter words), each answer starts and ends against an empty cell or the edge. An answer is not used
# again within 30 puzzles, no answer sits inside another of the same puzzle, and places are at most 60% of a puzzle,
# with at least two people and two other things (events, works, ideas). The kinds come from the encyclopedia entries.
# Puzzle lines: number, then the answers as direction|row|column|LETTERS (A across, D down; rows and columns from 0).
param([string]$Repo = (Split-Path $PSScriptRoot), [int]$Count = 365, [int]$Tries = 60, [string]$Words, [string]$Out)
if (-not $Words) { $Words = Join-Path $Repo "scripts/crossword-words.tsv" }
if (-not $Out) { $Out = Join-Path $Repo "scripts/crosswords.tsv" }
$ErrorActionPreference = 'Stop'
$U8 = New-Object Text.UTF8Encoding($false)
if (-not ('EpochCw.Maker' -as [type])) {
  Add-Type -Language CSharp -TypeDefinition @'
using System; using System.Collections.Generic; using System.Linq; using System.Text;
namespace EpochCw {
public class Maker {
  const int N = 12;
  char[,] g = new char[N, N]; int[,] m = new int[N, N];   // letters; 1 = part of an across answer, 2 = of a down one
  List<int[]> placed = new List<int[]>(); List<string> words = new List<string>();
  Random rnd;
  public Maker(int seed) { rnd = new Random(seed); }
  void Clear() { g = new char[N, N]; m = new int[N, N]; placed.Clear(); words.Clear(); }
  // can w go at (r, c), across or down? crosses = the letters it shares with answers already there
  bool Fits(string w, int r, int c, bool down, out int crosses) {
    crosses = 0; int dr = down ? 1 : 0, dc = down ? 0 : 1, L = w.Length, er = r + dr * (L - 1), ec = c + dc * (L - 1);
    if (r < 0 || c < 0 || er >= N || ec >= N) return false;
    int br = r - dr, bc = c - dc; if (br >= 0 && bc >= 0 && g[br, bc] != 0) return false;
    int ar = er + dr, ac = ec + dc; if (ar < N && ac < N && g[ar, ac] != 0) return false;
    for (int i = 0; i < L; i++) {
      int rr = r + dr * i, cc = c + dc * i; char ch = g[rr, cc];
      if (ch != 0) {
        if (ch != w[i] || (m[rr, cc] & (down ? 2 : 1)) != 0) return false;
        crosses++;
      } else if (down) {
        if ((cc > 0 && g[rr, cc - 1] != 0) || (cc < N - 1 && g[rr, cc + 1] != 0)) return false;
      } else {
        if ((rr > 0 && g[rr - 1, cc] != 0) || (rr < N - 1 && g[rr + 1, cc] != 0)) return false;
      }
    }
    return true;
  }
  void Put(string w, int r, int c, bool down) {
    int dr = down ? 1 : 0, dc = down ? 0 : 1;
    for (int i = 0; i < w.Length; i++) { g[r + dr * i, c + dc * i] = w[i]; m[r + dr * i, c + dc * i] |= down ? 2 : 1; }
    placed.Add(new[] { r, c, down ? 1 : 0 }); words.Add(w);
  }
  // one attempt: a long answer across the middle, then answers that cross the grid's letters, the best-crossing first
  int Attempt(List<string> pool, int target) {
    Clear();
    var longs = pool.Where(w => w.Length >= 7 && w.Length <= 11).ToList(); if (longs.Count == 0) return 0;
    string first = longs[rnd.Next(longs.Count)];
    bool d0 = rnd.Next(2) == 1; int r0 = d0 ? rnd.Next(0, N - first.Length + 1) : 4 + rnd.Next(4), c0 = d0 ? 4 + rnd.Next(4) : rnd.Next(0, N - first.Length + 1);
    Put(first, r0, c0, d0);
    int crossTotal = 0, stall = 0;
    while (words.Count < target && stall < 3) {
      var cands = new List<Tuple<int, string, int, int, bool>>();
      var sample = pool.Where(w => !words.Contains(w) && !words.Any(x => x.Contains(w) || w.Contains(x))).OrderBy(w => rnd.Next()).Take(140).ToList();
      foreach (var w in sample) {
        for (int i = 0; i < w.Length; i++)
          for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) {
            if (g[r, c] != w[i] || m[r, c] == 3) continue;
            bool down = m[r, c] == 1;   // cross an across answer going down, and the other way round
            int sr = down ? r - i : r, sc = down ? c : c - i, x;
            if (Fits(w, sr, sc, down, out x) && x > 0) {
              // prefer one or two crossings, answers that reach out to the empty parts of the grid, and longer words
              int sc2 = x * 12 + w.Length * 2 + rnd.Next(10) + Reach(sr, sc, down, w.Length);
              cands.Add(Tuple.Create(sc2, w, sr, sc, down));
            }
          }
      }
      if (cands.Count == 0) { stall++; continue; }
      var top = cands.OrderByDescending(t => t.Item1).Take(4).ToList(); var pick = top[rnd.Next(top.Count)];
      int xx; Fits(pick.Item2, pick.Item3, pick.Item4, pick.Item5, out xx); crossTotal += xx;
      Put(pick.Item2, pick.Item3, pick.Item4, pick.Item5);
    }
    return crossTotal;
  }
  // how far a placement reaches into rows or columns no answer uses yet
  int Reach(int r, int c, bool down, int L) {
    int fresh = 0;
    for (int i = 0; i < L; i++) {
      int rr = down ? r + i : r, cc = down ? c : c + i; bool rowUsed = false, colUsed = false;
      for (int k = 0; k < N; k++) { if (g[rr, k] != 0) rowUsed = true; if (g[k, cc] != 0) colUsed = true; }
      if (!rowUsed) fresh++; if (!colUsed) fresh++;
    }
    return fresh * 3;
  }
  // the best of many attempts that meets the rules, as "A|r|c|WORD\tD|r|c|WORD..." (null when none does)
  public string Make(string[] pool, Dictionary<string, string> kind, int tries) {
    string best = null; double bestScore = -1; var P = pool.ToList();
    for (int t = 0; t < tries; t++) {
      int target = 15 + rnd.Next(4), cross = Attempt(P, target);
      if (words.Count < 13) continue;
      int places = words.Count(w => kind[w] == "place"), people = words.Count(w => kind[w] == "person"), other = words.Count - places - people;
      if (places > words.Count * 0.6 || people < 2 || other < 2) continue;
      int minR = N, maxR = -1, minC = N, maxC = -1, cells = 0;
      for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) if (g[r, c] != 0) { cells++; minR = Math.Min(minR, r); maxR = Math.Max(maxR, r); minC = Math.Min(minC, c); maxC = Math.Max(maxC, c); }
      if (maxR - minR < 10 || maxC - minC < 10) continue;   // the answers should fill the 12 x 12 grid
      double score = words.Count * 10 + cross * 4 + cells * 0.6 + rnd.NextDouble();
      if (score > bestScore) {
        bestScore = score; var sb = new StringBuilder();
        for (int i = 0; i < words.Count; i++) { if (i > 0) sb.Append('\t'); sb.Append(placed[i][2] == 1 ? "D|" : "A|").Append(placed[i][0]).Append('|').Append(placed[i][1]).Append('|').Append(words[i]); }
        best = sb.ToString();
      }
    }
    return best;
  }
}
}
'@
}
# the answers and their kinds (from the encyclopedia entries' types)
$enc = [IO.File]::ReadAllText("$Repo\encyclopedia-data.js", $U8)
$TYPE = @{}; foreach ($mm in [regex]::Matches($enc, '\{slug:"([^"]+)",name:"(?:[^"\\]|\\.)*",type:"([a-z]+)"')) { $TYPE[$mm.Groups[1].Value] = $mm.Groups[2].Value }
$KIND = New-Object 'Collections.Generic.Dictionary[string,string]'; $ALL = New-Object Collections.Generic.List[string]
foreach ($l in [IO.File]::ReadAllLines($Words, $U8)) {
  if (-not $l.Trim() -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t"); $key = $c[0] -replace '[ -]', ''
  if (-not $TYPE.ContainsKey($c[2])) { throw "crossword-words.tsv: no entry '$($c[2])' for $($c[0])" }
  $t = $TYPE[$c[2]]; $KIND[$key] = $(if ($t -eq 'place' -or $t -eq 'person') { $t } else { 'other' }); $ALL.Add($key)
}
# the puzzles made before: their numbers go on, and their last 30 hold their answers back
$file = $Out; $lines = New-Object Collections.Generic.List[string]
if (Test-Path $file) { foreach ($l in [IO.File]::ReadAllLines($file, $U8)) { $lines.Add($l) } }
else { foreach ($h in @('# History Crossword puzzles (games.js #cross), made by scripts/make-crosswords.ps1, which only ever APPENDS: a day''s', '# puzzle never changes. A line: the number, then each answer as direction|row|column|LETTERS (A across, D down, from 0);', '# the clues and entries come from scripts/crossword-words.tsv when the site is built.')) { $lines.Add($h) } }
$made = @($lines | Where-Object { $_ -match '^\d+\t' })
$num = $made.Count; $recent = New-Object Collections.Generic.List[string[]]
foreach ($l in ($made | Select-Object -Last 30)) { $recent.Add(@($l.Split("`t") | Select-Object -Skip 1 | ForEach-Object { $_.Split('|')[3] })) }
$maker = New-Object EpochCw.Maker (20261028 + $num)
$sw = [Diagnostics.Stopwatch]::StartNew(); $fail = 0
for ($k = 0; $k -lt $Count; $k++) {
  $held = @{}; foreach ($ws in $recent) { foreach ($w in $ws) { $held[$w] = 1 } }
  $pool = @($ALL | Where-Object { -not $held.ContainsKey($_) })
  $pz = $maker.Make($pool, $KIND, $Tries)
  if (-not $pz) { $fail++; if ($fail -gt 20) { throw "no puzzle found 20 times (pool $($pool.Count))" }; $k--; continue }
  $num++; $lines.Add("$num`t$pz")
  $recent.Add(@($pz.Split("`t") | ForEach-Object { $_.Split('|')[3] })); if ($recent.Count -gt 30) { $recent.RemoveAt(0) }
}
[IO.File]::WriteAllText($file, (($lines -join "`n") + "`n"), $U8)
Write-Host ("crosswords: {0} made in {1:N0} s ({2} retries), {3} in all" -f $Count, $sw.Elapsed.TotalSeconds, $fail, $num)
