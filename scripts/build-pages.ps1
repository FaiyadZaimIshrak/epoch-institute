# Static, indexable pages built from the site's data (run after any change to encyclopedia-data.js,
# encyclopedia-links.js or data/*.json, then commit the result):
#   powershell -ExecutionPolicy Bypass -File scripts\build-pages.ps1
# Writes
#   encyclopedia/<slug>                 one page per encyclopedia entry (description gold-linked at build time)
#   encyclopedia/browse/<letter>[-n]    A-Z index, 100 entries a page
#   encyclopedia/conflicts/<century>    Conflicts & Resolutions by century
#   encyclopedia/index-data.js          slim index for the search on /encyclopedia/ (and random entry)
#   state/<id>                          one page per state of the register without a profile; state/.htaccess sends
#                                       the ids that have a profile to /empire/<slug>
#   state/browse/<region>               states by region
#   today-in-history/<month>-<day>      one page per day of the year
#   countries/<country>, countries/     country histories (present-day countries with 3+ states), with maps
#   centuries/<century>, centuries/     history by century (great powers, events, people, states, map)
#   encyclopedia/glossary               the term entries A-Z
#   paths/<slug>, paths/                reading paths (from reading-paths.js)
#   maps/atlas-data.js, maps/basemap.js, maps/world.svg   the atlas's states and outlines (data/geo.json, data/land.json:
#                                       scripts/fetch-geo.ps1 and scripts/make-basemap.ps1); ?v= stamped into /atlas
#   the generated blocks of encyclopedia/index, state/index, today-in-history/index, research (hub) and index (home),
#   enc-page.js's IDX_V, and the .htaccess files of state/, countries/, centuries/ and paths/
#   sitemap.xml (index) + sitemaps/*.xml, with lastmod kept in scripts/sitemap-state.tsv
#   images/encyclopedia/thumbs, images/states/thumbs   112 px copies for small pictures (scripts/make-thumbs.ps1, run first)
# Only files whose content changed are written; generated pages without a source any more are deleted.
# -SkipEntries keeps the existing entry pages (no linking, ~9 minutes faster) - for testing the other page sets.
param([string]$Repo = (Split-Path $PSScriptRoot), [string]$Reviewed = 'October 2026', [switch]$SkipEntries)
$ErrorActionPreference = 'Stop'
$SITE = 'https://the-epoch-institute.org'; $TODAY = (Get-Date).ToString('yyyy-MM-dd'); $YEAR = (Get-Date).Year
$clock = [Diagnostics.Stopwatch]::StartNew()
function Say([string]$m) { Write-Host ('[{0,4}s] {1}' -f [int]$clock.Elapsed.TotalSeconds, $m) }
. "$PSScriptRoot\lib\enc-fn.ps1"   # EncRx, EncPick, EncOk, EncYears (same rules as ENC_FN in the browser)
. "$PSScriptRoot\lib\clue-check.ps1"   # ClueOwnFault, ClueSet, ClueNamed: no game clue gives an answer away
# the 112 px copies of the encyclopedia and state pictures for small places (only new or changed pictures are redone)
foreach ($thLine in (& "$PSScriptRoot\make-thumbs.ps1" -Repo $Repo)) { Say "thumbs: $thLine" }

if (-not ('EpochBuild.W' -as [type])) {
  Add-Type -Language CSharp -TypeDefinition @'
using System; using System.Collections.Generic; using System.IO; using System.Text; using System.Text.RegularExpressions; using System.Security.Cryptography;
namespace EpochBuild {
public static class W {
  static readonly UTF8Encoding U8 = new UTF8Encoding(false);
  public static string H(string s) {
    if (string.IsNullOrEmpty(s)) return "";
    var sb = new StringBuilder(s.Length + 16);
    foreach (char c in s) { switch (c) { case '&': sb.Append("&amp;"); break; case '<': sb.Append("&lt;"); break; case '>': sb.Append("&gt;"); break; case '"': sb.Append("&quot;"); break; default: sb.Append(c); break; } }
    return sb.ToString();
  }
  // JSON string literal; '<' escaped so no "</script>" can end a JSON-LD block
  public static string J(string s) {
    if (s == null) return "null";
    var sb = new StringBuilder(s.Length + 8); sb.Append('"');
    foreach (char c in s) {
      switch (c) {
        case '"': sb.Append("\\\""); break; case '\\': sb.Append("\\\\"); break; case '\n': sb.Append("\\n"); break;
        case '\r': sb.Append("\\r"); break; case '\t': sb.Append("\\t"); break; case '<': sb.Append("\\u003c"); break;
        default: if (c < 0x20) sb.AppendFormat("\\u{0:x4}", (int)c); else sb.Append(c); break;
      }
    }
    return sb.Append('"').ToString();
  }
  // encyclopedia page's fold(): NFD, drop U+0300-036F, lower case
  public static string Fold(string s) {
    if (s == null) return "";
    string d = s.Normalize(NormalizationForm.FormD); var sb = new StringBuilder(d.Length);
    foreach (char c in d) if (c < '̀' || c > 'ͯ') sb.Append(c);
    return sb.ToString().ToLowerInvariant();
  }
  // shared-data.js toSlug(): profile URLs
  public static string ToSlug(string n) { return Regex.Replace(Fold(n).Replace("'", "").Replace("’", ""), "[^a-z0-9]+", "-").Trim('-'); }
  static readonly Regex Lead = new Regex("^(al-|el-|the )"), NonAn = new Regex("^[^a-z0-9]+");
  public static string SortKey(string name) { return NonAn.Replace(Lead.Replace(Fold(name), "", 1), "", 1); }
  // stable order by ordinal string comparison (as JavaScript's sort of strings)
  public static int[] Order(string[] keys) {
    var idx = new int[keys.Length]; for (int i = 0; i < idx.Length; i++) idx[i] = i;
    Array.Sort(idx, (a, b) => { int c = string.CompareOrdinal(keys[a], keys[b]); return c != 0 ? c : a.CompareTo(b); });
    return idx;
  }
  // one line of encyclopedia-data.js -> JSON (quote the keys outside strings)
  public static string QuoteKeys(string s) {
    var sb = new StringBuilder(s.Length + 64); bool str = false;
    for (int i = 0; i < s.Length; i++) {
      char c = s[i];
      if (str) { sb.Append(c); if (c == '\\' && i + 1 < s.Length) { sb.Append(s[++i]); continue; } if (c == '"') str = false; continue; }
      if (c == '"') { str = true; sb.Append(c); continue; }
      if (c == '{' || c == ',') {
        sb.Append(c); int j = i + 1;
        while (j < s.Length && (char.IsLetterOrDigit(s[j]) || s[j] == '_')) j++;
        if (j > i + 1 && j < s.Length && s[j] == ':') { sb.Append('"').Append(s, i + 1, j - i - 1).Append('"'); i = j - 1; }
        continue;
      }
      sb.Append(c);
    }
    return sb.ToString();
  }
  public static bool WriteIfChanged(string path, string content) {
    byte[] b = U8.GetBytes(content);
    if (File.Exists(path)) { byte[] o = File.ReadAllBytes(path); if (o.Length == b.Length) { bool same = true; for (int i = 0; i < b.Length; i++) if (o[i] != b[i]) { same = false; break; } if (same) return false; } }
    string dir = Path.GetDirectoryName(path); if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
    for (int attempt = 1; ; attempt++) {   // a virus scanner or indexer may hold a file it just saw being written
      try { File.WriteAllBytes(path, b); return true; }
      catch (Exception ex) { if (attempt >= 8 || !(ex is IOException || ex is UnauthorizedAccessException)) throw; System.Threading.Thread.Sleep(250 * attempt); }
    }
  }
  public static int[] JpegSize(string path) {
    try {
      using (var f = File.OpenRead(path)) {
        int a = f.ReadByte(), b = f.ReadByte(); if (a != 0xFF || b != 0xD8) return null;
        while (f.Position < f.Length) {
          int m = f.ReadByte(); if (m != 0xFF) continue;
          do { m = f.ReadByte(); } while (m == 0xFF);
          if (m < 0 || m == 0xD9) return null;
          if (m == 0x01 || (m >= 0xD0 && m <= 0xD8)) continue;
          int len = (f.ReadByte() << 8) | f.ReadByte();
          if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF)) {
            f.ReadByte(); int h = (f.ReadByte() << 8) | f.ReadByte(); int w = (f.ReadByte() << 8) | f.ReadByte(); return new[] { w, h };
          }
          f.Seek(len - 2, SeekOrigin.Current);
        }
      }
    } catch { }
    return null;
  }
  public static string Sha1(string s) {
    using (var h = SHA1.Create()) { var sb = new StringBuilder(); foreach (byte x in h.ComputeHash(U8.GetBytes(s))) sb.Append(x.ToString("x2")); return sb.ToString(); }
  }
  // sentences: a full stop ends one unless it closes an abbreviation ("c.", "St.", "v."), an initial ("W. E. B. Du
  // Bois", "H. V. Evatt") or a dotted abbreviation ("U.S."); a regnal numeral ("Charles V. He ...") and "D.C." end one.
  // The same rules as make-previews.ps1 and the Kids-mode "In short" (shared-nav.js firstSentence).
  static readonly Regex SentCand = new Regex("[.!?][\"'”’)\\]]*\\s+(?=[\"'“‘(]?[A-Z0-9])");
  static readonly Regex Abbr = new Regex("^(c|ca|fl|r|b|d|St|Mt|Ft|Mr|Mrs|Ms|Dr|Jr|Sr|vs|v|vz|No|Nos|vol|ed|eds|tr|Co|Bros|Gen|Col|Capt|Lt|Sgt|Rev|Fr|Sen|Gov|Hon|Prof)$");
  static readonly Regex Dotted = new Regex("^([A-Za-z]\\.)+[A-Za-z]$"), Initial = new Regex("^[A-Z]\\.");
  public static List<string> Sentences(string text) {
    var res = new List<string>(); int start = 0;
    foreach (Match m in SentCand.Matches(text)) {
      if (text[m.Index] == '.') {
        var ws = text.Substring(start, m.Index - start).Split((char[])null, StringSplitOptions.RemoveEmptyEntries);
        string w = ws.Length > 0 ? ws[ws.Length - 1].TrimStart('(', '"', '\'', '“', '‘') : "";
        int dash = w.LastIndexOfAny(new[] { '–', '—', '-' }); if (dash >= 0) w = w.Substring(dash + 1);
        if (Abbr.IsMatch(w) || (Dotted.IsMatch(w) && w != "D.C")) continue;
        if (w.Length == 1 && w[0] >= 'A' && w[0] <= 'Z' && !("IVX".IndexOf(w[0]) >= 0 && !(ws.Length > 1 && Initial.IsMatch(ws[ws.Length - 2])) && !Initial.IsMatch(text.Substring(m.Index + m.Length)))) continue;
      }
      int end = m.Index + m.Value.TrimEnd().Length;
      res.Add(text.Substring(start, end - start).Trim()); start = m.Index + m.Length;
    }
    if (start < text.Length && text.Substring(start).Trim().Length > 0) res.Add(text.Substring(start).Trim());
    return res;
  }
  // meta description: whole sentences up to max characters, else cut at a word
  public static string Summary(string text, int max) {
    if (string.IsNullOrEmpty(text)) return "";
    text = Regex.Replace(text.Trim(), "\\s+", " "); if (text.Length <= max) return text;
    var sb = new StringBuilder();
    foreach (var p in Sentences(text)) { if (sb.Length + (sb.Length > 0 ? 1 : 0) + p.Length > max) break; if (sb.Length > 0) sb.Append(' '); sb.Append(p); }
    if (sb.Length >= 70) return sb.ToString();
    int cut = text.LastIndexOf(' ', max - 2); if (cut < 40) cut = max - 2;
    return text.Substring(0, cut).TrimEnd(',', ';', ':', ' ', '(') + "…";
  }
  public static string FirstSentence(string text, int max) {
    if (string.IsNullOrEmpty(text)) return "";
    var parts = Sentences(text.Trim()); string s = parts.Count > 0 ? parts[0] : text.Trim();
    if (s.Length <= max) return s;
    int cut = s.LastIndexOf(' ', max - 2); if (cut < 30) cut = max - 2;
    return s.Substring(0, cut).TrimEnd(',', ';', ':', ' ', '(') + "…";
  }
  static readonly Regex Wd = new Regex("\\p{L}{3,}");
  public static string[] Words(string text) {
    var set = new HashSet<string>(); foreach (Match m in Wd.Matches(text)) set.Add(m.Value.ToLowerInvariant());
    var a = new string[set.Count]; set.CopyTo(a); return a;
  }
  public static string LongestWord(string text) {
    string best = null; foreach (Match m in Wd.Matches(text)) if (best == null || m.Value.Length > best.Length) best = m.Value;
    return best == null ? null : best.ToLowerInvariant();
  }
  // forms under which a name's keyword can appear in a text word: plural -s/-es, term -y/-ies
  public static string[] Variants(string w) {
    var v = new List<string> { w };
    if (w.EndsWith("ies") && w.Length > 4) v.Add(w.Substring(0, w.Length - 3));
    if (w.EndsWith("es") && w.Length > 4) v.Add(w.Substring(0, w.Length - 2));
    if ((w.EndsWith("s") || w.EndsWith("y")) && w.Length > 3) v.Add(w.Substring(0, w.Length - 1));
    return v.ToArray();
  }
  // encyclopedia page's yearOf(): first number of the dates, BCE negative; int.MinValue = none
  static readonly Regex Num = new Regex("(\\d{1,4})"), Bce = new Regex("BCE|BC\\b"), Ce = new Regex("CE\\b");
  // the day of a full date is not a year: "13 July 1260", "2–3 May 1815", "July 4, 1776" are read as 1260, 1815, 1776
  static readonly Regex DayMonth = new Regex("\\b\\d{1,2}(?:\\s*[–-]\\s*\\d{1,2})?\\s+(?=(?:January|February|March|April|May|June|July|August|September|October|November|December)\\b)|(?<=\\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+)\\d{1,2}(?:\\s*[–-]\\s*\\d{1,2})?,");
  public static string Clean(string s) { return string.IsNullOrEmpty(s) ? (s ?? "") : DayMonth.Replace(s, ""); }
  public static int YearOf(string s) {
    s = Clean(s); var m = Num.Match(s); if (!m.Success) return int.MinValue;
    int y = int.Parse(m.Groups[1].Value);
    if (Bce.IsMatch(s)) { int end = s.IndexOf(m.Groups[1].Value, StringComparison.Ordinal) + m.Groups[1].Value.Length + 6; string head = s.Substring(0, Math.Min(end, s.Length)).Replace("BCE", ""); if (!Ce.IsMatch(head)) y = -y; }
    return y;
  }
  // first and last year written in a date ("c. 1390–1441", "27 BCE – 14 CE", "5th–4th century BCE"); null = none
  static readonly Regex CentW = new Regex("(\\d+)(?:st|nd|rd|th)(?:\\s*[–-]\\s*(\\d+)(?:st|nd|rd|th))?\\s+centur(?:y|ies)", RegexOptions.IgnoreCase), NumEra = new Regex("(\\d{1,4})(?:\\s*(BCE|BC|CE|AD)\\b)?");
  static readonly Regex YearW = new Regex("(?<!\\d)(\\d{1,4})(?!\\d|st\\b|nd\\b|rd\\b|th\\b)(?:\\s*(BCE|BC|CE|AD)\\b)?"), EraW = new Regex("\\b(BCE|BC|CE|AD)\\b");
  public static int[] Span(string s) {
    s = Clean(s); if (string.IsNullOrEmpty(s) || !Regex.IsMatch(s, "\\d")) return null;
    bool bce = Regex.IsMatch(s, "\\b(BCE|BC)\\b"); var c = CentW.Match(s);
    if (c.Success) {
      int a = int.Parse(c.Groups[1].Value), b = c.Groups[2].Success ? int.Parse(c.Groups[2].Value) : a;
      var r = bce ? new[] { -a * 100 + 1, -(b - 1) * 100 } : new[] { (a - 1) * 100, b * 100 - 1 };
      // a year written beside the century counts too ("c. 985–15th century", "13th century–1707", "9th century–221 BCE");
      // a bare year takes the era written after it, else CE ("1st century BCE–668")
      foreach (Match y in YearW.Matches(s)) {
        if (y.Index >= c.Index && y.Index < c.Index + c.Length) continue;
        string era = y.Groups[2].Value; if (era == "") { var e = EraW.Match(s, y.Index + y.Length); if (e.Success) era = e.Groups[1].Value; }
        int v = int.Parse(y.Groups[1].Value); if (era.StartsWith("BC")) v = -v;
        if (v < r[0]) r[0] = v; if (v > r[1]) r[1] = v;
      }
      return r;
    }
    var ms = NumEra.Matches(s); int n = ms.Count; if (n == 0) return null;
    var ys = new int[n];
    for (int i = 0; i < n; i++) { string era = ms[i].Groups[2].Value; for (int j = i + 1; era == "" && j < n; j++) era = ms[j].Groups[2].Value; int v = int.Parse(ms[i].Groups[1].Value); ys[i] = era.StartsWith("BC") ? -v : v; }
    // "1895–96": a shortened second year takes the first one's century
    for (int i = 1; i < n; i++) {
      string p0 = ms[i - 1].Groups[1].Value, p1 = ms[i].Groups[1].Value, gap = s.Substring(ms[i - 1].Index + ms[i - 1].Length, ms[i].Index - ms[i - 1].Index - ms[i - 1].Length).Trim();
      if (ys[i - 1] > 0 && ys[i] > 0 && p0.Length >= 3 && p1.Length <= 2 && p1.Length < p0.Length && (gap == "–" || gap == "-")) { int m = p1.Length == 1 ? 10 : 100, v = ys[i - 1] / m * m + ys[i]; ys[i] = v < ys[i - 1] ? v + m : v; }
    }
    int lo = ys[0], hi = ys[0]; foreach (int y in ys) { if (y < lo) lo = y; if (y > hi) hi = y; }
    return new[] { lo, hi };
  }
  // year pages: only firm years count - a bare year with an optional era ("1453", "480 BCE", "29 May 1453"), never
  // "c. 1450", "1450s", "1066 or 1067" or a century; int.MinValue = none
  const string Months = "January|February|March|April|May|June|July|August|September|October|November|December";
  static readonly Regex FirmRx = new Regex("^(?:(?:" + Months + ")\\s+)?(\\d{1,4})(?:\\s*(BCE|BC|CE|AD))?$"), EraEnd = new Regex("\\b(BCE|BC|CE|AD)\\s*$"), Dash = new Regex("\\s*[–-]\\s*");
  public static int Firm(string s, bool bceDefault) {
    s = Clean(s ?? "").Trim(); var m = FirmRx.Match(s); if (!m.Success) return int.MinValue;
    int v = int.Parse(m.Groups[1].Value); if (v == 0) return int.MinValue;
    bool bce = m.Groups[2].Success ? m.Groups[2].Value.StartsWith("BC") : bceDefault;
    return bce ? -v : v;
  }
  // dates made only of years, eras, months, "c." and "?" ("c. 1412–1431", "29 May 1453"); words make them something
  // else: "caliph 656–661 CE" is a reign, "unified Jurchens 1583–1616" a span of work, "traditionally 543–505 BCE" a
  // tradition, "1450s" a decade
  static readonly Regex DateWords = new Regex("(?:" + Months + ")|\\bc\\.|\\b(?:BCE|BC|CE|AD)\\b");
  public static bool PlainDates(string s) { return !Regex.IsMatch(DateWords.Replace(s ?? "", ""), "\\p{L}"); }
  // two firm years of a range ("1337–1453", "356–323 BCE", "63 BCE – 14 CE", "1412–" (second: none)); a part that is
  // not firm ("c. 1412") gives int.MinValue; null when the dates are not a plain range of two parts
  public static int[] Range(string d) {
    if (string.IsNullOrEmpty(d)) return null;
    string s = Clean(d).Trim(); if (!PlainDates(s)) return null;
    var parts = Dash.Split(s); if (parts.Length != 2) return null;
    var e1 = EraEnd.Match(parts[0]); var e2 = EraEnd.Match(parts[1]);
    bool bce1 = e1.Success ? e1.Groups[1].Value.StartsWith("BC") : (e2.Success && e2.Groups[1].Value.StartsWith("BC"));
    return new[] { Firm(parts[0], bce1), parts[1].Length > 0 ? Firm(parts[1], false) : int.MinValue };
  }
  // a person's firm birth and death years: "1412–1431", "c. 1412–1431" (the death only), "d. 1066", "b. 1950",
  // "356–323 BCE"; a reign ("r.", "reigned"), "fl." or a century gives none
  public static int[] Life(string d) {
    var r = new[] { int.MinValue, int.MinValue }; if (string.IsNullOrEmpty(d)) return r;
    string s = Clean(d).Trim();
    if (Regex.IsMatch(s, "^(r\\.|fl\\.|reigned|ruled)") || s.Contains("centur")) return r;
    if (s.StartsWith("d. ")) { r[1] = Firm(s.Substring(3), false); return r; }
    if (s.StartsWith("b. ")) { r[0] = Firm(s.Substring(3), false); return r; }
    var rg = Range(s); return rg ?? r;
  }
  // month and day written in the dates ("29 May 1453", "July 4, 1776") as month * 100 + day; 0 = none
  static readonly Regex MD1 = new Regex("\\b(\\d{1,2})\\s+(" + Months + ")\\b"), MD2 = new Regex("\\b(" + Months + ")\\s+(\\d{1,2}),");
  public static int MonthDay(string d) {
    if (string.IsNullOrEmpty(d)) return 0;
    var m = MD1.Match(d); if (m.Success) return (Array.IndexOf(Months.Split('|'), m.Groups[2].Value) + 1) * 100 + int.Parse(m.Groups[1].Value);
    m = MD2.Match(d); if (m.Success) return (Array.IndexOf(Months.Split('|'), m.Groups[1].Value) + 1) * 100 + int.Parse(m.Groups[2].Value);
    return 0;
  }
  public static string YearSlug(int y) { return y < 0 ? (-y) + "-bce" : y.ToString(); }
  // the dates as HTML, each firm year that has a page linked to /years/<y> (a day of the month, "c." years, decades,
  // centuries and "or" / "/" alternatives stay text)
  static readonly Regex NumTok = new Regex("(\\d{1,4})(\\s*(?:BCE|BC|CE|AD)\\b)?");
  public static string LinkYears(string d, HashSet<int> pages) {
    if (string.IsNullOrEmpty(d)) return "";
    if (Regex.IsMatch(d, "(?i)\\btrad(?:itionally|\\.)")) return H(d);   // a traditional date is not a year to go to
    var skip = new bool[d.Length]; foreach (Match dm in DayMonth.Matches(d)) for (int k = dm.Index; k < dm.Index + dm.Length; k++) skip[k] = true;
    var ms = NumTok.Matches(d); var sb = new StringBuilder(); int pos = 0;
    for (int i = 0; i < ms.Count; i++) {
      var m = ms[i]; if (skip[m.Index]) continue;
      int end = m.Index + m.Length; string before = d.Substring(0, m.Index), after = d.Substring(end);
      if (Regex.IsMatch(after, "^(s\\b|st\\b|nd\\b|rd\\b|th\\b|\\s*(or|/)\\s*\\d)") || Regex.IsMatch(before, "(\\bc\\.|\\bcirca|\\bafter|\\bbefore|\\d\\s*(or|/))\\s*$") || (m.Index > 0 && char.IsLetterOrDigit(d[m.Index - 1]))) continue;
      string era = m.Groups[2].Success ? m.Groups[2].Value.Trim() : "";
      for (int j = i + 1; era == "" && j < ms.Count; j++) if (ms[j].Groups[2].Success) era = ms[j].Groups[2].Value.Trim();
      int v = int.Parse(m.Groups[1].Value); int y = era.StartsWith("BC") ? -v : v;
      if (v == 0 || !pages.Contains(y)) continue;
      sb.Append(H(d.Substring(pos, m.Index - pos))).Append("<a href=\"/years/").Append(YearSlug(y)).Append("\">").Append(H(m.Value)).Append("</a>"); pos = end;
    }
    return sb.Append(H(d.Substring(pos))).ToString();
  }
  // the states alive in year yr (start <= yr <= end; NaN end: still exists): the map dots of the placed ones, written as
  // DotPath writes them (map-dot-s, then map-dot-p for the profiles), the number of dots, and the number of all alive
  public static object[] YearDots(double[] s, double[] e, double[] x, double[] y, bool[] placed, bool[] prof, double yr) {
    var a = new StringBuilder(); var b = new StringBuilder(); int nAll = 0, nDots = 0;
    for (int i = 0; i < s.Length; i++) {
      if (double.IsNaN(s[i]) || s[i] > yr || (!double.IsNaN(e[i]) && e[i] < yr)) continue;
      nAll++; if (!placed[i]) continue; nDots++;
      var t = prof[i] ? b : a; t.Append('M').Append(((long)Math.Round(x[i] * 10)).ToString()).Append(' ').Append(((long)Math.Round(y[i] * 10)).ToString()).Append("h0");
    }
    string html = (a.Length > 0 ? "<path class=\"map-dot-s\" d=\"" + a + "\"/>" : "") + (b.Length > 0 ? "<path class=\"map-dot-p\" d=\"" + b + "\"/>" : "");
    return new object[] { html, nDots, nAll };
  }
  // "see also" scores, as the encyclopedia page computed them: for every profile both entries are mentioned in,
  // 3 points per shared section + 1, + 0.5 if the other entry has a picture; ties keep discovery order
  public static int[][] SeeAlso(int[][] emp, int[][] mask, bool[] img, int nEmp, int take) {
    int n = emp.Length; var lists = new List<int>[nEmp]; for (int k = 0; k < nEmp; k++) lists[k] = new List<int>();
    for (int i = 0; i < n; i++) foreach (int k in emp[i]) lists[k].Add(i);
    var res = new int[n][];
    for (int i = 0; i < n; i++) {
      var score = new Dictionary<int, double>(); var order = new List<int>();
      for (int a = 0; a < emp[i].Length; a++) {
        int k = emp[i][a]; int mi = mask[i][a];
        foreach (int o in lists[k]) {
          if (o == i) continue;
          int om = 0; for (int b = 0; b < emp[o].Length; b++) if (emp[o][b] == k) { om = mask[o][b]; break; }
          int shared = Bits(mi & om);
          double add = shared * 3 + 1 + (img[o] ? 0.5 : 0);
          double cur; if (score.TryGetValue(o, out cur)) score[o] = cur + add; else { score[o] = add; order.Add(o); }
        }
      }
      res[i] = Top(score, order, take);
    }
    return res;
  }
  // fallback "see also" for entries no profile mentions: entries linked from the same state histories
  public static int[][] CoMentioned(int[][] groups, bool[] img, int nGroups, int take) {
    int n = groups.Length; var lists = new List<int>[nGroups]; for (int k = 0; k < nGroups; k++) lists[k] = new List<int>();
    for (int i = 0; i < n; i++) foreach (int k in groups[i]) lists[k].Add(i);
    var res = new int[n][];
    for (int i = 0; i < n; i++) {
      var score = new Dictionary<int, double>(); var order = new List<int>();
      foreach (int k in groups[i]) {
        if (lists[k].Count > 400) continue;   // a state history that links hundreds of entries says little about any pair
        foreach (int o in lists[k]) { if (o == i) continue; double add = 1 + (img[o] ? 0.25 : 0); double cur; if (score.TryGetValue(o, out cur)) score[o] = cur + add; else { score[o] = add; order.Add(o); } }
      }
      res[i] = Top(score, order, take);
    }
    return res;
  }
  static int[] Top(Dictionary<int, double> score, List<int> order, int take) {
    var pos = new Dictionary<int, int>(); for (int p = 0; p < order.Count; p++) pos[order[p]] = p;
    var arr = order.ToArray();
    Array.Sort(arr, (a, b) => { int c = score[b].CompareTo(score[a]); return c != 0 ? c : pos[a].CompareTo(pos[b]); });
    if (arr.Length > take) Array.Resize(ref arr, take);
    return arr;
  }
  static int Bits(int v) { int c = 0; while (v != 0) { c += v & 1; v >>= 1; } return c; }
}
}
'@
}
function Hx([string]$s) { [EpochBuild.W]::H($s) }
function Js([string]$s) { [EpochBuild.W]::J($s) }
Add-Type -AssemblyName System.Web.Extensions
$JSS = New-Object System.Web.Script.Serialization.JavaScriptSerializer; $JSS.MaxJsonLength = [int]::MaxValue; $JSS.RecursionLimit = 256
$U8 = New-Object Text.UTF8Encoding($false)
function ReadJson([string]$path) { $JSS.DeserializeObject([IO.File]::ReadAllText($path, $U8)) }

# ── labels (as on the encyclopedia and state pages) ─────────────────────────────────────────────────────────────────
$SING = @{ person = 'Person'; conflict = 'Conflict / resolution'; event = 'Event'; place = 'Place'; polity = 'State'; group = 'People / group'; institution = 'Institution'; term = 'Term'; idea = 'Religion / idea'; work = 'Work / monument'; factor = 'Historical factor' }
$TYPES = @(@('person', 'People'), @('conflict', 'Conflicts & Resolutions'), @('event', 'Events'), @('place', 'Places'), @('polity', 'States & dynasties'), @('group', 'Peoples & groups'), @('institution', 'Institutions & offices'), @('term', 'Terms'), @('idea', 'Religions & ideas'), @('work', 'Works & monuments'), @('factor', 'Factors'))
$TAGNAME = @{ battle = 'Battle'; siege = 'Siege'; war = 'War'; campaign = 'Campaign'; revolt = 'Revolt'; revolution = 'Revolution'; crisis = 'Crisis'; treaty = 'Treaty'; peace = 'Peace' }
$TAGS = @(@('battle', 'Battles', @('battle')), @('siege', 'Sieges', @('siege')), @('war', 'Wars & campaigns', @('war', 'campaign')), @('revolt', 'Revolts & revolutions', @('revolt', 'revolution')), @('crisis', 'Crises & tensions', @('crisis')), @('treaty', 'Treaties', @('treaty')), @('peace', 'Peace efforts & congresses', @('peace')))
$SEC = @{ foundation = 'Foundation'; socioeconomy = 'Socioeconomy'; military = 'Military'; governance = 'Governance'; impact = 'Impact'; decline = 'Decline'; summary = 'Summary'
  origins = 'Origins'; beliefs = 'Beliefs'; texts = 'Texts'; spread = 'Spread'; community = 'Community'; legacy = 'Legacy'; structure = 'Grammar'; speakers = 'Speakers'; literature = 'Literature'; change = 'Change' }
# (religion and language sections share the bits of the state sections in the same place)
$SECBIT = @{ foundation = 1; socioeconomy = 2; military = 4; governance = 8; impact = 16; decline = 32; summary = 64
  origins = 1; beliefs = 2; structure = 2; texts = 4; literature = 4; spread = 8; speakers = 8; community = 16; change = 16; legacy = 32 }
# a profile's address by its kind (shared-data.js PROFILE_KINDS paths): states and empires /empire/, religions
# /religion/, languages /language/; read here because the entry pages link the profiles that mention them
$KINDPATH = @{ religion = 'religion'; language = 'language'; culture = 'culture'; ideology = 'ideology'; movement = 'movement' }
$PROFURL = @{}
foreach ($m in [regex]::Matches([IO.File]::ReadAllText("$Repo\shared-data.js", $U8), '\{"name": ("(?:[^"\\]|\\.)*"), "region": "[^"]*", "kind": "(\w+)"')) {
  $PROFURL[$JSS.Deserialize($m.Groups[1].Value, [string])] = '/' + $KINDPATH[$m.Groups[2].Value] + '/'
}
function ProfUrl([string]$name) { $(if ($PROFURL.ContainsKey($name)) { $PROFURL[$name] } else { '/empire/' }) + [EpochBuild.W]::ToSlug($name) }
$ABOUT = @{ person = 'Person'; place = 'Place'; event = 'Event'; conflict = 'Event'; polity = 'Country'; institution = 'Organization'; work = 'CreativeWork'; term = 'DefinedTerm'; idea = 'DefinedTerm'; factor = 'DefinedTerm'; group = 'Thing' }
$REGION = [ordered]@{ 'british-isles' = 'British Isles'; 'france-low-countries' = 'France and the Low Countries'; 'iberia' = 'Iberia'; 'italy' = 'Italy'; 'hre-germany-central-europe' = 'Germany and Central Europe'
  'greece-aegean' = 'Greece and the Aegean'; 'balkans-hungary' = 'Balkans and Hungary'; 'scandinavia-baltic' = 'Scandinavia and the Baltic'; 'poland-lithuania-russia' = 'Poland, Lithuania and Russia'
  'caucasus' = 'Caucasus'; 'anatolia-levant' = 'Anatolia and the Levant'; 'mesopotamia-iran' = 'Mesopotamia and Iran'; 'arabia-gulf' = 'Arabia and the Gulf'; 'egypt-maghreb-sahara' = 'Egypt, North Africa and Sudan'
  'west-africa' = 'West Africa'; 'horn-east-africa' = 'Horn and East Africa'; 'central-southern-africa' = 'Central and Southern Africa'; 'central-asia-steppe' = 'Central Asia and the Steppe'
  'south-asia' = 'South Asia'; 'south-asia-princely-states' = 'Indian princely states'; 'southeast-asia-mainland' = 'Mainland Southeast Asia'; 'maritime-southeast-asia' = 'Maritime Southeast Asia'
  'china-tibet-mongolia' = 'China, Tibet and Mongolia'; 'korea-japan' = 'Korea and Japan'; 'mesoamerica-caribbean' = 'Mesoamerica and the Caribbean'; 'andes-south-america' = 'South America'; 'north-america-oceania' = 'North America and Oceania' }
$REL = @{ 'part-of' = 'was part of'; 'province-of' = 'was a province of'; 'vassal-of' = 'was a vassal of'; 'tributary-to' = 'paid tribute to'; 'protectorate-of' = 'was a protectorate of'; 'colony-of' = 'was a colony of'
  'personal-union-with' = 'in personal union with'; 'successor-of' = 'succeeded'; 'predecessor-of' = 'preceded'; 'conquered-by' = 'was conquered by'; 'split-from' = 'split from'; 'merged-into' = 'merged into' }
$MONTHS = @('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')
function RegionLabel([string]$rg) { if ($REGION.Contains($rg)) { $REGION[$rg] } else { (Get-Culture).TextInfo.ToTitleCase(($rg -replace '-', ' ')) } }
function TypeLabel([string]$t) { if ($t) { $t -replace '-', ' ' } else { 'state' } }
function Yr($y) { if ($null -eq $y) { return '?' }; $v = [int][Math]::Round([double]$y); if ($v -lt 0) { "$(-$v) BCE" } else { "$v CE" } }
function Span($n) { (Yr $n['s']) + ' – ' + $(if ($null -eq $n['e']) { 'present' } else { Yr $n['e'] }) }
function SpanShort($s, $e) {   # compact years for titles: 1600–1871, 626–539 BCE, 27 BCE – 476 CE, 1918–present
  if ($null -eq $s) { return '' }
  $a = [int]$s; if ($null -eq $e) { return $(if ($a -lt 0) { "$(-$a) BCE – present" } else { "$a–present" }) }
  $b = [int]$e
  if ($a -lt 0 -and $b -lt 0) { return "$(-$a)–$(-$b) BCE" }; if ($a -lt 0) { return "$(-$a) BCE – $b CE" }
  if ($a -eq $b) { return "$a" }; return "$a–$b"
}
function Century([int]$y) {   # the encyclopedia page's century labels ("4th century BCE", "Undated")
  if ($y -eq [int]::MinValue) { return 'Undated' }
  $n = if ($y -lt 0) { [Math]::Floor(-$y / 100) + 1 } else { [Math]::Floor($y / 100) + 1 }
  $suf = 'th'; $l2 = $n % 100; $l1 = $n % 10
  if ($l2 -lt 11 -or $l2 -gt 13) { if ($l1 -eq 1) { $suf = 'st' } elseif ($l1 -eq 2) { $suf = 'nd' } elseif ($l1 -eq 3) { $suf = 'rd' } }
  return "$n$suf century" + $(if ($y -lt 0) { ' BCE' } else { '' })
}
function CenturySlug([string]$label) { ($label.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-') }
function CenturyRank([string]$label) {   # sort key: BCE centuries first (descending), then CE, Undated last
  if ($label -eq 'Undated') { return 100000 }
  $n = [int]([regex]::Match($label, '^\d+').Value); if ($label.EndsWith('BCE')) { return - $n } else { return $n }
}
function LicenceUrl([string]$l) {
  if (-not $l) { return $null }
  if ($l -eq 'Public domain') { return 'https://creativecommons.org/publicdomain/mark/1.0/' }
  if ($l -eq 'CC0') { return 'https://creativecommons.org/publicdomain/zero/1.0/' }
  $m = [regex]::Match($l, '^CC (BY(?:-SA|-NC|-ND)*) (\d\.\d)(?: ([a-z]+))?$')
  if ($m.Success) { return 'https://creativecommons.org/licenses/' + $m.Groups[1].Value.ToLowerInvariant() + '/' + $m.Groups[2].Value + '/' + $(if ($m.Groups[3].Success) { $m.Groups[3].Value + '/' } else { '' }) }
  return $null
}

# ── shared page frame ───────────────────────────────────────────────────────────────────────────────────────────────
$THEME = "<script>(function(){try{var t=localStorage.getItem('epoch-theme');if(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)t='light';if(t==='light')document.documentElement.setAttribute('data-theme','light');else if(t==='dark')document.documentElement.setAttribute('data-theme','dark');if(localStorage.getItem('epoch-kids')==='1')document.documentElement.setAttribute('data-kids','1');if(document.documentElement.getAttribute('data-kids')==='1')['nunito-normal-latin','baloo-2-latin'].forEach(function(f){var l=document.createElement('link');l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin='anonymous';l.href='/fonts/'+f+'.woff2';document.head.appendChild(l)});}catch(e){}})()</script>"
$THEME0 = "<script>(function(){try{var t=localStorage.getItem('epoch-theme');if(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)t='light';if(t==='light')document.documentElement.setAttribute('data-theme','light');else if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})()</script>"   # for Stamp, until every page is restamped
# Analytics: the page view is queued at once, gtag.js itself loads after the page has loaded and the browser is idle (it
# cost 250-310 ms of main thread on a phone when it loaded with the page). $GTAG0 is the snippet before Oct 2026:
# pages are hashed with it (Stamp), so changing the snippet dates no page.
$GTAG0 = "<script async src=`"https://www.googletagmanager.com/gtag/js?id=G-B163TLDMP4`"></script>`n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-B163TLDMP4');</script>"
$GTAG = "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-B163TLDMP4');addEventListener('load',function(){(window.requestIdleCallback||setTimeout)(function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-B163TLDMP4';document.head.appendChild(s)},{timeout:4000})})</script>"
$ORG = '{"@type":"Organization","name":"The Epoch Institute","url":"' + $SITE + '/","logo":{"@type":"ImageObject","url":"' + $SITE + '/logo.png","width":512,"height":512}}'
function Crumbs($items) {   # items: @(@(name, path or $null), ...); returns @(html, jsonld)
  $li = New-Object Text.StringBuilder; $ld = New-Object Text.StringBuilder; $i = 0
  foreach ($it in $items) {
    $i++; $last = ($i -eq $items.Count)
    if ($last) { [void]$li.Append('<li aria-current="page">' + (Hx $it[0]) + '</li>') } elseif (-not $it[1]) { [void]$li.Append('<li><span>' + (Hx $it[0]) + '</span></li>') } else { [void]$li.Append('<li><a href="' + $it[1] + '">' + (Hx $it[0]) + '</a></li>') }
    if ($i -gt 1) { [void]$ld.Append(',') }
    [void]$ld.Append('{"@type":"ListItem","position":' + $i + ',"name":' + (Js $it[0]) + $(if ($it[1] -and -not $last) { ',"item":' + (Js ($SITE + $it[1])) } else { '' }) + '}')
  }
  return @(('<nav class="ref-crumbs" aria-label="Breadcrumb"><ol>' + $li + '</ol></nav>'), ('{"@type":"BreadcrumbList","itemListElement":[' + $ld + ']}'))
}
# p: hashtable title, desc, path, type (og:type), img (site path), imgW, imgH, card, ld (JSON-LD objects joined by ','), nav, body
function Page($p) {
  $url = $SITE + $p.path; $img = if ($p.img) { $SITE + $p.img } else { "$SITE/images/og/default.jpg" }
  $w = if ($p.img) { $p.imgW } else { 1200 }; $h = if ($p.img) { $p.imgH } else { 630 }
  $card = if ($p.img -and [int]$w -lt 600) { 'summary' } else { 'summary_large_image' }   # a page picture is a small card; a rendered 1200x630 card is a large one
  $sb = New-Object Text.StringBuilder(8192)
  [void]$sb.Append("<!DOCTYPE html>`n<html lang=`"en`">`n<head>`n$THEME`n<meta charset=`"UTF-8`">`n<meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">`n")
  [void]$sb.Append("<meta name=`"theme-color`" content=`"#0b0c10`" media=`"(prefers-color-scheme: dark)`">`n<meta name=`"theme-color`" content=`"#f4efe4`" media=`"(prefers-color-scheme: light)`">`n")
  [void]$sb.Append("<link rel=`"alternate`" type=`"application/rss+xml`" title=`"The Epoch Institute — Research Series`" href=`"/feed.xml`">`n")
  if ($p.path -like '/today-in-history/*') { [void]$sb.Append("<link rel=`"alternate`" type=`"application/rss+xml`" title=`"The Epoch Institute — Today in History`" href=`"/feeds/today.xml`">`n") }
  [void]$sb.Append('<title>' + (Hx $p.title) + "</title>`n")
  [void]$sb.Append("<link rel=`"icon`" href=`"/favicon.svg`" type=`"image/svg+xml`">`n<link rel=`"icon`" href=`"/favicon.ico`" sizes=`"48x48`">`n<link rel=`"apple-touch-icon`" href=`"/apple-touch-icon.png`">`n")
  [void]$sb.Append('<meta name="description" content="' + (Hx $p.desc) + "`">`n<meta name=`"robots`" content=`"index, follow, max-image-preview:large`">`n<link rel=`"canonical`" href=`"$url`">`n")
  [void]$sb.Append('<meta property="og:type" content="' + $p.type + "`">`n<meta property=`"og:title`" content=`"" + (Hx $p.title) + "`">`n<meta property=`"og:description`" content=`"" + (Hx $p.desc) + "`">`n")
  [void]$sb.Append("<meta property=`"og:url`" content=`"$url`">`n<meta property=`"og:site_name`" content=`"The Epoch Institute`">`n<meta property=`"og:locale`" content=`"en_GB`">`n")
  [void]$sb.Append("<meta property=`"og:image`" content=`"$img`">`n")
  if ($w -and $h) { [void]$sb.Append("<meta property=`"og:image:width`" content=`"$w`">`n<meta property=`"og:image:height`" content=`"$h`">`n") }
  [void]$sb.Append("<meta name=`"twitter:card`" content=`"$card`">`n<meta name=`"twitter:site`" content=`"@Epoch_Institute`">`n<meta name=`"twitter:image`" content=`"$img`">`n")
  # css/pages.css: the rules of shared.css that these pages and the profiles can use (scripts/split-css.js, run at the end)
  [void]$sb.Append("<link rel=`"stylesheet`" href=`"/css/pages.css`">`n<link rel=`"preload`" href=`"/fonts/crimson-pro-normal-latin.woff2`" as=`"font`" type=`"font/woff2`" crossorigin>`n<link rel=`"preload`" href=`"/fonts/cinzel-normal-latin.woff2`" as=`"font`" type=`"font/woff2`" crossorigin>`n")
  [void]$sb.Append('<script type="application/ld+json">{"@context":"https://schema.org","@graph":[' + $p.ld + "]}</script>`n$GTAG`n</head>`n<body data-nav=`"" + $p.nav + "`">`n`n")
  [void]$sb.Append($p.body)
  # no shared-data.js here: these pages use none of it, and the header search gets the profiles from /search-profiles.js
  [void]$sb.Append("`n<script src=`"/shared-nav.js`" defer></script>`n<script src=`"/enc-page.js`" defer></script>`n</body>`n</html>`n")
  return $sb.ToString()
}
# a page's share poster (images/og/<name>.jpg, drawn by scripts/make-posters.js), when it has been drawn
function Poster([string]$name) { $f = '/images/og/' + $name + '.jpg'; if (Test-Path (Join-Path $Repo ($f.TrimStart('/') -replace '/', '\'))) { $f } else { $null } }
function ArticleLd([string]$headline, [string]$desc, [string]$path, [string]$aboutType, [string]$aboutName, $aka, $image) {
  $about = '{"@type":"' + $aboutType + '","name":' + (Js $aboutName) + $(if ($aka -and @($aka).Count) { ',"alternateName":[' + ((@($aka) | ForEach-Object { Js ([string]$_) }) -join ',') + ']' } else { '' }) + '}'
  return '{"@type":"Article","headline":' + (Js $headline) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + ',"mainEntityOfPage":' + (Js ($SITE + $path)) +
    ',"inLanguage":"en-GB","dateModified":"@@MOD@@","author":' + $ORG + ',"publisher":' + $ORG + ',"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"},"about":' + $about +
    $(if ($image) { ',"image":' + $image } else { '' }) + '}'
}
function ImageLd([string]$path, $w, $h, [string]$artist, [string]$licence, [string]$source) {
  $o = '{"@type":"ImageObject","url":' + (Js ($SITE + $path)) + ',"contentUrl":' + (Js ($SITE + $path))
  if ($w) { $o += ',"width":' + $w + ',"height":' + $h }
  $lu = LicenceUrl $licence; if ($lu) { $o += ',"license":' + (Js $lu) }
  if ($source) { $o += ',"acquireLicensePage":' + (Js $source) }
  if ($artist) { $o += ',"creditText":' + (Js $artist) + ',"creator":{"@type":"Person","name":' + (Js $artist) + '},"copyrightNotice":' + (Js $artist) }
  return $o + '}'
}
function CiteBox([string]$name, [string]$url, [string]$work) {
  $n = Hx $name; $wk = Hx $work
  return '<details class="ref-cite"><summary>Cite this ' + $(if ($work -like '*Encyclopedia') { 'entry' } elseif ($work -eq 'Research Series') { 'essay' } else { 'page' }) + '</summary><dl>' +
    "<dt>APA</dt><dd><span>The Epoch Institute. ($YEAR). $n. In <i>$wk</i>. $url</span> <button type=`"button`" class=`"ref-copy`" data-copy>Copy</button></dd>" +
    "<dt>MLA</dt><dd><span>&#8220;$n.&#8221; <i>$wk</i>, The Epoch Institute, $YEAR, $url. Accessed <span data-today></span>.</span> <button type=`"button`" class=`"ref-copy`" data-copy>Copy</button></dd>" +
    "<dt>Chicago</dt><dd><span>The Epoch Institute. &#8220;$n.&#8221; <i>$wk</i>. $YEAR. $url.</span> <button type=`"button`" class=`"ref-copy`" data-copy>Copy</button></dd>" +
    "<dt>Harvard</dt><dd><span>The Epoch Institute ($YEAR) &#8216;$n&#8217;, <i>$wk</i>. Available at: $url (Accessed: <span data-today></span>).</span> <button type=`"button`" class=`"ref-copy`" data-copy>Copy</button></dd>" +
    '</dl></details>'
}
function Pager([string]$base, [int]$cur, [int]$tot) {   # links: base, base-2, ...
  if ($tot -le 1) { return '' }
  $u = { param($k) if ($k -eq 1) { $base } else { "$base-$k" } }
  $sb = New-Object Text.StringBuilder; [void]$sb.Append('<nav class="ref-pager" aria-label="Pages">')
  if ($cur -gt 1) { [void]$sb.Append('<a rel="prev" href="' + (& $u ($cur - 1)) + '">&larr; Previous</a>') }
  $show = @{}; foreach ($k in (@(1, $tot) + @(($cur - 2)..($cur + 2)))) { if ($k -ge 1 -and $k -le $tot) { $show[[int]$k] = 1 } }
  $prev = 0
  foreach ($k in ($show.Keys | Sort-Object)) {
    if ($prev -and $k - $prev -gt 1) { [void]$sb.Append('<span class="gap">&hellip;</span>') }
    if ($k -eq $cur) { [void]$sb.Append('<span aria-current="page">' + $k + '</span>') } else { [void]$sb.Append('<a href="' + (& $u $k) + '">' + $k + '</a>') }
    $prev = $k
  }
  if ($cur -lt $tot) { [void]$sb.Append('<a rel="next" href="' + (& $u ($cur + 1)) + '">Next &rarr;</a>') }
  return $sb.Append('</nav>').ToString()
}

# ── sitemap state: lastmod changes only when a page's content changes ──────────────────────────────────────────────
$stateFile = "$PSScriptRoot\sitemap-state.tsv"; $SM = @{}
if (Test-Path $stateFile) { foreach ($l in [IO.File]::ReadAllLines($stateFile, $U8)) { $p = $l -split "`t"; if ($p.Count -eq 3) { $SM[$p[0]] = @($p[1], $p[2]) } } }
$SMNEW = @{}; $CHANGED = @{}
function Stamp([string]$path, [string]$content) {   # content may hold @@MOD@@ (dateModified): hashed without it
  # a picture's small copy (images/<folder>/thumbs/, Oct 2026) is the same picture: moving to it dates no page either
  $c = $content.Replace("`r`n", "`n").Replace('/images/encyclopedia/thumbs/', '/images/encyclopedia/').Replace('/images/states/thumbs/', '/images/states/').Replace($GTAG, $GTAG0)
  # the stylesheet a page links (css/<file>.css since Oct 2026, cut from shared.css) is not content either
  $c = [regex]::Replace($c, 'href="/css/[\w-]+\.css"', 'href="/shared.css"')
  $hash = [EpochBuild.W]::Sha1($c.Replace($THEME, ''))   # the head snippet is not content: changing it dates no page
  # until every page has been stamped once without the snippet: a hash of the page with the snippet as it was before Kids mode
  $old = if ($SM.ContainsKey($path) -and $SM[$path][0] -ne $hash) { [EpochBuild.W]::Sha1($c.Replace($THEME, $THEME0)) } else { '' }
  $same = $SM.ContainsKey($path) -and ($SM[$path][0] -eq $hash -or $SM[$path][0] -eq $old)
  if (-not $same) { $CHANGED[$path] = 1 }
  $mod = if ($same) { $SM[$path][1] } else { $TODAY }
  $SMNEW[$path] = @($hash, $mod); return $mod
}
$WROTE = @{}; $NWRITE = 0
function Emit([string]$path, [string]$content) {   # path: site path (/encyclopedia/x); file: repo path
  $mod = Stamp $path $content
  $file = Join-Path $Repo ($path.TrimStart('/') -replace '/', '\'); if ($path.EndsWith('/')) { $file = Join-Path $file 'index' }
  $WROTE[$file.ToLowerInvariant()] = 1
  if ([EpochBuild.W]::WriteIfChanged($file, $content.Replace('@@MOD@@', $mod))) { $script:NWRITE++ }
}
# a generated block (<!-- build:name --> ... <!-- /build:name -->) in a hand-written page
function SetBlock([string]$file, [string]$name, [string]$html) {
  $t = [IO.File]::ReadAllText($file, $U8); $a = "<!-- build:$name -->"; $b = "<!-- /build:$name -->"
  $i = $t.IndexOf($a); $j = $t.IndexOf($b); if ($i -lt 0 -or $j -lt $i) { throw "markers $a ... $b missing in $file" }
  $new = $t.Substring(0, $i + $a.Length) + "`n" + $html + "`n" + $t.Substring($j)
  if ([EpochBuild.W]::WriteIfChanged($file, $new)) { $script:NWRITE++ }
}

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Data
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'reading encyclopedia-data.js'
$lines = [IO.File]::ReadAllLines("$Repo\encyclopedia-data.js", $U8) | Where-Object { $_.StartsWith('  {slug:') }
$sbJ = New-Object Text.StringBuilder(25000000); [void]$sbJ.Append('[')
$first = $true; foreach ($l in $lines) { if (-not $first) { [void]$sbJ.Append(',') }; $first = $false; [void]$sbJ.Append([EpochBuild.W]::QuoteKeys($l.Trim().TrimEnd(','))) }
[void]$sbJ.Append(']'); $RAW = $JSS.DeserializeObject($sbJ.ToString()); $sbJ = $null
$NENT = $RAW.Count; Say "entries: $NENT"
foreach ($bad in 'index', 'browse', 'conflicts', 'glossary') { if (@($RAW | Where-Object { $_['slug'] -eq $bad }).Count) { throw "an entry has the reserved slug '$bad'" } }
# A-Z order (the encyclopedia page's _k sort)
$keys = New-Object 'string[]' $NENT; for ($i = 0; $i -lt $NENT; $i++) { $keys[$i] = [EpochBuild.W]::SortKey([string]$RAW[$i]['name']) }
$ord = [EpochBuild.W]::Order($keys)
$ENT = New-Object 'object[]' $NENT; $BY = @{}
for ($r = 0; $r -lt $NENT; $r++) {
  $d = $RAW[$ord[$r]]; $k = $keys[$ord[$r]]; $etags = @($d['tags'] | Where-Object { $_ })
  # a credit is plain text: decoded once here, so escaping it can never write "&amp;amp;" (scripts/clean-credits.ps1)
  if ($d['credit'] -and $d['credit']['artist']) { $d['credit']['artist'] = [Net.WebUtility]::HtmlDecode([string]$d['credit']['artist']) }
  $e = [pscustomobject]@{ i = $r; slug = [string]$d['slug']; name = [string]$d['name']; type = [string]$d['type']; sub = [string]$d['subtype']; aka = @($d['aka'] | Where-Object { $_ }); dates = [string]$d['dates']
    desc = [string]$d['desc']; img = [string]$d['img']; cr = $d['credit']; tags = $etags; war = [string]$d['war']; emp = @($d['empires'] | Where-Object { $_ }); k = $k
    L = $(if ($k -and $k[0] -ge [char]'a' -and $k[0] -le [char]'z') { [string]$k[0] } else { '0-9' }); conflict = ($etags.Count -gt 0); year = [EpochBuild.W]::YearOf([string]$d['dates']) }
  $ENT[$r] = $e; $BY[$e.slug] = $e
}
$RAW = $null
function KindOf($e) { if ($e.conflict) { 'conflict' } else { $e.type } }
function TagLabel($e) { ($e.tags | ForEach-Object { if ($TAGNAME.ContainsKey($_)) { $TAGNAME[$_] } else { $_ } }) -join ' · ' }
function TagGroup($e) { foreach ($g in $TAGS) { foreach ($tg in $e.tags) { if ($g[2] -contains $tg) { return $g[0] } } }; return $null }   # first group (in $TAGS order) the entry belongs to
function TypeLine($e) { if ($e.conflict) { (TagLabel $e) + $(if ($e.dates) { ' · ' + $e.dates } else { '' }) } elseif ($SING.ContainsKey($e.type)) { $SING[$e.type] } else { $e.type } }
# an entry without a picture: a small sign of its kind (shared.css .ph-person, .ph-conflict, ...) instead of a blank square
function PhSpan($e) { '<span class="ph ph-' + $(if ($e.conflict) { 'conflict' } else { [string]$e.type }) + '" aria-hidden="true"></span>' }
# a picture shown at 56 px or less (list tiles, speech portraits on the index, chart avatars) uses its 112 px copy in
# images/<folder>/thumbs/ (scripts/make-thumbs.ps1, run above); a picture without one keeps the full file
$THUMBSET = New-Object 'Collections.Generic.HashSet[string]'
foreach ($thDir in 'encyclopedia', 'states') { if (Test-Path "$Repo\images\$thDir\thumbs") { foreach ($thFile in [IO.Directory]::GetFiles("$Repo\images\$thDir\thumbs", '*.jpg')) { [void]$THUMBSET.Add("/images/$thDir/" + [IO.Path]::GetFileName($thFile)) } } }
function ThumbOf([string]$img) { if ($THUMBSET.Contains($img)) { $img.Insert($img.LastIndexOf('/') + 1, 'thumbs/') } else { $img } }

Say 'reading encyclopedia-links.js'
$elText = [IO.File]::ReadAllText("$Repo\encyclopedia-links.js", $U8)
$i0 = $elText.IndexOf('var ENC_LINKS = ') + 16; $i1 = $elText.IndexOf("};`n", $i0); if ($i1 -lt 0) { $i1 = $elText.IndexOf("};`r`n", $i0) }
$EL = $JSS.DeserializeObject($elText.Substring($i0, $i1 - $i0 + 1)); $elText = $null
$ROWS = $EL['e']; $FS = if ($EL.ContainsKey('fs')) { [int]$EL['fs'] } else { $ROWS.Count }
$Y = @{}; foreach ($kv in $EL['y'].GetEnumerator()) { $Y[$kv.Key] = $kv.Value }
$KW = New-Object 'System.Collections.Generic.Dictionary[string,System.Collections.Generic.List[object]]'; $nPat = 0; $ALWAYS = New-Object System.Collections.Generic.List[object]
for ($ri = 0; $ri -lt $(if ($SkipEntries) { 0 } else { $FS }); $ri++) {
  $row = $ROWS[$ri]; $rs = [string]$row[0]; $grp = $null
  if ($rs -eq '@g') { $grp = [pscustomobject]@{ m = @($row[2]); p = [string]$row[3] } }
  $pats = $row[1]
  for ($pj = 0; $pj -lt $pats.Count; $pj++) {
    $txt = [string]$pats[$pj][0]; $mode = [int]$pats[$pj][1]
    try { $rx = EncRx $txt $mode } catch { continue }
    $kt = if ($mode -eq 1 -and $txt.EndsWith('y')) { $txt.Substring(0, $txt.Length - 1) } else { $txt }
    $kword = [EpochBuild.W]::LongestWord($kt)
    $c = [pscustomobject]@{ id = [long]$ri * 1000 + $pj; slug = $rs; grp = $grp; rx = $rx }
    if (-not $kword) { $ALWAYS.Add($c); $nPat++; continue }   # no word of 3+ letters ("Ur", "Wu"): tried on every text
    $lst = $null; if (-not $KW.TryGetValue($kword, [ref]$lst)) { $lst = New-Object System.Collections.Generic.List[object]; $KW[$kword] = $lst }
    $lst.Add($c); $nPat++
  }
}
Say "link patterns: $nPat (keywords $($KW.Count))"

# the encyclopedia page's linkify(): a name several entries share goes to the one that fits the year in the sentence
# or this entry's dates; undecided or a dated event next to a wrong year -> the text is claimed, not linked
function LinkDesc([string]$text, [string]$self, $ctx) {
  $seen = New-Object 'System.Collections.Generic.HashSet[long]'; $list = New-Object System.Collections.Generic.List[object]
  foreach ($w in [EpochBuild.W]::Words($text)) { foreach ($v in [EpochBuild.W]::Variants($w)) { $l = $null; if ($KW.TryGetValue($v, [ref]$l)) { foreach ($c in $l) { if ($seen.Add($c.id)) { $list.Add($c) } } } } }
  foreach ($c in $ALWAYS) { if ($seen.Add($c.id)) { $list.Add($c) } }
  if ($list.Count -eq 0) { return (Hx $text) }
  $cands = New-Object System.Collections.Generic.List[object]; $q = 0
  foreach ($c in ($list | Sort-Object id)) {
    if (-not $c.grp -and $c.slug -eq $self) { continue }
    foreach ($m in $c.rx.Matches($text)) {
      if ($m.Length -eq 0) { continue }
      $s0 = $m.Index; $e0 = $s0 + $m.Length
      if ($c.grp) { $sl = EncPick @($c.grp.m | Where-Object { $_ -ne $self }) $text $s0 $e0 $ctx $null $Y $c.grp.p }
      elseif (EncOk $c.slug $text $s0 $e0 $Y) { $sl = $c.slug } else { $sl = $null }
      $cands.Add([pscustomobject]@{ s = $s0; e = $e0; slug = $sl; q = $q++ })
    }
  }
  $sb = New-Object Text.StringBuilder; $pos = 0; $used = @{}
  foreach ($c in ($cands | Sort-Object @{ e = { $_.s } }, @{ e = { $_.e - $_.s }; Descending = $true }, @{ e = { [int][bool]$_.slug }; Descending = $true }, @{ e = { $_.q } })) {
    if ($c.s -lt $pos) { continue }
    if (-not $c.slug) { [void]$sb.Append((Hx $text.Substring($pos, $c.e - $pos))); $pos = $c.e; continue }
    if ($used.ContainsKey($c.slug) -or -not $BY.ContainsKey($c.slug)) { continue }
    $used[$c.slug] = 1
    $tx = $text.Substring($c.s, $c.e - $c.s); $tail = ''
    $pm = [regex]::Match($tx, '([''\u2019]s)$'); if ($pm.Success) { $tail = $pm.Groups[1].Value; $tx = $tx.Substring(0, $tx.Length - $tail.Length) }
    [void]$sb.Append((Hx $text.Substring($pos, $c.s - $pos))).Append('<a class="enc-link" href="/encyclopedia/').Append($c.slug).Append('">').Append((Hx $tx)).Append('</a>').Append((Hx $tail))
    $pos = $c.e
  }
  [void]$sb.Append((Hx $text.Substring($pos))); return $sb.ToString()
}

Say 'reading the states register'
$POL = ReadJson "$Repo\data\polities.json"; $NODE = @{}; foreach ($n in $POL['nodes']) { $NODE[[string]$n['id']] = $n }
foreach ($bad in 'index', 'browse') { if ($NODE.ContainsKey($bad)) { throw "a state has the reserved id '$bad'" } }
function StateUrl($n) { if ($n['p']) { [string]$n['p'] } else { '/state/' + $n['id'] } }
$ADJ = @{}; foreach ($n in $POL['nodes']) { $ADJ[[string]$n['id']] = New-Object System.Collections.Generic.List[object] }
foreach ($l in $POL['links']) { $s = [string]$l['s']; $t = [string]$l['t']; if ($NODE.ContainsKey($s) -and $NODE.ContainsKey($t)) { $ADJ[$s].Add($l); $ADJ[$t].Add($l) } }
$STX = @{}; foreach ($f in Get-ChildItem "$Repo\data\states" -Filter *.json) { foreach ($kv in (ReadJson $f.FullName).GetEnumerator()) { $STX[$kv.Key] = $kv.Value } }
$ES = ReadJson "$Repo\data\enc-states.json"; $ESM = $ES['m']; $ESP = $ES['p']
# entry -> states whose histories link it (all, from the state texts), for the fallback "see also"
$entStates = @{}; $stIdx = @{}
foreach ($kv in $STX.GetEnumerator()) {
  $txt = [string]$kv.Value['o'] + ' ' + [string]$kv.Value['r'] + ' ' + [string]$kv.Value['e']
  foreach ($m in [regex]::Matches($txt, '\[\[e:([^|\]]+)\|')) {
    $sl = $m.Groups[1].Value; if (-not $BY.ContainsKey($sl)) { continue }
    if (-not $stIdx.ContainsKey($kv.Key)) { $stIdx[$kv.Key] = $stIdx.Count }
    if (-not $entStates.ContainsKey($sl)) { $entStates[$sl] = New-Object 'System.Collections.Generic.HashSet[int]' }
    [void]$entStates[$sl].Add($stIdx[$kv.Key])
  }
}

Say 'see also'
$empId = @{}; $empArr = New-Object 'int[][]' $NENT; $maskArr = New-Object 'int[][]' $NENT; $imgArr = New-Object 'bool[]' $NENT; $grpArr = New-Object 'int[][]' $NENT
foreach ($e in $ENT) {
  $ids = New-Object System.Collections.Generic.List[int]; $mk = New-Object System.Collections.Generic.List[int]
  foreach ($m in $e.emp) { $nm = [string]$m['name']; if (-not $empId.ContainsKey($nm)) { $empId[$nm] = $empId.Count }; $ids.Add($empId[$nm]); $b = 0; foreach ($s in @($m['sections'])) { if ($SECBIT.ContainsKey([string]$s)) { $b = $b -bor $SECBIT[[string]$s] } }; $mk.Add($b) }
  $empArr[$e.i] = $ids.ToArray(); $maskArr[$e.i] = $mk.ToArray(); $imgArr[$e.i] = [bool]$e.img
  if ($entStates.ContainsKey($e.slug)) { $grpArr[$e.i] = [int[]]@($entStates[$e.slug]) } else { $grpArr[$e.i] = New-Object 'int[]' 0 }
}
$SEE = [EpochBuild.W]::SeeAlso($empArr, $maskArr, $imgArr, $empId.Count, 8)
$SEE2 = [EpochBuild.W]::CoMentioned($grpArr, $imgArr, $stIdx.Count, 8)
$KIDS = @{}; foreach ($e in $ENT) { if ($e.war -and $BY.ContainsKey($e.war)) { if (-not $KIDS.ContainsKey($e.war)) { $KIDS[$e.war] = New-Object System.Collections.Generic.List[object] }; $KIDS[$e.war].Add($e) } }
$IMGSZ = @{}
function ImgSize([string]$path) { if (-not $path) { return $null }; if (-not $IMGSZ.ContainsKey($path)) { $IMGSZ[$path] = [EpochBuild.W]::JpegSize((Join-Path $Repo ($path.TrimStart('/') -replace '/', '\'))) }; return $IMGSZ[$path] }

# A-Z pages: 100 entries a page, per letter
$LETTERS = @('0-9') + @([char[]](97..122) | ForEach-Object { [string]$_ }); $PER = 100
$byLetter = @{}; foreach ($L in $LETTERS) { $byLetter[$L] = New-Object System.Collections.Generic.List[object] }
foreach ($e in $ENT) { $byLetter[$e.L].Add($e) }
$PAGEOF = @{}   # slug -> browse path
foreach ($L in $LETTERS) { $lst = $byLetter[$L]; for ($i = 0; $i -lt $lst.Count; $i++) { $pg = [Math]::Floor($i / $PER) + 1; $PAGEOF[$lst[$i].slug] = '/encyclopedia/browse/' + $L + $(if ($pg -gt 1) { "-$pg" } else { '' }) } }
function LetterLabel([string]$L) { if ($L -eq '0-9') { '0–9' } else { $L.ToUpperInvariant() } }
# conflicts by century
$CENT = @{}; foreach ($e in $ENT) { if ($e.conflict) { $c = Century $e.year; if (-not $CENT.ContainsKey($c)) { $CENT[$c] = New-Object System.Collections.Generic.List[object] }; $CENT[$c].Add($e) } }
$CENTORDER = @($CENT.Keys | Sort-Object { CenturyRank $_ })

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Maps, countries and centuries (prepared here: the entry and state pages link to them)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'maps, countries and centuries'
if (-not ('EpochGeo.G' -as [type])) { Add-Type -TypeDefinition ([IO.File]::ReadAllText("$PSScriptRoot\lib\geo.cs")) }
$INV = [Globalization.CultureInfo]::InvariantCulture
$LAND = ReadJson "$Repo\data\land.json"; $GEOD = ReadJson "$Repo\data\geo.json"
$RINGS = New-Object 'System.Collections.Generic.List[double[]]'; $BOXES = New-Object 'System.Collections.Generic.List[double[]]'
$CTRY = @{}   # a present-day country -> its outline record (n, ct, lp, bb, ...): its own name first, then its other
              # names, its sovereign's name last (dependencies such as Greenland carry it too)
$CRING = @{}   # a country's own rings and their boxes (Natural Earth name): the country lit up on its page
foreach ($c in $LAND['countries']) {
  $cr = New-Object 'System.Collections.Generic.List[double[]]'; $cb = New-Object 'System.Collections.Generic.List[double[]]'
  foreach ($r in $c['r']) { $d = [EpochGeo.G]::FromInts([object[]]$r, 100); $bx = [EpochGeo.G]::Bbox($d); $RINGS.Add($d); $BOXES.Add($bx); $cr.Add($d); $cb.Add($bx) }
  $CRING[[string]$c['n']] = @($cr, $cb)
  $CTRY[[string]$c['n']] = $c
}
foreach ($c in $LAND['countries']) { foreach ($nm in @($c['names'])) { if ($nm -and -not $CTRY.ContainsKey([string]$nm)) { $CTRY[[string]$nm] = $c } } }
foreach ($c in $LAND['countries']) { $nm = [string]$c['sov']; if ($nm -and -not $CTRY.ContainsKey($nm)) { $CTRY[$nm] = $c } }
$MAPH = [EpochGeo.G]::P(0, -58)[1]   # maps run from the Arctic to 58 degrees south (no Antarctica)
# state positions in plane units: the capital or the state's own point (Wikidata); approximate ones (the centre of a
# present-day country) are spread on a small spiral so they do not sit on one another
$STATEXY = @{}; $apN = @{}
foreach ($id in @($GEOD.Keys | Sort-Object)) {
  $g = $GEOD[$id]; $pxy = [EpochGeo.G]::P([double]$g[1], [double]$g[0]); $ap = ([int]$g[2] -eq 9)
  if ($ap) { $k0 = [string][Math]::Round($pxy[0]) + ',' + [Math]::Round($pxy[1]); $kk = [int]$apN[$k0]; $apN[$k0] = $kk + 1; if ($kk) { $rr = 0.55 * [Math]::Sqrt($kk); $an = $kk * 2.39996; $pxy = @(($pxy[0] + $rr * [Math]::Cos($an)), ($pxy[1] + $rr * [Math]::Sin($an))) } }
  $STATEXY[$id] = @([double]$pxy[0], [double]$pxy[1], $ap, [int]$g[2])   # x, y, approximate, source (scripts/fetch-geo.ps1)
}
function Fx([double]$v) { [string][long][Math]::Round($v * 10) }   # maps are written in tenths of a plane unit
function Fd([double]$v) { $v.ToString('0.##', [Globalization.CultureInfo]::InvariantCulture) }   # degrees, 2 dp
function Alive($n, [double]$y) { $s = $n['s']; $e = $n['e']; ($null -ne $s) -and ([double]$s -le $y) -and (($null -eq $e) -or ([double]$e -ge $y)) }
# dots as zero-length strokes (one path per class; the stroke width, in screen pixels, comes from shared.css)
function DotPath([string]$cls, $pts) {   # pts: a list of points (@(, $p) for one); @() is avoided: it fails on New-Object lists
  $sbD = New-Object Text.StringBuilder
  if ($null -ne $pts) { foreach ($q in $pts) { if ($null -ne $q) { [void]$sbD.Append('M').Append((Fx $q[0])).Append(' ').Append((Fx $q[1])).Append('h0') } } }
  if (-not $sbD.Length) { return '' }
  return '<path class="' + $cls + '" d="' + $sbD.ToString() + '"/>'
}
# a map of the rectangle $view (x, y, w, h in plane units): over the shared world picture, or with its own outlines
function MapSvg($view, [string]$inner, [string]$label, [string]$cls, [switch]$Outlines, $Hi) {   # Hi: @(rings, boxes) of a country to light up
  $vb = (Fx $view[0]) + ' ' + (Fx $view[1]) + ' ' + (Fx $view[2]) + ' ' + (Fx $view[3])
  if ($Outlines) {
    $clip = [double[]]@(($view[0] - $view[2] * 0.03), ($view[1] - $view[3] * 0.03), ($view[0] + $view[2] * 1.03), ($view[1] + $view[3] * 1.03))
    $bg = '<path class="map-land" d="' + [EpochGeo.G]::PathData($RINGS, $BOXES, ($view[2] / 700), 0, $clip, 10) + '"/>'
    if ($Hi) { $bg += '<path class="map-land-hi" d="' + [EpochGeo.G]::PathData($Hi[0], $Hi[1], ($view[2] / 700), 0, $clip, 10) + '"/>' }
  } else { $bg = '<image href="/maps/world.svg" x="0" y="0" width="10000" height="' + (Fx $MAPH) + '"/>' }
  return '<svg class="map' + $(if ($cls) { ' ' + $cls } else { '' }) + '" viewBox="' + $vb + '" role="img" aria-label="' + (Hx $label) + '">' + $bg + $inner + '</svg>'
}
function FitView($pts, [double]$minW, [double]$aspect, [double]$pad) {   # rectangle around points, at least minW wide, w/h = aspect
  $x0 = 1e9; $y0 = 1e9; $x1 = -1e9; $y1 = -1e9
  foreach ($p in $pts) { if ($p[0] -lt $x0) { $x0 = $p[0] }; if ($p[0] -gt $x1) { $x1 = $p[0] }; if ($p[1] -lt $y0) { $y0 = $p[1] }; if ($p[1] -gt $y1) { $y1 = $p[1] } }
  $w = ($x1 - $x0) * (1 + 2 * $pad); $h = ($y1 - $y0) * (1 + 2 * $pad); if ($w -lt $minW) { $w = $minW }; if ($h * $aspect -gt $w) { $w = $h * $aspect } else { $h = $w / $aspect }
  $cx = ($x0 + $x1) / 2; $cy = ($y0 + $y1) / 2
  return [double[]]@(($cx - $w / 2), ($cy - $h / 2), $w, $h)
}

# present-day countries with at least 3 states of the register: /countries/<slug>
$CSTATES = @{}
foreach ($n in $POL['nodes']) { foreach ($m in @($n['mo'] | Where-Object { $_ })) { $m = [string]$m; if (-not $CSTATES.ContainsKey($m)) { $CSTATES[$m] = New-Object System.Collections.Generic.List[object] }; $CSTATES[$m].Add($n) } }
$CPAGE = @{}; foreach ($m in $CSTATES.Keys) { if ($CSTATES[$m].Count -ge 3) { $CPAGE[$m] = [EpochBuild.W]::ToSlug($m) } }
if (@($CPAGE.Values | Group-Object | Where-Object { $_.Count -gt 1 }).Count -or $CPAGE.Values -contains 'index') { throw 'country slugs are not unique' }
function CountryLink([string]$m) { if ($CPAGE.ContainsKey($m)) { '<a href="/countries/' + $CPAGE[$m] + '">' + (Hx $m) + '</a>' } else { Hx $m } }
function TheCountry([string]$m) { if ($m -match '^(United |Bahamas|Central African|Comoros|Cook Islands|Czech|Democratic Republic|Dominican Republic|Gambia|Maldives|Marshall Islands|Netherlands|Philippines|Republic of)') { "the $m" } else { $m } }
# a register state's name in running text: "the" before titles ("the Kingdom of Ndongo", "the People's Republic of
# China"), state nouns ("the Inca Empire", "the Xia dynasty", "the New Republic (Brazil)") and peoples ("the Ligures")
$STATENOUN = 'Kingdoms?|Duchy|Grand Duchy|Archduchy|Principality|County|Republic|State|Lordship|(Prince-)?(Arch)?[Bb]ishopric|Sultanate|Emirate|Colony|colony|Commonwealth|Chiefdom|chiefdom|Province|Canton|Khanate|Khaganate|Caliphate|Empire|Federation|Union|Confederation|Confederacy|Protectorate|Viceroyalty|Captaincy|Earldom|Marquisate|Margraviate|Landgraviate|Electorate|Imamate|Mandate|Territory|Dominion|Tsardom|Despotate|Exarchate|Judicate|Taifa|Beylik|Regency|Satrapy|Settlement|Presidency|Shogunate|[Dd]ynasty|League|Horde|Raj|Banate|Governorate|Company|Order'
function StateThe($n) {
  [string]$s = $n['n']; [string]$t = $n['t']
  $c = TheCountry $s; if ($c -ne $s) { return $c }
  if ($s -match ('^(?:[A-Z][\w''-]* ){0,3}(?:' + $STATENOUN + ') of\b') -or $s -match ('\b(?:' + $STATENOUN + ')(?:\s*\([^)]*\))?$')) { return "the $s" }
  if ($s -notmatch ' ' -and ($t -match 'tribal|tribe|people' -or $s -match '(ans|ians|ii|ites)$') -and $s -match '(s|i|ae)$') { return "the $s" }
  return $s
}

# centuries: /centuries/<slug> (the encyclopedia's century labels: 13th century = 1200-1299, 5th century BCE = 499-400 BCE)
function CentRange([string]$label) { $n = [int]([regex]::Match($label, '^\d+').Value); if ($label.EndsWith('BCE')) { return @((-$n * 100 + 1), (-($n - 1) * 100)) }; return @((($n - 1) * 100), ($n * 100 - 1)) }
function CentMid([string]$label) { $r = CentRange $label; [int][Math]::Round(($r[0] + $r[1]) / 2.0) }
function CentDecades([string]$label) {   # "the 1200s", "the 400s BCE"
  $n = [int]([regex]::Match($label, '^\d+').Value); if ($n -eq 1) { return $(if ($label.EndsWith('BCE')) { 'the years 99–1 BCE' } else { 'the years 1–99' }) }
  return 'the ' + (($n - 1) * 100) + 's' + $(if ($label.EndsWith('BCE')) { ' BCE' } else { '' })
}
function CentTitle([string]$label) { $label.Substring(0, 1).ToUpperInvariant() + $label.Substring(1) }
# when an entry belongs to: an event's (or work's, place's ...) first year; a person's working life (birth-death:
# two thirds of the way; reign or "fl.": the middle; "d.": ten years before; "b.": 35 years after)
$EYRS = @{}; $ENTCENT = @{}
foreach ($e in $ENT) {
  $sp = [EpochBuild.W]::Span($e.dates); if (-not $sp) { continue }
  $EYRS[$e.slug] = $sp; $lo = $sp[0]; $hi = $sp[1]
  if ($e.type -eq 'person') {
    $at = if ($e.dates -match '^\s*(r\.|fl\.)') { ($lo + $hi) / 2 } elseif ($e.dates -match '^\s*(d\.|died)') { $hi - 10 } elseif ($e.dates -match '^\s*(b\.|born)') { $lo + 35 } elseif ($hi -gt $lo) { $lo + ($hi - $lo) * 0.65 } else { $lo }
  } else { $at = $lo }
  if ($at -gt $YEAR) { continue }
  $ENTCENT[$e.slug] = Century ([int][Math]::Floor($at))
}
$CSTAT = @{}   # century -> alive, founded, ended (node lists), entries (list)
function CentOf($y) { if ($null -eq $y) { return $null }; Century ([int][Math]::Round([double]$y)) }
$allCents = New-Object System.Collections.Generic.List[string]
for ($cn = 30; $cn -ge 1; $cn--) { $allCents.Add("$(Century (-($cn - 1) * 100 - 50))") }
for ($cn = 1; $cn -le 21; $cn++) { $allCents.Add("$(Century (($cn - 1) * 100 + 50))") }
foreach ($c in $allCents) { $CSTAT[$c] = @{ alive = New-Object System.Collections.Generic.List[object]; founded = New-Object System.Collections.Generic.List[object]; ended = New-Object System.Collections.Generic.List[object]; ents = New-Object System.Collections.Generic.List[object] } }
foreach ($n in $POL['nodes']) {
  if ($null -eq $n['s']) { continue }; $s0 = [double]$n['s']; $e0 = if ($null -eq $n['e']) { [double]$YEAR } else { [double]$n['e'] }
  foreach ($c in $allCents) { $r = CentRange $c; if ($s0 -le $r[1] -and $e0 -ge $r[0]) { $CSTAT[$c].alive.Add($n) } }
  $cf = CentOf $s0; if ($CSTAT.ContainsKey($cf)) { $CSTAT[$cf].founded.Add($n) }
  if ($null -ne $n['e']) { $ce = CentOf $n['e']; if ($CSTAT.ContainsKey($ce)) { $CSTAT[$ce].ended.Add($n) } }
}
foreach ($e in $ENT) { $c = $ENTCENT[$e.slug]; if ($c -and $CSTAT.ContainsKey($c)) { $CSTAT[$c].ents.Add($e) } }
# a page for every century from the first with ten states alive (or 25 dated entries) to the present one
$CENTPAGES = New-Object System.Collections.Generic.List[string]; $started = $false
foreach ($c in $allCents) { if (-not $started -and ($CSTAT[$c].alive.Count -ge 10 -or $CSTAT[$c].ents.Count -ge 25)) { $started = $true }; if ($started) { $CENTPAGES.Add($c) } }
$CENTSET = @{}; foreach ($c in $CENTPAGES) { $CENTSET[$c] = 1 }
function CentLink([string]$c, [string]$text) { if ($c -and $CENTSET.ContainsKey($c)) { '<a href="/centuries/' + (CenturySlug $c) + '">' + (Hx $(if ($text) { $text } else { $c })) + '</a>' } else { Hx $(if ($text) { $text } else { $c }) } }
Say "countries with pages: $($CPAGE.Count); century pages: $($CENTPAGES.Count) ($($CENTPAGES[0]) - $($CENTPAGES[-1])); placed states: $($STATEXY.Count)"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Encyclopedia entry pages
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Great Speeches are read here so that each entry page can list the speeches that name it: as speaker, as a
# connected entry or as something a speech led to (their own pages are written further down)
$spText = [IO.File]::ReadAllText("$Repo\speeches-data.js", $U8); $i0 = $spText.IndexOf('var SPEECHES = ') + 15; $i1 = $spText.LastIndexOf('];')
# QuoteKeys quotes a key only right after { or , - so drop the line breaks first (no string value holds one)
$SPS = @($JSS.DeserializeObject([EpochBuild.W]::QuoteKeys($spText.Substring($i0, $i1 - $i0 + 1).Replace("`r", '').Replace("`n", '')))); $spText = $null
# by year, and within a year in file order (Sort-Object is not stable; the file lists each year's speeches by date)
for ($k = 0; $k -lt $SPS.Count; $k++) { $SPS[$k]['_n'] = $k }
$SPS = @($SPS | Sort-Object @{ e = { [double]$_['year'] } }, @{ e = { [int]$_['_n'] } })
$SPBY = @{}
foreach ($spx in $SPS) {
  $spRefs = @([string]$spx['speakerSlug']) + @(@($spx['links']) + @($spx['led']) | ForEach-Object { if ([string]$_ -match '^/encyclopedia/([^|]+)\|') { $Matches[1] } })
  foreach ($spRef in ($spRefs | Where-Object { $_ } | Select-Object -Unique)) { if (-not $SPBY.ContainsKey($spRef)) { $SPBY[$spRef] = New-Object Collections.Generic.List[object] }; $SPBY[$spRef].Add($spx) }
}

# Years: /years/<y> for every year with enough firm-dated material (6 items, 2 of them events), gathered here so that
# the entry, day and century pages can link to them (the pages are written after the centuries). Only firm years:
# "c. 1450", "1450s" or a reign never put anything on a year. ($y would be $Y, the link years: script-level year
# variables are $yv.)
$HIST = ReadJson "$Repo\data\history.json"
$GLANCE = [ordered]@{}   # profile -> 'At a glance' (empire-glance.js): ev = key events [year text, text]
foreach ($l in [IO.File]::ReadAllLines("$Repo\empire-glance.js", $U8)) {
  $m = [regex]::Match($l, '^\s+"((?:[^"\\]|\\.)*)": (\{.*\}),?\s*$'); if (-not $m.Success) { continue }
  $GLANCE[[regex]::Unescape($m.Groups[1].Value)] = $JSS.DeserializeObject([EpochBuild.W]::QuoteKeys($m.Groups[2].Value))
}
$MINV = [int]::MinValue; $YEARB = @{}
function YB([int]$yv) {   # the year's buckets
  if (-not $YEARB.ContainsKey($yv)) { $h = @{}; foreach ($bk in 'days', 'ents', 'wks', 'born', 'died', 'began', 'ended', 'gl', 'sf', 'se', 'sp') { $h[$bk] = New-Object Collections.Generic.List[object] }; $YEARB[$yv] = $h }
  return $YEARB[$yv]
}
foreach ($e in $ENT) {
  if (-not $e.dates) { continue }
  if ($e.type -eq 'person') {
    $lf = [EpochBuild.W]::Life($e.dates)
    if ($lf[0] -ne $MINV -and $lf[0] -le $YEAR) { (YB $lf[0]).born.Add($e) }
    if ($lf[1] -ne $MINV -and $lf[1] -le $YEAR) { (YB $lf[1]).died.Add($e) }
    continue
  }
  $isEv = ($e.type -eq 'event' -or $e.conflict); if (-not $isEv -and $e.type -ne 'work') { continue }
  $yv = [EpochBuild.W]::Firm($e.dates, $false)
  if ($yv -ne $MINV) { if ($yv -le $YEAR) { if ($isEv) { (YB $yv).ents.Add($e) } else { (YB $yv).wks.Add($e) } }; continue }
  if ($isEv) { $rg2 = [EpochBuild.W]::Range($e.dates); if ($rg2 -and $rg2[0] -ne $MINV -and $rg2[1] -ne $MINV -and $rg2[1] -gt $rg2[0] -and $rg2[0] -le $YEAR) { (YB $rg2[0]).began.Add($e); if ($rg2[1] -le $YEAR) { (YB $rg2[1]).ended.Add($e) } } }
}
foreach ($k in @($HIST.Keys)) { foreach ($ev in $HIST[$k]) { $yv = [int][Math]::Round([double]$ev['year']); if ($yv -ne 0 -and $yv -le $YEAR) { (YB $yv).days.Add(@($k, $ev)) } } }
foreach ($gn in $GLANCE.Keys) { foreach ($gev in @($GLANCE[$gn]['ev'])) { $yv = [EpochBuild.W]::Firm([string]$gev[0], $false); if ($yv -ne $MINV -and $yv -le $YEAR) { (YB $yv).gl.Add(@($gn, [string]$gev[1])) } } }
foreach ($n in $POL['nodes']) {   # states whose years are recorded as firm (x: approximate)
  if ($n['x']) { continue }
  if ($null -ne $n['s']) { $yv = [int][Math]::Round([double]$n['s']); if ($yv -ne 0) { (YB $yv).sf.Add($n) } }
  if ($null -ne $n['e']) { $yv = [int][Math]::Round([double]$n['e']); if ($yv -ne 0) { (YB $yv).se.Add($n) } }
}
foreach ($spx in $SPS) { (YB ([int][Math]::Round([double]$spx['year']))).sp.Add($spx) }
# an entry a day event of the year already names is not listed again beside it: one of the event's links, its name in
# the event's title, or every word of its name there ("Fall of Constantinople": "Constantinople falls to the Ottomans")
$STOPW = @{}; foreach ($w in 'the', 'and', 'von', 'van', 'der', 'des', 'del', 'della') { $STOPW[$w] = 1 }
function NameWords([string]$s) { @(([regex]::Replace($s.ToLowerInvariant(), '\([^)]*\)', ' ') -split '[^\p{L}\p{N}]+') | Where-Object { $_.Length -ge 3 -and -not $STOPW.ContainsKey($_) }) }
function YCovered($yb, $o) {
  if ($yb.cov.ContainsKey($o.slug)) { return $true }
  $nm = $o.name.ToLowerInvariant(); foreach ($t in $yb.tl) { if ($t.Contains($nm)) { return $true } }
  $ws = NameWords $o.name; if ($ws.Count -lt 2) { return $false }
  foreach ($tw in $yb.tw) {
    $all = $true
    foreach ($w in $ws) { $hw = $false; foreach ($x in $tw) { if ($x.StartsWith($w) -or ($x.Length -ge 4 -and $w.StartsWith($x))) { $hw = $true; break } }; if (-not $hw) { $all = $false; break } }
    if ($all) { return $true }
  }
  return $false
}
$YEARSET = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($yv in @($YEARB.Keys)) {
  $yb = $YEARB[$yv]; $cov = @{}; $tl = New-Object Collections.Generic.List[string]; $tw = New-Object Collections.Generic.List[object]
  foreach ($de in $yb.days) { $tl.Add(([string]$de[1]['title']).ToLowerInvariant()); $tw.Add((NameWords ([string]$de[1]['title']))); foreach ($lk in @($de[1]['links'])) { if ($lk) { $cov[[string]$lk[0]] = 1 } } }
  $yb.cov = $cov; $yb.tl = $tl; $yb.tw = $tw
  $nEv = $yb.days.Count + $yb.gl.Count; foreach ($bk in 'ents', 'began', 'ended') { foreach ($o in $yb[$bk]) { if (-not (YCovered $yb $o)) { $nEv++ } } }
  $nAll = $nEv + $yb.born.Count + $yb.died.Count + $yb.wks.Count + $yb.sf.Count + $yb.se.Count + $yb.sp.Count
  if ($nAll -ge 6 -and $nEv -ge 2) { [void]$YEARSET.Add([int]$yv) }
}
$YEARLIST = @($YEARSET | Sort-Object)
function YearLabel([int]$yv) { if ($yv -lt 0) { "$(-$yv) BCE" } elseif ($yv -lt 1000) { "$yv CE" } else { "$yv" } }
function YearHref([int]$yv) { '/years/' + [EpochBuild.W]::YearSlug($yv) }
Say "year pages: $($YEARLIST.Count) ($(YearLabel $YEARLIST[0]) - $(YearLabel $YEARLIST[-1]))"

Say 'encyclopedia entry pages'
$nLinks = 0
foreach ($e in $ENT) {
  $path = '/encyclopedia/' + $e.slug; $url = $SITE + $path
  if ($SkipEntries) { $WROTE[(Join-Path $Repo ('encyclopedia\' + $e.slug)).ToLowerInvariant()] = 1; $SMNEW[$path] = if ($SM.ContainsKey($path)) { $SM[$path] } else { @('', $TODAY) }; continue }
  $ctx = EncYears $e.dates
  $descHtml = if ($e.desc) { LinkDesc $e.desc $e.slug $ctx } else { 'Description coming soon.' }
  $nLinks += ([regex]::Matches($descHtml, 'class="enc-link"')).Count
  $crumb = Crumbs @(@('Home', '/'), @('Encyclopedia', '/encyclopedia/'), @((LetterLabel $e.L), $PAGEOF[$e.slug]), @($e.name, $null))
  $kicker = if ($e.conflict) { '<a href="/encyclopedia/conflicts/' + (CenturySlug (Century $e.year)) + '">Conflicts &amp; Resolutions</a> · ' + (Hx (TagLabel $e)) }
            elseif ($e.type -eq 'term') { '<a href="/encyclopedia/glossary#' + $e.slug + '">Glossary</a> · Term' + $(if ($e.sub) { ' · ' + (Hx $e.sub) } else { '' }) }
            else { (Hx $SING[$e.type]) + $(if ($e.sub -and $e.sub -ne 'other' -and $e.type -ne 'polity' -and $e.type -ne 'factor') { ' · ' + (Hx $e.sub) } else { '' }) }
  $meta = @(); if ($e.dates) { $meta += '<span class="dates">' + [EpochBuild.W]::LinkYears($e.dates, $YEARSET) + '</span>' }
  $ec = $ENTCENT[$e.slug]; if ($ec -and $CENTSET.ContainsKey($ec)) { $meta += CentLink $ec }
  if ($e.aka.Count) { $meta += 'Also known as ' + (($e.aka | ForEach-Object { Hx ([string]$_) }) -join ', ') }
  if ($e.war -and $BY.ContainsKey($e.war)) { $meta += 'Part of the <a class="enc-link" href="/encyclopedia/' + $e.war + '">' + (Hx $BY[$e.war].name) + '</a>' }
  $fig = ''; $imgLd = $null; $sz = $null
  if ($e.img) {
    $sz = ImgSize $e.img; $artist = if ($e.cr) { [string]$e.cr['artist'] } else { '' }; $lic = if ($e.cr) { [string]$e.cr['licence'] } else { '' }; $src = if ($e.cr) { [string]$e.cr['source'] } else { '' }
    $cap = (@($(if ($artist) { Hx $artist }), $(if ($lic) { Hx $lic })) | Where-Object { $_ }) -join ' · '
    $dim = if ($sz) { ' width="' + $sz[0] + '" height="' + $sz[1] + '"' } else { ' width="320"' }
    $fig = '<figure class="enc-fig"><img src="' + $e.img + '" alt="' + (Hx $e.name) + '"' + $dim + ' fetchpriority="high"><figcaption>' + $(if ($cap) { 'Image: ' + $cap + ' · ' } else { '' }) +
      $(if ($src) { '<a href="' + (Hx $src) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' } else { '' }) + '</figcaption></figure>'
    $imgLd = ImageLd $e.img $(if ($sz) { $sz[0] }) $(if ($sz) { $sz[1] }) $artist $lic $src
  }
  $body = New-Object Text.StringBuilder(6000)
  [void]$body.Append('<main id="main" class="enc-page ref-page">' + "`n" + '<div class="enc-wrap">' + "`n" + $crumb[0] + "`n" + '<article class="enc-article">' + "`n")
  [void]$body.Append('<header><p class="enc-kicker">' + $kicker + '</p><h1 class="enc-title">' + (Hx $e.name) + '</h1>' + $(if ($meta.Count) { '<p class="enc-meta">' + ($meta -join ' · ') + '</p>' } else { '' }) + "</header>`n")
  [void]$body.Append('<div class="enc-body"><p class="enc-desc">' + $descHtml + '</p>' + $fig + "</div>`n")
  if ($e.emp.Count) {
    [void]$body.Append('<section><h2 class="enc-section-title">Mentioned in ' + $e.emp.Count + ' profile' + $(if ($e.emp.Count -eq 1) { '' } else { 's' }) + '</h2><div class="enc-mentions">')
    foreach ($m in $e.emp) { $ps = [string]$m['slug']; if (-not $ps) { $ps = [EpochBuild.W]::ToSlug([string]$m['name']) }; [void]$body.Append('<a href="' + $(if ($PROFURL.ContainsKey([string]$m['name'])) { $PROFURL[[string]$m['name']] } else { '/empire/' }) + $ps + '">' + (Hx ([string]$m['name'])) + '<span class="secs">' + (Hx ((@($m['sections']) | ForEach-Object { if ($SEC.ContainsKey([string]$_)) { $SEC[[string]$_] } else { [string]$_ } }) -join ', ')) + '</span></a>') }
    [void]$body.Append("</div></section>`n")
  }
  if ($KIDS.ContainsKey($e.slug)) {
    $warKids = @($KIDS[$e.slug] | Sort-Object @{ e = { if ($_.year -eq [int]::MinValue) { 1 } else { 0 } } }, @{ e = { $_.year } }, @{ e = { $_.i } })
    [void]$body.Append('<section><h2 class="enc-section-title">Battles and settlements</h2><ul class="enc-seealso">')
    foreach ($o in $warKids) { [void]$body.Append('<li><a href="/encyclopedia/' + $o.slug + '">' + $(if ($o.img) { '<img src="' + (ThumbOf $o.img) + '" alt="" loading="lazy" width="44" height="44">' } else { (PhSpan $o) }) + '<span><span class="nm">' + (Hx $o.name) + '</span><span class="tp">' + (Hx ((TagLabel $o) + $(if ($o.dates) { ' · ' + $o.dates } else { '' }))) + '</span></span></a></li>') }
    [void]$body.Append("</ul></section>`n")
  }
  $own = if ($ESP) { $ESP[$e.slug] } else { $null }
  if ($own -and $NODE.ContainsKey([string]$own)) { [void]$body.Append('<p class="enc-article-foot"><a class="enc-random-link" href="' + (StateUrl $NODE[[string]$own]) + '">State page: history, lineage and connections &rarr;</a></p>' + "`n") }
  $stm = if ($ESM) { $ESM[$e.slug] } else { $null }
  if ($stm) {
    $tot = [int]$stm[0]; $shown = @($stm[1])
    [void]$body.Append('<section><h2 class="enc-section-title">Mentioned in ' + $tot + ' state histor' + $(if ($tot -eq 1) { 'y' } else { 'ies' }) + '</h2><div class="enc-mentions">')
    foreach ($s in $shown) { $id = [string]$s[0]; $href = if ($NODE.ContainsKey($id)) { StateUrl $NODE[$id] } else { '/state/' + $id }; [void]$body.Append('<a href="' + $href + '">' + (Hx ([string]$s[1])) + '</a>') }
    if ($tot -gt $shown.Count) { [void]$body.Append('<span class="secs">and ' + ($tot - $shown.Count) + ' more</span>') }
    [void]$body.Append("</div></section>`n")
  }
  if ($SPBY.ContainsKey($e.slug)) {
    [void]$body.Append('<section><h2 class="enc-section-title">Great speeches</h2><div class="enc-mentions">')
    foreach ($spx in $SPBY[$e.slug]) { [void]$body.Append('<a href="/speeches/' + $spx['slug'] + '">' + (Hx ([string]$spx['title'])) + '<span class="secs">' + (Hx ([string]$spx['display'])) + '</span></a>') }
    [void]$body.Append("</div></section>`n")
  }
  $related = @($SEE[$e.i]); if (-not $related.Count) { $related = @($SEE2[$e.i]) }
  if ($related.Count) {
    [void]$body.Append('<section><h2 class="enc-section-title">See also</h2><ul class="enc-seealso">')
    foreach ($ix in $related) { $o = $ENT[$ix]; [void]$body.Append('<li><a href="/encyclopedia/' + $o.slug + '">' + $(if ($o.img) { '<img src="' + (ThumbOf $o.img) + '" alt="" loading="lazy" width="44" height="44">' } else { (PhSpan $o) }) + '<span><span class="nm">' + (Hx $o.name) + '</span><span class="tp">' + (Hx $(if ($o.conflict) { TagLabel $o } else { $SING[$o.type] })) + '</span></span></a></li>') }
    [void]$body.Append("</ul></section>`n")
  }
  $pv = if ($e.i -gt 0) { $ENT[$e.i - 1] } else { $null }; $nx = if ($e.i -lt $NENT - 1) { $ENT[$e.i + 1] } else { $null }
  [void]$body.Append('<nav class="ref-prevnext" aria-label="Neighbouring entries">' + $(if ($pv) { '<a class="prev" rel="prev" href="/encyclopedia/' + $pv.slug + '"><span class="lbl">&larr; Previous entry</span><span class="nm">' + (Hx $pv.name) + '</span></a>' } else { '' }) +
    $(if ($nx) { '<a class="next" rel="next" href="/encyclopedia/' + $nx.slug + '"><span class="lbl">Next entry &rarr;</span><span class="nm">' + (Hx $nx.name) + '</span></a>' } else { '' }) + "</nav>`n")
  [void]$body.Append((CiteBox $e.name $url 'The Epoch Institute Encyclopedia') + "`n")
  [void]$body.Append('<p class="ref-updated"><span>Last reviewed ' + $Reviewed + '</span><a class="enc-random-link" href="/encyclopedia/" data-random="entry">Random entry &#8635;</a></p>' + "`n</article>`n</div>`n</main>`n")
  $kind = KindOf $e; $desc = [EpochBuild.W]::Summary($(if ($e.desc) { $e.desc } else { "$($e.name): an entry in The Epoch Institute Encyclopedia." }), 155)
  $tDates = if ($e.dates -and $e.dates.Length -le 16 -and $e.dates -match '^[\dc.r\s–\-BCEAD]+$' -and ($e.name.Length + $e.dates.Length) -le 48) { " ($($e.dates))" } else { '' }
  $ld = $crumb[1] + ',' + (ArticleLd $e.name $desc $path $ABOUT[$kind] $e.name $e.aka $imgLd)
  Emit $path (Page @{ title = "$($e.name)$tDates — Encyclopedia — The Epoch Institute"; desc = $desc; path = $path; type = 'article'; img = $e.img; imgW = $(if ($sz) { $sz[0] }); imgH = $(if ($sz) { $sz[1] }); ld = $ld; nav = 'encyclopedia'; body = $body.ToString() })
  if (($e.i % 2000) -eq 1999) { Say "  $($e.i + 1) entries" }
}
Say "entry pages: $NENT, gold links in descriptions: $nLinks"

# A-Z browse pages
$LETTERBAR = '<nav class="ref-letters" aria-label="Letters">' + (($LETTERS | ForEach-Object { if ($byLetter[$_].Count) { '<a href="/encyclopedia/browse/' + $_ + '">' + (LetterLabel $_) + '</a>' } else { '<span>' + (LetterLabel $_) + '</span>' } }) -join '') + '</nav>'
$nBrowse = 0
foreach ($L in $LETTERS) {
  $lst = $byLetter[$L]; if (-not $lst.Count) { continue }; $tot = [Math]::Ceiling($lst.Count / $PER)
  for ($pg = 1; $pg -le $tot; $pg++) {
    $path = '/encyclopedia/browse/' + $L + $(if ($pg -gt 1) { "-$pg" } else { '' }); $slice = @($lst | Select-Object -Skip (($pg - 1) * $PER) -First $PER)
    $lbl = LetterLabel $L; $range = $slice[0].name + ' – ' + $slice[-1].name
    $crumb = Crumbs @(@('Home', '/'), @('Encyclopedia', '/encyclopedia/'), @($lbl + $(if ($tot -gt 1) { " (page $pg of $tot)" } else { '' }), $null))
    $sb = New-Object Text.StringBuilder(40000)
    [void]$sb.Append('<main id="main" class="enc-page ref-page">' + "`n<div class=`"enc-wrap`">`n" + $crumb[0] + "`n")
    [void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Encyclopedia: ' + $lbl + '</h1><p class="ref-lede">' + $lst.Count.ToString('N0') + ' entries under ' + $lbl + $(if ($tot -gt 1) { " · page $pg of $tot" } else { '' }) + ': ' + (Hx $range) + "</p></header>`n")
    [void]$sb.Append(($LETTERBAR.Replace('href="/encyclopedia/browse/' + $L + '">', 'href="/encyclopedia/browse/' + $L + '" aria-current="page">')) + "`n<ul class=`"enc-list`">")
    foreach ($o in $slice) {
      [void]$sb.Append('<li class="enc-item' + $(if ($o.img) { ' has-img' } else { '' }) + '"><a href="/encyclopedia/' + $o.slug + '">' + $(if ($o.img) { '<img class="enc-thumb" src="' + (ThumbOf $o.img) + '" alt="" loading="lazy" width="56" height="56">' } else { '' }) +
        '<span class="enc-name">' + (Hx $o.name) + '</span><span class="enc-type">' + (Hx (TypeLine $o)) + '</span>' + $(if ($o.desc) { '<span class="enc-snip">' + (Hx ([EpochBuild.W]::FirstSentence($o.desc, 170))) + '</span>' } else { '' }) + '</a></li>')
    }
    [void]$sb.Append("</ul>`n" + (Pager ('/encyclopedia/browse/' + $L) $pg $tot) + "`n</div>`n</main>`n")
    $title = "Encyclopedia Index: $lbl" + $(if ($tot -gt 1) { ", Page $pg of $tot" } else { '' }) + ' — The Epoch Institute'
    $desc = [EpochBuild.W]::Summary("Encyclopedia entries $range" + ': people, places, events, states and ideas from The Epoch Institute''s profiles of states and empires.', 155)
    Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"url":' + (Js ($SITE + $path)) + ',"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"}}'); nav = 'encyclopedia'; body = $sb.ToString() })
    $nBrowse++
  }
}
# Conflicts & Resolutions by century
$CENTBAR = '<nav class="ref-letters ref-centuries" aria-label="Centuries">' + (($CENTORDER | ForEach-Object { '<a href="/encyclopedia/conflicts/' + (CenturySlug $_) + '">' + (Hx ($_ -replace ' century', ' c.')) + '</a>' }) -join '') + '</nav>'
foreach ($c in $CENTORDER) {
  $path = '/encyclopedia/conflicts/' + (CenturySlug $c); $lst = $CENT[$c]
  $crumb = Crumbs @(@('Home', '/'), @('Encyclopedia', '/encyclopedia/'), @('Conflicts & Resolutions', $null), @($(if ($c -eq 'Undated') { 'Undated' } else { $c.Substring(0, 1).ToUpperInvariant() + $c.Substring(1) }), $null))
  $heading = if ($c -eq 'Undated') { 'Undated conflicts and resolutions' } else { 'Conflicts and resolutions of the ' + $c }
  $sb = New-Object Text.StringBuilder(20000)
  [void]$sb.Append('<main id="main" class="enc-page ref-page">' + "`n<div class=`"enc-wrap`">`n" + $crumb[0] + "`n")
  [void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">' + (Hx $heading) + '</h1><p class="ref-lede">' + $lst.Count + ' battles, sieges, wars, revolts, crises, treaties and peace settlements, in date order.</p></header>' + "`n" + $CENTBAR.Replace('conflicts/' + (CenturySlug $c) + '">', 'conflicts/' + (CenturySlug $c) + '" aria-current="page">') + "`n")
  foreach ($g in $TAGS) {
    $items = @($lst | Where-Object { (TagGroup $_) -eq $g[0] } | Sort-Object @{ e = { $_.year } }, @{ e = { $_.i } })
    if (-not $items.Count) { continue }
    [void]$sb.Append('<section class="ref-group"><h2>' + (Hx $g[1]) + ' <span class="n">' + $items.Count + '</span></h2><ul class="enc-list">')
    foreach ($o in $items) { [void]$sb.Append('<li class="enc-item' + $(if ($o.img) { ' has-img' } else { '' }) + '"><a href="/encyclopedia/' + $o.slug + '">' + $(if ($o.img) { '<img class="enc-thumb" src="' + (ThumbOf $o.img) + '" alt="" loading="lazy" width="56" height="56">' } else { '' }) + '<span class="enc-name">' + (Hx $o.name) + '</span><span class="enc-type">' + (Hx (TypeLine $o)) + '</span>' + $(if ($o.desc) { '<span class="enc-snip">' + (Hx ([EpochBuild.W]::FirstSentence($o.desc, 170))) + '</span>' } else { '' }) + '</a></li>') }
    [void]$sb.Append("</ul></section>`n")
  }
  [void]$sb.Append("</div>`n</main>`n")
  $title = $(if ($c -eq 'Undated') { 'Undated Battles, Wars and Treaties' } else { 'Battles, Wars and Treaties of the ' + $c.Replace(' century', ' Century') }) + ' — The Epoch Institute'
  $desc = [EpochBuild.W]::Summary("$($lst.Count) battles, sieges, wars, revolts, crises and treaties " + $(if ($c -eq 'Undated') { 'without a firm date' } else { "of the $c" }) + ' in The Epoch Institute Encyclopedia, grouped by kind and in date order.', 155)
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"url":' + (Js ($SITE + $path)) + '}'); nav = 'encyclopedia'; body = $sb.ToString() })
  $nBrowse++
}
Say "encyclopedia browse pages: $nBrowse"

# index data for /encyclopedia/ (search, filters, random entry)
$typeIx = @{}; for ($i = 0; $i -lt $TYPES.Count; $i++) { $typeIx[$TYPES[$i][0]] = $i }
$sbI = New-Object Text.StringBuilder(4000000)
[void]$sbI.Append("// Generated by scripts/build-pages.ps1: the encyclopedia index for /encyclopedia/ (search, filters, random entry). Do not edit.`n")
[void]$sbI.Append('var ENC_INDEX = {types:' + '[' + (($TYPES | ForEach-Object { '[' + (Js $_[0]) + ',' + (Js $_[1]) + ',' + (Js $SING[$_[0]]) + ']' }) -join ',') + '],' + "`nrows:[`n")
for ($i = 0; $i -lt $NENT; $i++) { $e = $ENT[$i]; [void]$sbI.Append('[' + (Js $e.slug) + ',' + (Js $e.name) + ',' + $typeIx[(KindOf $e)] + ',' + (Js $e.dates) + ',' + (Js ($e.tags -join ' ')) + ',' + $(if ($e.img) { 1 } else { 0 }) + ',' + (Js (($e.aka | ForEach-Object { [string]$_ }) -join ' | ')) + ']' + $(if ($i -lt $NENT - 1) { ",`n" } else { "`n" })) }
[void]$sbI.Append("]};`n"); $idxText = $sbI.ToString(); $IDXV = [EpochBuild.W]::Sha1($idxText).Substring(0, 10)
if ([EpochBuild.W]::WriteIfChanged("$Repo\encyclopedia\index-data.js", $idxText)) { $NWRITE++ }
Say ("index-data.js: {0:N0} KB, v={1}" -f ($idxText.Length / 1KB), $IDXV)
# the counts the page shows before anyone searches (its type chips), so index-data.js loads only when it is needed
$tcount = @{}; for ($i = 0; $i -lt $NENT; $i++) { $kk = KindOf $ENT[$i]; $tcount[$kk] = 1 + [int]$tcount[$kk] }
SetBlock "$Repo\encyclopedia\index" 'enc-counts' ('<script>var ENC_COUNTS = {total:' + $NENT + ',types:[' + (($TYPES | ForEach-Object { '[' + (Js $_[0]) + ',' + (Js $_[1]) + ',' + (Js $SING[$_[0]]) + ',' + [int]$tcount[$_[0]] + ']' }) -join ',') + ']};</script>')

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# State pages
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'state pages'
$EMBLEM = @{
  crown = '<path d="M22 72 V40 L36 54 L50 28 L64 54 L78 40 V72 Z"/><path d="M22 80 H78"/><circle cx="50" cy="24" r="3"/><circle cx="22" cy="36" r="2.5"/><circle cx="78" cy="36" r="2.5"/>'
  coronet = '<path d="M20 74 H80 V60 H20 Z"/><path d="M20 60 Q35 46 50 60 Q65 46 80 60"/><circle cx="20" cy="54" r="3"/><circle cx="35" cy="48" r="3"/><circle cx="50" cy="44" r="3"/><circle cx="65" cy="48" r="3"/><circle cx="80" cy="54" r="3"/>'
  mitre = '<path d="M30 82 V46 Q50 12 70 46 V82 Z"/><path d="M50 30 V82 M40 58 H60"/>'
  tower = '<path d="M24 82 V42 H32 V34 H40 V42 H46 V34 H54 V42 H60 V34 H68 V42 H76 V82 Z"/><path d="M44 82 V66 Q50 58 56 66 V82"/><path d="M34 54 H40 M60 54 H66"/>'
  dome = '<path d="M24 82 V62 Q24 40 50 34 Q76 40 76 62 V82 Z"/><path d="M50 34 V24"/><path d="M53 13 A6 6 0 1 0 53 25 A4.5 4.5 0 1 1 53 13"/><path d="M38 82 V66 Q44 58 50 66 V82"/>'
  yurt = '<path d="M18 74 V58 Q50 30 82 58 V74 Z"/><path d="M42 74 V60 H58 V74"/><path d="M30 50 L50 36 L70 50"/><path d="M50 36 V26"/>'
  tribal = '<ellipse cx="44" cy="56" rx="16" ry="24"/><path d="M44 34 V78"/><path d="M68 20 V84"/><path d="M68 20 L63 30 H73 Z"/>'
  columns = '<path d="M20 38 L50 20 L80 38 Z"/><path d="M24 42 H76 M24 80 H76"/><path d="M30 44 V78 M43 44 V78 M57 44 V78 M70 44 V78"/>'
  ship = '<path d="M20 64 H80 L70 78 H30 Z"/><path d="M50 64 V18"/><path d="M50 22 L72 56 H50"/><path d="M50 28 L32 56 H50"/>'
  shield = '<path d="M26 24 H74 V52 Q74 74 50 84 Q26 74 26 52 Z"/><path d="M50 24 V84 M26 46 H74"/>'
}
function EmblemKind($n) {
  $t = [string]$n['t']; $m = [string]$n['m']
  if ($t -match 'nomadic|khanate|khaganate|horde') { return 'yurt' }; if ($t -match 'chiefdom|tribal') { return 'tribal' }; if ($t -match 'kingdom|princely-state') { return 'crown' }
  if ($t -match 'duchy|principality|county|margraviate|electorate|landgraviate|lordship|despotate') { return 'coronet' }; if ($t -match 'bishopric|theocracy|imamate') { return 'mitre' }
  if ($t -match 'city|polis|league') { return 'tower' }; if ($t -match 'sultanate|emirate|caliphate|beylik') { return 'dome' }; if ($t -match 'republic|commune|confederation') { return 'columns' }
  if ($t -match 'colony|protectorate|mandate|territory') { return 'ship' }
  $mm = @{ nomadic = 'yurt'; tribal = 'tribal'; theocratic = 'mitre'; colonial = 'ship'; mercantile = 'tower' }; if ($mm.ContainsKey($m)) { return $mm[$m] }; return 'shield'
}
function Rich([string]$t) {   # state texts: [[e:slug|text]] encyclopedia entry, [[s:id|text]] another state or empire
  if (-not $t) { return '' }
  $sb = New-Object Text.StringBuilder; $pos = 0
  foreach ($m in [regex]::Matches($t, '\[\[([es]):([^|\]]+)\|([^\]]*)\]\]')) {
    [void]$sb.Append((Hx $t.Substring($pos, $m.Index - $pos))); $id = $m.Groups[2].Value; $tx = Hx $m.Groups[3].Value
    if ($m.Groups[1].Value -eq 'e') { if ($BY.ContainsKey($id)) { [void]$sb.Append('<a class="enc-link" href="/encyclopedia/' + $id + '">' + $tx + '</a>') } else { [void]$sb.Append($tx) } }
    elseif ($NODE.ContainsKey($id)) { [void]$sb.Append('<a class="enc-link st-link" href="' + (StateUrl $NODE[$id]) + '">' + $tx + '</a>') } else { [void]$sb.Append($tx) }
    $pos = $m.Index + $m.Length
  }
  [void]$sb.Append((Hx $t.Substring($pos))); return $sb.ToString()
}
# locator map in a state page's sidebar: the state in gold, the states it was connected with as small dots
function StateLocator($n) {
  $id = [string]$n['id']; $p = $STATEXY[$id]; if (-not $p) { return '' }
  $vw = 64; $view = [double[]]@(($p[0] - $vw / 2), ($p[1] - $vw * 0.4), $vw, ($vw * 0.8))
  $ties = New-Object System.Collections.Generic.List[string]; $near = New-Object System.Collections.Generic.List[object]; $seenT = @{}
  foreach ($l in $ADJ[$id]) {
    $oid = if ([string]$l['s'] -eq $id) { [string]$l['t'] } else { [string]$l['s'] }
    if ($seenT.ContainsKey($oid)) { continue }; $seenT[$oid] = 1
    $q = $STATEXY[$oid]; if (-not $q -or $q[2]) { continue }
    $near.Add($q); $ties.Add('M' + (Fx $p[0]) + ' ' + (Fx $p[1]) + 'L' + (Fx $q[0]) + ' ' + (Fx $q[1]))
  }
  $inner = $(if ($ties.Count -and -not $p[2]) { '<path class="map-tie" d="' + ($ties -join '') + '"/>' } else { '' }) + (DotPath 'map-dot-n' $near) + (DotPath 'map-dot-halo' @(, $p)) + (DotPath $(if ($p[2]) { 'map-dot-ap' } else { 'map-dot-me' }) @(, $p))
  $mid = if ($null -eq $n['s']) { 1000 } else { [int][Math]::Round(([double]$n['s'] + $(if ($null -eq $n['e']) { $YEAR } else { [double]$n['e'] })) / 2) }
  $name = [string]$n['n']; $capName = if ($n['c']) { (([string]$n['c'] -split '[,;]')[0] -replace '\s*\([^)]*\)', '').Trim() } else { '' }
  $cap = switch ([int]$p[3]) { 9 { 'Location approximate: shown in present-day ' + (Hx ([string]@($n['mo'])[0])) + '.' }
    { $_ -in 0, 3 } { if ($capName) { 'The dot marks ' + (Hx $capName) + '.' } else { 'The dot marks its capital.' } }
    1 { 'The dot marks its recorded location.' } default { 'The dot marks its capital.' } }
  $href = '/atlas?year=' + $mid + '&amp;focus=' + $id
  return '<figure class="st-locator"><a href="' + $href + '" aria-label="' + (Hx "$name on the atlas") + '">' + (MapSvg $view $inner "Map: where $name lay" 'map-loc') + '</a><figcaption>' + $cap + ' <a href="' + $href + '">On the atlas &rarr;</a></figcaption></figure>'
}
$nState = 0; $redirects = New-Object System.Collections.Generic.List[string]
$REGIONS = [ordered]@{}; foreach ($rg in $REGION.Keys) { $REGIONS[$rg] = New-Object System.Collections.Generic.List[object] }
foreach ($n in $POL['nodes']) { $rg = [string]$n['rg']; if ($rg) { if (-not $REGIONS.Contains($rg)) { $REGIONS[$rg] = New-Object System.Collections.Generic.List[object] }; $REGIONS[$rg].Add($n) } }
foreach ($n in $POL['nodes']) {
  $id = [string]$n['id']
  if ($n['p']) { $redirects.Add('Redirect 301 /state/' + $id + ' ' + $SITE + $n['p']); continue }
  $d = $STX[$id]; if (-not $d) { $d = @{} }
  $path = '/state/' + $id; $url = $SITE + $path; $name = [string]$n['n']; $rg = [string]$n['rg']; $rgl = if ($rg) { RegionLabel $rg } else { [string]$n['b'] }
  $yrs = (Span $n) + $(if ($n['x']) { ' (approx.)' } else { '' })
  # lineage
  $preds = New-Object System.Collections.Generic.List[object]; $succs = New-Object System.Collections.Generic.List[object]
  foreach ($l in $ADJ[$id]) {
    $r = [string]$l['r']; $s = [string]$l['s']; $t = [string]$l['t']
    if ($r -eq 'successor-of' -and $s -eq $id) { $preds.Add($NODE[$t]) }; if ($r -eq 'successor-of' -and $t -eq $id) { $succs.Add($NODE[$s]) }
    if ($r -eq 'merged-into' -and $s -eq $id) { $succs.Add($NODE[$t]) }; if ($r -eq 'merged-into' -and $t -eq $id) { $preds.Add($NODE[$s]) }
    if ($r -eq 'split-from' -and $s -eq $id) { $preds.Add($NODE[$t]) }
  }
  $uniq = { param($a) $seenU = @{}; @($a | Where-Object { $k = [string]$_['id']; if ($seenU.ContainsKey($k)) { $false } else { $seenU[$k] = 1; $true } } | Sort-Object @{ e = { if ($null -eq $_['s']) { 0 } else { [double]$_['s'] } } }) }
  $preds = @(& $uniq $preds); $succs = @(& $uniq $succs)
  $col = { param($a) '<span class="col">' + ((@($a) | Select-Object -First 6 | ForEach-Object { '<a href="' + (StateUrl $_) + '">' + (Hx ([string]$_['n'])) + ' <span class="st-conf">' + (Hx (Span $_)) + '</span></a>' }) -join '') + '</span>' }
  $lineage = if ($preds.Count -or $succs.Count) { '<section><h2 class="st-sec-title">Lineage</h2><div class="st-lineage">' + $(if ($preds.Count) { (& $col $preds) + '<span class="arr" aria-hidden="true">&rarr;</span>' } else { '' }) + '<span class="here">' + (Hx $name) + '</span>' + $(if ($succs.Count) { '<span class="arr" aria-hidden="true">&rarr;</span>' + (& $col $succs) } else { '' }) + '</div></section>' } else { '' }
  # dated connections (ConnectionsMap.timeline), without the lineage
  $skip = @{}; foreach ($x in @($preds) + @($succs)) { if ($x) { $skip[[string]$x['id']] = 1 } }
  $tieRows = New-Object System.Collections.Generic.List[object]; $qq = 0
  foreach ($l in $ADJ[$id]) {
    $oid = if ([string]$l['s'] -eq $id) { [string]$l['t'] } else { [string]$l['s'] }; $o = $NODE[$oid]
    $f = $l['f']; $u = $l['u']
    if ([string]$l['r'] -eq 'successor-of' -and $null -eq $f -and $null -ne $NODE[[string]$l['s']]['s']) { $f = $NODE[[string]$l['s']]['s']; if ($null -eq $u) { $u = $f } }
    if ($null -eq $f) { $f = [Math]::Max($(if ($null -eq $n['s']) { -1e9 } else { [double]$n['s'] }), $(if ($null -eq $o['s']) { -1e9 } else { [double]$o['s'] })) }
    if ($null -eq $u) { $u = [Math]::Min($(if ($null -eq $n['e']) { 2030 } else { [double]$n['e'] }), $(if ($null -eq $o['e']) { 2030 } else { [double]$o['e'] })) }
    if ([double]$f -le -1e9) { $f = $u }
    if ($skip.ContainsKey($oid)) { continue }
    $sent = [string]$NODE[[string]$l['s']]['n'] + ' ' + $(if ($REL.ContainsKey([string]$l['r'])) { $REL[[string]$l['r']] } else { [string]$l['r'] }) + ' ' + [string]$NODE[[string]$l['t']]['n']
    $tieRows.Add([pscustomobject]@{ o = $o; name = [string]$o['n']; sent = $sent; f = [double]$f; u = [Math]::Max([double]$u, [double]$f); q = $qq++ })
  }
  $tieRows = @($tieRows | Sort-Object @{ e = { $_.f } }, @{ e = { $_.q } })
  $ties = ''
  if ($tieRows.Count) {
    $sbT = New-Object Text.StringBuilder; [void]$sbT.Append('<section><h2 class="st-sec-title">Connections (' + $tieRows.Count + ')</h2><ul class="st-ties">')
    foreach ($r in ($tieRows | Select-Object -First 60)) {
      $s = Hx $r.sent; $nm = Hx $r.name; $ix = $s.LastIndexOf($nm); if ($ix -ge 0) { $s = $s.Substring(0, $ix) + '<a href="' + (StateUrl $r.o) + '">' + $nm + '</a>' + $s.Substring($ix + $nm.Length) }
      [void]$sbT.Append('<li><span>' + $s + '</span><span class="dt">' + $(if ($r.f -eq $r.u) { Yr $r.f } else { (Yr $r.f) + ' – ' + (Yr $r.u) }) + '</span></li>')
    }
    [void]$sbT.Append('</ul>'); if ($tieRows.Count -gt 60) { [void]$sbT.Append('<p class="st-conf">' + ($tieRows.Count - 60) + ' more on the <a href="/connections#' + $id + '">connections map</a>.</p>') }
    $ties = $sbT.Append('</section>').ToString()
  }
  # figure or emblem
  $img = [string]$d['img']; $sz = $null; $imgLd = $null
  if ($img -and (Test-Path (Join-Path $Repo ($img.TrimStart('/') -replace '/', '\')))) {
    $sz = ImgSize $img; $cr = $d['cr']; $a = if ($cr) { [Net.WebUtility]::HtmlDecode([string]$cr['a']) } else { '' }; $lic = if ($cr) { [string]$cr['l'] } else { '' }; $src = if ($cr) { [string]$cr['s'] } else { '' }
    $fig = '<figure class="st-fig"><img src="' + $img + '" alt="' + (Hx $name) + '"' + $(if ($sz) { ' width="' + $sz[0] + '" height="' + $sz[1] + '"' } else { ' width="320"' }) + '><figcaption>' +
      ((@(('Image: ' + $(if ($a) { Hx $a } else { 'Wikimedia Commons' })), $(if ($lic) { Hx $lic })) | Where-Object { $_ }) -join ' · ') + $(if ($src) { ' · <a href="' + (Hx $src) + '" target="_blank" rel="noopener">source</a>' } else { '' }) + '</figcaption></figure>'
    $imgLd = ImageLd $img $(if ($sz) { $sz[0] }) $(if ($sz) { $sz[1] }) $a $lic $src
  } else {
    $img = ''; $lo = -3000; $hi = 2025; $s0 = if ($null -eq $n['s']) { $lo } else { [Math]::Max($lo, [double]$n['s']) }; $e0 = if ($null -eq $n['e']) { $hi } else { [Math]::Min($hi, [double]$n['e']) }
    $left = ($s0 - $lo) / ($hi - $lo) * 100; $width = [Math]::Max(1.2, ($e0 - $s0) / ($hi - $lo) * 100)
    $fig = '<div class="st-emblem" role="img" aria-label="' + (Hx ((TypeLabel $n['t']) + ', ' + $yrs)) + '"><svg viewBox="0 0 100 100" aria-hidden="true">' + $EMBLEM[(EmblemKind $n)] + '</svg>' +
      '<p class="st-emblem-type">' + (Hx (TypeLabel $n['t'])) + '</p><p class="st-emblem-region">' + (Hx $rgl) + '</p>' +
      '<div class="st-span" aria-hidden="true"><span class="st-span-bar" style="left:' + $left.ToString('0.00', [Globalization.CultureInfo]::InvariantCulture) + '%;width:' + $width.ToString('0.00', [Globalization.CultureInfo]::InvariantCulture) + '%"></span></div>' +
      '<div class="st-span-axis" aria-hidden="true"><span>3000 BCE</span><span>1 CE</span><span>2000</span></div></div>'
  }
  $c1 = CentOf $n['s']; $c2 = if ($null -eq $n['e']) { Century $YEAR } else { CentOf $n['e'] }
  $centDd = if (-not $c1) { '' } elseif ($c1 -eq $c2) { CentLink $c1 } else { (CentLink $c1) + ' – ' + (CentLink $c2) }
  $facts = '<dl class="st-facts"><dt>Years</dt><dd>' + (Hx $yrs) + '</dd>' + $(if ($centDd) { '<dt>' + $(if ($c1 -eq $c2) { 'Century' } else { 'Centuries' }) + '</dt><dd>' + $centDd + '</dd>' } else { '' }) +
    '<dt>Type</dt><dd>' + (Hx (TypeLabel $n['t'])) + '</dd>' + $(if ($n['m']) { '<dt>Character</dt><dd>' + (Hx ([string]$n['m'])) + '</dd>' } else { '' }) +
    $(if ($n['c']) { '<dt>Capital</dt><dd>' + (Hx ([string]$n['c'])) + '</dd>' } else { '' }) + $(if ($d['ru'] -and @($d['ru']).Count) { '<dt>Rulers</dt><dd>' + (Hx ((@($d['ru']) | ForEach-Object { [string]$_ }) -join ', ')) + '</dd>' } else { '' }) +
    $(if ($d['re']) { '<dt>Religion</dt><dd>' + (Hx ([string]$d['re'])) + '</dd>' } else { '' }) + $(if ($d['la']) { '<dt>Language</dt><dd>' + (Hx ([string]$d['la'])) + '</dd>' } else { '' }) +
    $(if ($n['mo'] -and @($n['mo']).Count) { '<dt>Today</dt><dd>' + ((@($n['mo']) | ForEach-Object { CountryLink ([string]$_) }) -join ', ') + '</dd>' } else { '' }) +
    $(if ($n['a'] -and @($n['a']).Count) { '<dt>Also</dt><dd>' + (Hx ((@($n['a']) | ForEach-Object { [string]$_ }) -join ', ')) + '</dd>' } else { '' }) + '</dl>'
  $locator = StateLocator $n
  $text = if ($d['o']) { '<h2>Origins</h2><p>' + (Rich ([string]$d['o'])) + '</p><h2>Rule and society</h2><p>' + (Rich ([string]$d['r'])) + '</p><h2>' + $(if ($null -eq $n['e']) { 'To the present' } else { 'Decline and legacy' }) + '</h2><p>' + (Rich ([string]$d['e'])) + '</p>' + $(if ([string]$d['c'] -eq 'low') { '<p class="st-conf">Few sources survive for this state; details are uncertain.</p>' } else { '' }) }
          else { '<p class="st-pending">A written history of this state is in preparation. Its dates, connections and lineage are below.</p>' }
  $crumb = Crumbs @(@('Home', '/'), @('States', '/state/'), @($rgl, $(if ($rg) { '/state/browse/' + $rg } else { $null })), @($name, $null))
  $body = '<main id="main" class="st-page ref-page">' + "`n<div class=`"st-wrap`">`n" + $crumb[0] + "`n<article class=`"st-article`">`n" +
    '<header><p class="st-kicker">' + (Hx (TypeLabel $n['t'])) + ' · ' + (Hx $rgl) + '</p><h1 class="st-title">' + (Hx $name) + '</h1><p class="st-meta">' + (Hx $yrs) + $(if ($n['c']) { ' · capital ' + (Hx ([string]$n['c'])) } else { '' }) + "</p></header>`n" +
    $(if ($d['t']) { '<p class="st-teaser">' + (Hx ([string]$d['t'])) + "</p>`n" } else { '' }) +
    '<div class="st-body"><div class="st-text">' + $text + '</div><aside class="st-side">' + $fig + $facts + $locator + "</aside></div>`n" + $lineage + "`n" +
    '<section class="st-mapwrap" id="connections" hidden><h2 class="st-sec-title">On the connections map</h2><div class="cx-map" id="st-map" data-id="' + $id + '"></div><a class="st-maplink" href="/connections#' + $id + '">Open the full map &rarr;</a></section>' + "`n" + $ties + "`n" +
    $(if ($rg) { '<p class="enc-article-foot"><a class="enc-random-link" href="/state/browse/' + $rg + '">More states of ' + (Hx $rgl) + ' &rarr;</a></p>' + "`n" } else { '' }) +
    (CiteBox $name $url 'The Epoch Institute States Register') + "`n" +
    '<p class="ref-updated"><span>Last reviewed ' + $Reviewed + '</span><a class="enc-random-link" href="/state/" data-random="state">Random state &#8635;</a></p>' + "`n</article>`n</div>`n</main>`n"
  $teaser = if ($d['t']) { [string]$d['t'] } else { "$name ($yrs): a $(TypeLabel $n['t']) of $rgl, with its lineage and connections." }
  $desc = [EpochBuild.W]::Summary($teaser, 155)
  $ld = $crumb[1] + ',' + (ArticleLd $name $desc $path 'Country' $name @($n['a'] | Where-Object { $_ }) $imgLd)
  $tYears = SpanShort $n['s'] $n['e']
  Emit $path (Page @{ title = "$name$(if ($tYears) { " ($tYears)" }) — States — The Epoch Institute"; desc = $desc; path = $path; type = 'article'; img = $img; imgW = $(if ($sz) { $sz[0] }); imgH = $(if ($sz) { $sz[1] }); ld = $ld; nav = 'states'; body = $body })
  $nState++; if (($nState % 1000) -eq 0) { Say "  $nState states" }
}
Say "state pages: $nState, redirects to profiles: $($redirects.Count)"
$ht = "# Generated by scripts/build-pages.ps1. State pages are extensionless HTML; states that have a full profile live at /empire/<slug>.`n<FilesMatch `"^[a-z0-9-]+$`">`n  ForceType text/html`n</FilesMatch>`n" + ($redirects -join "`n") + "`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\state\.htaccess", $ht)) { $NWRITE++ }; $WROTE["$Repo\state\.htaccess".ToLowerInvariant()] = 1
# states by region
$REGIONBAR = '<nav class="ref-letters ref-regions" aria-label="Regions">' + (($REGIONS.Keys | Where-Object { $REGIONS[$_].Count } | ForEach-Object { '<a href="/state/browse/' + $_ + '">' + (Hx (RegionLabel $_)) + '</a>' }) -join '') + '</nav>'
foreach ($rg in @($REGIONS.Keys)) {
  $lst = @($REGIONS[$rg] | Sort-Object @{ e = { if ($null -eq $_['s']) { -1e9 } else { [double]$_['s'] } } }, @{ e = { [string]$_['n'] } }); if (-not $lst.Count) { continue }
  $path = '/state/browse/' + $rg; $rgl = RegionLabel $rg
  $crumb = Crumbs @(@('Home', '/'), @('States', '/state/'), @($rgl, $null))
  $sb = New-Object Text.StringBuilder(60000)
  [void]$sb.Append('<main id="main" class="st-page ref-page">' + "`n<div class=`"st-wrap`">`n" + $crumb[0] + "`n")
  $from = Yr $lst[0]['s']
  [void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">States of ' + (Hx $rgl) + '</h1><p class="ref-lede">' + $lst.Count + ' kingdoms, principalities, republics, chiefdoms and other states, in order of their founding.</p></header>' + "`n")
  [void]$sb.Append($REGIONBAR.Replace('browse/' + $rg + '">', 'browse/' + $rg + '" aria-current="page">') + "`n")
  $cur = $null
  foreach ($n in $lst) {
    $c = if ($null -eq $n['s']) { 'Undated' } else { Century ([int][Math]::Round([double]$n['s'])) }
    if ($c -ne $cur) { if ($cur) { [void]$sb.Append('</ul></section>') }; [void]$sb.Append('<section class="ref-group"><h2>' + (Hx ($c.Substring(0, 1).ToUpperInvariant() + $c.Substring(1))) + '</h2><ul class="st-list">'); $cur = $c }
    [void]$sb.Append('<li class="st-item"><a href="' + (StateUrl $n) + '"><span class="st-name">' + (Hx ([string]$n['n'])) + '</span><span class="st-yrs">' + (Hx (Span $n)) + '</span><span class="st-sub"><b>' + $(if ($n['p']) { 'profile' } else { Hx (TypeLabel $n['t']) }) + '</b>' + $(if ($n['mo'] -and @($n['mo']).Count) { ' · today ' + (Hx ((@($n['mo']) | Select-Object -First 3 | ForEach-Object { [string]$_ }) -join ', ')) } else { '' }) + '</span></a></li>')
  }
  [void]$sb.Append("</ul></section>`n</div>`n</main>`n")
  $title = "States of $rgl`: $($lst.Count) Historical States — The Epoch Institute"
  $desc = [EpochBuild.W]::Summary("$($lst.Count) historical states of $rgl, from $from to the present: kingdoms, principalities, republics and more, each with a short history, lineage and connections.", 155)
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"url":' + (Js ($SITE + $path)) + '}'); nav = 'states'; body = $sb.ToString() })
}
Say 'state region pages done'

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Today in History: one page per day
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$INTL = ReadJson "$Repo\data\international-days.json"   # ($HIST was read for the years)
$DAYS = @($HIST.Keys | Sort-Object)
function DaySlug([string]$k) { $MONTHS[[int]$k.Substring(0, 2) - 1].ToLowerInvariant() + '-' + [int]$k.Substring(3, 2) }
function DayLabel([string]$k) { "$([int]$k.Substring(3, 2)) $($MONTHS[[int]$k.Substring(0, 2) - 1])" }
function MonthCal([int]$mo, [string]$curKey) {
  $sb = New-Object Text.StringBuilder; [void]$sb.Append('<div class="day-cal-month"><h3>' + $MONTHS[$mo - 1] + '</h3><ol class="day-cal">')
  foreach ($k in ($DAYS | Where-Object { [int]$_.Substring(0, 2) -eq $mo })) { $dn = [int]$k.Substring(3, 2); if ($k -eq $curKey) { [void]$sb.Append('<li><span aria-current="page">' + $dn + '</span></li>') } else { [void]$sb.Append('<li><a href="/today-in-history/' + (DaySlug $k) + '">' + $dn + '</a></li>') } }
  return $sb.Append('</ol></div>').ToString()
}
# the event's picture: an entry its title names first (Chaucer's portrait for "Geoffrey Chaucer dies in London"),
# then its own linked entries
function EvImg($ev, $titleSlugs) {
  foreach ($s in @($titleSlugs)) { if ($s -and $BY.ContainsKey($s) -and $BY[$s].img) { return , @([string]$BY[$s].img, [string]$s) } }
  foreach ($lk in @($ev['links'])) { if ($lk -and $BY.ContainsKey([string]$lk[0]) -and $BY[[string]$lk[0]].img) { return , @([string]$BY[[string]$lk[0]].img, [string]$lk[0]) } }
  return $null
}
function LinkedSlugs([string]$html) { @([regex]::Matches($html, 'href="/encyclopedia/([^"]+)"') | ForEach-Object { $_.Groups[1].Value }) }
function YearsAgo([double]$y) { [int]($YEAR - $y - $(if ($y -lt 0) { 1 } else { 0 })) }   # no year 0: 49 BCE to 2026 is 2,074 years
# Born and died on this day: scripts/day-people.tsv (mm-dd, b or d, year, slug), Wikipedia's "On this day" births and
# deaths kept only where Wikidata gives the same day and the entry the same year (scratchpad days\r3-people.js)
$DAYPPL = @{}
if (Test-Path "$Repo\scripts\day-people.tsv") {
  foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\day-people.tsv", $U8)) {
    if (-not $l -or $l.StartsWith('#')) { continue }; $c = $l.Split("`t"); if ($c.Count -lt 4 -or -not $BY.ContainsKey($c[3])) { continue }
    if (-not $DAYPPL.ContainsKey($c[0])) { $DAYPPL[$c[0]] = New-Object Collections.Generic.List[object] }
    $DAYPPL[$c[0]].Add([pscustomobject]@{ k = $c[1]; y = [int]$c[2]; o = $BY[$c[3]] })
  }
}
# the 12 best known (profiles that mention them, a picture) in year order, the rest folded
function DayPplList($rows) {
  $top = @($rows | Sort-Object @{ e = { $_.o.emp.Count * 3 + $(if ($_.o.img) { 4 } else { 0 }) }; Descending = $true }, @{ e = { $_.y } } | Select-Object -First 12 | Sort-Object y)
  $rest = @($rows | Where-Object { $top -notcontains $_ } | Sort-Object y)
  $li = { param($r) '<li><a href="/encyclopedia/' + $r.o.slug + '">' + $(if ($r.o.img) { '<img src="' + (ThumbOf $r.o.img) + '" alt="" loading="lazy" width="44" height="44">' } else { (PhSpan $r.o) }) + '<span><span class="nm">' + (Hx $r.o.name) + '</span><span class="tp">' + (Hx ([string]$r.o.dates)) + '</span></span></a></li>' }
  $h = '<ul class="enc-seealso">' + (($top | ForEach-Object { & $li $_ }) -join '') + '</ul>'
  if ($rest.Count) { $h += '<details class="cen-all"><summary>Show ' + $rest.Count + ' more</summary><ul class="enc-seealso">' + (($rest | ForEach-Object { & $li $_ }) -join '') + '</ul></details>' }
  $h
}
New-Item -ItemType Directory -Force "$Repo\data\days" | Out-Null
$daysAll = New-Object Text.StringBuilder; $nDayPics = 0; $nDayLinks = 0
for ($di = 0; $di -lt $DAYS.Count; $di++) {
  $k = $DAYS[$di]; $evs = @($HIST[$k] | Sort-Object @{ e = { [double]$_['year'] } }); $lbl = DayLabel $k; $path = '/today-in-history/' + (DaySlug $k)
  # the descriptions are linked with the encyclopedia's patterns, compiled only in full builds: -SkipEntries keeps the
  # day pages (and data/days) as they are, like the entry pages
  if ($SkipEntries) { $WROTE[(Join-Path $Repo ('today-in-history\' + (DaySlug $k))).ToLowerInvariant()] = 1; $SMNEW[$path] = if ($SM.ContainsKey($path)) { $SM[$path] } else { @('', $TODAY) }; continue }
  $pk = $DAYS[($di - 1 + $DAYS.Count) % $DAYS.Count]; $nk = $DAYS[($di + 1) % $DAYS.Count]
  $crumb = Crumbs @(@('Home', '/'), @('Today in History', '/today-in-history/'), @($lbl, $null))
  # each event's description with gold links (its year decides between entries of one name), and the entries its title names
  $DH = New-Object string[] $evs.Count; $TS = New-Object object[] $evs.Count
  for ($ei = 0; $ei -lt $evs.Count; $ei++) {
    $yr = [double]$evs[$ei]['year']; $cx = @($yr, $yr)
    $DH[$ei] = LinkDesc ([string]$evs[$ei]['description']) '' $cx; $nDayLinks += ([regex]::Matches($DH[$ei], 'class="enc-link"')).Count
    $TS[$ei] = LinkedSlugs (LinkDesc ([string]$evs[$ei]['title']) '' $cx)
  }
  # the day's anniversary piece: the roundest centenary, else half-century, else quarter, else the oldest event
  $hero = $null; $heroScore = -1; $heroIdx = -1
  for ($ei = 0; $ei -lt $evs.Count; $ei++) {
    $ago = YearsAgo ([double]$evs[$ei]['year']); if ($ago -le 0) { continue }
    $sc = if ($ago % 100 -eq 0) { 300 } elseif ($ago % 50 -eq 0) { 200 } elseif ($ago % 25 -eq 0) { 100 } else { 0 }
    if ((EvImg $evs[$ei] $TS[$ei])) { $sc += 10 }
    if ($sc -gt $heroScore) { $heroScore = $sc; $hero = $evs[$ei]; $heroIdx = $ei }
  }
  $heroImg = if ($hero) { EvImg $hero $TS[$heroIdx] } else { $null }; if ($heroImg) { $nDayPics++ }
  $sb = New-Object Text.StringBuilder(20000)
  [void]$sb.Append('<main id="main" class="day-page ref-page">' + "`n<div class=`"day-wrap`">`n" + $crumb[0] + "`n")
  [void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">' + $lbl + ' in history</h1><p class="ref-lede">' + $evs.Count + ' events that happened on ' + $lbl + ', from ' + (Hx ([string]$evs[0]['yearDisplay'])) + ' to ' + (Hx ([string]$evs[-1]['yearDisplay'])) + ".</p></header>`n")
  $intlDay = $INTL[$k]
  if ($intlDay) { [void]$sb.Append('<div class="tih-pinned-card"><p class="tih-pinned-label">International day</p><p class="tih-pinned-title">' + (Hx ([string]$intlDay['name'])) + '</p><p class="tih-pinned-desc">' + (Hx ([string]$intlDay['description'])) + "</p></div>`n") }
  [void]$sb.Append('<ol class="day-events">')
  $ej = New-Object Collections.Generic.List[string]   # the same day for the home page strip and the Today in History page
  for ($ei = 0; $ei -lt $evs.Count; $ei++) {
    $ev = $evs[$ei]; $evTags = ''; $lkJs = New-Object Collections.Generic.List[string]
    if ($ev['profile']) { $evTags += '<a class="tih-tag tih-tag-profile" href="' + (Hx ([string]$ev['profile'][1])) + '">' + (Hx ([string]$ev['profile'][0])) + '</a>' }
    foreach ($lk in @($ev['links'])) { if ($lk -and $BY.ContainsKey([string]$lk[0])) { $evTags += '<a class="tih-tag enc-link" href="/encyclopedia/' + $lk[0] + '">' + (Hx ([string]$lk[1])) + '</a>'; $lkJs.Add('[' + (Js ([string]$lk[0])) + ',' + (Js ([string]$lk[1])) + ']') } }
    $ago = YearsAgo ([double]$ev['year'])
    $isHero = ($ei -eq $heroIdx)
    $im = if ($isHero) { $heroImg } else { $null }   # one strong picture per day: only the anniversary card
    $yd = [string]$ev['yearDisplay']; if ($yd -match '^\d+$') { $yd += ' CE' }   # bare years read as CE, like everywhere else
    $thumb = if ($im) { '<a class="tih-event-thumb" href="/encyclopedia/' + $im[1] + '" tabindex="-1" aria-hidden="true"><img src="' + (Hx $im[0]) + '" alt="" loading="lazy" width="168" height="112"></a>' } else { '' }
    [void]$sb.Append('<li class="tih-event-card' + $(if ($im) { ' tih-has-thumb' } else { '' }) + $(if ($isHero) { ' tih-event-hero' } else { '' }) + '">' + $(if ($isHero) { '<p class="tih-hero-kicker">&#10022; Anniversary of the day</p>' } else { '' }) + $thumb + '<div class="tih-event-main"><p class="tih-event-year">' + $(if ($YEARSET.Contains([int][Math]::Round([double]$ev['year']))) { '<a href="' + (YearHref ([int][Math]::Round([double]$ev['year']))) + '">' + (Hx $yd) + '</a>' } else { Hx $yd }) + $(if ($ago -gt 0) { ' <span class="tih-ago">' + $ago.ToString('N0', $INV) + ' years ago</span>' } else { '' }) + '</p><h2 class="tih-event-title">' + (Hx ([string]$ev['title'])) + '</h2><p class="tih-event-desc">' + $DH[$ei] + '</p>' + $(if ($evTags) { '<div class="tih-tags">' + $evTags + '</div>' } else { '' }) + '</div></li>')
    $ej.Add('{"year":' + ([double]$ev['year']).ToString($INV) + ',"yearDisplay":' + (Js $yd) + ',"title":' + (Js ([string]$ev['title'])) + ',"description":' + (Js ([string]$ev['description'])) + ',"html":' + (Js $DH[$ei]) + ',"links":[' + ($lkJs -join ',') + ']' + $(if ($ev['profile']) { ',"profile":[' + (Js ([string]$ev['profile'][0])) + ',' + (Js ([string]$ev['profile'][1])) + ']' } else { '' }) + '}')
  }
  [void]$sb.Append("</ol>`n")
  if ($DAYPPL.ContainsKey($k)) {
    $bo = @($DAYPPL[$k] | Where-Object { $_.k -eq 'b' }); $de = @($DAYPPL[$k] | Where-Object { $_.k -eq 'd' })
    if ($bo.Count) { [void]$sb.Append('<section class="day-ppl" aria-labelledby="day-born"><h2 class="ref-sec-title" id="day-born">Born on ' + $lbl + ' <span class="n">' + $bo.Count + '</span></h2>' + (DayPplList $bo) + "</section>`n") }
    if ($de.Count) { [void]$sb.Append('<section class="day-ppl" aria-labelledby="day-died"><h2 class="ref-sec-title" id="day-died">Died on ' + $lbl + ' <span class="n">' + $de.Count + '</span></h2>' + (DayPplList $de) + "</section>`n") }
    [void]$sb.Append('<p class="day-ppl-note">Dates as the sources give them: in the Julian calendar before 1582, and in some countries for longer (Britain until 1752, Russia until 1918). Only people whose day of birth or death the records agree on are listed.</p>' + "`n")
  }
  # data/days/<mm-dd>.json: one day for the home page strip and the Today in History page (not the whole year)
  $dayJs = '{"k":' + (Js $k) + ',"events":[' + ($ej -join ',') + '],"hero":' + $heroIdx + ',"pic":' + $(if ($heroImg) { '[' + (Js $heroImg[0]) + ',' + (Js $heroImg[1]) + ']' } else { 'null' }) + ',"intl":' + $(if ($intlDay) { '{"name":' + (Js ([string]$intlDay['name'])) + ',"description":' + (Js ([string]$intlDay['description'])) + '}' } else { 'null' }) + "}`n"
  if ([EpochBuild.W]::WriteIfChanged("$Repo\data\days\$k.json", $dayJs)) { $NWRITE++ }
  [void]$daysAll.Append($dayJs)
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Neighbouring days"><a class="prev" rel="prev" href="/today-in-history/' + (DaySlug $pk) + '"><span class="lbl">&larr; Previous day</span><span class="nm">' + (DayLabel $pk) + '</span></a><a class="next" rel="next" href="/today-in-history/' + (DaySlug $nk) + '"><span class="lbl">Next day &rarr;</span><span class="nm">' + (DayLabel $nk) + "</span></a></nav>`n")
  [void]$sb.Append('<section class="day-cal-wrap" aria-label="Other days of ' + $MONTHS[[int]$k.Substring(0, 2) - 1] + '">' + (MonthCal ([int]$k.Substring(0, 2)) $k) + '<p><a class="enc-random-link" href="/today-in-history/">All days of the year &rarr;</a></p></section>' + "`n</div>`n</main>`n")
  $title = "What Happened on $lbl in History — The Epoch Institute"
  $desc = [EpochBuild.W]::Summary("On this day, $lbl" + ': ' + ((@($evs | Select-Object -First 3 | ForEach-Object { [string]$_['yearDisplay'] + ', ' + [string]$_['title'] })) -join '; ') + '.', 155)
  $ogD = '/images/og/day-' + (DaySlug $k) + '.jpg'
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; img = $(if (Test-Path (Join-Path $Repo ($ogD.TrimStart('/') -replace '/', '\'))) { $ogD }); imgW = 1200; imgH = 630; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + '}'); nav = 'today'; body = $sb.ToString() })
}
# the day files' version, stamped into the two pages that read them (var DAYS_V = '...')
if (-not $SkipEntries) {
  $DAYSV = [EpochBuild.W]::Sha1($daysAll.ToString()).Substring(0, 10)
  foreach ($f in @("$Repo\index", "$Repo\today-in-history\index")) {
    $t = [IO.File]::ReadAllText($f, $U8); $t2 = [regex]::Replace($t, "var DAYS_V(\s*)= '[0-9a-f]*'", "var DAYS_V`$1= '$DAYSV'")
    if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged($f, $t2)) { $NWRITE++ }
  }
  Say "day pages: $($DAYS.Count), day pictures: $nDayPics, gold links in day events: $nDayLinks"
} else { Say 'day pages: kept (-SkipEntries)' }

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Profiles (shared-data.js EMPIRES, epoch-stats.js) and shared pieces for the country and century pages
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$sdText = [IO.File]::ReadAllText("$Repo\shared-data.js", $U8); $i0 = $sdText.IndexOf('const EMPIRES = ') + 16; $i1 = $sdText.IndexOf('];', $i0)
$EMPS = $JSS.DeserializeObject($sdText.Substring($i0, $i1 - $i0 + 1)); $sdText = $null
$EMPURL = @{}; foreach ($em in $EMPS) { $EMPURL[(ProfUrl ([string]$em['name']))] = $em }
# the profiles with a power curve (states and empires): the century powers, the open data, the curve samples
$POLS = @($EMPS | Where-Object { $_['points'] })
# search-profiles.js: the profiles for the header search on the generated pages (they no longer load shared-data.js)
$spb = New-Object Text.StringBuilder
[void]$spb.Append("// Generated by scripts/build-pages.ps1 - the profiles for the header search on pages without shared-data.js.`nconst SEARCH_PROFILES=[`n")
foreach ($em in $EMPS) {
  $nm = [string]$em['name']
  $sub = if ($em['subtype']) { [string]$em['subtype'] } elseif ($em['kind']) { @{ religion = 'Religion'; language = 'Language'; culture = 'Culture'; movement = 'Movement'; ideology = 'Ideology' }[[string]$em['kind']] } else {
    $m = [regex]::Match($nm, '\b(Empire|Caliphate|Sultanate|Dynasty|Kingdom|Khaganate|Khanate|Confederation|Shogunate|Commonwealth|Ilkhanate)\b')
    if ($m.Success) { $m.Groups[1].Value.Replace('Ilkhanate', 'Khanate') } else { 'State' }
  }
  [void]$spb.Append('[' + (Js $nm) + ',' + (Js (ProfUrl $nm)) + ',' + (Js $sub) + "],`n")
}
[void]$spb.Append("];`n")
if ([EpochBuild.W]::WriteIfChanged("$Repo\search-profiles.js", $spb.ToString())) { $NWRITE++ }
$STATS = @{}; foreach ($m in [regex]::Matches([IO.File]::ReadAllText("$Repo\epoch-stats.js", $U8), "(?m)^\s*'((?:[^'\\]|\\.)*)':\s*\{\s*rank:(\d+),\s*overall:([\d.]+)")) { $STATS[($m.Groups[1].Value -replace "\\'", "'")] = @([int]$m.Groups[2].Value, [double]$m.Groups[3].Value) }
$LOGO = @{}; foreach ($f in Get-ChildItem "$Repo\logos\thumbs" -Filter *.png) { $LOGO[$f.BaseName] = 1 }
function PeakYear($em) { $best = -1; $yr = $null; foreach ($pt in $em['points']) { if ([double]$pt[1] -gt $best) { $best = [double]$pt[1]; $yr = [double]$pt[0] } }; return $yr }
function PowerAt($em, [double]$y) {   # the profile's power curve (0-10, scaled to its own peak) at year y; 0 outside its years
  $pts = $em['points']; if ($y -lt [double]$pts[0][0] -or $y -gt [double]$pts[-1][0]) { return 0 }
  for ($i = 1; $i -lt $pts.Count; $i++) { $x1 = [double]$pts[$i][0]; if ($y -le $x1) { $x0 = [double]$pts[$i - 1][0]; $v0 = [double]$pts[$i - 1][1]; $v1 = [double]$pts[$i][1]; if ($x1 -eq $x0) { return $v1 }; return $v0 + ($v1 - $v0) * ($y - $x0) / ($x1 - $x0) } }
  return [double]$pts[-1][1]
}
# weight as a great power of a century: military, territorial, economic and historical weight (epoch-stats.js), times
# the share of the century it existed, times its strength then (its curve is scaled to its own peak, so this counts less)
$MIGHT = @{}
foreach ($m in [regex]::Matches([IO.File]::ReadAllText("$Repo\epoch-stats.js", $U8), "(?m)^\s*'((?:[^'\\]|\\.)*)':\s*\{\s*rank:\d+,\s*overall:[\d.]+,\s*tags:\[[^\]]*\],\s*stats:\{([^}]*)\}")) {
  $kv = @{}; foreach ($p in [regex]::Matches($m.Groups[2].Value, '(\w+):([\d.]+)')) { $kv[$p.Groups[1].Value] = [double]$p.Groups[2].Value }
  $MIGHT[($m.Groups[1].Value -replace "\\'", "'")] = ([double]$kv['militaryPower'] + [double]$kv['territorialReach'] + [double]$kv['economicStrength'] + [double]$kv['historicalInfluence']) / 4
}
function CenturyWeight($em, $rg) {
  $sum = 0; $alive = 0; for ($k = 0; $k -lt 10; $k++) { $v = PowerAt $em ($rg[0] + 5 + $k * 10); $sum += $v; if ($v -gt 0) { $alive++ } }
  if (-not $alive) { return 0 }
  $mg = if ($MIGHT.ContainsKey([string]$em['name'])) { $MIGHT[[string]$em['name']] } else { 4 }
  return $mg * ($alive / 10) * (0.35 + 0.65 * ($sum / $alive) / 10)
}
function LogoImg([string]$name, [int]$size) {
  if ($LOGO.ContainsKey($name)) { return '<img class="pcard-logo" src="/logos/thumbs/' + [Uri]::EscapeDataString($name) + '.png" alt="" width="' + $size + '" height="' + $size + '" loading="lazy">' }
  return '<span class="pcard-logo pcard-mono" aria-hidden="true">' + (Hx $name.Substring(0, 1)) + '</span>'
}
function ProfCard([string]$url, [string]$name, [string]$years, [string]$sub) {   # sub: HTML
  $em = $EMPURL[$url]; $logoName = if ($em) { [string]$em['name'] } else { $name }
  return '<li><a class="pcard" href="' + $url + '">' + (LogoImg $logoName 52) + '<span class="pcard-b"><span class="pcard-n">' + (Hx $name) + '</span><span class="pcard-y">' + (Hx $years) + '</span>' + $(if ($sub) { '<span class="pcard-s">' + $sub + '</span>' } else { '' }) + '</span></a></li>'
}
function EntTile($o) {   # an encyclopedia entry as a picture tile (as "See also" on entry pages)
  '<li><a href="/encyclopedia/' + $o.slug + '">' + $(if ($o.img) { '<img src="' + (ThumbOf $o.img) + '" alt="" loading="lazy" width="44" height="44">' } else { (PhSpan $o) }) + '<span><span class="nm">' + (Hx $o.name) + '</span><span class="tp">' + (Hx ((TypeLine $o) + $(if ($o.dates -and -not $o.conflict) { ' · ' + $o.dates } else { '' }))) + '</span></span></a></li>'
}
$ESCORE = @{}; foreach ($e in $ENT) { $stMent = if ($ESM -and $ESM[$e.slug]) { [int]$ESM[$e.slug][0] } else { 0 }; $ESCORE[$e.slug] = $e.emp.Count * 3 + [Math]::Min($stMent, 30) + $(if ($e.img) { 4 } else { 0 }) }
function TopEntries($list, [int]$take) { @($list | Sort-Object @{ e = { $ESCORE[$_.slug] }; Descending = $true }, @{ e = { $_.i } } | Select-Object -First $take) }
function StateItem($n) { '<li><a href="' + (StateUrl $n) + '">' + (Hx ([string]$n['n'])) + ' <span>' + (Hx (Span $n)) + '</span></a></li>' }
function ProseList($names) { $a = @($names); if ($a.Count -le 1) { return ($a -join '') }; return (($a[0..($a.Count - 2)]) -join ', ') + ' and ' + $a[-1] }

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Country histories: /countries/<slug>, /countries/
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'country pages'
$cnames = @($CPAGE.Keys | Sort-Object @{ e = { $_.Length }; Descending = $true })
$crx = New-Object Text.RegularExpressions.Regex(('\b(' + (($cnames | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')\b'), 'CultureInvariant')
$CTENT = @{}   # country -> entries whose description names it
foreach ($e in $ENT) {
  if (-not $e.desc) { continue }; $seenC = @{}
  foreach ($mm in $crx.Matches($e.desc)) { $cn = $mm.Value; if ($seenC.ContainsKey($cn)) { continue }; $seenC[$cn] = 1; if (-not $CTENT.ContainsKey($cn)) { $CTENT[$cn] = New-Object System.Collections.Generic.List[object] }; $CTENT[$cn].Add($e) }
}
$RULEREL = @('part-of', 'province-of', 'colony-of', 'conquered-by', 'vassal-of', 'tributary-to', 'protectorate-of')
$CINFO = @{}   # country -> summary for the index, the home page and the hub
foreach ($m in @($CPAGE.Keys | Sort-Object)) {
  $slug = $CPAGE[$m]; $path = '/countries/' + $slug
  $CLIST = @($CSTATES[$m] | Sort-Object @{ e = { if ($null -eq $_['s']) { 1e9 } else { [double]$_['s'] } } }, @{ e = { [string]$_['n'] } })
  $here = @{}; foreach ($n in $CLIST) { $here[[string]$n['id']] = 1 }
  $profs = @($CLIST | Where-Object { $_['p'] })
  $ruledN = @{}; $ruledF = @{}
  foreach ($n in $CLIST) {
    foreach ($lk in $ADJ[[string]$n['id']]) {
      $t = [string]$lk['t']; if ([string]$lk['s'] -ne [string]$n['id'] -or $RULEREL -notcontains [string]$lk['r'] -or $here.ContainsKey($t) -or -not $NODE[$t]['p']) { continue }
      $ruledN[$t] = 1 + [int]$ruledN[$t]; $f = if ($null -ne $lk['f']) { [double]$lk['f'] } elseif ($null -ne $NODE[$t]['s']) { [double]$NODE[$t]['s'] } else { 0 }
      if (-not $ruledF.ContainsKey($t) -or $f -lt $ruledF[$t]) { $ruledF[$t] = $f }
    }
  }
  $ruled = @($ruledN.Keys | Sort-Object @{ e = { $ruledF[$_] } }, @{ e = { $_ } })
  $dated = @($CLIST | Where-Object { $null -ne $_['s'] }); $first = $dated[0]; $living = @($CLIST | Where-Object { $null -eq $_['e'] })
  $named = @($living | Where-Object { ([string]$_['n']) -match ('\b' + [regex]::Escape($m) + '\b') })   # the present-day state, when one carries the name
  if ($named.Count) { $living = @($living | Where-Object { $named -notcontains $_ }) + @($named[-1]) }
  $ct = $CTRY[$m]; $cont = if ($ct) { [string]$ct['ct'] } else { '' }
  $CINFO[$m] = @{ slug = $slug; n = $CLIST.Count; p = $profs.Count; cont = $cont; first = $first; lp = $(if ($ct) { $ct['lp'] } else { $null }) }
  # map: the country's main outline, widened to the states placed around it
  $pts = @($CLIST | ForEach-Object { , $STATEXY[[string]$_['id']] } | Where-Object { $_ -and -not $_[2] })   # "," keeps each point whole
  $mapHtml = ''
  if ($ct) {
    $bb = @([double]$ct['bb'][0], [double]$ct['bb'][1], [double]$ct['bb'][2], [double]$ct['bb'][3]); $mx = [Math]::Max($bb[2] - $bb[0], $bb[3] - $bb[1])
    $box = New-Object System.Collections.Generic.List[object]; $box.Add(@($bb[0], $bb[1])); $box.Add(@($bb[2], $bb[3]))
    foreach ($p in $pts) { if ($p[0] -ge $bb[0] - $mx * 0.5 -and $p[0] -le $bb[2] + $mx * 0.5 -and $p[1] -ge $bb[1] - $mx * 0.5 -and $p[1] -le $bb[3] + $mx * 0.5) { $box.Add($p) } }
    $view = FitView $box 16 1.5 0.08; $CINFO[$m]['view'] = $view
    $pp = @($profs | ForEach-Object { , $STATEXY[[string]$_['id']] } | Where-Object { $_ -and -not $_[2] })
    $nAp = @($CLIST | Where-Object { $q = $STATEXY[[string]$_['id']]; -not $q -or $q[2] }).Count
    $hiRings = $CRING[[string]$ct['n']]   # the country itself, lit up; the dots get a dark halo to stand out on it
    $mapHtml = '<figure class="cty-map">' + (MapSvg $view ((DotPath 'map-dot-bg' $pts) + (DotPath 'map-dot-s' $pts) + (DotPath 'map-dot-p' $pp)) "Map of the states of $(TheCountry $m), with $(TheCountry $m) highlighted" 'map-cty' -Outlines -Hi $hiRings) +
      '<figcaption><span class="map-key"><i class="k-p"></i>Profile</span><span class="map-key"><i class="k-s"></i>State (capital or seat)</span>' + $(if ($nAp) { '<span>' + $nAp + ' without a known seat not shown</span>' } else { '' }) + '<a href="/atlas?c=' + $slug + '">Open in the atlas &rarr;</a></figcaption></figure>'
  }
  $crumb = Crumbs @(@('Home', '/'), @('Countries', '/countries/'), @($m, $null))
  $sb = New-Object Text.StringBuilder(60000)
  [void]$sb.Append('<main id="main" class="cty-page ref-page">' + "`n<div class=`"cty-wrap`">`n" + $crumb[0] + "`n")
  $lede = $CLIST.Count.ToString('N0') + ' recorded states lay in what is now ' + (Hx (TheCountry $m)) + $(if ($first) { ', from ' + (Hx (StateThe $first)) + ' (' + (Hx (Yr $first['s'])) + ')' } else { '' }) +
    $(if ($living.Count) { ' to ' + (Hx (StateThe $living[-1])) } else { '' }) + '. ' + $(if ($profs.Count) { $profs.Count.ToString() + ' of them ' + $(if ($profs.Count -eq 1) { 'has' } else { 'have' }) + ' a full profile' + $(if ($ruled.Count) { ', and ' + $ruled.Count + ' outside ' + $(if ($ruled.Count -eq 1) { 'power' } else { 'powers' }) + ' ruled here' } else { '' }) + '.' } elseif ($ruled.Count) { $ruled.Count.ToString() + ' outside ' + $(if ($ruled.Count -eq 1) { 'power' } else { 'powers' }) + ' ruled here.' } else { '' })
  [void]$sb.Append('<header class="ref-head cty-head"><p class="cty-kicker">Country history' + $(if ($cont) { ' · ' + (Hx $cont) } else { '' }) + '</p><h1 class="research-title">History of ' + (Hx (TheCountry $m)) + '</h1><p class="ref-lede">' + $lede + "</p></header>`n")
  [void]$sb.Append($mapHtml + "`n")
  if ($profs.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Profiles</h2><ul class="pcards">' + (($profs | ForEach-Object { ProfCard ([string]$_['p']) ([string]$_['n']) (Span $_) $(if ([string]$_['t'] -and [string]$_['t'] -ne 'other') { Hx (TypeLabel $_['t']) } else { '' }) }) -join '') + "</ul></section>`n") }
  if ($ruled.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Empires that ruled here</h2><ul class="pcards">' + (($ruled | Select-Object -First 16 | ForEach-Object { $o = $NODE[$_]; ProfCard ([string]$o['p']) ([string]$o['n']) (Span $o) ($ruledN[$_].ToString() + ' state' + $(if ($ruledN[$_] -eq 1) { '' } else { 's' }) + ' here') }) -join '') + "</ul></section>`n") }
  # timeline on one scale, grouped by the century of founding
  $t0 = if ($first) { [Math]::Floor([double]$first['s'] / 100) * 100 } else { 0 }; $t1 = $YEAR; $tw = [Math]::Max(1, $t1 - $t0)
  [void]$sb.Append('<section><h2 class="ref-sec-title">Timeline</h2><p class="cty-scale" aria-hidden="true"><span>' + (Hx (Yr $t0)) + '</span><span>' + (Hx (Yr ([Math]::Round(($t0 + $t1) / 2 / 100) * 100))) + '</span><span>' + $t1 + "</span></p>`n")
  $cur = $null
  foreach ($n in $CLIST) {
    $c = if ($null -eq $n['s']) { 'Undated' } else { CentOf $n['s'] }
    if ($c -ne $cur) { if ($cur) { [void]$sb.Append('</ol>') }; [void]$sb.Append('<h3 class="cty-cent">' + $(if ($c -eq 'Undated') { 'Undated' } else { CentLink $c (CentTitle $c) }) + '</h3><ol class="cty-tl">'); $cur = $c }
    $bar = ''
    if ($null -ne $n['s']) { $a = [Math]::Max($t0, [double]$n['s']); $b = if ($null -eq $n['e']) { $t1 } else { [Math]::Min($t1, [double]$n['e']) }; $bar = '<span class="cty-track" aria-hidden="true"><span class="cty-bar' + $(if ($n['p']) { ' is-prof' } else { '' }) + '" style="left:' + (($a - $t0) / $tw * 100).ToString('0.0', $INV) + '%;width:' + ([Math]::Max(0.6, ($b - $a) / $tw * 100)).ToString('0.0', $INV) + '%"></span></span>' }
    [void]$sb.Append('<li><a href="' + (StateUrl $n) + '"><span class="cty-n">' + (Hx ([string]$n['n'])) + '</span><span class="cty-y">' + (Hx (Span $n)) + ' · ' + $(if ($n['p']) { 'profile' } else { Hx (TypeLabel $n['t']) }) + '</span></a>' + $bar + '</li>')
  }
  [void]$sb.Append("</ol></section>`n")
  $ents = if ($CTENT.ContainsKey($m)) { TopEntries $CTENT[$m] 12 } else { @() }
  if ($ents.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">In the encyclopedia</h2><ul class="enc-seealso">' + (($ents | ForEach-Object { EntTile $_ }) -join '') + "</ul></section>`n") }
  $nb = @{}; foreach ($n in $CLIST) { foreach ($o in @($n['mo'])) { $o = [string]$o; if ($o -and $o -ne $m -and $CPAGE.ContainsKey($o)) { $nb[$o] = 1 + [int]$nb[$o] } } }
  $nbs = @($nb.Keys | Sort-Object @{ e = { $nb[$_] }; Descending = $true }, @{ e = { $_ } } | Select-Object -First 12)
  if ($nbs.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Shared histories</h2><p class="cty-note">States that also lay in other present-day countries:</p><ul class="cty-chips">' + (($nbs | ForEach-Object { '<li><a href="/countries/' + $CPAGE[$_] + '">' + (Hx $_) + ' <span>' + $nb[$_] + '</span></a></li>' }) -join '') + "</ul></section>`n") }
  $rgs = @($CLIST | Where-Object { $_['rg'] } | Group-Object { [string]$_['rg'] } | Sort-Object Count -Descending | Select-Object -First 2)
  [void]$sb.Append('<p class="enc-article-foot">' + (($rgs | ForEach-Object { '<a class="enc-random-link" href="/state/browse/' + $_.Name + '">States of ' + (Hx (RegionLabel $_.Name)) + ' &rarr;</a>' }) -join ' ') + ' <a class="enc-random-link" href="/countries/">All country histories &rarr;</a></p>' + "`n")
  [void]$sb.Append((CiteBox "History of $(TheCountry $m)" ($SITE + $path) 'The Epoch Institute States Register') + "`n</div>`n</main>`n")
  $title = "History of $(TheCountry $m)`: $($CLIST.Count) Historical States — The Epoch Institute"
  $desc = [EpochBuild.W]::Summary("$($CLIST.Count) states that rose and fell in what is now $(TheCountry $m)" + $(if ($first) { ", from $([string]$first['n']) ($(Yr $first['s']))" } else { '' }) + ' to today: a timeline, a map, the empires that ruled here, and profiles.', 155)
  $ld = $crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + ',"about":{"@type":"Country","name":' + (Js $m) + '},"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"}}'
  $ogC = '/images/og/country-' + $slug + '.jpg'
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; img = $(if (Test-Path (Join-Path $Repo ($ogC.TrimStart('/') -replace '/', '\'))) { $ogC }); imgW = 1200; imgH = 630; ld = $ld; nav = 'countries'; body = $sb.ToString() })
}
# index: a bubble map and the countries by continent
$CONTS = @('Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania')
$bub = New-Object Text.StringBuilder
foreach ($m in @($CINFO.Keys | Sort-Object @{ e = { $CINFO[$_].n }; Descending = $true })) {
  $ci = $CINFO[$m]; if (-not $ci.lp) { continue }; $r = (2.2 + [Math]::Sqrt($ci.n) * 0.85) * 10
  [void]$bub.Append('<a href="/countries/' + $ci.slug + '"><circle cx="' + (Fx ([double]$ci.lp[0])) + '" cy="' + (Fx ([double]$ci.lp[1])) + '" r="' + [Math]::Round($r) + '"><title>' + (Hx $m) + ': ' + $ci.n + ' states</title></circle></a>')
}
$crumb = Crumbs @(@('Home', '/'), @('Countries', $null))
$sb = New-Object Text.StringBuilder(40000)
[void]$sb.Append('<main id="main" class="cty-page ref-page">' + "`n<div class=`"cty-wrap`">`n" + $crumb[0] + "`n")
[void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Country Histories</h1><p class="ref-lede">The history of ' + $CPAGE.Count + ' present-day countries, told through the states that lay on their soil: kingdoms, empires, sultanates, republics and colonies, from the first cities to today. The larger the circle, the more states.</p></header>' + "`n")
[void]$sb.Append('<figure class="cty-bubbles">' + (MapSvg ([double[]]@(0, 0, 1000, $MAPH)) ('<g class="map-bub">' + $bub.ToString() + '</g>') 'World map: the number of historical states in each present-day country' 'map-world') + "</figure>`n")
foreach ($cont in $CONTS + @('')) {
  $lst = @($CINFO.Keys | Where-Object { $(if ($cont) { $CINFO[$_].cont -eq $cont } else { $CONTS -notcontains $CINFO[$_].cont }) } | Sort-Object)
  if (-not $lst.Count) { continue }
  [void]$sb.Append('<section class="ref-group"><h2>' + $(if ($cont) { Hx $cont } else { 'Elsewhere' }) + ' <span class="n">' + $lst.Count + '</span></h2><ul class="ref-cent-list">' + (($lst | ForEach-Object { '<li><a href="/countries/' + $CINFO[$_].slug + '">' + (Hx $_) + ' <span>' + $CINFO[$_].n + '</span></a></li>' }) -join '') + "</ul></section>`n")
}
[void]$sb.Append("</div>`n</main>`n")
$title = 'Country Histories: ' + $CPAGE.Count + ' Countries Through Time — The Epoch Institute'
$desc = [EpochBuild.W]::Summary("The history of $($CPAGE.Count) present-day countries through the states that lay on their soil, from the first cities to today, with maps and timelines.", 155)
Emit '/countries/' (Page @{ title = $title; desc = $desc; path = '/countries/'; type = 'website'; img = (Poster 'page-countries'); imgW = 1200; imgH = 630; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/countries/") + '}'); nav = 'countries'; body = $sb.ToString() })
Say "country pages: $($CPAGE.Count)"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Test yourself (test-yourself.js) on the century and path pages: up to five questions built only from what the page
# shows, as the Teachers' corner worksheets are (their helpers WsShuffle, WsSpread, WsItem and WsSteps are defined
# here, before both). The profiles carry their own, written by generator.html. A page gets the section with three.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function WsShuffle($items, [string]$seed) {   # the same order on every build, never the order of the answer
  $a = @($items); if ($a.Count -lt 2) { return $a }
  $rnd = New-Object Random ([Convert]::ToInt32(([EpochBuild.W]::Sha1($seed)).Substring(0, 7), 16))
  for ($i = $a.Count - 1; $i -gt 0; $i--) { $j = $rnd.Next($i + 1); $t = $a[$i]; $a[$i] = $a[$j]; $a[$j] = $t }
  $same = $true; for ($i = 0; $i -lt $a.Count; $i++) { if (-not [object]::ReferenceEquals($a[$i], @($items)[$i])) { $same = $false; break } }
  if ($same) { $a = @($a[1..($a.Count - 1)]) + @($a[0]) }
  return $a
}
# items with a first year, in their order of priority: up to max of them, no two within gap years of each other
function WsSpread($items, [int]$max, [int]$gap) {
  $out = New-Object Collections.Generic.List[object]
  foreach ($it in $items) { if ($null -eq $it.y) { continue }; $ok = $true; foreach ($o in $out) { if ([Math]::Abs($o.y - $it.y) -lt $gap) { $ok = $false; break } }; if ($ok) { $out.Add($it); if ($out.Count -ge $max) { break } } }
  return @($out | Sort-Object { $_.y })
}
# an encyclopedia entry as a worksheet item: a person's birth (a lifespan only), an event's or a work's first year
function WsItem($e, [string]$name) {
  $o = [pscustomobject]@{ name = $(if ($name) { $name } else { $e.name }); slug = $e.slug; e = $e; y = $null; life = $false; dates = [string]$e.dates; kind = ''; href = '/encyclopedia/' + $e.slug }
  if ($e.type -eq 'person') { $o.kind = 'person'; if ([EpochBuild.W]::Range($e.dates)) { $o.life = $true; $sp = [EpochBuild.W]::Span($e.dates); if ($sp) { $o.y = $sp[0] } } }
  elseif ($e.type -eq 'event' -or $e.type -eq 'work' -or $e.conflict) { $o.kind = 'event'; $sp = [EpochBuild.W]::Span($e.dates); if ($sp -and $e.dates -notmatch 'centur') { $o.y = $sp[0] } }
  elseif ($e.type -eq 'polity') { $o.kind = 'state'; $sp = [EpochBuild.W]::Span($e.dates); if ($sp -and $e.dates -notmatch 'centur') { $o.y = $sp[0] } }
  return $o
}
# a path's stops as items (an entry's dates, a profile's first year), with their number, reason and address
function WsSteps($p) {
  $steps = New-Object Collections.Generic.List[object]; $k = 0
  foreach ($st in @($p['steps'])) {
    $k++; $h = [string]$st['href']; $it = $null
    if ($h -match '^/encyclopedia/(.+)$' -and $BY.ContainsKey($Matches[1])) { $it = WsItem $BY[$Matches[1]] ([string]$st['name']) }
    elseif ($EMPURL.ContainsKey($h) -and $EMPURL[$h]['points']) { $em = $EMPURL[$h]; $pts0 = $em['points']; $it = [pscustomobject]@{ name = [string]$st['name']; slug = ''; e = $null; y = [int][double]$pts0[0][0]; life = $false; dates = (Yr $pts0[0][0]) + ' – ' + (Yr $pts0[-1][0]); kind = 'state'; href = $h } }
    else { $it = [pscustomobject]@{ name = [string]$st['name']; slug = ''; e = $null; y = $null; life = $false; dates = ''; kind = ''; href = $h } }
    $it | Add-Member n $k; $it | Add-Member why ([string]$st['why']); $steps.Add($it)
  }
  return , $steps
}
# a seeded order that may also keep the given one (WsShuffle never does: two options would always swap)
function TyShuffle($items, [string]$seed) {
  $a = @($items); $rnd = New-Object Random ([Convert]::ToInt32(([EpochBuild.W]::Sha1($seed)).Substring(0, 7), 16))
  for ($i = $a.Count - 1; $i -gt 0; $i--) { $j = $rnd.Next($i + 1); $t = $a[$i]; $a[$i] = $a[$j]; $a[$j] = $t }
  return $a
}
function TyQ([string]$p, [string]$q, [string]$ans, $wrong, [string]$w, [string]$l, [string]$seed) {   # one question
  $opts = [string[]]@(TyShuffle (@($ans) + @($wrong)) $seed)
  [pscustomobject]@{ p = $p; q = $q; o = $opts; a = [array]::IndexOf($opts, $ans); w = $w; l = $l }
}
function TyJson($qs) {
  '[' + (($qs | ForEach-Object { '{"p":' + (Js $_.p) + ',"q":' + (Js $_.q) + ',"o":[' + ((@($_.o) | ForEach-Object { Js $_ }) -join ',') + '],"a":' + $_.a + ',"w":' + (Js $_.w) + $(if ($_.l) { ',"l":' + (Js $_.l) } else { '' }) + '}' }) -join ',') + ']'
}
function TyWhen($it) { if ($it.kind -eq 'person') { 'born ' + $(if ($it.dates -match '^\s*c\.') { 'c. ' } else { '' }) + (YearLabel $it.y) } elseif ($it.kind -eq 'state') { 'from ' + (YearLabel $it.y) } else { $it.dates } }
# which came first: two items of one kind (two people by their births, two events, two states), at least gap years
# apart, a hundred when a date is approximate; used: names already asked about
function TyFirst($items, [int]$gap, [string]$seed, [hashtable]$used) {
  $its = @(TyShuffle @($items | Where-Object { $null -ne $_.y -and $_.kind -and ($_.kind -ne 'person' -or $_.life) -and ($_.kind -eq 'state' -or [EpochBuild.W]::PlainDates($_.dates)) }) $seed)   # (never "captured Jerusalem 1099")
  for ($i = 0; $i -lt $its.Count; $i++) { for ($j = $i + 1; $j -lt $its.Count; $j++) {
    $a = $its[$i]; $b = $its[$j]
    if ($a.kind -ne $b.kind -or $used.ContainsKey($a.name) -or $used.ContainsKey($b.name)) { continue }
    $need = if ($a.dates -match '^\s*c\.' -or $b.dates -match '^\s*c\.') { 100 } else { $gap }
    if ([Math]::Abs($a.y - $b.y) -lt $need) { continue }
    $f = if ($a.y -lt $b.y) { $a } else { $b }; $l = if ($a.y -lt $b.y) { $b } else { $a }
    $used[$a.name] = 1; $used[$b.name] = 1
    $p = switch ($a.kind) { 'person' { 'Who was born first?' } 'state' { 'Which began first?' } default { 'Which came first?' } }
    return (TyQ $p '' $f.name @($l.name) (($f.name + ': ' + (TyWhen $f) + ' · ' + $l.name + ': ' + (TyWhen $l)) + '.') $f.href ($seed + '|' + $f.name))
  } }
  return $null
}
# who lived these dates: a person with a lifespan of two years; the others: people of the same page born apart
function TyLived($items, [string]$seed, [hashtable]$used) {
  $pp = @($items | Where-Object { $_.kind -eq 'person' -and $_.life -and $_.dates -match '\d\s*[–-]\s*\d' })
  foreach ($x in @(TyShuffle $pp $seed)) {
    if ($used.ContainsKey($x.name)) { continue }
    $wrong = @(TyShuffle @($pp | Where-Object { $_.name -ne $x.name -and $_.dates -ne $x.dates -and [Math]::Abs($_.y - $x.y) -ge 8 }) ($seed + '|' + $x.name) | Select-Object -First 3)
    if ($wrong.Count -lt 3) { continue }
    $used[$x.name] = 1
    return (TyQ ('Who lived ' + $x.dates + '?') '' $x.name @($wrong | ForEach-Object { $_.name }) ($x.name + ': ' + $x.dates + '.') $x.href ($seed + '|o|' + $x.name))
  }
  return $null
}
# in which year: an event with one firm year; the others: the firm years of the page's other events
function TyYear($items, [string]$seed, [hashtable]$used) {
  $firm = @($items | Where-Object { $_.kind -eq 'event' } | ForEach-Object { $y = [EpochBuild.W]::Firm($_.dates, $false); if ($y -ne [int]::MinValue) { [pscustomobject]@{ it = $_; y = $y } } })
  foreach ($x in @(TyShuffle $firm $seed)) {
    if ($used.ContainsKey($x.it.name)) { continue }
    $wrong = @(TyShuffle @($firm | Where-Object { $_.y -ne $x.y } | ForEach-Object { $_.y } | Select-Object -Unique) ($seed + '|' + $x.it.name) | Select-Object -First 3)
    if ($wrong.Count -lt 3) { return $null }
    $used[$x.it.name] = 1
    return (TyQ 'In which year?' $x.it.name (YearLabel $x.y) @($wrong | ForEach-Object { YearLabel $_ }) ($x.it.dates + ': ' + $x.it.name + '.') $x.it.href ($seed + '|o|' + $x.it.name))
  }
  return $null
}
function TySpan($em) { $pts0 = $em['points']; (YearLabel ([int][double]$pts0[0][0])) + '–' + $(if ($null -eq $em['end'] -and [double]$pts0[-1][0] -ge 2025) { 'present' } else { YearLabel ([int][double]$pts0[-1][0]) }) }
# a great power of the century: one of its first three, against the great powers of other ages: three of the ten
# strongest profiles (the Institute's overall score, the same region first) that had ended or not yet begun a hundred
# years either side, picked by the century's seed, never two that share a core word (Roman Empire and Roman Republic,
# United Kingdom and United Kingdom of Great Britain and Ireland)
$TYGEN = '^(empire|kingdom|dynasty|republic|caliphate|sultanate|state|states|united|great|khanate|khaganate|confederacy|confederation|league|union|peoples|federal|principality|duchy|grand|holy|first|second|third|later|early|eastern|western|northern|southern)$'
function TyCore([string]$n) {   # (every British name is one: United Kingdom, Great Britain, British Empire)
  $sl = [EpochBuild.W]::ToSlug($n); $w = @($sl -split '-' | Where-Object { $_.Length -ge 4 -and $_ -notmatch $TYGEN } | ForEach-Object { $_.Substring(0, 4) })
  if ($sl -match 'united-kingdom|britain|british') { $w += 'brit' }; if ($w.Count) { $w } else { @($sl) }
}
function TyPower([string]$c, $rg, $pw, [string]$seed) {
  if (-not @($pw).Count) { return $null }
  $ans = @(TyShuffle @($pw | Select-Object -First 3) $seed)[0]; $an = [string]$ans['name']; $reg = [string]$ans['region']
  $pool = @($POLS | Where-Object { [double]$_['points'][-1][0] -lt $rg[0] - 100 -or [double]$_['points'][0][0] -gt $rg[1] + 100 } |
    Sort-Object @{ e = { if ([string]$_['region'] -eq $reg) { 0 } else { 1 } } }, @{ e = { if ($STATS.ContainsKey([string]$_['name'])) { -[double]$STATS[[string]$_['name']][1] } else { 0 } } }, @{ e = { [string]$_['name'] } } | Select-Object -First 10)
  $taken = @(TyCore $an); $far = New-Object Collections.Generic.List[object]
  foreach ($e in @(TyShuffle $pool ($seed + '|far'))) { $cw = @(TyCore ([string]$e['name'])); if (@($cw | Where-Object { $taken -contains $_ }).Count) { continue }; $far.Add($e); $taken += $cw; if ($far.Count -ge 3) { break } }
  if ($far.Count -lt 3) { return $null }
  $w = 'A great power of the ' + $c + ': ' + $an + ' (' + (TySpan $ans) + '). Not yet begun or already gone: ' + (ProseList @($far | ForEach-Object { [string]$_['name'] + ' (' + (TySpan $_) + ')' })) + '.'
  return (TyQ ('Which of these was a great power of the ' + $c + '?') '' $an @($far | ForEach-Object { [string]$_['name'] }) $w (ProfUrl $an) ($seed + '|o'))
}
# which stop is on the path for this reason: a reason that names neither its stop nor any other option
function TyFoldName([string]$s) { ((($s.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '').ToUpperInvariant()) -replace '[^A-Z ]', ' ' -replace '\s+', ' ').Trim() }
function TyWhy($steps, [string]$seed, [hashtable]$used) {
  $all = @(foreach ($x in $steps) { $x })   # (@() fails on a generic List in PowerShell 5.1)
  foreach ($x in @(TyShuffle $all $seed)) {
    if ($used.ContainsKey($x.name) -or -not $x.why -or (ClueOwnFault (TyFoldName $x.name) $x.why)) { continue }
    $wrong = @(TyShuffle @($all | Where-Object { $_.name -ne $x.name -and -not (ClueOwnFault (TyFoldName $_.name) $x.why) }) ($seed + '|' + $x.name) | Select-Object -First 3)
    if ($wrong.Count -lt 3) { continue }
    $used[$x.name] = 1
    return (TyQ 'Which stop is on the path for this reason?' ([string][char]0x201C + $x.why + [string][char]0x201D) $x.name @($wrong | ForEach-Object { $_.name }) ('Stop ' + $x.n + ': ' + $x.name + '.') $x.href ($seed + '|o|' + $x.name))
  }
  return $null
}
$TYLOAD = '<script>(function(){var el=document.querySelector(".ty[data-ty]");if(!el)return;var go=function(){var s=document.createElement("script");s.src="/test-yourself.js";s.onload=function(){TestYourself.mount(el);};document.head.appendChild(s);};if(location.hash==="#test-yourself"||!("IntersectionObserver" in window))return go();var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();go();}},{rootMargin:"600px"});io.observe(el);})();</script>'
$TYN = @{ century = 0; path = 0 }
function TySection($qs, [string]$on) {   # the section with its questions inline, and the loader
  $qs = @($qs | Where-Object { $_ } | Select-Object -First 5); if ($qs.Count -lt 3) { return '' }
  '<section class="ty-sec" id="test-yourself" aria-labelledby="ty-title"><h2 class="ref-sec-title" id="ty-title">Test yourself</h2><p class="ty-lede">' + $qs.Count + ' questions on ' + $on + '.</p>' +
    '<div class="ty" data-ty=""><p class="ty-loading">The questions open here once the page has loaded.</p></div><script type="application/json" class="ty-data">' + (TyJson $qs) + "</script></section>`n" + $TYLOAD + "`n"
}

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Centuries: /centuries/<slug>, /centuries/
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'century pages'
$TIHC = @{}   # century -> Today in History events [day key, event]
foreach ($k in $DAYS) { foreach ($ev in $HIST[$k]) { $c = CentOf $ev['year']; if (-not $c) { continue }; if (-not $TIHC.ContainsKey($c)) { $TIHC[$c] = New-Object System.Collections.Generic.List[object] }; $TIHC[$c].Add(@($k, $ev)) } }
function WorldDots([double]$y) {   # the states alive in year y: small dots, profiles in gold
  $s = New-Object System.Collections.Generic.List[object]; $p = New-Object System.Collections.Generic.List[object]
  foreach ($n in $POL['nodes']) { if (-not (Alive $n $y)) { continue }; $q = $STATEXY[[string]$n['id']]; if (-not $q -or $q[2]) { continue }; if ($n['p']) { $p.Add($q) } else { $s.Add($q) } }
  return @(((DotPath 'map-dot-s' $s) + (DotPath 'map-dot-p' $p)), ($s.Count + $p.Count))
}
$CENTINFO = @{}
for ($ci = 0; $ci -lt $CENTPAGES.Count; $ci++) {
  $c = $CENTPAGES[$ci]; $cs = $CSTAT[$c]; $slug = CenturySlug $c; $path = '/centuries/' + $slug; $rg = CentRange $c; $mid = CentMid $c
  $ct = CentTitle $c; $dec = CentDecades $c; $midLbl = Yr $mid
  # great powers: profiles alive in the century, by the Institute's overall score
  $cw = @{}; foreach ($em in $POLS) { $pts0 = $em['points']; if ([double]$pts0[0][0] -le $rg[1] -and [double]$pts0[-1][0] -ge $rg[0]) { $w = CenturyWeight $em $rg; if ($w -gt 0.05) { $cw[[string]$em['name']] = $w } } }
  $pw = @($POLS | Where-Object { $cw.ContainsKey([string]$_['name']) } | Sort-Object @{ e = { $cw[[string]$_['name']] }; Descending = $true }, @{ e = { [string]$_['name'] } } | Select-Object -First 12)
  $CENTINFO[$c] = @{ slug = $slug; alive = $cs.alive.Count; founded = $cs.founded.Count; ended = $cs.ended.Count; powers = @($pw | Select-Object -First 3 | ForEach-Object { [string]$_['name'] }); ents = $cs.ents.Count }
  $wd = WorldDots $mid
  $crumb = Crumbs @(@('Home', '/'), @('Centuries', '/centuries/'), @($ct, $null))
  $sb = New-Object Text.StringBuilder(60000)
  [void]$sb.Append('<main id="main" class="cen-page ref-page">' + "`n<div class=`"cen-wrap`">`n" + $crumb[0] + "`n")
  $lede = 'In ' + $dec + ', ' + $cs.alive.Count.ToString('N0') + ' recorded states existed somewhere in the world. ' + $cs.founded.Count.ToString('N0') + ' were founded and ' + $cs.ended.Count.ToString('N0') + ' came to an end. ' +
    $(if ($pw.Count) { 'The great powers of the age included ' + (ProseList @($pw | Select-Object -First 3 | ForEach-Object { 'the ' + (Hx ([string]$_['name'])) })) + '.' } else { '' })
  [void]$sb.Append('<header class="ref-head cen-head"><p class="cty-kicker">History by century · ' + (Hx ($dec.Substring(0, 1).ToUpperInvariant() + $dec.Substring(1))) + '</p><h1 class="research-title">The ' + (Hx $ct) + '</h1><p class="ref-lede">' + $lede + "</p></header>`n")
  $bar = '<nav class="ref-letters ref-centuries" aria-label="Centuries">' + (($CENTPAGES | ForEach-Object { '<a href="/centuries/' + (CenturySlug $_) + '"' + $(if ($_ -eq $c) { ' aria-current="page"' } else { '' }) + '>' + (Hx ($_ -replace ' century', ' c.')) + '</a>' }) -join '') + '</nav>'
  [void]$sb.Append($bar + "`n")
  [void]$sb.Append('<figure class="cen-map">' + (MapSvg ([double[]]@(0, 0, 1000, $MAPH)) $wd[0] "World map: states that existed in $midLbl" 'map-world') +
    '<figcaption><span class="map-key"><i class="k-p"></i>Profile</span><span class="map-key"><i class="k-s"></i>State</span><span>' + $wd[1] + ' states with a known seat in ' + (Hx $midLbl) + '</span><a href="/atlas?year=' + $mid + '">See ' + (Hx $midLbl) + ' in the atlas &rarr;</a></figcaption></figure>' + "`n")
  if ($pw.Count) {
    [void]$sb.Append('<section><h2 class="ref-sec-title">Great powers</h2><p class="cty-note">Profiles of the ' + (Hx $c) + ', ranked by their military, territorial, economic and historical weight in the Institute&#8217;s analysis and by how strong they were in these hundred years.</p><ul class="pcards">')
    foreach ($em in $pw) {
      $nm = [string]$em['name']; $url = '/empire/' + [EpochBuild.W]::ToSlug($nm); $pk = PeakYear $em; $pts0 = $em['points']
      $sub = $(if ($STATS.ContainsKey($nm)) { 'Score ' + $STATS[$nm][1].ToString('0.0', $INV) + '/10' } else { '' }) + $(if ($null -ne $pk -and (CentOf $pk) -eq $c) { ' · <b>at its peak c. ' + (Hx (Yr $pk)) + '</b>' } else { '' })
      [void]$sb.Append((ProfCard $url $nm ((Yr $pts0[0][0]) + ' – ' + (Yr $pts0[-1][0])) $sub))
    }
    [void]$sb.Append("</ul></section>`n")
  }
  $evs = TopEntries @($cs.ents | Where-Object { $_.type -eq 'event' -or $_.conflict }) 12
  $ppl = TopEntries @($cs.ents | Where-Object { $_.type -eq 'person' }) 12
  $wks = TopEntries @($cs.ents | Where-Object { $_.type -eq 'work' -or $_.type -eq 'idea' }) 8
  # kept for the century's worksheet (Teachers' corner)
  $CENTINFO[$c].evs = TopEntries @($cs.ents | Where-Object { $_.type -eq 'event' -or $_.conflict }) 30; $CENTINFO[$c].ppl = TopEntries @($cs.ents | Where-Object { $_.type -eq 'person' }) 30
  $CENTINFO[$c].pw = $pw; $CENTINFO[$c].mid = $mid; $CENTINFO[$c].dec = $dec
  if ($evs.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Key events</h2><ul class="enc-seealso">' + (($evs | ForEach-Object { EntTile $_ }) -join '') + '</ul>' + $(if ($CENT.ContainsKey($c)) { '<p class="cen-more"><a class="enc-random-link" href="/encyclopedia/conflicts/' + $slug + '">All ' + $CENT[$c].Count + ' battles, wars and treaties of the ' + (Hx $c) + ' &rarr;</a></p>' } else { '' }) + "</section>`n") }
  if ($ppl.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">People</h2><ul class="enc-seealso">' + (($ppl | ForEach-Object { EntTile $_ }) -join '') + "</ul></section>`n") }
  if ($wks.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Works and ideas</h2><ul class="enc-seealso">' + (($wks | ForEach-Object { EntTile $_ }) -join '') + "</ul></section>`n") }
  foreach ($grp in @(@('founded', 'States founded'), @('ended', 'States that came to an end'))) {
    $lst = @($cs[$grp[0]] | Sort-Object @{ e = { [double]$(if ($grp[0] -eq 'founded') { $_['s'] } else { $_['e'] }) } }, @{ e = { [string]$_['n'] } })
    if (-not $lst.Count) { continue }
    [void]$sb.Append('<section><h2 class="ref-sec-title">' + $grp[1] + ' <span class="n">' + $lst.Count + '</span></h2>')
    if ($lst.Count -gt 40) { [void]$sb.Append('<ul class="ref-cent-list cen-states">' + (($lst | Select-Object -First 40 | ForEach-Object { StateItem $_ }) -join '') + '</ul><details class="cen-all"><summary>Show all ' + $lst.Count + '</summary><ul class="ref-cent-list cen-states">' + (($lst | Select-Object -Skip 40 | ForEach-Object { StateItem $_ }) -join '') + '</ul></details>') }
    else { [void]$sb.Append('<ul class="ref-cent-list cen-states">' + (($lst | ForEach-Object { StateItem $_ }) -join '') + '</ul>') }
    [void]$sb.Append("</section>`n")
  }
  if ($TIHC.ContainsKey($c)) {
    $tl = @($TIHC[$c] | Sort-Object @{ e = { [double]$_[1]['year'] } } | Select-Object -First 10)
    [void]$sb.Append('<section><h2 class="ref-sec-title">On this day</h2><ul class="cen-days">' + (($tl | ForEach-Object { '<li><a href="/today-in-history/' + (DaySlug $_[0]) + '"><span class="dt">' + (DayLabel $_[0]) + ' ' + (Hx ([string]$_[1]['yearDisplay'])) + '</span><span class="nm">' + (Hx ([string]$_[1]['title'])) + '</span></a></li>' }) -join '') + "</ul></section>`n")
  }
  $cyrs = @($YEARLIST | Where-Object { $_ -ge $rg[0] -and $_ -le $rg[1] })
  if ($cyrs.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Year by year <span class="n">' + $cyrs.Count + '</span></h2><p class="cty-note">The years of the ' + (Hx $c) + ' with a page of their own: their events, births and deaths, and the states founded and ended.</p><ul class="cty-chips yr-chips">' + (($cyrs | ForEach-Object { '<li><a href="' + (YearHref $_) + '">' + (Hx (YearLabel $_)) + '</a></li>' }) -join '') + "</ul></section>`n") }
  # Test yourself: from the key events, people and great powers shown above
  $tyU = @{}; $tyS = 'ty-' + $slug
  $tyEv = @($evs | Where-Object { $_.dates -notmatch '^\s*c\.' -and [EpochBuild.W]::PlainDates($_.dates) } | ForEach-Object { WsItem $_ '' }); $tyPp = @($ppl | ForEach-Object { WsItem $_ '' })
  $tyH = TySection @((TyFirst $tyEv 10 ($tyS + '-f1') $tyU), (TyLived $tyPp ($tyS + '-l') $tyU), (TyPower $c $rg $pw ($tyS + '-p')), (TyYear $tyEv ($tyS + '-y') $tyU), (TyFirst $tyEv 10 ($tyS + '-f2') $tyU)) ('the ' + (Hx $c) + ': its events, people and great powers')
  if ($tyH) { $TYN.century++ }; [void]$sb.Append($tyH)
  $pv = if ($ci -gt 0) { $CENTPAGES[$ci - 1] } else { $null }; $nx = if ($ci -lt $CENTPAGES.Count - 1) { $CENTPAGES[$ci + 1] } else { $null }
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Neighbouring centuries">' + $(if ($pv) { '<a class="prev" rel="prev" href="/centuries/' + (CenturySlug $pv) + '"><span class="lbl">&larr; Previous century</span><span class="nm">' + (Hx (CentTitle $pv)) + '</span></a>' } else { '' }) +
    $(if ($nx) { '<a class="next" rel="next" href="/centuries/' + (CenturySlug $nx) + '"><span class="lbl">Next century &rarr;</span><span class="nm">' + (Hx (CentTitle $nx)) + '</span></a>' } else { '' }) + "</nav>`n")
  [void]$sb.Append((CiteBox "The $ct" ($SITE + $path) 'The Epoch Institute') + "`n</div>`n</main>`n")
  $title = "The $($ct -replace ' century', ' Century'): States, Empires and Events — The Epoch Institute"
  $desc = [EpochBuild.W]::Summary("The $c ($dec) in world history: $($cs.alive.Count.ToString('N0')) states, the great powers of the age, key events and people, and a map of the world in $midLbl.", 155)
  $ld = $crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + $(if ($rg[0] -ge 0) { ',"temporalCoverage":' + (Js ($rg[0].ToString('0000') + '/' + $rg[1].ToString('0000'))) } else { '' }) + ',"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"}}'
  $ogY = '/images/og/century-' + $slug + '.jpg'
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; img = $(if (Test-Path (Join-Path $Repo ($ogY.TrimStart('/') -replace '/', '\'))) { $ogY }); imgW = 1200; imgH = 630; ld = $ld; nav = 'centuries'; body = $sb.ToString() })
}
# index: a histogram of the states alive in each century, then the centuries with their great powers
$maxA = ($CENTPAGES | ForEach-Object { $CENTINFO[$_].alive } | Measure-Object -Maximum).Maximum
$crumb = Crumbs @(@('Home', '/'), @('Centuries', $null))
$sb = New-Object Text.StringBuilder(30000)
[void]$sb.Append('<main id="main" class="cen-page ref-page">' + "`n<div class=`"cen-wrap`">`n" + $crumb[0] + "`n")
[void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">History by Century</h1><p class="ref-lede">Five thousand years, one century at a time: the states and great powers of each age, its key events and people, and a map of the world at mid-century.</p></header>' + "`n")
[void]$sb.Append('<figure class="cen-hist"><ol class="cen-bars">' + (($CENTPAGES | ForEach-Object { $ii = $CENTINFO[$_]; '<li><a href="/centuries/' + $ii.slug + '" title="' + (Hx (CentTitle $_)) + ': ' + $ii.alive + ' states"><span class="cen-bar" style="height:' + ([Math]::Max(2, $ii.alive / $maxA * 100)).ToString('0.0', $INV) + '%"></span><span class="cen-lbl">' + (Hx (($_ -replace ' century', '') -replace ' BCE', ' BC')) + '</span></a></li>' }) -join '') +
  '</ol><figcaption>Recorded states alive in each century</figcaption></figure>' + "`n")
[void]$sb.Append('<ul class="cen-cards">')
foreach ($c in $CENTPAGES) {
  $ii = $CENTINFO[$c]
  [void]$sb.Append('<li><a href="/centuries/' + $ii.slug + '"><span class="cen-c-t">' + (Hx (CentTitle $c)) + '</span><span class="cen-c-d">' + (Hx (CentDecades $c)) + '</span><span class="cen-c-n">' + $ii.alive.ToString('N0') + ' states · ' + $ii.founded + ' founded · ' + $ii.ents.ToString('N0') + ' entries</span>' +
    $(if ($ii.powers.Count) { '<span class="cen-c-p">' + (Hx ($ii.powers -join ' · ')) + '</span>' } else { '' }) + '</a></li>')
}
[void]$sb.Append("</ul>`n</div>`n</main>`n")
$title = 'History by Century: ' + $CENTPAGES.Count + ' Centuries of World History — The Epoch Institute'
$desc = [EpochBuild.W]::Summary("World history one century at a time, from the $($CENTPAGES[0]) to the $($CENTPAGES[-1]): states, great powers, key events and people, with maps.", 155)
Emit '/centuries/' (Page @{ title = $title; desc = $desc; path = '/centuries/'; type = 'website'; img = (Poster 'page-centuries'); imgW = 1200; imgH = 630; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/centuries/") + '}'); nav = 'centuries'; body = $sb.ToString() })
Say "century pages: $($CENTPAGES.Count)"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Glossary: /encyclopedia/glossary (the term entries, A-Z)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$TERMS = @($ENT | Where-Object { $_.type -eq 'term' })
$glL = [ordered]@{}; foreach ($e in $TERMS) { if (-not $glL.Contains($e.L)) { $glL[$e.L] = New-Object System.Collections.Generic.List[object] }; $glL[$e.L].Add($e) }
$crumb = Crumbs @(@('Home', '/'), @('Encyclopedia', '/encyclopedia/'), @('Glossary', $null))
$sb = New-Object Text.StringBuilder(200000)
[void]$sb.Append('<main id="main" class="enc-page ref-page">' + "`n<div class=`"enc-wrap gl-wrap`">`n" + $crumb[0] + "`n")
[void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Glossary of Historical Terms</h1><p class="ref-lede">' + $TERMS.Count + ' terms of government, war, faith, law and society that appear in the profiles and the encyclopedia, each with a short definition and a link to its full entry.</p></header>' + "`n")
[void]$sb.Append('<nav class="ref-letters gl-letters" aria-label="Letters">' + (($LETTERS | ForEach-Object { if ($glL.Contains($_)) { '<a href="#gl-' + $_ + '">' + (LetterLabel $_) + '</a>' } else { '<span>' + (LetterLabel $_) + '</span>' } }) -join '') + "</nav>`n")
foreach ($L in $glL.Keys) {
  [void]$sb.Append('<section class="gl-letter" id="gl-' + $L + '"><h2>' + (LetterLabel $L) + '</h2><dl class="gl-list">')
  foreach ($e in $glL[$L]) { [void]$sb.Append('<div id="' + $e.slug + '"><dt><a href="/encyclopedia/' + $e.slug + '">' + (Hx $e.name) + '</a>' + $(if ($e.aka.Count) { ' <span class="gl-aka">(' + (Hx (($e.aka | Select-Object -First 2 | ForEach-Object { [string]$_ }) -join ', ')) + ')</span>' } else { '' }) + '</dt><dd>' + (Hx ([EpochBuild.W]::FirstSentence($e.desc, 240))) + '</dd></div>') }
  [void]$sb.Append("</dl></section>`n")
}
[void]$sb.Append("</div>`n</main>`n")
$title = "Glossary of Historical Terms: $($TERMS.Count) Definitions — The Epoch Institute"
$desc = [EpochBuild.W]::Summary("$($TERMS.Count) terms of history explained in a sentence each, from $($TERMS[0].name) to $($TERMS[-1].name): offices, institutions, laws, warfare and faith, with links to full entries.", 155)
$ld = $crumb[1] + ',{"@type":"DefinedTermSet","name":"Glossary of Historical Terms","url":' + (Js "$SITE/encyclopedia/glossary") + ',"description":' + (Js $desc) + ',"hasDefinedTerm":[' + (($TERMS | ForEach-Object { '{"@type":"DefinedTerm","name":' + (Js $_.name) + ',"url":' + (Js ($SITE + '/encyclopedia/' + $_.slug)) + '}' }) -join ',') + ']}'
Emit '/encyclopedia/glossary' (Page @{ title = $title; desc = $desc; path = '/encyclopedia/glossary'; type = 'website'; ld = $ld; nav = 'glossary'; body = $sb.ToString() })

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Reading paths: /paths/<slug>, /paths/ (from reading-paths.js)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$rpText = [IO.File]::ReadAllText("$Repo\reading-paths.js", $U8); $i0 = $rpText.IndexOf('var READING_PATHS = ') + 20; $i1 = $rpText.LastIndexOf('];')
$RP = @($JSS.DeserializeObject([EpochBuild.W]::QuoteKeys($rpText.Substring($i0, $i1 - $i0 + 1)))); $rpText = $null
# a path card's strip: three different pictures (two entries can share one Commons file), maps and diagrams only when
# there is nothing else
function PicSource([string]$img) { if ($img -match '^/images/encyclopedia/(.+)\.jpg$' -and $BY.ContainsKey($Matches[1]) -and $BY[$Matches[1]].cr) { [string]$BY[$Matches[1]].cr['source'] } else { '' } }
function PicIsChart([string]$src) { $src -match '(?i)\.svg$' -or $src -match '(?i)(?<![a-z])(map|maps|mapa|carte|karte|locator|location|diagram|plan|territor(y|ies)|extent)(?![a-z])' }
# a person's picture that shows the person (Who Said It?, the "Who is this?" flashcards): never one of
# scripts/no-portrait.tsv (scenes, maps, a burial suit: checked by eye) nor a map or diagram; -Strict also leaves out
# coins, seals, steles and inscriptions by the Commons file name (fine for a speaker, poor as a portrait to guess)
$NOFACE = @{}; foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\no-portrait.tsv", $U8)) { if ($l -and -not $l.StartsWith('#')) { $NOFACE[$l.Split("`t")[0]] = 1 } }
function PicFace($e, [switch]$Strict) {
  if (-not $e.img -or $NOFACE.ContainsKey($e.slug)) { return $false }
  $src = PicSource ([string]$e.img); if (PicIsChart $src) { return $false }
  -not $Strict -or $src -notmatch '(?i)(?<![a-z])(coins?|dinars?|dirhams?|deniers?|staters?|drachms?|tetradrachms?|solidus|aureus|follis|penny|siliqua|tremissis|seals?|stel[ae]|tablets?|inscriptions?|obverse|reverse)(?![a-z])'
}
function PathThumbs($p) {
  $seen = @{}; $all = New-Object Collections.Generic.List[object]
  foreach ($st in @($p['steps'])) { $im = [string]$st['img']; if (-not $im) { continue }; $src = PicSource $im; $key = if ($src) { $src } else { $im }; if ($seen.ContainsKey($key)) { continue }; $seen[$key] = 1; $all.Add([pscustomobject]@{ im = $im; chart = [bool](PicIsChart $src) }) }
  $pick = @($all | Where-Object { -not $_.chart } | Select-Object -First 3)
  if ($pick.Count -lt 3) { $pick += @($all | Where-Object { $_.chart } | Select-Object -First (3 - $pick.Count)) }
  ($pick | ForEach-Object { '<img src="' + (Hx $_.im) + '" alt="" loading="lazy" width="64" height="64">' }) -join ''
}
$RTYPE = @{ strategist = 'the Strategist'; navigator = 'the Navigator'; thinker = 'the Thinker'; chronicler = 'the Chronicler'; builder = 'the Builder'; timekeeper = 'the Timekeeper' }
function PathTypes($p) {   # the reader types this path suits (from /start), as a small badge line
  if (-not $p['types'] -or -not @($p['types']).Count) { return '' }
  '<p class="path-types">Suits <a href="/start">' + ((@($p['types']) | ForEach-Object { Hx ([string]$RTYPE[[string]$_]) }) -join '</a> · <a href="/start">') + '</a></p>'
}
function PathCard($p) { '<a class="path-card" href="/paths/' + $p['slug'] + '"><span class="path-thumbs">' + (PathThumbs $p) + '</span><span class="path-card-body"><span class="featured-region">' + @($p['steps']).Count + ' stops' + $(if ($p['types'] -and @($p['types']).Count) { ' · ' + ((@($p['types']) | ForEach-Object { [string]$RTYPE[[string]$_] }) -join ', ') } else { '' }) + '</span><span class="path-card-title">' + (Hx ([string]$p['title'])) + '</span><span class="path-card-tag">' + (Hx ([string]$p['tagline'])) + '</span></span></a>' }
for ($pi2 = 0; $pi2 -lt $RP.Count; $pi2++) {
  $p = $RP[$pi2]; $slug = [string]$p['slug']; $path = '/paths/' + $slug; $steps = @($p['steps'])
  $crumb = Crumbs @(@('Home', '/'), @('Reading Paths', '/paths/'), @([string]$p['title'], $null))
  $sb = New-Object Text.StringBuilder(20000)
  [void]$sb.Append('<main id="main" class="paths-page ref-page">' + "`n<div class=`"paths-wrap`">`n" + $crumb[0] + "`n<article class=`"path-view`">`n")
  [void]$sb.Append('<div class="path-head"><p class="featured-region">Reading path · ' + $steps.Count + ' stops</p><h1 class="path-title">' + (Hx ([string]$p['title'])) + '</h1><p class="path-tagline">' + (Hx ([string]$p['tagline'])) + '</p><p class="path-intro">' + (Hx ([string]$p['intro'])) + '</p>' + (PathTypes $p) + "</div>`n<ol class=`"path-steps`">")
  for ($k = 0; $k -lt $steps.Count; $k++) {
    $s = $steps[$k]
    [void]$sb.Append('<li><a class="path-step" href="' + (Hx ([string]$s['href'])) + '">' + $(if ($s['img']) { '<img src="' + (Hx ([string]$s['img'])) + '" alt="" loading="lazy" width="96" height="96">' } else { '<span class="path-step-ph">' + ($k + 1) + '</span>' }) +
      '<span class="path-step-body"><span class="path-step-kind">' + ($k + 1) + ' · ' + (Hx ([string]$s['meta'])) + '</span><span class="path-step-name">' + (Hx ([string]$s['name'])) + '</span><span class="path-step-why">' + (Hx ([string]$s['why'])) + '</span></span></a></li>')
  }
  [void]$sb.Append("</ol>`n")
  # Test yourself: from the stops, their dates and the reasons the path gives for them
  $tyU = @{}; $tySt = WsSteps $p; $tyS = 'ty-path-' + $slug
  $tyH = TySection @((TyWhy $tySt ($tyS + '-w1') $tyU), (TyFirst $tySt 20 ($tyS + '-f1') $tyU), (TyLived $tySt ($tyS + '-l') $tyU), (TyWhy $tySt ($tyS + '-w2') $tyU), (TyFirst $tySt 20 ($tyS + '-f2') $tyU)) 'this path and its stops'
  if ($tyH) { $TYN.path++ }; [void]$sb.Append($tyH)
  $pv = $RP[($pi2 - 1 + $RP.Count) % $RP.Count]; $nx = $RP[($pi2 + 1) % $RP.Count]
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Other reading paths"><a class="prev" rel="prev" href="/paths/' + $pv['slug'] + '"><span class="lbl">&larr; Previous path</span><span class="nm">' + (Hx ([string]$pv['title'])) + '</span></a><a class="next" rel="next" href="/paths/' + $nx['slug'] + '"><span class="lbl">Next path &rarr;</span><span class="nm">' + (Hx ([string]$nx['title'])) + "</span></a></nav>`n")
  [void]$sb.Append('<p class="enc-article-foot"><a class="enc-random-link" href="/paths/">All reading paths &rarr;</a></p>' + "`n</article>`n</div>`n</main>`n")
  $title = [string]$p['title'] + ': A Reading Path — The Epoch Institute'
  $desc = [EpochBuild.W]::Summary([string]$p['tagline'] + ' ' + [string]$p['intro'], 155)
  $ld = $crumb[1] + ',{"@type":"ItemList","name":' + (Js ([string]$p['title'])) + ',"description":' + (Js ([string]$p['tagline'])) + ',"url":' + (Js ($SITE + $path)) + ',"itemListOrder":"https://schema.org/ItemListOrderAscending","numberOfItems":' + $steps.Count + ',"itemListElement":[' +
    ((0..($steps.Count - 1) | ForEach-Object { '{"@type":"ListItem","position":' + ($_ + 1) + ',"name":' + (Js ([string]$steps[$_]['name'])) + ',"url":' + (Js ($SITE + [string]$steps[$_]['href'])) + '}' }) -join ',') + ']}'
  $img1 = @($steps | Where-Object { $_['img'] } | Select-Object -First 1); $isz = if ($img1.Count) { ImgSize ([string]$img1[0]['img']) } else { $null }
  $ogP = Poster ('path-' + $slug)
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'article'; img = $(if ($ogP) { $ogP } elseif ($isz) { [string]$img1[0]['img'] }); imgW = $(if ($ogP) { 1200 } elseif ($isz) { $isz[0] }); imgH = $(if ($ogP) { 630 } elseif ($isz) { $isz[1] }); ld = $ld; nav = 'paths'; body = $sb.ToString() })
}
$crumb = Crumbs @(@('Home', '/'), @('Reading Paths', $null))
$body = "<script>(function(){var h=location.hash.slice(1);if(/^[a-z0-9-]+`$/.test(h)&&h!=='index')location.replace('/paths/'+h);})();</script>`n" +
  '<main id="main" class="paths-page ref-page">' + "`n<div class=`"paths-wrap`">`n" + $crumb[0] + "`n" +
  '<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Reading Paths</h1><p class="ref-lede">Curated routes through the profiles and the encyclopedia. Pick a theme and follow it across empires, people and events, one stop at a time.</p></header>' + "`n" +
  '<div class="paths-grid">' + (($RP | ForEach-Object { PathCard $_ }) -join '') + "</div>`n</div>`n</main>`n"
$title = 'Reading Paths Through World History — The Epoch Institute'
$desc = 'Curated routes through world history: the Silk Road, the steppe empires, the crusades, great conquerors and explorers, one stop at a time.'
Emit '/paths/' (Page @{ title = $title; desc = $desc; path = '/paths/'; type = 'website'; img = (Poster 'page-paths'); imgW = 1200; imgH = 630; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/paths/") + '}'); nav = 'paths'; body = $body })
Say "glossary: $($TERMS.Count) terms; reading paths: $($RP.Count); Test yourself on $($TYN.century) century and $($TYN.path) path pages"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Great Speeches: /speeches/<slug> (the setting, the famous words and their source, what followed, connected entries)
# and /speeches/ by era. Data: speeches-data.js (short passages only; see its header).
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# ($SPS, sorted by year, was read before the entry pages)
$SPERA = [ordered]@{ ancient = 'The ancient world'; medieval = 'The medieval world'; earlymodern = 'The early modern world'; revolutions = 'The age of revolutions'; nineteenth = 'The nineteenth century'; twentieth = 'The early twentieth century'; postwar = 'The world since 1945' }
$spMiss = New-Object Collections.Generic.List[string]
# the complete texts of the speeches in the public domain, imported by scripts/fetch-speech-texts.ps1
$SPTXT = @{}
foreach ($f in @(Get-ChildItem "$Repo\data\speech-texts\*.json" -ErrorAction SilentlyContinue)) { $o = $JSS.DeserializeObject([IO.File]::ReadAllText($f.FullName, $U8)); $SPTXT[[string]$o['slug']] = $o }
function SpPortrait($s) { $sl = [string]$s['speakerSlug']; if ($sl -and $BY.ContainsKey($sl) -and $BY[$sl].img) { [string]$BY[$sl].img } else { '' } }
function SpChip([string]$pair) {
  $q = $pair -split '\|', 2
  if ($q[0] -match '^/encyclopedia/(.+)$' -and -not $BY.ContainsKey($Matches[1])) { $spMiss.Add($q[0]) }
  '<a class="tih-tag' + $(if ($q[0] -like '/empire/*') { ' tih-tag-profile' } else { ' enc-link' }) + '" href="' + (Hx $q[0]) + '">' + (Hx $q[1]) + '</a>'
}
for ($si = 0; $si -lt $SPS.Count; $si++) {
  $s = $SPS[$si]; $slug = [string]$s['slug']; $path = '/speeches/' + $slug
  $crumb = Crumbs @(@('Home', '/'), @('Great Speeches', '/speeches/'), @([string]$s['title'], $null))
  $isPara = ([string]$s['kind'] -eq 'paraphrase'); $isCopy = [bool]$s['copyright']
  $spk = if ($s['speakerSlug'] -and $BY.ContainsKey([string]$s['speakerSlug'])) { '<a class="enc-link" href="/encyclopedia/' + $s['speakerSlug'] + '">' + (Hx ([string]$s['speaker'])) + '</a>' } else { Hx ([string]$s['speaker']) }
  $chips = New-Object Text.StringBuilder
  if ($s['empire']) { [void]$chips.Append((SpChip ([string]$s['empire']))) }
  foreach ($l in @($s['links'])) { if ($l) { [void]$chips.Append((SpChip ([string]$l))) } }
  $led = New-Object Text.StringBuilder
  foreach ($l in @($s['led'])) { if ($l) { [void]$led.Append((SpChip ([string]$l))) } }
  # full: "url|source" - the complete text at a free, reliable source (opens in a new tab); when the text itself is
  # here (data/speech-texts/<slug>.json), the page carries it and the button leads down to it
  $full = if ($s['full']) { [string]$s['full'] -split '\|', 2 } else { $null }
  $ft = $SPTXT[$slug]; $ftw = 0; $ftm = 0
  if ($ft) { $ftw = [int]$ft['words']; $ftm = [Math]::Max(1, [int][Math]::Round($ftw / 200.0)) }
  $sb = New-Object Text.StringBuilder(9000)
  [void]$sb.Append('<main id="main" class="sp-page ref-page">' + "`n<div class=`"sp-wrap`">`n" + $crumb[0] + "`n<article class=`"sp-view`">`n")
  # the speaker's portrait (the speaker's entry picture; its credit is on that entry)
  $por = SpPortrait $s; $ogS = Poster ('speech-' + $slug)
  [void]$sb.Append('<header class="sp-head">' + $(if ($por) { '<a class="sp-portrait" href="/encyclopedia/' + $s['speakerSlug'] + '" tabindex="-1" aria-hidden="true"><img src="' + $por + '" alt="" width="104" height="104"></a>' } else { '' }) + '<p class="featured-region">' + (Hx ([string]$s['display'])) + ' · ' + (Hx ([string]$s['place'])) + '</p><h1 class="sp-title">' + (Hx ([string]$s['title'])) + '</h1><p class="sp-by">' + $spk + "</p></header>`n")
  [void]$sb.Append('<section class="sp-sec"><h2>The setting</h2><p>' + (Hx ([string]$s['before'])) + "</p></section>`n")
  [void]$sb.Append('<section class="sp-sec"><h2>' + $(if ($isPara) { 'In substance' } else { 'Key passage' }) + '</h2>' +
    $(if ($isPara) { '<p class="sp-para">' + (Hx ([string]$s['excerpt'])) + '</p>' } else { '<blockquote class="sp-quote"><p>' + (Hx ([string]$s['excerpt'])) + '</p></blockquote>' }) +
    '<p class="sp-source">' + (Hx ([string]$s['source'])) + $(if ($isCopy) { ' Quoted briefly: the full text is still under copyright.' } else { '' }) + '</p>' +
    '<div class="sp-full">' +
    # a short full text stands open just below: the button is only for a folded one
    $(if ($ft -and $ftw -gt 600) { '<a class="sp-full-link" href="#full-text">Read the full speech<span aria-hidden="true"> &#8595;</span></a><span class="sp-full-src">' + $ftw.ToString('N0') + ' words · about ' + $ftm + ' min</span>' }
      elseif (-not $ft -and $full) { '<a class="sp-full-link" href="' + (Hx $full[0]) + '" target="_blank" rel="noopener">Read the complete text<span aria-hidden="true"> &#8599;</span></a><span class="sp-full-src">' + (Hx $full[1]) + '</span>' } else { '' }) +
    $(if (-not $isPara) { '<button type="button" class="sp-share" data-share-text="' + (Hx ([string][char]0x201C + [string]$s['excerpt'] + [string][char]0x201D + ' ' + [string][char]0x2014 + ' ' + [string]$s['speaker'] + ', ' + [string]$s['title'])) + '"' + $(if ($ogS) { ' data-share-img="' + $ogS + '"' } else { '' }) + '>Share this quote</button>' } else { '' }) +
    "</div></section>`n")
  if ($ft) {
    $ftb = New-Object Text.StringBuilder
    foreach ($fp in @($ft['paras'])) { [void]$ftb.Append('<p>' + ((Hx ([string]$fp)) -replace "`n", '<br>') + '</p>') }
    $ftLang = if ($ft['lang'] -and [string]$ft['lang'] -ne 'en') { ' lang="' + $ft['lang'] + '"' } else { '' }
    $ftBody = '<div class="sp-ft-body"' + $ftLang + '>' + $ftb.ToString() + '</div>'
    [void]$sb.Append('<section class="sp-sec sp-ft" id="full-text"><h2>The full speech</h2>' +
      $(if ($ftw -le 600) { $ftBody } else { '<details class="sp-ft-fold"><summary><span class="sp-ft-open">Read the full speech</span><span class="sp-ft-meta">' + $ftw.ToString('N0') + ' words · about ' + $ftm + ' minutes</span></summary>' + $ftBody + '</details>' }) +
      '<p class="sp-ft-credit">Text: <a href="' + (Hx ([string]$ft['url'])) + '" target="_blank" rel="noopener">' + (Hx ([string]$ft['source'])) + '</a>' + $(if ($ft['credit']) { ', ' + (Hx ([string]$ft['credit'])) } else { '' }) + '. ' + (Hx ([string]$ft['licence'])) + "</p></section>`n")
  }
  [void]$sb.Append('<section class="sp-sec"><h2>What followed</h2><p>' + (Hx ([string]$s['after'])) + '</p>' +
    $(if ($led.Length) { '<div class="sp-led"><h3 class="sp-led-k">What it led to</h3><div class="tih-tags">' + $led.ToString() + '</div></div>' } else { '' }) + "</section>`n")
  if ($chips.Length) { [void]$sb.Append('<section class="sp-sec"><h2>Connected</h2><div class="tih-tags">' + $chips.ToString() + "</div></section>`n") }
  $pv = $SPS[($si - 1 + $SPS.Count) % $SPS.Count]; $nx = $SPS[($si + 1) % $SPS.Count]
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Other speeches"><a class="prev" rel="prev" href="/speeches/' + $pv['slug'] + '"><span class="lbl">&larr; Earlier speech</span><span class="nm">' + (Hx ([string]$pv['title'])) + '</span></a><a class="next" rel="next" href="/speeches/' + $nx['slug'] + '"><span class="lbl">Later speech &rarr;</span><span class="nm">' + (Hx ([string]$nx['title'])) + "</span></a></nav>`n")
  [void]$sb.Append('<p class="enc-article-foot"><a class="enc-random-link" href="/speeches/">All great speeches &rarr;</a></p>' + "`n</article>`n</div>`n</main>`n")
  $title = [string]$s['title'] + ' (' + [string]$s['display'] + ') — Great Speeches — The Epoch Institute'
  $desc = [EpochBuild.W]::Summary([string]$s['before'], 155)
  $ld = $crumb[1] + ',' + (ArticleLd ([string]$s['title']) $desc $path 'Event' ([string]$s['title']) $null $null)
  $srcUrl = if ($ft) { [string]$ft['url'] } elseif ($full) { $full[0] } else { $null }
  if (-not $isPara) { $ld += ',{"@type":"Quotation","text":' + (Js ([string]$s['excerpt'])) + ',"creator":{"@type":"Person","name":' + (Js ([string]$s['speaker'])) + '}' + $(if ($srcUrl) { ',"isPartOf":{"@type":"CreativeWork","name":' + (Js ([string]$s['title'])) + ',"url":' + (Js $srcUrl) + '}' } else { '' }) + '}' }
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'article'; img = $ogS; imgW = 1200; imgH = 630; ld = $ld; nav = 'speeches'; body = $sb.ToString() })
}
$crumb = Crumbs @(@('Home', '/'), @('Great Speeches', $null))
$ib = New-Object Text.StringBuilder
[void]$ib.Append('<main id="main" class="sp-page ref-page">' + "`n<div class=`"sp-wrap`">`n" + $crumb[0] + "`n")
$spWhole = @($SPS | Where-Object { $SPTXT.ContainsKey([string]$_['slug']) }).Count
$spFull = @($SPS | Where-Object { $_['full'] -and -not $SPTXT.ContainsKey([string]$_['slug']) }).Count
[void]$ib.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Great Speeches</h1><p class="ref-lede">' + $SPS.Count + ' speeches that moved history, from Xerxes to Reagan. Each gives the setting, the key passage with its source, what followed and what it led to. ' + $spWhole + ' carry their full text, and ' + $spFull + ' more link to it at a free source.</p></header>' + "`n")
foreach ($era in $SPERA.Keys) {
  $grp = @($SPS | Where-Object { [string]$_['era'] -eq $era }); if (-not $grp.Count) { continue }
  [void]$ib.Append('<section class="sp-era"><h2 class="ref-sec-title">' + $SPERA[$era] + '</h2><div class="sp-grid">')
  foreach ($s in $grp) {
    $para = ([string]$s['kind'] -eq 'paraphrase'); $por = SpPortrait $s
    [void]$ib.Append('<a class="sp-card' + $(if ($por) { ' has-pic' } else { '' }) + '" href="/speeches/' + $s['slug'] + '">' + $(if ($por) { '<span class="sp-card-pic"><img src="' + (ThumbOf $por) + '" alt="" loading="lazy" width="56" height="56"></span>' } else { '' }) + '<span class="sp-card-k">' + (Hx ([string]$s['display'])) + '</span><span class="sp-card-t">' + (Hx ([string]$s['title'])) + '</span><span class="sp-card-q">' + $(if ($para) { 'In substance: ' + (Hx ([string]$s['excerpt'])) } else { '&ldquo;' + (Hx ([string]$s['excerpt'])) + '&rdquo;' }) + '</span><span class="sp-card-by">' + (Hx ([string]$s['speaker'])) + $(if ($SPTXT.ContainsKey([string]$s['slug'])) { '<span class="sp-card-ft"> · full text</span>' } elseif ($s['full']) { '<span class="sp-card-ft"> · complete text linked</span>' } else { '' }) + '</span></a>')
  }
  [void]$ib.Append("</div></section>`n")
}
[void]$ib.Append("</div>`n</main>`n")
$title = 'Great Speeches in History: The Words That Moved the World — The Epoch Institute'
$desc = 'Great speeches that moved history, from Xerxes to Reagan: the setting, the key passage, what followed, and the full text of every speech in the public domain.'
Emit '/speeches/' (Page @{ title = $title; desc = $desc; path = '/speeches/'; type = 'website'; img = (Poster 'page-speeches'); imgW = 1200; imgH = 630; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/speeches/") + '}'); nav = 'speeches'; body = $ib.ToString() })
Say "great speeches: $($SPS.Count) ($spWhole with their full text, $spFull more linked to it)"
if ($spMiss.Count) { Say ("great speeches: unknown encyclopedia links " + (($spMiss | Sort-Object -Unique) -join ', ')) }

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Research Series: /essays/<slug> from scripts/essays/NN-slug.html, the cards of /research-series (build:essays) and
# feed.xml. Each source starts with a comment of "key: value" lines (title, subtitle, card: the text of its card,
# desc, published: yyyy-mm-dd, picture: "entry slug|caption" or cover: "path|alt", profiles: slugs), then the essay:
# h2 sections with ids (the last one, id ...-reading, is Further Reading), p, a, i, tables.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$ESSAYS = New-Object Collections.Generic.List[object]
foreach ($f in @(Get-ChildItem "$PSScriptRoot\essays\*.html" | Sort-Object Name)) {
  $raw = [IO.File]::ReadAllText($f.FullName, $U8).Replace("`r`n", "`n")
  $esHead = [regex]::Match($raw, '^<!--\n(.*?)\n-->\n', [Text.RegularExpressions.RegexOptions]::Singleline)
  $esName = [regex]::Match($f.BaseName, '^(\d\d)-([a-z0-9-]+)$')
  if (-not $esHead.Success -or -not $esName.Success) { throw "essay $($f.Name): needs a name NN-slug.html and a header comment" }
  $hd = @{}; foreach ($l in $esHead.Groups[1].Value -split "`n") { $kv = $l -split ':\s*', 2; if ($kv.Count -eq 2) { $hd[$kv[0].Trim()] = $kv[1].Trim() } }
  foreach ($k in 'title', 'subtitle', 'card', 'desc', 'published') { if (-not $hd[$k]) { throw "essay $($f.Name): no $k" } }
  if ($hd['desc'].Length -gt 160) { throw "essay $($f.Name): desc longer than 160 characters" }
  $ESSAYS.Add([pscustomobject]@{ num = $esName.Groups[1].Value; slug = $esName.Groups[2].Value; hd = $hd; html = $raw.Substring($esHead.Length).Trim()
      date = [datetime]::ParseExact($hd['published'], 'yyyy-MM-dd', $INV) })
}
$esMiss = New-Object Collections.Generic.List[string]
for ($ei = 0; $ei -lt $ESSAYS.Count; $ei++) {
  $ey = $ESSAYS[$ei]; $hd = $ey.hd; $path = '/essays/' + $ey.slug; $url = $SITE + $path; $title = $hd['title']
  # every link inside the essay must lead somewhere (check-site checks again on the written pages)
  foreach ($m in [regex]::Matches($ey.html, 'href="(/[^"#]*)"')) {
    $h = $m.Groups[1].Value
    if (($h -match '^/encyclopedia/(.+)$' -and -not $BY.ContainsKey($Matches[1])) -or ($h -like '/empire/*' -and -not $EMPURL.ContainsKey($h)) -or ($h -match '^/state/(.+)$' -and -not $NODE.ContainsKey($Matches[1]))) { $esMiss.Add("$($ey.slug): $h") }
  }
  # the sections: the contents list, and the essay apart from its Further Reading
  $secs = [regex]::Matches($ey.html, '<h2 id="([^"]+)">(.*?)</h2>')
  $rm = [regex]::Match($ey.html, '<h2 id="[^"]*-reading">'); $main = if ($rm.Success) { $ey.html.Substring(0, $rm.Index).Trim() } else { $ey.html }
  $refs = if ($rm.Success) { $ey.html.Substring($rm.Index).Trim() } else { '' }
  $words = @(([regex]::Replace($main, '<[^>]+>', ' ') -split '\s+') | Where-Object { $_ }).Count; $ey | Add-Member words $words
  $mins = [Math]::Max(1, [int][Math]::Round($words / 230.0)); $ey | Add-Member mins $mins
  # the picture: an encyclopedia entry's (with its caption and credit) or a cover
  $fig = ''; $ogImg = Poster ('essay-' + $ey.slug); $ogW = 1200; $ogH = 630; $imgLd = $null; $cardImg = ''
  if ($hd['picture']) {
    $pp = $hd['picture'] -split '\|', 2; $o = $BY[$pp[0]]; if (-not $o -or -not $o.img) { throw "essay $($ey.slug): no picture for $($pp[0])" }
    # the games' 800 px copy of the same Commons file when there is one, else the entry's thumbnail
    $pic = if (Test-Path "$Repo\images\games\$($pp[0]).jpg") { "/images/games/$($pp[0]).jpg" } else { $o.img }
    $sz = ImgSize $pic; $artist = if ($o.cr) { [string]$o.cr['artist'] } else { '' }; $lic = if ($o.cr) { [string]$o.cr['licence'] } else { '' }; $src = if ($o.cr) { [string]$o.cr['source'] } else { '' }
    $fig = '<figure class="essay-fig"><img src="' + $pic + '" alt="' + (Hx $o.name) + '"' + $(if ($sz) { ' width="' + $sz[0] + '" height="' + $sz[1] + '"' } else { ' width="320"' }) + ' fetchpriority="high"><figcaption>' + (Hx $pp[1]) +
      ' <span class="essay-credit">Image: ' + ((@($(if ($artist) { Hx $artist }), $(if ($lic) { Hx $lic })) | Where-Object { $_ }) -join ' · ') + $(if ($src) { ' · <a href="' + (Hx $src) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' } else { '' }) + '</span></figcaption></figure>'
    $imgLd = ImageLd $pic $(if ($sz) { $sz[0] }) $(if ($sz) { $sz[1] }) $artist $lic $src; $cardImg = $pic
    if (-not $ogImg) { $ogImg = $pic; $ogW = $(if ($sz) { $sz[0] }); $ogH = $(if ($sz) { $sz[1] }) }
  } elseif ($hd['cover']) {
    $pp = $hd['cover'] -split '\|', 2; $sz = ImgSize $pp[0]
    $fig = '<figure class="essay-fig essay-cover"><img src="' + $pp[0] + '" alt="' + (Hx $pp[1]) + '"' + $(if ($sz) { ' width="' + $sz[0] + '" height="' + $sz[1] + '"' }) + ' fetchpriority="high"></figure>'
    $cardImg = $pp[0]; if (-not $ogImg) { $ogImg = $pp[0]; $ogW = $(if ($sz) { $sz[0] }); $ogH = $(if ($sz) { $sz[1] }) }
  }
  $ey | Add-Member pic $cardImg
  $crumb = Crumbs @(@('Home', '/'), @('Research Series', '/research-series'), @($title, $null))
  $dateTxt = $ey.date.ToString('d MMMM yyyy', $INV)
  $sb = New-Object Text.StringBuilder(40000)
  [void]$sb.Append('<main id="main" class="essay-page ref-page">' + "`n<div class=`"essay-wrap`">`n" + $crumb[0] + "`n<article class=`"essay-view`">`n")
  [void]$sb.Append('<header class="essay-head"><p class="essay-kicker"><a href="/research-series">Research Series</a> · Essay ' + $ey.num + ' · <time datetime="' + $hd['published'] + '">' + $dateTxt + '</time> · ' + $mins + ' min read</p>' +
    '<h1 class="essay-title">' + (Hx $title) + '</h1><p class="essay-sub">' + (Hx $hd['subtitle']) + '</p>' +
    '<p class="page-share-row"><button type="button" class="sp-share page-share" data-share-text="' + (Hx ($title + ': ' + $hd['subtitle'])) + '" data-share-title="' + (Hx $title) + '" data-share-heading="Share this essay" data-share-url="' + $url + '"' + $(if ($ogImg -like '/images/og/*') { ' data-share-img="' + $ogImg + '"' } else { '' }) + '>Share</button></p></header>' + "`n")
  if ($fig) { [void]$sb.Append($fig + "`n") }
  [void]$sb.Append('<nav class="essay-toc" aria-label="Contents"><p class="essay-toc-k">Contents</p><ol>' + (($secs | ForEach-Object { '<li><a href="#' + $_.Groups[1].Value + '">' + $_.Groups[2].Value + '</a></li>' }) -join '') + "</ol></nav>`n")
  [void]$sb.Append('<div class="essay-body">' + "`n" + $main + "`n</div>`n")
  if ($refs) { [void]$sb.Append('<section class="essay-reading">' + "`n" + $refs + "`n</section>`n") }
  $profs = @(($hd['profiles'] -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($profs.Count) {
    [void]$sb.Append('<section class="essay-profs"><h2 class="ref-sec-title">Profiles in this essay</h2><ul class="pcards">')
    foreach ($ps in $profs) {
      $pu = @('/empire/', '/religion/', '/language/', '/culture/', '/movement/') | ForEach-Object { $_ + $ps } | Where-Object { $EMPURL.ContainsKey($_) } | Select-Object -First 1; $em = if ($pu) { $EMPURL[$pu] } else { $null }; if (-not $em) { $esMiss.Add("$($ey.slug): profile $ps"); continue }
      $pts0 = $em['points']; [void]$sb.Append((ProfCard $pu ([string]$em['name']) $(if ($pts0) { (Yr $pts0[0][0]) + ' – ' + (Yr $pts0[-1][0]) } else { (Yr $em['start']) + ' – ' + $(if ($null -eq $em['end']) { 'present' } else { Yr $em['end'] }) }) ''))
    }
    [void]$sb.Append("</ul></section>`n")
  }
  [void]$sb.Append((CiteBox $title $url 'Research Series') + "`n")
  $pv = if ($ei -gt 0) { $ESSAYS[$ei - 1] } else { $null }; $nx = if ($ei -lt $ESSAYS.Count - 1) { $ESSAYS[$ei + 1] } else { $null }
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Other essays">' + $(if ($pv) { '<a class="prev" rel="prev" href="/essays/' + $pv.slug + '"><span class="lbl">&larr; Essay ' + $pv.num + '</span><span class="nm">' + (Hx $pv.hd['title']) + '</span></a>' } else { '' }) +
    $(if ($nx) { '<a class="next" rel="next" href="/essays/' + $nx.slug + '"><span class="lbl">Essay ' + $nx.num + ' &rarr;</span><span class="nm">' + (Hx $nx.hd['title']) + '</span></a>' } else { '' }) + "</nav>`n")
  [void]$sb.Append('<p class="enc-article-foot"><a class="enc-random-link" href="/research-series">All essays in the Research Series &rarr;</a></p>' + "`n</article>`n</div>`n</main>`n")
  $cites = @([regex]::Matches($refs, '<li>(.*?)</li>') | ForEach-Object { Js ([System.Net.WebUtility]::HtmlDecode(([regex]::Replace($_.Groups[1].Value, '<[^>]+>', '')))) })
  $ld = $crumb[1] + ',{"@type":"Article","headline":' + (Js $title) + ',"alternativeHeadline":' + (Js $hd['subtitle']) + ',"description":' + (Js $hd['desc']) + ',"url":' + (Js $url) + ',"mainEntityOfPage":' + (Js $url) +
    ',"inLanguage":"en-GB","datePublished":"' + $hd['published'] + '","dateModified":"@@MOD@@","wordCount":' + $words + ',"author":' + $ORG + ',"publisher":' + $ORG +
    ',"isPartOf":{"@type":"CreativeWorkSeries","name":"Research Series","url":"' + $SITE + '/research-series"},"position":' + [int]$ey.num +
    $(if ($imgLd) { ',"image":' + $imgLd } elseif ($ogImg) { ',"image":' + (Js ($SITE + $ogImg)) } else { '' }) + $(if ($cites.Count) { ',"citation":[' + ($cites -join ',') + ']' } else { '' }) + '}'
  Emit $path (Page @{ title = $title + ': ' + $hd['subtitle'] + ' — The Epoch Institute'; desc = $hd['desc']; path = $path; type = 'article'; img = $ogImg; imgW = $ogW; imgH = $ogH; ld = $ld; nav = 'series'; body = $sb.ToString() })
}
if ($esMiss.Count) { throw ("essays: unknown links " + (($esMiss | Sort-Object -Unique) -join ', ')) }
# the cards of /research-series, and its old addresses (the essays opened inside that page: #series-01 ...) forwarded
SetBlock "$Repo\research-series" 'essays' ('<script>(function(){var s={' + (($ESSAYS | ForEach-Object { '"' + $_.num + '":"' + $_.slug + '"' }) -join ',') + '},m=/^#series-(\d\d)$/.exec(location.hash);if(m&&s[m[1]])location.replace("/essays/"+s[m[1]]);})();</script>' + "`n" +
  '<ul class="rs-grid">' + (($ESSAYS | ForEach-Object {
  '<li><a class="rs-card" href="/essays/' + $_.slug + '">' + $(if ($_.pic) { '<span class="rs-pic"><img src="' + $_.pic + '" alt="" loading="lazy"></span>' } else { '' }) +
  '<span class="rs-b"><span class="rs-num">Series ' + $_.num + '</span><span class="rs-title">' + (Hx $_.hd['title']) + '</span><span class="rs-sub">' + (Hx $_.hd['subtitle']) + '</span><span class="rs-desc">' + (Hx $_.hd['card']) + '</span>' +
  '<span class="rs-foot"><span class="rs-cta">Read the essay &rarr;</span><span class="rs-time">' + $_.mins + ' min read</span></span></span></a></li>' }) -join '') + '</ul>')
# feed.xml: the essays, newest first (the guid of each stays the old #series-NN address, so readers see none twice)
$fx = New-Object Text.StringBuilder
[void]$fx.Append('<?xml version="1.0" encoding="UTF-8"?>' + "`n" + '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">' + "`n  <channel>`n    <title>The Epoch Institute — Research Series</title>`n    <link>$SITE/research-series</link>`n    <description>Thematic essays on civilisational rise and collapse.</description>`n    <language>en-gb</language>`n    <atom:link href=`"$SITE/feed.xml`" rel=`"self`" type=`"application/rss+xml`"/>`n")
foreach ($ey in @($ESSAYS | Sort-Object @{ e = { $_.date }; Descending = $true }, @{ e = { $_.num }; Descending = $true })) {
  [void]$fx.Append("    <item>`n      <title>" + (Hx "Series $($ey.num) — $($ey.hd['title'])") + "</title>`n      <link>$SITE/essays/$($ey.slug)</link>`n      <description>" + (Hx "$($ey.hd['subtitle']). $($ey.hd['card'])") + "</description>`n" +
    "      <pubDate>" + $ey.date.ToString('ddd, dd MMM yyyy', $INV) + " 09:00:00 +0000</pubDate>`n      <guid isPermaLink=`"false`">$SITE/research-series#series-$($ey.num)</guid>`n    </item>`n")
}
[void]$fx.Append("  </channel>`n</rss>`n")
if ([EpochBuild.W]::WriteIfChanged("$Repo\feed.xml", $fx.ToString())) { $NWRITE++ }
Say "research essays: $($ESSAYS.Count) ($((($ESSAYS | ForEach-Object { $_.words }) | Measure-Object -Sum).Sum) words)"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Community articles: /articles/<slug> from data/community/articles.json and the build:articles block of /community,
# which links its cards to these pages. An article the Institute accepts (sent through the /community form or by
# email) is added to the file by hand: {title: a key, author, ts: the date in milliseconds, content: [paragraphs]}
# (until Oct 2026 it was a snapshot of the articles approved in a Google Apps Script). The texts are the authors' own;
# only their layout is made here: leading short lines in capitals are the title (with the next as its second half and
# a third as the subtitle), "PART n …" lines are sections, other short unpunctuated lines subheadings (leading emoji
# dropped), "Source: …" lines source notes, "— End of Document —" is dropped. scripts/community-overrides.tsv: the key
# (title), slug, title, subtitle, author (an empty field keeps what the text gives; no author = "A community contributor").
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$CMOV = @{}
if (Test-Path "$PSScriptRoot\community-overrides.tsv") { foreach ($l in [IO.File]::ReadAllLines("$PSScriptRoot\community-overrides.tsv", $U8)) { if ($l.Trim() -and -not $l.StartsWith('#')) { $c = $l.Split("`t"); $CMOV[$c[0]] = $c } } }
function CmTitleCase([string]$s) {   # "SATI PRATHA" -> "Sati Pratha"; small words stay lower inside
  $small = @('a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with')
  $w = $s.ToLowerInvariant() -split ' '
  for ($i = 0; $i -lt $w.Count; $i++) { if ($w[$i] -and ($i -eq 0 -or $small -notcontains $w[$i])) { $w[$i] = $w[$i].Substring(0, 1).ToUpperInvariant() + $w[$i].Substring(1) } }
  return ($w -join ' ')
}
function CmHead([string]$s) { return ($s -replace '^[^\p{L}\p{N}"“(]+', '').Trim() }   # a heading without its leading emoji
$CMART = New-Object Collections.Generic.List[object]
$cmFile = "$Repo\data\community\articles.json"
# (ConvertFrom-Json hands an array over whole: unrolled here, or "[]" would be one empty article)
$cmList = if (Test-Path $cmFile) { @(([IO.File]::ReadAllText($cmFile, $U8) | ConvertFrom-Json) | ForEach-Object { $_ }) } else { @() }
foreach ($x in $cmList) {
  $ov = $CMOV[[string]$x.title]
  $paras = @($x.content | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ -and $_ -notmatch '^[—–-]+\s*End of Document\s*[—–-]+$' })
  $k = 0; $title = ''; $sub = ''
  if ($paras.Count -and $paras[0].Length -lt 90 -and $paras[0] -ceq $paras[0].ToUpperInvariant() -and $paras[0] -match '\p{Lu}') {
    $lead = New-Object Collections.Generic.List[string]
    while ($k -lt $paras.Count -and $lead.Count -lt 3 -and $paras[$k].Length -lt 90 -and $paras[$k] -notmatch '[.:;!?]$' -and $paras[$k] -notmatch '^(PART\b|Source:)') { $lead.Add($paras[$k]); $k++ }
    $title = (CmTitleCase $lead[0]) + $(if ($lead.Count -ge 2) { ': ' + $lead[1] } else { '' }); if ($lead.Count -ge 3) { $sub = $lead[2] }
  } else { $title = CmTitleCase ((([string]$x.title) -replace '^Copy of\s+', '' -replace '[_]+', ' ').Trim()) }
  if ($ov -and $ov.Count -gt 2 -and $ov[2]) { $title = $ov[2] }; if ($ov -and $ov.Count -gt 3 -and $ov[3]) { $sub = $ov[3] }
  $author = if ($ov -and $ov.Count -gt 4 -and $ov[4]) { $ov[4] } elseif (([string]$x.author).Trim()) { ([string]$x.author).Trim() } else { 'A community contributor' }
  $slug = if ($ov -and $ov.Count -gt 1 -and $ov[1]) { $ov[1] } else { (($title.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '').ToLowerInvariant() -replace "['’]", '' -replace '[^a-z0-9]+', '-').Trim('-') }
  $body = New-Object Text.StringBuilder; $words = 0; $first = ''
  for ($i = $k; $i -lt $paras.Count; $i++) {
    $p = $paras[$i]
    if ($p -match '^Source:\s*(.+)$') { [void]$body.Append('<p class="cm-src">Source: ' + (Hx $Matches[1]) + "</p>`n"); continue }
    if ($p -match '^PART\s+(\w+)\s*[—–:-]+\s*(.+)$') { [void]$body.Append('<h2>Part ' + (Hx $Matches[1]) + ' — ' + (Hx (CmHead $Matches[2])) + "</h2>`n"); continue }
    if ($p.Length -lt 100 -and $p -notmatch '[.:;!?,]$') { [void]$body.Append('<h3>' + (Hx (CmHead $p)) + "</h3>`n"); continue }
    if (-not $first) { $first = $p }
    $words += @($p -split '\s+' | Where-Object { $_ }).Count
    [void]$body.Append('<p>' + (Hx $p) + "</p>`n")
  }
  $desc = [regex]::Match($first, '^.+?[.!?](?=\s|$)').Value; if (-not $desc) { $desc = $first }
  if ($desc.Length -gt 158) { $desc = $desc.Substring(0, $desc.LastIndexOf(' ', 155)) + '…' }
  $when = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$x.ts).UtcDateTime; $iso = $when.ToString('yyyy-MM-dd', $INV); $dateTxt = $when.ToString('d MMMM yyyy', $INV)
  $mins = [Math]::Max(1, [int][Math]::Round($words / 230.0))
  $path = '/articles/' + $slug; $url = $SITE + $path
  $crumb = Crumbs @(@('Home', '/'), @('Community', '/community'), @($title, $null))
  $sb = New-Object Text.StringBuilder(30000)
  [void]$sb.Append('<main id="main" class="essay-page ref-page">' + "`n<div class=`"essay-wrap`">`n" + $crumb[0] + "`n<article class=`"essay-view cm-article`">`n")
  [void]$sb.Append('<header class="essay-head"><p class="essay-kicker"><a href="/community">Community</a> · <time datetime="' + $iso + '">' + $dateTxt + '</time> · ' + $mins + ' min read</p>' +
    '<h1 class="essay-title">' + (Hx $title) + '</h1>' + $(if ($sub) { '<p class="essay-sub">' + (Hx $sub) + '</p>' } else { '' }) + '<p class="cm-by">By ' + (Hx $author) + '</p>' +
    '<p class="page-share-row"><button type="button" class="sp-share page-share" data-share-text="' + (Hx $title) + '" data-share-title="' + (Hx $title) + '" data-share-heading="Share this article" data-share-url="' + $url + '">Share</button></p></header>' + "`n")
  [void]$sb.Append('<aside class="cm-note"><p>Community articles are written by the Institute''s readers and published as they were submitted, with light formatting. Their views, facts and sources are the author''s own and have not been checked by the Institute. <a href="/contact?topic=correction&amp;page=' + $path + '">Suggest a correction</a> · <a href="/contributors">Write for the Institute</a></p></aside>' + "`n")
  [void]$sb.Append('<div class="essay-body cm-body">' + "`n" + $body.ToString() + "</div>`n")
  [void]$sb.Append('<p class="enc-article-foot"><a class="enc-random-link" href="/community">More from the community &rarr;</a></p>' + "`n</article>`n</div>`n</main>`n")
  $ld = $crumb[1] + ',{"@type":"Article","headline":' + (Js $title) + $(if ($sub) { ',"alternativeHeadline":' + (Js $sub) } else { '' }) + ',"description":' + (Js $desc) + ',"url":' + (Js $url) + ',"mainEntityOfPage":' + (Js $url) +
    ',"inLanguage":"en","datePublished":"' + $iso + '","dateModified":"@@MOD@@","wordCount":' + $words + ',"author":{"@type":"Person","name":' + (Js $author) + '},"publisher":' + $ORG +
    ',"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"}}'
  Emit $path (Page @{ title = $title + ' — Community — The Epoch Institute'; desc = $desc; path = $path; type = 'article'; ld = $ld; nav = 'community'; body = $sb.ToString() })
  $CMART.Add([pscustomobject]@{ key = [string]$x.title; path = $path; title = $title; author = $author; iso = $iso; excerpt = $(if ($first.Length -gt 180) { $first.Substring(0, $first.LastIndexOf(' ', 178)) + '…' } else { $first }) })
}
# /community: its article cards, each opening the article's page
SetBlock "$Repo\community" 'articles' ('<script>var BUILT_ARTICLES = {' + (($CMART | ForEach-Object { (Js $_.key) + ':{h:' + (Js $_.path) + ',t:' + (Js $_.title) + ',a:' + (Js $_.author) + ',d:' + (Js $_.iso) + ',e:' + (Js $_.excerpt) + '}' }) -join ',') + '};</script>')
Say "community articles: $($CMART.Count)"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Teachers' corner: /teachers/ (a guide) and printable worksheets on the reading paths (/teachers/path-<slug>) and
# the centuries (/teachers/century-<slug>), wherever the data gives at least one task (two for a century). Every task comes from the data, never from made-up claims: stops or events
# put in order by their first year, people matched to their lifespans, the numbered states of a map named from a word
# bank, glossary terms the texts use, and questions built on each path stop's own "why". The answer key is folded on
# screen; "Print with the answers" (enc-page.js) opens it, and it prints on a page of its own.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'teachers corner'
# (WsShuffle, WsSpread, WsItem and WsSteps are defined before the century pages, with Test yourself)
# glossary terms: whole words, case apart; everyday words that are also terms (materials, crops, coins of the realm)
# are left out, and a sheet takes the rarest of those it mentions
$WSSTOP = @{}; foreach ($w in 'Well', 'Talent', 'Theatre', 'Silver', 'Silk', 'Tea', 'Cotton', 'Camel', 'Cattle', 'Copper', 'Bronze', 'Rice', 'Steel', 'Timber', 'Tin', 'Leather', 'Coal', 'Bead', 'Flax', 'Pepper', 'Yang', 'Skat', 'Riesling', 'Terp', 'Vogt', 'Charcoal', 'Cinnamon', 'Cloves', 'Nutmeg', 'Maize', 'Potato', 'Tomato', 'Peanut', 'Groundnut', 'Sorghum', 'Millet', 'Rye', 'Sesame', 'Pulses', 'Indigo', 'Rubber', 'Shawl', 'Kora', 'Tanka', 'Rajab', 'Insulin', 'Gamay', 'Pinot noir', 'Percheron', 'Union Flag', 'Flag of Denmark', 'Iron Curtain', 'Hellanodikai', 'Tin', 'Ebony', 'Natron', 'Phosphate', 'Calabash', 'Benzoin resin', 'Camphor', 'Myrrh', 'Incense', 'Sugarcane', 'Cassava', 'Sweet potato', 'Olive oil', 'Palm oil', 'Oil palm', 'Kola nut', 'Yerba mate', 'Cacao', 'Sling', 'Lance', 'Pike', 'Archery', 'Well') { $WSSTOP[$w] = 1 }
$WSTERMS = New-Object Collections.Generic.List[object]
foreach ($e in $TERMS) {
  if ($WSSTOP.ContainsKey($e.name)) { continue }
  $names = @($e.name) + @($e.aka | Where-Object { ([string]$_).Length -ge 4 })
  $rx = '(?<![\p{L}\p{N}])(?:' + (($names | ForEach-Object { [regex]::Escape(([string]$_ -replace '\s*\([^)]*\)$', '')) }) -join '|') + ')(?![\p{L}\p{N}])'
  $WSTERMS.Add([pscustomobject]@{ e = $e; rx = New-Object Regex ($rx, [Text.RegularExpressions.RegexOptions]::IgnoreCase) })
}
function WsTermsIn([string]$text) { $found = New-Object Collections.Generic.List[object]; foreach ($t in $WSTERMS) { if ($t.rx.IsMatch($text)) { $found.Add($t.e) } }; return $found }
# the sheets' data first (the rarest terms need every sheet's terms), then the pages
$NODEBYP = @{}; foreach ($n in $POL['nodes']) { if ($n['p']) { $NODEBYP[[string]$n['p']] = $n } }
$WSDEG = @{}; foreach ($l in $POL['links']) { $WSDEG[[string]$l['s']] = 1 + [int]$WSDEG[[string]$l['s']]; $WSDEG[[string]$l['t']] = 1 + [int]$WSDEG[[string]$l['t']] }
$SHEETS = New-Object Collections.Generic.List[object]; $TERMDF = @{}
foreach ($p in $RP) {
  $steps = WsSteps $p
  $shT = WsTermsIn (([string]$p['intro']) + ' ' + ((@($p['steps']) | ForEach-Object { [string]$_['why'] }) -join ' '))
  foreach ($t in $shT) { $TERMDF[$t.slug] = 1 + [int]$TERMDF[$t.slug] }
  $SHEETS.Add([pscustomobject]@{ kind = 'path'; slug = 'path-' + [string]$p['slug']; p = $p; steps = $steps; terms = $shT })
}
foreach ($c in $CENTPAGES) {
  $ii = $CENTINFO[$c]
  $evI = @($ii.evs | Where-Object { $_.dates -notmatch '^\s*c\.' } | ForEach-Object { WsItem $_ '' })
  $ppI = @($ii.ppl | ForEach-Object { WsItem $_ '' } | Where-Object { $_.life })
  $txt = ((@($ii.evs | Select-Object -First 12) + @($ii.ppl | Select-Object -First 12)) | ForEach-Object { [EpochBuild.W]::Summary($_.desc, 300) }) -join ' '
  $shT = WsTermsIn $txt; foreach ($t in $shT) { $TERMDF[$t.slug] = 1 + [int]$TERMDF[$t.slug] }
  $SHEETS.Add([pscustomobject]@{ kind = 'century'; slug = 'century-' + $ii.slug; c = $c; ev = $evI; pp = $ppI; terms = $shT })
}
function WsLines([int]$n) { '<span class="ws-lines" aria-hidden="true">' + ('<span></span>' * $n) + '</span>' }
function WsTask([int]$n, [string]$head, [string]$how, [string]$html) { '<section class="ws-task"><h2><span class="ws-n">' + $n + '</span>' + $head + '</h2>' + $(if ($how) { '<p class="ws-how">' + $how + '</p>' } else { '' }) + $html + "</section>`n" }
function WsOrderTask($items, [string]$seed) {   # @(task html, key html)
  $mix = WsShuffle $items $seed
  $t = '<ul class="ws-order">' + (($mix | ForEach-Object { '<li><span class="ws-box" aria-hidden="true"></span><span>' + (Hx $_.name) + '</span></li>' }) -join '') + '</ul>'
  $k = '<ol class="ws-key-list">' + (($items | ForEach-Object { '<li>' + (Hx $_.name) + ' <span>' + (Hx $(if ($_.kind -eq 'person') { 'born ' + $(if ($_.dates -match '^\s*c\.') { 'c. ' } else { '' }) + (Yr $_.y) } elseif ($_.kind -eq 'state') { 'from ' + (Yr $_.y) } else { $_.dates })) + '</span></li>' }) -join '') + '</ol>'
  return @($t, $k)
}
function WsMatchTask($people, [string]$seed) {
  $ds = WsShuffle $people ($seed + '-d')
  $t = '<div class="ws-match"><ol class="ws-ma" type="A">' + (($people | ForEach-Object { '<li>' + (Hx $_.name) + '</li>' }) -join '') + '</ol><ol class="ws-mb">' + (($ds | ForEach-Object { '<li><span class="ws-box" aria-hidden="true"></span>' + (Hx $_.dates) + '</li>' }) -join '') + '</ol></div>'
  $k = '<ol class="ws-key-list" type="A">' + (($people | ForEach-Object { $pi = $_; '<li>' + (Hx $pi.name) + ' <span>' + ([array]::IndexOf(@($ds), $pi) + 1) + ': ' + (Hx $pi.dates) + '</span></li>' }) -join '') + '</ol>'
  return @($t, $k)
}
function WsTermTask($tl) {
  $t = '<ul class="ws-terms">' + (($tl | ForEach-Object { '<li><b>' + (Hx $_.name) + '</b>' + (WsLines 2) + '</li>' }) -join '') + '</ul>'
  $k = '<dl class="ws-key-terms">' + (($tl | ForEach-Object { '<dt>' + (Hx $_.name) + '</dt><dd>' + (Hx ([EpochBuild.W]::FirstSentence($_.desc, 220))) + '</dd>' }) -join '') + '</dl>'
  return @($t, $k)
}
function WsPage($sh, [string]$kicker, [string]$title, [string]$lede, [string]$online, [string]$onlineLbl, $tasks, $keys, [string]$desc) {
  $path = '/teachers/' + $sh.slug; $WSOK[$sh.slug] = 1
  $crumb = Crumbs @(@('Home', '/'), @("Teachers' Corner", '/teachers/'), @($title, $null))
  $sb = New-Object Text.StringBuilder(20000)
  [void]$sb.Append('<main id="main" class="ws-page ref-page">' + "`n<div class=`"ws-wrap`">`n" + $crumb[0] + "`n<article class=`"ws-sheet`">`n")
  [void]$sb.Append('<header class="ws-head"><p class="ws-kicker">' + $kicker + '</p><h1 class="ws-title">' + (Hx $title) + '</h1><p class="ws-lede">' + $lede + '</p>' +
    '<p class="ws-who" aria-hidden="true"><span>Name</span><span>Class</span><span>Date</span></p>' +
    '<p class="ws-tools"><button type="button" class="ws-print" data-key="0">Print the worksheet</button><button type="button" class="ws-print" data-key="1">Print with the answers</button><a href="' + $online + '">' + $onlineLbl + ' &rarr;</a></p></header>' + "`n")
  $n = 0; foreach ($t in $tasks) { $n++; [void]$sb.Append((WsTask $n $t[0] $t[1] $t[2])) }
  [void]$sb.Append('<p class="ws-src">From The Epoch Institute: ' + (Hx ($SITE -replace '^https://', '')) + $online + '. Free to print and copy for use in class.</p>' + "`n")
  [void]$sb.Append('<details class="ws-key" id="answers"><summary>Answer key</summary><div class="ws-key-b"><p class="ws-key-t">Answer key: ' + (Hx $title) + '</p>')
  $n = 0; foreach ($k in $keys) { $n++; if ($k) { [void]$sb.Append('<section><h2><span class="ws-n">' + $n + '</span>' + $k[0] + '</h2>' + $k[1] + '</section>') } }
  [void]$sb.Append("</div></details>`n</article>`n</div>`n</main>`n")
  $ld = $crumb[1] + ',{"@type":"LearningResource","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + ',"learningResourceType":"Worksheet","educationalLevel":"Secondary school","inLanguage":"en-GB","isAccessibleForFree":true,"publisher":' + $ORG + '}'
  Emit $path (Page @{ title = $title + " — Teachers' Corner — The Epoch Institute"; desc = $desc; path = $path; type = 'website'; ld = $ld; nav = 'teachers'; body = $sb.ToString() })
}
$wsN = @{ path = 0; century = 0 }; $WSOK = @{}
foreach ($sh in $SHEETS) {
  $shT = @($sh.terms | Sort-Object @{ e = { $TERMDF[$_.slug] } }, @{ e = { $_.name } } | Select-Object -First 5 | Sort-Object { $_.name })
  $tasks = New-Object Collections.Generic.List[object]; $keys = New-Object Collections.Generic.List[object]
  if ($sh.kind -eq 'path') {
    $p = $sh.p; $title = 'Worksheet: ' + [string]$p['title']; $online = '/paths/' + [string]$p['slug']
    $ord = WsSpread $sh.steps 6 10
    if ($ord.Count -ge 3) { $r = WsOrderTask $ord $sh.slug; $tasks.Add(@('Put the stops in order', ('Number the stops from 1 (earliest) to ' + $ord.Count + ' (latest), by when each began: a state&#8217;s founding, a person&#8217;s birth, the date of an event.'), $r[0])); $keys.Add(@('Put the stops in order', $r[1])) }
    $ppl = @($sh.steps | Where-Object { $_.life } | Select-Object -First 6)
    if ($ppl.Count -ge 3) { $r = WsMatchTask $ppl $sh.slug; $tasks.Add(@('Match the people to their dates', 'Write the number of the right dates next to each person. Their pages on the path will help.', $r[0])); $keys.Add(@('Match the people to their dates', $r[1])) }
    if ($shT.Count -ge 2) { $r = WsTermTask $shT; $tasks.Add(@('Key terms', 'The path uses these words. Explain each one in your own words.', $r[0])); $keys.Add(@('Key terms', $r[1])) }
    if (-not $tasks.Count) { Say "  no worksheet for $($sh.slug): no task from the data"; continue }
    # questions built on the path's own reasons for its stops: the first, one from the middle, the last
    $st = $sh.steps.ToArray(); $mi = [int][Math]::Floor($st.Count / 2)
    $qs = @(
      ('Stop 1, <b>' + (Hx $st[0].name) + '</b>. The path begins here because: &#8220;' + (Hx $st[0].why) + '&#8221; What does this stop tell you about how the story began?'),
      ('Stop ' + $st[$mi].n + ', <b>' + (Hx $st[$mi].name) + '</b>: &#8220;' + (Hx $st[$mi].why) + '&#8221; Find one detail on its page that supports this, and one question it leaves open.'),
      ('Stop ' + $st[-1].n + ', <b>' + (Hx $st[-1].name) + '</b>: &#8220;' + (Hx $st[-1].why) + '&#8221; How does this last stop connect to an earlier one?'),
      ('The path sums itself up as: &#8220;' + (Hx ([string]$p['tagline'])) + '&#8221; Which stop shows this best? Explain your choice.'))
    $tasks.Add(@('Think and discuss', '', ('<ol class="ws-qs">' + (($qs | ForEach-Object { '<li><p>' + $_ + '</p>' + (WsLines 3) + '</li>' }) -join '') + '</ol>'))); $keys.Add(@('Think and discuss', '<p class="ws-key-note">Open questions: answers will vary. Good answers use details from the pages of the path.</p>'))
    $lede = Hx ([string]$p['tagline']) + ' A worksheet for the reading path of ' + @($p['steps']).Count + ' stops: read the stops online, then answer.'
    $desc = [EpochBuild.W]::Summary('A printable worksheet for the reading path ' + [string]$p['title'] + ': put the stops in order, match people to their dates, key terms and questions, with an answer key.', 155)
    WsPage $sh 'Worksheet &middot; Reading path' $title $lede $online 'Open the path' $tasks $keys $desc; $wsN.path++
  } else {
    $c = $sh.c; $ii = $CENTINFO[$c]; $ct = CentTitle $c; $title = 'Worksheet: The ' + $ct; $online = '/centuries/' + $ii.slug
    # the map: numbered profiles (else states) alive at mid-century with a known seat, spread out
    $cand = New-Object Collections.Generic.List[object]; $seen = @{}
    foreach ($em in $ii.pw) { $n = $NODEBYP['/empire/' + [EpochBuild.W]::ToSlug([string]$em['name'])]; if ($n -and -not $seen.ContainsKey([string]$n['id'])) { $seen[[string]$n['id']] = 1; $cand.Add($n) } }
    # (a profile only while it still had some strength: the Abbasid caliphs of 1450 were a title in Cairo, not Baghdad)
    $more = @($POL['nodes'] | Where-Object { (Alive $_ $ii.mid) -and -not $seen.ContainsKey([string]$_['id']) -and (-not $_['p'] -or ($EMPURL.ContainsKey([string]$_['p']) -and (PowerAt $EMPURL[[string]$_['p']] $ii.mid) -ge 2)) } | Sort-Object @{ e = { if ($_['p']) { 0 } else { 1 } } }, @{ e = { -[int]$WSDEG[[string]$_['id']] } }, @{ e = { [string]$_['n'] } })
    foreach ($n in $more) { $cand.Add($n) }
    $cand = @($cand | Where-Object { $q = $STATEXY[[string]$_['id']]; $q -and -not $q[2] } | Select-Object -First 60)
    $mapT = $null
    if ($cand.Count -ge 4) {
      # the view fits the best-known twelve; the numbers go to the best-ranked states inside it that keep apart
      $v0 = FitView @($cand | Select-Object -First 12 | ForEach-Object { $STATEXY[[string]$_['id']] }) 240 1.9 0.16
      if ($v0[0] -lt 0) { $v0[0] = 0 }; if ($v0[1] -lt 0) { $v0[1] = 0 }; if ($v0[0] + $v0[2] -gt 1000) { $v0[0] = [Math]::Max(0, 1000 - $v0[2]) }; if ($v0[1] + $v0[3] -gt $MAPH) { $v0[1] = [Math]::Max(0, $MAPH - $v0[3]) }
      $dmin = $v0[2] * 0.045; $pick = New-Object Collections.Generic.List[object]
      foreach ($n in $cand) { $q = $STATEXY[[string]$n['id']]; if ($q[0] -lt $v0[0] + $dmin / 2 -or $q[0] -gt $v0[0] + $v0[2] - $dmin / 2 -or $q[1] -lt $v0[1] + $dmin / 2 -or $q[1] -gt $v0[1] + $v0[3] - $dmin / 2) { continue }; $ok = $true; foreach ($o in $pick) { $qo = $STATEXY[[string]$o['id']]; if ([Math]::Sqrt(($q[0] - $qo[0]) * ($q[0] - $qo[0]) + ($q[1] - $qo[1]) * ($q[1] - $qo[1])) -lt $dmin) { $ok = $false; break } }; if ($ok) { $pick.Add($n); if ($pick.Count -ge 8) { break } } }
      if ($pick.Count -ge 4) {
        $r0 = $v0[2] * 0.017; $pins = New-Object Text.StringBuilder; $i = 0
        foreach ($n in $pick) { $i++; $q = $STATEXY[[string]$n['id']]; [void]$pins.Append('<g><circle cx="' + (Fx $q[0]) + '" cy="' + (Fx $q[1]) + '" r="' + (Fx $r0) + '"/><text x="' + (Fx $q[0]) + '" y="' + (Fx ($q[1] + $r0 * 0.42)) + '" font-size="' + (Fx ($r0 * 1.2)) + '">' + $i + '</text></g>') }
        $bank = WsShuffle $pick.ToArray() ($sh.slug + '-map')
        $mapT = @(('<figure class="ws-mapfig">' + (MapSvg $v0 ('<g class="ws-pins">' + $pins.ToString() + '</g>') ('Map: ' + $pick.Count + ' numbered states of the world in ' + (Yr $ii.mid)) 'map-world ws-map') + '<figcaption>The world in ' + (Hx (Yr $ii.mid)) + '</figcaption></figure>' +
          '<p class="ws-bank"><b>Word bank:</b> ' + (($bank | ForEach-Object { Hx ([string]$_['n']) }) -join ' &middot; ') + '</p><ol class="ws-blanks">' + (($pick | ForEach-Object { '<li><span class="ws-line1"></span></li>' }) -join '') + '</ol>'),
          ('<ol class="ws-key-list">' + (($pick | ForEach-Object { '<li>' + (Hx ([string]$_['n'])) + ' <span>' + (Hx (Span $_)) + '</span></li>' }) -join '') + '</ol>'))
      }
    }
    if ($mapT) { $tasks.Add(@('Name the states on the map', ('Each number marks the capital or seat of a state that existed in ' + (Hx (Yr $ii.mid)) + '. Write its name from the word bank on the line with the same number.'), $mapT[0])); $keys.Add(@('Name the states on the map', $mapT[1])) }
    $ord = WsSpread $sh.ev 6 3
    if ($ord.Count -ge 3) { $r = WsOrderTask $ord $sh.slug; $tasks.Add(@('Put the events in order', ('Number the events from 1 (earliest) to ' + $ord.Count + ' (latest).'), $r[0])); $keys.Add(@('Put the events in order', $r[1])) }
    $ppl = @($sh.pp | Select-Object -First 6)
    if ($ppl.Count -ge 3) { $r = WsMatchTask $ppl $sh.slug; $tasks.Add(@('Match the people to their dates', 'Write the number of the right dates next to each person. Look them up in the encyclopedia.', $r[0])); $keys.Add(@('Match the people to their dates', $r[1])) }
    if ($shT.Count -ge 2) { $r = WsTermTask $shT; $tasks.Add(@('Key terms', 'These words appear in the entries of this century. Explain each one in your own words.', $r[0])); $keys.Add(@('Key terms', $r[1])) }
    if ($tasks.Count -lt 2) { Say "  no worksheet for $($sh.slug): too little for two tasks"; continue }
    $cs = $CSTAT[$c]
    $qs = @(('In ' + (Hx $ii.dec) + ', ' + $cs.founded.Count.ToString('N0') + ' recorded states were founded and ' + $cs.ended.Count.ToString('N0') + ' came to an end. Choose one of each from the century page. What happened to them?'))
    if ($ii.pw.Count) { $qs += 'The great powers of the age included ' + (ProseList @($ii.pw | Select-Object -First 3 | ForEach-Object { 'the ' + (Hx ([string]$_['name'])) })) + '. Choose one: what made it strong in these hundred years, and what threatened it?' }
    if ($ord.Count -ge 3 -and $ppl.Count -ge 3) { $qs += 'Choose one event from the list and one person. How might they be connected? Use the encyclopedia to find out.' }
    $qs += 'If you could visit one place in the ' + (Hx $c) + ', where would you go, and what would you hope to see?'
    $tasks.Add(@('Think and discuss', '', ('<ol class="ws-qs">' + (($qs | ForEach-Object { '<li><p>' + $_ + '</p>' + (WsLines 3) + '</li>' }) -join '') + '</ol>'))); $keys.Add(@('Think and discuss', '<p class="ws-key-note">Open questions: answers will vary. Good answers name states, people and events from the century page.</p>'))
    $lede = 'A worksheet on ' + (Hx $ii.dec) + ': the states, events and people of the century. Use its page to find the answers.'
    $desc = [EpochBuild.W]::Summary('A printable worksheet on the ' + $c + ': name the states on the map, put events in order, match people to their dates and discuss, with an answer key.', 155)
    WsPage $sh 'Worksheet &middot; History by century' $title $lede $online 'Open the century page' $tasks $keys $desc; $wsN.century++
  }
}
# the guide: how to use the site in class, and every worksheet
$crumb = Crumbs @(@('Home', '/'), @("Teachers' Corner", $null))
$sb = New-Object Text.StringBuilder(40000)
[void]$sb.Append('<main id="main" class="ws-page ref-page">' + "`n<div class=`"ws-wrap ws-guide`">`n" + $crumb[0] + "`n")
[void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Teachers&#8217; Corner</h1><p class="ref-lede">Free resources for teaching world history with the Institute: ' + ($wsN.path + $wsN.century) + ' printable worksheets with answer keys on the reading paths and the centuries, and ideas for using the atlas, the timeline and the games in class.</p></header>' + "`n")
[void]$sb.Append('<section class="ws-guide-sec"><h2 class="ref-sec-title">Printable worksheets</h2><p>Each worksheet prints on a few A4 pages and draws only on the Institute&#8217;s pages: pupils read the reading path or the century page, then put stops or events in order, match people to their dates, explain key terms and answer open questions. The century sheets add a map with numbered states to name. The answer key prints on a page of its own: use <b>Print with the answers</b> on the sheet.</p>' +
  '<h3 class="ws-guide-h">Reading paths <span class="n">' + $wsN.path + '</span></h3><ul class="ws-guide-list">' + (($RP | Where-Object { $WSOK.ContainsKey('path-' + $_['slug']) } | ForEach-Object { '<li><a href="/teachers/path-' + $_['slug'] + '">' + (Hx ([string]$_['title'])) + '</a></li>' }) -join '') + '</ul>' +
  '<h3 class="ws-guide-h">Centuries <span class="n">' + $wsN.century + '</span></h3><ul class="ws-guide-list ws-guide-cents">' + (($CENTPAGES | Where-Object { $WSOK.ContainsKey('century-' + (CenturySlug $_)) } | ForEach-Object { '<li><a href="/teachers/century-' + (CenturySlug $_) + '">' + (Hx (CentTitle $_)) + '</a></li>' }) -join '') + "</ul></section>`n")
[void]$sb.Append('<section class="ws-guide-sec"><h2 class="ref-sec-title">Ideas for the classroom</h2><dl class="ws-ideas">' +
  '<dt><a href="/paths/">Reading paths</a></dt><dd>Twenty-eight guided routes of five to nine stops, each with a line on why it matters. Set a path as reading before a lesson, or give each group a different stop to present.</dd>' +
  '<dt><a href="/atlas">Atlas</a> and <a href="/timeline">World Timeline</a></dt><dd>On a projector, move the atlas&#8217;s year slider through a century and ask what appears and disappears; the timeline shows which states lived at the same time. <a href="/years/">Year pages</a> collect what happened in a single year.</dd>' +
  '<dt><a href="/today-in-history/">Today in History</a></dt><dd>A page for every day of the year: a quick start to a lesson with the anniversaries of the day.</dd>' +
  '<dt><a href="/games">Games</a> and the <a href="/quiz">daily quiz</a></dt><dd>Order the Ages and Which Came First? practise chronology; Globe Hunt practises geography; History Connections asks pupils to group people, events and works by what links them.</dd>' +
  '<dt><a href="/kids">Kids Corner</a> and Kids mode</dt><dd>For younger pupils: the star in the menu bar switches the whole site to larger text and short versions of the long pages, with the hardest stories folded away.</dd>' +
  '<dt><a href="/research-series">Research Series</a> and <a href="/speeches/">Great Speeches</a></dt><dd>For older students: essays that compare empires across five thousand years, and speeches with their setting and, where it is free, the full text.</dd>' +
  "</dl></section>`n")
[void]$sb.Append('<section class="ws-guide-sec"><h2 class="ref-sec-title">Ages and levels</h2><p>The worksheets suit pupils of about eleven to sixteen. For younger classes, use Kids mode and the <a href="/kids">Kids Corner</a>; older students can follow the references at the end of each profile and the works listed in the essays.</p></section>' + "`n")
[void]$sb.Append('<section class="ws-guide-sec"><h2 class="ref-sec-title">Citing the Institute and using its pictures</h2><p>Every page offers a ready-made citation (APA, MLA, Chicago and Harvard) under <b>Cite this page</b>. The pictures come from Wikimedia Commons under free licences, with the author and licence under each one: keep that credit when you reuse a picture. The states register and the power curves are free to download from <a href="/dataset">Open Data</a> for projects of your own.</p><p>Spotted a mistake, or have an idea for a worksheet? <a href="/contact?topic=suggest&amp;page=/teachers/">Tell us</a>.</p></section>' + "`n")
[void]$sb.Append("</div>`n</main>`n")
$title = "Teachers' Corner: Free History Worksheets and Classroom Ideas — The Epoch Institute"
$desc = 'Free printable world history worksheets with answer keys on the reading paths and the centuries, and ideas for teaching with the atlas, timeline and games.'
Emit '/teachers/' (Page @{ title = $title; desc = $desc; path = '/teachers/'; type = 'website'; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/teachers/") + ',"audience":{"@type":"EducationalAudience","educationalRole":"teacher"}}'); nav = 'teachers'; body = $sb.ToString() })
Say "teachers corner: $($wsN.path) path and $($wsN.century) century worksheets"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Years: /years/<y> and /years/ (the years were gathered before the entry pages), data/years.json (the atlas and the
# 404 page find the nearest year with it)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'year pages'
# the register as arrays for the year maps (WorldDots in C#: one map per year page)
$nN = $POL['nodes'].Count
$aS = New-Object 'double[]' $nN; $aE = New-Object 'double[]' $nN; $aX = New-Object 'double[]' $nN; $aYv = New-Object 'double[]' $nN; $aPl = New-Object 'bool[]' $nN; $aPr = New-Object 'bool[]' $nN
for ($i = 0; $i -lt $nN; $i++) {
  $n = $POL['nodes'][$i]; $aS[$i] = if ($null -eq $n['s']) { [double]::NaN } else { [double]$n['s'] }; $aE[$i] = if ($null -eq $n['e']) { [double]::NaN } else { [double]$n['e'] }
  $q = $STATEXY[[string]$n['id']]; if ($q -and -not $q[2]) { $aPl[$i] = $true; $aX[$i] = [double]$q[0]; $aYv[$i] = [double]$q[1] }; $aPr[$i] = [bool]$n['p']
}
# a day event's description with its gold links, as the day pages wrote it to data/days (also in -SkipEntries builds)
$DAYJ = @{}
function DayEvHtml([string]$k, [string]$title) {
  if (-not $DAYJ.ContainsKey($k)) { $f = "$Repo\data\days\$k.json"; $DAYJ[$k] = if (Test-Path $f) { ReadJson $f } else { $null } }
  if ($DAYJ[$k]) { foreach ($x in $DAYJ[$k]['events']) { if ([string]$x['title'] -eq $title) { return [string]$x['html'] } } }
  return $null
}
# a picture of the thing itself (no maps, diagrams, flags or arms): a painting or photograph, which on Commons is a
# JPEG (battle maps and diagrams are PNG, GIF or SVG, whatever their names say)
function GoodPic([string]$img) { if (-not $img) { return $false }; $src = PicSource $img; if ($src -and $src -notmatch '(?i)\.jpe?g$') { return $false }; return -not ((PicIsChart $src) -or $src -match '(?i)(?<![a-z])(flag|flags|coat[_ ]of[_ ]arms|emblem|seal)(?![a-z])') }
function DayEvPic($ev) { foreach ($lk in @($ev['links'])) { if ($lk -and $BY.ContainsKey([string]$lk[0])) { $o = $BY[[string]$lk[0]]; if (GoodPic $o.img) { return $o } } }; return $null }
function MdLabel([int]$md) { "$($md % 100) $($MONTHS[[int][Math]::Floor($md / 100) - 1])" }
function MdKey([int]$md) { ([int][Math]::Floor($md / 100)).ToString('00') + '-' + ($md % 100).ToString('00') }
function YrTile($o, [string]$note) { '<li><a href="/encyclopedia/' + $o.slug + '">' + $(if ($o.img) { '<img src="' + (ThumbOf $o.img) + '" alt="" loading="lazy" width="44" height="44">' } else { (PhSpan $o) }) + '<span><span class="nm">' + (Hx $o.name) + '</span><span class="tp">' + (Hx $note) + '</span></span></a></li>' }
function TileList($items, [string]$noteKind) {   # entry tiles, the 24 best known first, the rest folded
  $all = @($items | Sort-Object @{ e = { $ESCORE[$_.slug] }; Descending = $true }, @{ e = { $_.i } })
  $f = { param($o) YrTile $o $(if ($noteKind -eq 'dates') { $o.dates } else { (TypeLine $o) -replace ' · .*$', '' }) }
  $h = '<ul class="enc-seealso">' + (($all | Select-Object -First 24 | ForEach-Object { & $f $_ }) -join '') + '</ul>'
  if ($all.Count -gt 24) { $h += '<details class="cen-all"><summary>Show all ' + $all.Count + '</summary><ul class="enc-seealso">' + (($all | Select-Object -Skip 24 | ForEach-Object { & $f $_ }) -join '') + '</ul></details>' }
  return $h
}
function StateList($lst) {
  if ($lst.Count -gt 40) { return '<ul class="ref-cent-list cen-states">' + (($lst | Select-Object -First 40 | ForEach-Object { StateItem $_ }) -join '') + '</ul><details class="cen-all"><summary>Show all ' + $lst.Count + '</summary><ul class="ref-cent-list cen-states">' + (($lst | Select-Object -Skip 40 | ForEach-Object { StateItem $_ }) -join '') + '</ul></details>' }
  return '<ul class="ref-cent-list cen-states">' + (($lst | ForEach-Object { StateItem $_ }) -join '') + '</ul>'
}
function IsoY([int]$yv) { if ($yv -gt 0) { $yv.ToString('0000') } elseif ($yv -eq -1) { '0000' } else { '-' + ((-$yv) - 1).ToString('0000') } }
function Plural([int]$n, [string]$one, [string]$many) { if ($n -eq 1) { "1 $one" } else { "$($n.ToString('N0')) $many" } }
$nYrEv = 0
for ($yi = 0; $yi -lt $YEARLIST.Count; $yi++) {
  $yv = [int]$YEARLIST[$yi]; $yb = $YEARB[$yv]; $label = YearLabel $yv; $slug = [EpochBuild.W]::YearSlug($yv); $path = '/years/' + $slug; $cy = Century $yv
  # events: the day events and the entries dated to the year, by month and day where known, then the best known
  $rows = New-Object Collections.Generic.List[object]
  foreach ($de in $yb.days) {
    $sc = 0; foreach ($lk in @($de[1]['links'])) { if ($lk -and $ESCORE.ContainsKey([string]$lk[0]) -and $ESCORE[[string]$lk[0]] -gt $sc) { $sc = $ESCORE[[string]$lk[0]] } }
    $rows.Add([pscustomobject]@{ md = ([int]$de[0].Substring(0, 2) * 100 + [int]$de[0].Substring(3, 2)); sc = $sc + 5; k = $de[0]; ev = $de[1]; e = $null; t = [string]$de[1]['title'] })
  }
  foreach ($o in $yb.ents) { if (-not (YCovered $yb $o)) { $rows.Add([pscustomobject]@{ md = [EpochBuild.W]::MonthDay($o.dates); sc = $ESCORE[$o.slug]; k = $null; ev = $null; e = $o; t = $o.name }) } }
  $evRows = @(@($rows | Where-Object { $_.md } | Sort-Object md, @{ e = { $_.sc }; Descending = $true }) + @($rows | Where-Object { -not $_.md } | Sort-Object @{ e = { $_.sc }; Descending = $true }, t))
  $began = @($yb.began | Where-Object { -not (YCovered $yb $_) }); $ended = @($yb.ended | Where-Object { -not (YCovered $yb $_) })
  $sf = @($yb.sf | Sort-Object @{ e = { [string]$_['n'] } }); $se = @($yb.se | Sort-Object @{ e = { [string]$_['n'] } })
  $yd = [EpochBuild.W]::YearDots($aS, $aE, $aX, $aYv, $aPl, $aPr, [double]$yv)
  $nEvAll = $evRows.Count + $yb.gl.Count + $began.Count + $ended.Count; $nYrEv += $nEvAll
  $crumb = Crumbs @(@('Home', '/'), @('Year by Year', '/years/'), @($label, $null))
  $sb = New-Object Text.StringBuilder(30000)
  [void]$sb.Append('<main id="main" class="yr-page yr-year ref-page">' + "`n<div class=`"yr-wrap`">`n" + $crumb[0] + "`n")
  $parts = @(); if ($nEvAll) { $parts += Plural $nEvAll 'event' 'events' }; if ($yb.born.Count) { $parts += Plural $yb.born.Count 'birth' 'births' }; if ($yb.died.Count) { $parts += Plural $yb.died.Count 'death' 'deaths' }
  if ($yb.wks.Count) { $parts += Plural $yb.wks.Count 'work' 'works' }; if ($sf.Count) { $parts += (Plural $sf.Count 'state' 'states') + ' founded' }; if ($se.Count) { $parts += $(if ($sf.Count) { [string]$se.Count + ' that came to an end' } else { (Plural $se.Count 'state' 'states') + ' that came to an end' }) }
  $lede = (Hx $label) + ' in world history: ' + (ProseList $parts) + '. ' + (Plural ([int]$yd[2]) 'recorded state' 'recorded states') + ' existed that year.'
  [void]$sb.Append('<header class="ref-head yr-head"><p class="cty-kicker">Year by year · ' + (CentLink $cy (CentTitle $cy)) + '</p><h1 class="research-title">' + (Hx $label) + '</h1><p class="ref-lede">' + $lede + "</p></header>`n")
  $i0 = [Math]::Max(0, $yi - 4); $i1 = [Math]::Min($YEARLIST.Count - 1, $yi + 4)
  [void]$sb.Append('<nav class="ref-letters yr-near" aria-label="Nearby years">' + (($i0..$i1 | ForEach-Object { $z = [int]$YEARLIST[$_]; '<a href="' + (YearHref $z) + '"' + $(if ($z -eq $yv) { ' aria-current="page"' } else { '' }) + '>' + (Hx (YearLabel $z)) + '</a>' }) -join '') + "</nav>`n")
  if ($evRows.Count) {
    [void]$sb.Append('<section><h2 class="ref-sec-title">Events</h2><ol class="day-events yr-events">')
    foreach ($r in $evRows) {
      if ($r.ev) {
        $ev = $r.ev; $html = DayEvHtml $r.k $r.t; if (-not $html) { $html = Hx ([string]$ev['description']) }; $pic = DayEvPic $ev
        $tags = ''; if ($ev['profile']) { $tags += '<a class="tih-tag tih-tag-profile" href="' + (Hx ([string]$ev['profile'][1])) + '">' + (Hx ([string]$ev['profile'][0])) + '</a>' }
        foreach ($lk in @($ev['links'])) { if ($lk -and $BY.ContainsKey([string]$lk[0])) { $tags += '<a class="tih-tag enc-link" href="/encyclopedia/' + $lk[0] + '">' + (Hx ([string]$lk[1])) + '</a>' } }
        $when = '<a href="/today-in-history/' + (DaySlug $r.k) + '">' + (DayLabel $r.k) + '</a>'; $head = Hx $r.t; $desc = $html
      } else {
        $o = $r.e; $pic = if (GoodPic $o.img) { $o } else { $null }; $tags = ''
        $kindL = if ($o.conflict) { TagLabel $o } else { 'Event' }
        $when = $(if ($r.md -and $HIST.ContainsKey((MdKey $r.md))) { '<a href="/today-in-history/' + (DaySlug (MdKey $r.md)) + '">' + (MdLabel $r.md) + '</a> · ' } elseif ($r.md) { (MdLabel $r.md) + ' · ' } else { '' }) + (Hx $kindL)
        $head = '<a href="/encyclopedia/' + $o.slug + '">' + (Hx $o.name) + '</a>'; $desc = Hx ([EpochBuild.W]::FirstSentence($o.desc, 260))
      }
      $thumb = if ($pic) { '<a class="tih-event-thumb" href="/encyclopedia/' + $pic.slug + '" tabindex="-1" aria-hidden="true"><img src="' + (Hx $pic.img) + '" alt="" loading="lazy" width="168" height="112"></a>' } else { '' }
      [void]$sb.Append('<li class="tih-event-card' + $(if ($pic) { ' tih-has-thumb' } else { '' }) + '">' + $thumb + '<div class="tih-event-main"><p class="tih-event-year">' + $when + '</p><h3 class="tih-event-title">' + $head + '</h3><p class="tih-event-desc">' + $desc + '</p>' + $(if ($tags) { '<div class="tih-tags">' + $tags + '</div>' } else { '' }) + '</div></li>')
    }
    [void]$sb.Append("</ol></section>`n")
  }
  [void]$sb.Append('<figure class="cen-map yr-map">' + (MapSvg ([double[]]@(0, 0, 1000, $MAPH)) ([string]$yd[0]) "World map: states that existed in $label" 'map-world') +
    '<figcaption><span class="map-key"><i class="k-p"></i>Profile</span><span class="map-key"><i class="k-s"></i>State</span><span>' + $yd[1] + ' states with a known seat in ' + (Hx $label) + '</span><a href="/atlas?year=' + $yv + '">Open the atlas at ' + (Hx $label) + ' &rarr;</a></figcaption></figure>' + "`n")
  if ($yb.gl.Count) {
    [void]$sb.Append('<section><h2 class="ref-sec-title">In the profiles</h2><ul class="yr-prof">')
    foreach ($g in $yb.gl) { [void]$sb.Append('<li><a class="yr-prof-n" href="' + (ProfUrl ([string]$g[0])) + '">' + (LogoImg ([string]$g[0]) 28) + '<span>' + (Hx ([string]$g[0])) + '</span></a><span class="yr-prof-t">' + (Hx ([string]$g[1])) + '</span></li>') }
    [void]$sb.Append("</ul></section>`n")
  }
  if ($began.Count -or $ended.Count) {
    [void]$sb.Append('<section><h2 class="ref-sec-title">Wars and longer events</h2><ul class="enc-seealso">' + (($began | ForEach-Object { YrTile $_ ('Began · ' + $_.dates) }) -join '') + (($ended | ForEach-Object { YrTile $_ ('Ended · ' + $_.dates) }) -join '') + "</ul></section>`n")
  }
  if ($yb.born.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Born in ' + (Hx $label) + ' <span class="n">' + $yb.born.Count + '</span></h2>' + (TileList $yb.born 'dates') + "</section>`n") }
  if ($yb.died.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Died in ' + (Hx $label) + ' <span class="n">' + $yb.died.Count + '</span></h2>' + (TileList $yb.died 'dates') + "</section>`n") }
  if ($yb.wks.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Works <span class="n">' + $yb.wks.Count + '</span></h2>' + (TileList $yb.wks 'kind') + "</section>`n") }
  if ($sf.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">States founded <span class="n">' + $sf.Count + '</span></h2>' + (StateList $sf) + "</section>`n") }
  if ($se.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">States that came to an end <span class="n">' + $se.Count + '</span></h2>' + (StateList $se) + "</section>`n") }
  if ($yb.sp.Count) { [void]$sb.Append('<section><h2 class="ref-sec-title">Great speeches</h2><div class="enc-mentions">' + (($yb.sp | ForEach-Object { '<a href="/speeches/' + $_['slug'] + '">' + (Hx ([string]$_['title'])) + '<span class="secs">' + (Hx ([string]$_['speaker'])) + '</span></a>' }) -join '') + "</div></section>`n") }
  $pv = if ($yi -gt 0) { [int]$YEARLIST[$yi - 1] } else { $null }; $nx = if ($yi -lt $YEARLIST.Count - 1) { [int]$YEARLIST[$yi + 1] } else { $null }
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Neighbouring years">' + $(if ($null -ne $pv) { '<a class="prev" rel="prev" href="' + (YearHref $pv) + '"><span class="lbl">&larr; Earlier year</span><span class="nm">' + (Hx (YearLabel $pv)) + '</span></a>' } else { '' }) +
    $(if ($null -ne $nx) { '<a class="next" rel="next" href="' + (YearHref $nx) + '"><span class="lbl">Later year &rarr;</span><span class="nm">' + (Hx (YearLabel $nx)) + '</span></a>' } else { '' }) + "</nav>`n")
  [void]$sb.Append('<p class="enc-article-foot"><a class="enc-random-link" href="/years/">All years &rarr;</a>' + $(if ($CENTSET.ContainsKey($cy)) { ' <a class="enc-random-link" href="/centuries/' + (CenturySlug $cy) + '">The ' + (Hx $cy) + ' &rarr;</a>' } else { '' }) + "</p>`n")
  [void]$sb.Append((CiteBox $label ($SITE + $path) 'The Epoch Institute, Year by Year') + "`n</div>`n</main>`n")
  $top = @($evRows | Sort-Object @{ e = { $_.sc }; Descending = $true } | Select-Object -First 3 | ForEach-Object { $_.t })
  $title = "What Happened in $label`? Events, Births and Deaths — The Epoch Institute"
  $desc = [EpochBuild.W]::Summary("$label in world history: " + $(if ($top.Count) { ($top -join '; ') + '. ' } else { '' }) + 'The events, births and deaths of the year, the states founded and ended, and a map of the world.', 155)
  $ld = $crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + ',"temporalCoverage":' + (Js (IsoY $yv)) + ',"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"}}'
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; ld = $ld; nav = 'years'; body = $sb.ToString() })
}
# index: the years by century, and a box that goes to the nearest year with a page
$byCent = [ordered]@{}; foreach ($z in $YEARLIST) { $c = Century ([int]$z); if (-not $byCent.Contains($c)) { $byCent[$c] = New-Object Collections.Generic.List[int] }; $byCent[$c].Add([int]$z) }
$crumb = Crumbs @(@('Home', '/'), @('Year by Year', $null))
$sb = New-Object Text.StringBuilder(60000)
[void]$sb.Append('<main id="main" class="yr-page ref-page">' + "`n<div class=`"yr-wrap`">`n" + $crumb[0] + "`n")
[void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Year by Year</h1><p class="ref-lede">' + $YEARLIST.Count.ToString('N0') + ' years of world history with a page of their own, from ' + (Hx (YearLabel $YEARLIST[0])) + ' to ' + (Hx (YearLabel $YEARLIST[-1])) + ': the events of each year, the people born and the people who died, the states founded and ended, and a map of the world.</p></header>' + "`n")
[void]$sb.Append('<form class="yr-jump" id="yr-jump" role="search" action="/years/"><label for="yr-in">Go to a year</label><input id="yr-in" type="number" min="1" max="' + $YEAR + '" inputmode="numeric" placeholder="1453"><select id="yr-era" aria-label="Era"><option value="ce">CE</option><option value="bce">BCE</option></select><button type="submit">Go</button><span class="yr-jump-note">No page for a year? You land on the nearest one.</span></form>' + "`n")
[void]$sb.Append('<nav class="ref-letters ref-centuries" aria-label="Centuries">' + (($byCent.Keys | ForEach-Object { '<a href="#' + (CenturySlug $_) + '">' + (Hx ($_ -replace ' century', ' c.')) + '</a>' }) -join '') + "</nav>`n")
foreach ($c in $byCent.Keys) {
  [void]$sb.Append('<section class="ref-group" id="' + (CenturySlug $c) + '"><h2>' + (CentLink $c (CentTitle $c)) + ' <span class="n">' + $byCent[$c].Count + '</span></h2><ul class="cty-chips yr-chips">' + (($byCent[$c] | ForEach-Object { '<li><a href="' + (YearHref $_) + '">' + (Hx (YearLabel $_)) + '</a></li>' }) -join '') + "</ul></section>`n")
}
[void]$sb.Append("<script>(function(){var f=document.getElementById('yr-jump');if(!f)return;var Y=[].map.call(document.querySelectorAll('.yr-chips a'),function(a){var m=a.getAttribute('href').match(/\/years\/(\d+)(-bce)?`$/);return m?(m[2]?-m[1]:+m[1]):null;}).filter(function(v){return v!==null;});f.addEventListener('submit',function(e){e.preventDefault();var v=parseInt(document.getElementById('yr-in').value,10);if(!v||v<1||!Y.length)return;if(document.getElementById('yr-era').value==='bce')v=-v;var b=Y[0];Y.forEach(function(z){if(Math.abs(z-v)<Math.abs(b-v))b=z;});location.href='/years/'+(b<0?(-b)+'-bce':b);});})();</script>`n")
[void]$sb.Append("</div>`n</main>`n")
$title = 'Year by Year: ' + $YEARLIST.Count.ToString('N0') + ' Years of World History — The Epoch Institute'
$desc = [EpochBuild.W]::Summary("$($YEARLIST.Count.ToString('N0')) years of world history, from $(YearLabel $YEARLIST[0]) to $(YearLabel $YEARLIST[-1]), each with its events, births and deaths, the states founded and ended, and a world map.", 155)
Emit '/years/' (Page @{ title = $title; desc = $desc; path = '/years/'; type = 'website'; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/years/") + '}'); nav = 'years'; body = $sb.ToString() })
$yearsJs = '[' + ($YEARLIST -join ',') + "]`n"; $YEARSV = [EpochBuild.W]::Sha1($yearsJs).Substring(0, 10)
if ([EpochBuild.W]::WriteIfChanged("$Repo\data\years.json", $yearsJs)) { $NWRITE++ }
$t = [IO.File]::ReadAllText("$Repo\atlas", $U8); $t2 = [regex]::Replace($t, 'data/years\.json\?v=[0-9a-f]*', "data/years.json?v=$YEARSV"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\atlas", $t2)) { $NWRITE++ }
Say "year pages: $($YEARLIST.Count), events on them: $nYrEv"

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# People: /people/<century>, /people/, and people-data.js for the "who lived when" chart on /people/
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'people pages'
$BREG = @([regex]::Matches([regex]::Match([IO.File]::ReadAllText("$Repo\shared-data.js", $U8), 'const REGIONS = \[([^\]]*)\]').Groups[1].Value, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
$BREGIX = @{}; for ($i = 0; $i -lt $BREG.Count; $i++) { $BREGIX[$BREG[$i]] = $i }
$EREG = @{}; $EKIND = @{}; foreach ($em in $EMPS) { $EREG[[string]$em['name']] = [string]$em['region']; $EKIND[[string]$em['name']] = $(if ($em['kind']) { [string]$em['kind'] } else { 'polity' }) }
# regions set by hand where the rule below misleads (scripts/entry-regions.tsv: slug, region, why)
$EREGFIX = @{}
if (Test-Path "$Repo\scripts\entry-regions.tsv") { foreach ($erLine in [IO.File]::ReadAllLines("$Repo\scripts\entry-regions.tsv", $U8)) { if (-not $erLine.Trim() -or $erLine.StartsWith('#')) { continue }; $erF = $erLine.Split("`t"); if (-not $BREGIX.ContainsKey($erF[1])) { throw "entry-regions.tsv: unknown region '$($erF[1])' for $($erF[0])" }; if (-not $BY.ContainsKey($erF[0])) { throw "entry-regions.tsv: no entry $($erF[0])" }; $EREGFIX[$erF[0]] = $erF[1] } }
# a person's region: the hand-set one, else the one most of the profiles of states, empires, religions and languages
# that mention them belong to, else most of the state histories, else the cultures that name them, else the movements.
# A culture's or movement's region is where it lived or began, not where everyone it names did (Abolitionism, begun in
# Britain, would make Frederick Douglass European), so they only place people nothing else does. make-home-data.ps1
# reads an entry's region for the search filters and the quiz the same way.
function PersonRegion($e) {
  if ($EREGFIX.ContainsKey($e.slug)) { return $EREGFIX[$e.slug] }
  foreach ($tier in 'profiles', 'states', 'culture', 'movement') {
    $cnt = @{}; $ord = New-Object Collections.Generic.List[string]
    if ($tier -eq 'states') { if ($ESM -and $ESM[$e.slug]) { foreach ($st in @($ESM[$e.slug][1])) { $nd = $NODE[[string]$st[0]]; if ($nd) { $rr = [string]$nd['b']; if ($BREGIX.ContainsKey($rr)) { $cnt[$rr] = 1 + [int]$cnt[$rr]; if (-not $ord.Contains($rr)) { $ord.Add($rr) } } } } } }
    else {
      foreach ($pm in $e.emp) {
        $k = $EKIND[[string]$pm['name']]; if (-not $k -or $(if ($tier -eq 'profiles') { $k -in 'culture', 'movement' } else { $k -ne $tier })) { continue }
        $rr = $EREG[[string]$pm['name']]; if ($rr -and $BREGIX.ContainsKey($rr)) { $cnt[$rr] = 1 + [int]$cnt[$rr]; if (-not $ord.Contains($rr)) { $ord.Add($rr) } }
      }
    }
    $best = $null; $most = 0; foreach ($rr in $ord) { if ($cnt[$rr] -gt $most) { $most = $cnt[$rr]; $best = $rr } }
    if ($best) { return $best }
  }
  return $null
}
# what a person's years are: 0 a lifespan, 1 a reign, 2 years of activity, 3 the death, 4 the birth, 5 a century
function SpanKind([string]$d) { if ($d -match '^\s*(r\.|reigned|ruled)') { 1 } elseif ($d -match '^\s*fl\.') { 2 } elseif ($d -match '^\s*d\.') { 3 } elseif ($d -match '^\s*b\.') { 4 } elseif ($d -match 'centur') { 5 } else { 0 } }
$PPL = New-Object Collections.Generic.List[object]
foreach ($e in $ENT) { if ($e.type -eq 'person') { $PPL.Add([pscustomobject]@{ e = $e; sp = $EYRS[$e.slug]; c = $ENTCENT[$e.slug]; r = (PersonRegion $e); k = (SpanKind $e.dates); sc = $ESCORE[$e.slug] }) } }
$PBYC = @{}; foreach ($pp in $PPL) { if ($pp.c -and $CENTSET.ContainsKey($pp.c)) { if (-not $PBYC.ContainsKey($pp.c)) { $PBYC[$pp.c] = New-Object Collections.Generic.List[object] }; $PBYC[$pp.c].Add($pp) } }
$PCENTS = @($CENTPAGES | Where-Object { $PBYC.ContainsKey($_) -and $PBYC[$_].Count -ge 5 })
function ScaleLbl([int]$yv) { if ($yv -lt 0) { "$(-$yv) BCE" } elseif ($yv -lt 1000) { "$yv CE" } else { "$yv" } }
# a lifespan chart on one scale (as the country timelines): rows of [person record]; dim bars: reigns and years of activity
function LifeChart($rows, [string]$caption) {
  $lo0 = ($rows | ForEach-Object { $_.sp[0] } | Measure-Object -Minimum).Minimum; $hi0 = ($rows | ForEach-Object { $_.sp[1] } | Measure-Object -Maximum).Maximum
  $t0 = [Math]::Floor($lo0 / 25) * 25; $t1 = [Math]::Ceiling($hi0 / 25) * 25; if ($t1 -le $t0) { $t1 = $t0 + 25 }
  if ((($t1 - $t0) % 50) -ne 0) { $t1 += 25 }; $tw = $t1 - $t0   # the middle mark falls on a round year
  $h = '<figure class="pp-chart"><p class="cty-scale" aria-hidden="true"><span>' + (Hx (ScaleLbl $t0)) + '</span><span>' + (Hx (ScaleLbl ([int][Math]::Round(($t0 + $t1) / 2)))) + '</span><span>' + (Hx (ScaleLbl $t1)) + '</span></p><ol class="cty-tl pp-tl">'
  foreach ($rw in $rows) {
    $a = $rw.sp[0]; $b = $rw.sp[1]
    $h += '<li><a href="/encyclopedia/' + $rw.e.slug + '">' + $(if ($rw.e.img) { '<img class="pp-av" src="' + (ThumbOf $rw.e.img) + '" alt="" loading="lazy" width="28" height="28">' } else { '<span class="pp-av"></span>' }) + '<span class="pp-nm"><span class="cty-n">' + (Hx $rw.e.name) + '</span><span class="cty-y">' + (Hx $rw.e.dates) + '</span></span></a><span class="cty-track" aria-hidden="true"><span class="cty-bar ' + $(if ($rw.k -ne 0) { 'pp-dim' } else { 'pp-life' }) + '" style="left:' + (($a - $t0) / $tw * 100).ToString('0.0', $INV) + '%;width:' + ([Math]::Max(0.8, ($b - $a) / $tw * 100)).ToString('0.0', $INV) + '%"></span></span></li>'
  }
  return $h + '</ol><figcaption>' + $caption + '</figcaption></figure>'
}
$PCINFO = @{}
for ($pi3 = 0; $pi3 -lt $PCENTS.Count; $pi3++) {
  $c = $PCENTS[$pi3]; $slug = CenturySlug $c; $path = '/people/' + $slug; $ct = CentTitle $c
  $lst = @($PBYC[$c] | Sort-Object @{ e = { $_.sc }; Descending = $true }, @{ e = { $_.e.i } })
  $PCINFO[$c] = @{ n = $lst.Count; top = @($lst | Select-Object -First 3 | ForEach-Object { $_.e.name }) }
  $crumb = Crumbs @(@('Home', '/'), @('People', '/people/'), @($ct, $null))
  $sb = New-Object Text.StringBuilder(80000)
  [void]$sb.Append('<main id="main" class="pp-page ref-page">' + "`n<div class=`"pp-wrap`">`n" + $crumb[0] + "`n")
  $nPic = @($lst | Where-Object { $_.e.img }).Count
  [void]$sb.Append('<header class="ref-head cen-head"><p class="cty-kicker">People · ' + (Hx ((CentDecades $c).Substring(0, 1).ToUpperInvariant() + (CentDecades $c).Substring(1))) + '</p><h1 class="research-title">People of the ' + (Hx $ct) + '</h1><p class="ref-lede">' + $lst.Count.ToString('N0') + ' people whose working lives fell in the ' + (Hx $c) + $(if ($nPic) { ', ' + $nPic.ToString('N0') + ' of them with a portrait or picture' } else { '' }) + '. They are grouped by region, the best known first.</p></header>' + "`n")
  [void]$sb.Append('<nav class="ref-letters ref-centuries" aria-label="Centuries">' + (($PCENTS | ForEach-Object { '<a href="/people/' + (CenturySlug $_) + '"' + $(if ($_ -eq $c) { ' aria-current="page"' } else { '' }) + '>' + (Hx ($_ -replace ' century', ' c.')) + '</a>' }) -join '') + "</nav>`n")
  $ch = @($lst | Where-Object { $_.sp -and $_.sp[1] -gt $_.sp[0] -and $_.k -le 2 } | Select-Object -First 40 | Sort-Object @{ e = { $_.sp[0] } }, @{ e = { $_.e.name } })
  if ($ch.Count -ge 5) { [void]$sb.Append('<section><h2 class="ref-sec-title">Who lived when</h2>' + (LifeChart $ch ('The ' + $ch.Count + ' best-known people of the century with dates. Bright bars: lifespans; pale bars: reigns or years of activity. <a href="/people/">Draw your own chart &rarr;</a>')) + "</section>`n") }
  foreach ($rr in @($BREG) + @('')) {
    $grp = @($lst | Where-Object { $(if ($rr) { $_.r -eq $rr } else { -not $_.r }) }); if (-not $grp.Count) { continue }
    [void]$sb.Append('<section class="ref-group"><h2>' + $(if ($rr) { Hx $rr } else { 'Other people of the century' }) + ' <span class="n">' + $grp.Count + '</span></h2><ul class="enc-seealso">' + (($grp | Select-Object -First 24 | ForEach-Object { YrTile $_.e $_.e.dates }) -join '') + '</ul>')
    if ($grp.Count -gt 24) { [void]$sb.Append('<details class="cen-all"><summary>All ' + $grp.Count + '</summary><ul class="ref-cent-list cen-states">' + (($grp | Select-Object -Skip 24 | ForEach-Object { '<li><a href="/encyclopedia/' + $_.e.slug + '">' + (Hx $_.e.name) + ' <span>' + (Hx $_.e.dates) + '</span></a></li>' }) -join '') + '</ul></details>') }
    [void]$sb.Append("</section>`n")
  }
  $pv = if ($pi3 -gt 0) { $PCENTS[$pi3 - 1] } else { $null }; $nx = if ($pi3 -lt $PCENTS.Count - 1) { $PCENTS[$pi3 + 1] } else { $null }
  [void]$sb.Append('<nav class="ref-prevnext" aria-label="Neighbouring centuries">' + $(if ($pv) { '<a class="prev" rel="prev" href="/people/' + (CenturySlug $pv) + '"><span class="lbl">&larr; Earlier century</span><span class="nm">' + (Hx (CentTitle $pv)) + '</span></a>' } else { '' }) +
    $(if ($nx) { '<a class="next" rel="next" href="/people/' + (CenturySlug $nx) + '"><span class="lbl">Later century &rarr;</span><span class="nm">' + (Hx (CentTitle $nx)) + '</span></a>' } else { '' }) + "</nav>`n")
  [void]$sb.Append('<p class="enc-article-foot"><a class="enc-random-link" href="/people/">All people &rarr;</a> <a class="enc-random-link" href="/centuries/' + $slug + '">The ' + (Hx $c) + ' &rarr;</a></p>' + "`n")
  [void]$sb.Append((CiteBox "People of the $ct" ($SITE + $path) 'The Epoch Institute Encyclopedia') + "`n</div>`n</main>`n")
  $title = "People of the $($ct -replace ' century', ' Century'): $($lst.Count.ToString('N0')) Historical Figures — The Epoch Institute"
  $desc = [EpochBuild.W]::Summary("$($lst.Count.ToString('N0')) people of the $c ($(CentDecades $c)) by region, from $(ProseList @($PCINFO[$c].top)) to the less known, with a chart of who lived when.", 155)
  $ld = $crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js ($SITE + $path)) + ',"isPartOf":{"@type":"WebSite","name":"The Epoch Institute","url":"' + $SITE + '/"}}'
  Emit $path (Page @{ title = $title; desc = $desc; path = $path; type = 'website'; ld = $ld; nav = 'people'; body = $sb.ToString() })
}
# people-data.js: everyone with years, for the chart on /people/ (pictures are /images/encyclopedia/<slug>.jpg)
$pd = New-Object Text.StringBuilder(1200000); $nPd = 0
[void]$pd.Append("// Generated by scripts/build-pages.ps1 for /people/. Do not edit.`n// rows: [slug, name, dates, first year, last year, kind (0 lifespan, 1 reign, 2 active, 3 died, 4 born, 5 century), region (PEOPLE_REGIONS, -1 none), picture, weight]`n")
[void]$pd.Append('var PEOPLE_REGIONS = [' + (($BREG | ForEach-Object { Js $_ }) -join ',') + "];`nvar PEOPLE = [`n")
foreach ($pp in $PPL) {
  if (-not $pp.sp) { continue }
  if ($nPd) { [void]$pd.Append(",`n") }
  [void]$pd.Append('[' + (Js $pp.e.slug) + ',' + (Js $pp.e.name) + ',' + (Js $pp.e.dates) + ',' + $pp.sp[0] + ',' + $pp.sp[1] + ',' + $pp.k + ',' + $(if ($pp.r) { $BREGIX[$pp.r] } else { -1 }) + ',' + $(if ($pp.e.img) { 1 } else { 0 }) + ',' + $pp.sc + ']'); $nPd++
}
[void]$pd.Append("`n];`n"); $pdText = $pd.ToString(); $PEOPLEV = [EpochBuild.W]::Sha1($pdText).Substring(0, 10)
if ([EpochBuild.W]::WriteIfChanged("$Repo\people-data.js", $pdText)) { $NWRITE++ }
# index: the chart tool (people-data.js), then the centuries
$crumb = Crumbs @(@('Home', '/'), @('People', $null))
$sb = New-Object Text.StringBuilder(40000)
[void]$sb.Append('<main id="main" class="pp-page ref-page">' + "`n<div class=`"pp-wrap`">`n" + $crumb[0] + "`n")
[void]$sb.Append('<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">People in History</h1><p class="ref-lede">' + $PPL.Count.ToString('N0') + ' people of the encyclopedia: rulers and rebels, thinkers and believers, artists, scientists and explorers. Draw a chart of who lived when for any age and region, or browse them century by century.</p></header>' + "`n")
$opts = ($PCENTS | ForEach-Object { $r0 = CentRange $_; '<option value="' + (CenturySlug $_) + '" data-a="' + $r0[0] + '" data-b="' + $r0[1] + '">' + (Hx (CentTitle $_)) + '</option>' }) -join ''
[void]$sb.Append('<section aria-labelledby="pp-tool-t"><h2 class="ref-sec-title" id="pp-tool-t">Who lived when</h2><form class="srch-row pp-form" id="pp-form"><label>Region <select id="pp-r"><option value="-1">All regions</option>' + (($BREG | ForEach-Object { '<option value="' + $BREGIX[$_] + '">' + (Hx $_) + '</option>' }) -join '') + '</select></label><label>From <select id="pp-from">' + $opts + '</select></label><label>To <select id="pp-to">' + $opts + '</select></label><label class="srch-check"><input type="checkbox" id="pp-pic"> With a picture</label></form>' +
  '<p class="pp-status" id="pp-status" aria-live="polite">The chart needs JavaScript; the centuries below list everyone.</p><div id="pp-out"></div></section>' + "`n")
[void]$sb.Append('<section><h2 class="ref-sec-title">By century</h2><ul class="cen-cards">' + (($PCENTS | ForEach-Object { $ii = $PCINFO[$_]; '<li><a href="/people/' + (CenturySlug $_) + '"><span class="cen-c-t">' + (Hx (CentTitle $_)) + '</span><span class="cen-c-d">' + (Hx (CentDecades $_)) + '</span><span class="cen-c-n">' + $ii.n.ToString('N0') + ' people</span><span class="cen-c-p">' + (Hx ($ii.top -join ' · ')) + '</span></a></li>' }) -join '') + "</ul></section>`n")
[void]$sb.Append("<script src=`"/people-data.js?v=$PEOPLEV`" defer></script>`n<script src=`"/people.js?v=2`" defer></script>`n</div>`n</main>`n")
$title = 'People in History: ' + $PPL.Count.ToString('N0') + ' Rulers, Thinkers and Explorers — The Epoch Institute'
$desc = [EpochBuild.W]::Summary("$($PPL.Count.ToString('N0')) people of world history, from rulers and rebels to thinkers, artists and explorers: a chart of who lived when, and every century's people by region.", 155)
Emit '/people/' (Page @{ title = $title; desc = $desc; path = '/people/'; type = 'website'; ld = ($crumb[1] + ',{"@type":"CollectionPage","name":' + (Js $title) + ',"description":' + (Js $desc) + ',"url":' + (Js "$SITE/people/") + '}'); nav = 'people'; body = $sb.ToString() })
Say ("people pages: {0} centuries, {1:N0} people, people-data.js {2:N0} KB" -f $PCENTS.Count, $PPL.Count, ($pdText.Length / 1KB))

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Atlas: maps/atlas-data.js (states), maps/basemap.js (outlines for the atlas page), maps/world.svg (picture for small maps)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$KINDS = @('crown', 'coronet', 'tower', 'dome', 'columns', 'ship', 'tribal', 'yurt', 'mitre', 'shield')
$KINDLBL = @('Kingdoms and empires', 'Principalities and duchies', 'Cities and leagues', 'Sultanates and emirates', 'Republics and confederations', 'Colonies and protectorates', 'Chiefdoms and tribal states', 'Nomadic states', 'Religious states', 'Other states')
$rgKeys = @($REGIONS.Keys | Where-Object { $REGIONS[$_].Count }); $rgIx = @{}; for ($i = 0; $i -lt $rgKeys.Count; $i++) { $rgIx[$rgKeys[$i]] = $i }
$sbA = New-Object Text.StringBuilder(600000); $nA = 0; $minS = 0
[void]$sbA.Append("// Generated by scripts/build-pages.ps1 for /atlas. Do not edit.`n// rows: [id, name, start, end (null: still exists), x, y (tenths of a map unit), flags (1 profile, 2 approximate place), kind, region, lng, lat (degrees, for the globe), profile url, present-day countries of an approximate place (country-page slugs, | between)]`n")
[void]$sbA.Append('var ATLAS = {w:10000,h:' + (Fx $MAPH) + ',year:' + $YEAR + ',kinds:[' + (($KINDLBL | ForEach-Object { Js $_ }) -join ',') + '],regions:[' + (($rgKeys | ForEach-Object { Js (RegionLabel $_) }) -join ',') + "],`nrows:[`n")
$rowsA = New-Object System.Collections.Generic.List[string]
foreach ($n in ($POL['nodes'] | Sort-Object @{ e = { if ($null -eq $_['s']) { 1e9 } else { [double]$_['s'] } } })) {
  $id = [string]$n['id']; $q = $STATEXY[$id]; if (-not $q -or $null -eq $n['s']) { continue }
  $sY = [int][Math]::Round([double]$n['s']); if ($sY -lt $minS) { $minS = $sY }
  $flags = $(if ($n['p']) { 1 } else { 0 }) + $(if ($q[2]) { 2 } else { 0 })
  $ll = [EpochGeo.G]::Inv([double]$q[0], [double]$q[1])   # back to degrees, so the globe keeps the spiral spread of approximate places
  $rowsA.Add('[' + (Js $id) + ',' + (Js ([string]$n['n'])) + ',' + $sY + ',' + $(if ($null -eq $n['e']) { 'null' } else { [int][Math]::Round([double]$n['e']) }) + ',' + (Fx $q[0]) + ',' + (Fx $q[1]) + ',' + $flags + ',' + [array]::IndexOf($KINDS, (EmblemKind $n)) + ',' +
    $(if ($rgIx.ContainsKey([string]$n['rg'])) { $rgIx[[string]$n['rg']] } else { -1 }) + ',' + (Fd $ll[0]) + ',' + (Fd $ll[1]) + $(
      # an approximate place sits in its country only, so "What was here?" lists it by country, not by distance
      $acs = if ($q[2]) { @(@($n['mo']) | Where-Object { $_ -and $CPAGE.ContainsKey([string]$_) } | ForEach-Object { $CPAGE[[string]$_] }) -join '|' } else { '' }
      if ($acs) { ',' + $(if ($n['p']) { Js ([string]$n['p']) } else { 'null' }) + ',' + (Js $acs) } elseif ($n['p']) { ',' + (Js ([string]$n['p'])) } else { '' }) + ']')
  $nA++
}
[void]$sbA.Append(($rowsA -join ",`n") + "`n],`n")
$minS = [Math]::Max($minS, -3500)   # the slider starts when several states exist (Eridu alone goes back to 5400 BCE)
$PRESETS = @(@('World', -180, 84, 180, -58), @('Europe', -12, 62, 42, 34), @('Mediterranean', -10, 47, 42, 28), @('Middle East', 25, 43, 65, 12), @('Africa', -20, 37, 55, -36), @('South Asia', 60, 37, 98, 5), @('East Asia', 95, 55, 146, 15), @('Southeast Asia', 92, 28, 135, -11), @('Central Asia', 45, 56, 100, 34), @('The Americas', -130, 55, -34, -56), @('Oceania', 110, -5, 180, -48))
$presetJs = ($PRESETS | ForEach-Object { $xs = @(); $ys = @(); foreach ($lng in @(([double]$_[1]), (([double]$_[1] + [double]$_[3]) / 2), ([double]$_[3]))) { foreach ($lat in @(([double]$_[2]), (([double]$_[2] + [double]$_[4]) / 2), ([double]$_[4]))) { $pp = [EpochGeo.G]::P($lng, $lat); $xs += $pp[0]; $ys += $pp[1] } }
  $x0 = ($xs | Measure-Object -Minimum).Minimum; $x1 = ($xs | Measure-Object -Maximum).Maximum; $y0 = ($ys | Measure-Object -Minimum).Minimum; $y1 = ($ys | Measure-Object -Maximum).Maximum
  '[' + (Js $_[0]) + ',' + (Fx $x0) + ',' + (Fx $y0) + ',' + (Fx ($x1 - $x0)) + ',' + (Fx ($y1 - $y0)) + ']' }) -join ','
#  the same presets and country views for the globe: centre in degrees + the span of the box, in degrees
$presetLL = ($PRESETS | ForEach-Object {
  $cl = if ($_[0] -eq 'World') { @(10, 15) } else { @((([double]$_[1] + [double]$_[3]) / 2), (([double]$_[2] + [double]$_[4]) / 2)) }
  $span = [Math]::Max([Math]::Abs([double]$_[3] - [double]$_[1]), [Math]::Abs([double]$_[2] - [double]$_[4]))
  '[' + (Fd $cl[0]) + ',' + (Fd $cl[1]) + ',' + (Fd $span) + ']' }) -join ','
$ctyLL = ($CINFO.Keys | Sort-Object | Where-Object { $CINFO[$_].view } | ForEach-Object { $v = $CINFO[$_].view
  $c = [EpochGeo.G]::Inv(([double]$v[0] + [double]$v[2] / 2), ([double]$v[1] + [double]$v[3] / 2))
  (Js $CINFO[$_].slug) + ':[' + (Fd $c[0]) + ',' + (Fd $c[1]) + ',' + (Fd ([Math]::Max([double]$v[2], [double]$v[3] * 2) * 0.36)) + ']' }) -join ','
[void]$sbA.Append('presets:[' + $presetJs + "],`npresetsLL:[" + $presetLL + "],`ncountries:{" + (($CINFO.Keys | Sort-Object | Where-Object { $CINFO[$_].view } | ForEach-Object { $v = $CINFO[$_].view; (Js $CINFO[$_].slug) + ':[' + (Js $_) + ',' + (Fx $v[0]) + ',' + (Fx $v[1]) + ',' + (Fx $v[2]) + ',' + (Fx $v[3]) + ']' }) -join ',') + "},`ncountriesLL:{" + $ctyLL + "},`nfirst:" + $minS + "};`n")
$atlasData = $sbA.ToString(); $ATLASV = [EpochBuild.W]::Sha1($atlasData).Substring(0, 10)
if ([EpochBuild.W]::WriteIfChanged("$Repo\maps\atlas-data.js", $atlasData)) { $NWRITE++ }
$landPath = [EpochGeo.G]::PathData($RINGS, $BOXES, 0.12, 0, $null, 10); $grat = [EpochGeo.G]::Graticule(30, -58, 90, 0, 10); $edge = [EpochGeo.G]::Outline(-58, 90, 0, 10)
$baseJs = "// Generated by scripts/build-pages.ps1: present-day outlines (Natural Earth, public domain) in the Equal Earth projection, for /atlas.`nvar ATLAS_BASE = {land:`"$landPath`",grat:`"$grat`",edge:`"$edge`"};`n"
$BASEV = [EpochBuild.W]::Sha1($baseJs).Substring(0, 10)
if ([EpochBuild.W]::WriteIfChanged("$Repo\maps\basemap.js", $baseJs)) { $NWRITE++ }
# the globe's land: the same rings in lng/lat (hundredths of a degree), drawn client-side with d3's orthographic
# projection; each ring carries its country's atlas slug so an arrival can light up just that country's border
$NESLUG = @{}   # Natural Earth country name -> country-page slug
foreach ($ck in $CINFO.Keys) { $ct2 = $CTRY[[string]$ck]; if ($ct2 -and $CINFO[$ck].slug) { $NESLUG[[string]$ct2['n']] = [string]$CINFO[$ck].slug } }
$grSb = New-Object Text.StringBuilder; $gcSb = New-Object Text.StringBuilder; $nGR = 0
foreach ($c in $LAND['countries']) {
  $slug2 = $NESLUG[[string]$c['n']]; if (-not $slug2) { $slug2 = '' }
  foreach ($d in $CRING[[string]$c['n']][0]) {
    $ringJs = [EpochGeo.G]::GlobeRing($d, 0.1); if (-not $ringJs) { continue }
    if ($nGR) { [void]$grSb.Append(",`n"); [void]$gcSb.Append(',') }
    [void]$grSb.Append($ringJs); [void]$gcSb.Append((Js $slug2)); $nGR++
  }
}
$globeJs = "// Generated by scripts/build-pages.ps1: present-day outlines (Natural Earth, public domain) in lng/lat`n// hundredths of a degree, flat [lng,lat,...] rings, for the atlas globe; cty[i] is ring i's country-page slug.`nvar ATLAS_GLOBE={rings:[" + $grSb.ToString() + "],`ncty:[" + $gcSb.ToString() + "]};`n"
$GLOBEV = [EpochBuild.W]::Sha1($globeJs).Substring(0, 10)
if ([EpochBuild.W]::WriteIfChanged("$Repo\maps\globe-land.js", $globeJs)) { $NWRITE++ }
$world = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10000 ' + (Fx $MAPH) + '" width="1000" height="' + [Math]::Round($MAPH) + '">' +
  '<path d="' + [EpochGeo.G]::Outline(-58, 90, 0, 10) + '" fill="#9a8552" fill-opacity=".06"/>' +
  '<path d="' + [EpochGeo.G]::Graticule(30, -58, 90, 0, 10) + '" fill="none" stroke="#9a8552" stroke-opacity=".22" stroke-width="2.5"/>' +
  '<path d="' + [EpochGeo.G]::PathData($RINGS, $BOXES, 0.22, 0, $null, 10) + '" fill="#b39a5a" fill-opacity=".2" stroke="#b39a5a" stroke-opacity=".6" stroke-width="2.6" stroke-linejoin="round"/></svg>' + "`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\maps\world.svg", $world)) { $NWRITE++ }
foreach ($f in @('atlas', 'games', 'timeline')) { $t = [IO.File]::ReadAllText("$Repo\$f", $U8); $t2 = [regex]::Replace([regex]::Replace([regex]::Replace($t, 'maps/atlas-data\.js\?v=[0-9a-f]*', "maps/atlas-data.js?v=$ATLASV"), 'maps/basemap\.js\?v=[0-9a-f]*', "maps/basemap.js?v=$BASEV"), 'maps/globe-land\.js\?v=[0-9a-f]*', "maps/globe-land.js?v=$GLOBEV"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\$f", $t2)) { $NWRITE++ } }
Say ("atlas: {0} states, atlas-data.js {1:N0} KB, basemap.js {2:N0} KB, globe-land.js {3:N0} KB, world.svg {4:N0} KB" -f $nA, ($atlasData.Length / 1KB), ($baseJs.Length / 1KB), ($globeJs.Length / 1KB), ($world.Length / 1KB))

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Faith maps (faith-map.js: the religion profiles' #faith-map and /faiths), from scripts/faiths.tsv: where each religion
# was the main faith (level 2) or held communities (level 1), century by century, its routes of spread, its marks (origin,
# holy places, the last places of a faith that ended), a caption per century and the works relied on. Written to
# data/faiths/<slug>.json in tenths of the map plane, as the other maps, each place followed by its longitude and
# latitude for the globe: {name, span, areas [x, y, r, from, to, level, name, note, lng, lat], routes [year, x1, y1, x2,
# y2, label, lng1, lat1, lng2, lat2], marks [kind, year, x, y, name, text, lng, lat], notes [[year, text]], src}; radii
# are given in kilometres (about 40 km to a plane unit). FAITHS_V and GLOBE_V (globe-land.js) go into faith-map.js.
# Stops on a religion without a profile, a year outside its span (a century's grace), a level other than 1 or 2, or a
# place off the map.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
$FAITH = [ordered]@{}
foreach ($m in [regex]::Matches([IO.File]::ReadAllText("$Repo\shared-data.js", $U8), '\{"name": ("(?:[^"\\]|\\.)*"), "region": "[^"]*", "kind": "religion", "start": (-?\d+), "end": (null|-?\d+)')) {
  $fnm = $JSS.Deserialize($m.Groups[1].Value, [string])
  $FAITH[[EpochBuild.W]::ToSlug($fnm)] = @{ name = $fnm; s = [int]$m.Groups[2].Value; e = $(if ($m.Groups[3].Value -eq 'null') { $null } else { [int]$m.Groups[3].Value }) }
}
$fmBad = New-Object Collections.Generic.List[string]; $fmOut = [ordered]@{}; $fmCur = $null; $fmLn = 0
function FmPlace([string]$s, [string]$where) {
  $p = $s -split ','; if ($p.Count -ne 2) { $fmBad.Add("$where`: place '$s'"); return $null }
  $la = 0.0; $lo = 0.0
  if (-not [double]::TryParse($p[0].Trim(), [Globalization.NumberStyles]::Float, $INV, [ref]$la) -or -not [double]::TryParse($p[1].Trim(), [Globalization.NumberStyles]::Float, $INV, [ref]$lo) -or [Math]::Abs($la) -gt 84 -or $la -lt -57 -or [Math]::Abs($lo) -gt 180) { $fmBad.Add("$where`: place '$s'"); return $null }
  $xy = [EpochGeo.G]::P($lo, $la); return @((Fx $xy[0]), (Fx $xy[1]), ([Math]::Round($lo, 2)).ToString($INV), ([Math]::Round($la, 2)).ToString($INV))
}
function FmYear([string]$s, [string]$where, $f, [switch]$Open) {
  if (-not $s.Trim()) { if ($Open) { return 'null' }; $fmBad.Add("$where`: a year is missing"); return '0' }
  $y = 0; if (-not [int]::TryParse($s.Trim(), [ref]$y)) { $fmBad.Add("$where`: year '$s'"); return '0' }
  $end = if ($null -eq $f.e) { 2025 } else { $f.e + 100 }
  if ($y -lt $f.s - 100 -or $y -gt $end) { $fmBad.Add("$where`: year $y outside $($f.name) ($($f.s) to $(if ($null -eq $f.e) { 'today' } else { $f.e }))") }
  return [string]$y
}
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\faiths.tsv", $U8)) {
  $fmLn++; if (-not $l.Trim() -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t"); $where = "faiths.tsv:$fmLn"
  if ($c[0].StartsWith('@')) {
    $fsl = $c[0].Substring(1)
    if (-not $FAITH.Contains($fsl)) { $fmBad.Add("$where`: no religion profile '$fsl'"); $fmCur = $null; continue }
    $fmCur = @{ f = $FAITH[$fsl]; areas = New-Object Collections.Generic.List[string]; routes = New-Object Collections.Generic.List[string]; marks = New-Object Collections.Generic.List[string]; notes = New-Object Collections.Generic.List[string]; src = New-Object Collections.Generic.List[string] }
    $fmOut[$fsl] = $fmCur; continue
  }
  if (-not $fmCur) { continue }
  $ff = $fmCur.f
  switch ($c[0]) {
    'area' {   # area name lat,lng km from to level note
      $xy = FmPlace $c[2] $where; $km = 0; [void][int]::TryParse($c[3], [ref]$km); $lv = $c[6].Trim()
      if ($km -lt 20 -or $km -gt 3000) { $fmBad.Add("$where`: radius '$($c[3])'") }
      if ($lv -ne '1' -and $lv -ne '2') { $fmBad.Add("$where`: level '$lv'") }
      $fr = FmYear $c[4] $where $ff; $to = FmYear $c[5] $where $ff -Open
      if ($to -ne 'null' -and [int]$to -le [int]$fr) { $fmBad.Add("$where`: ends before it begins") }
      if ($xy) { $fmCur.areas.Add('[' + $xy[0] + ',' + $xy[1] + ',' + [Math]::Round($km / 4.0075) + ',' + $fr + ',' + $to + ',' + $lv + ',' + (Js $c[1]) + ',' + (Js $(if ($c.Count -gt 7) { $c[7] } else { '' })) + ',' + $xy[2] + ',' + $xy[3] + ']') }
    }
    'route' {   # route year lat,lng > lat,lng label
      $ends = $c[2] -split '>'; $a = FmPlace $ends[0] $where; $b = $(if ($ends.Count -eq 2) { FmPlace $ends[1] $where } else { $fmBad.Add("$where`: route '$($c[2])'"); $null })
      $yr = FmYear $c[1] $where $ff
      if ($a -and $b) { $fmCur.routes.Add('[' + $yr + ',' + $a[0] + ',' + $a[1] + ',' + $b[0] + ',' + $b[1] + ',' + (Js $c[3]) + ',' + $a[2] + ',' + $a[3] + ',' + $b[2] + ',' + $b[3] + ']') }
    }
    'mark' {   # mark origin|place|last year name lat,lng text
      if ($c[1] -notin 'origin', 'place', 'last') { $fmBad.Add("$where`: mark kind '$($c[1])'") }
      $xy = FmPlace $c[4] $where; $yr = FmYear $c[2] $where $ff
      if ($xy) { $fmCur.marks.Add('[' + (Js $c[1]) + ',' + $yr + ',' + $xy[0] + ',' + $xy[1] + ',' + (Js $c[3]) + ',' + (Js $(if ($c.Count -gt 5) { $c[5] } else { '' })) + ',' + $xy[2] + ',' + $xy[3] + ']') }
    }
    'note' { $fmCur.notes.Add('[' + (FmYear $c[1] $where $ff) + ',' + (Js $c[2]) + ']') }
    'src' { $fmCur.src.Add((Js $c[1])) }
    default { $fmBad.Add("$where`: unknown line '$($c[0])'") }
  }
}
if ($fmBad.Count) { throw ('scripts/faiths.tsv: ' + ($fmBad -join '; ')) }
$fmAll = New-Object Text.StringBuilder
foreach ($fsl in $fmOut.Keys) {
  $o = $fmOut[$fsl]
  $js = '{"slug":' + (Js $fsl) + ',"name":' + (Js $o.f.name) + ',"span":[' + $o.f.s + ',' + $(if ($null -eq $o.f.e) { 'null' } else { $o.f.e }) + ']' +
    ',"areas":[' + ($o.areas -join ',') + '],"routes":[' + ($o.routes -join ',') + '],"marks":[' + ($o.marks -join ',') + '],"notes":[' + ($o.notes -join ',') + '],"src":[' + ($o.src -join ',') + ']}'
  [void]$fmAll.Append($js)
  if ([EpochBuild.W]::WriteIfChanged("$Repo\data\faiths\$fsl.json", $js)) { $NWRITE++ }
}
$FAITHSV = [EpochBuild.W]::Sha1($fmAll.ToString()).Substring(0, 10)
$t = [IO.File]::ReadAllText("$Repo\faith-map.js", $U8); $t2 = [regex]::Replace($t, "var FAITHS_V = '[0-9a-f]*', GLOBE_V = '[0-9a-f]*';", "var FAITHS_V = '$FAITHSV', GLOBE_V = '$GLOBEV';"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\faith-map.js", $t2)) { $NWRITE++ }
Say ("faith maps: {0} of {1} religions, {2} areas" -f $fmOut.Count, $FAITH.Count, (($fmOut.Values | ForEach-Object { $_.areas.Count } | Measure-Object -Sum).Sum))

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Flashcards (/flashcards, flashcards.js): decks made from the data, written as data/cards/<deck>.json and listed in the
# page's build:fc-decks block with each file's ?v=. A card is [id, front, back, picture, link, hint]; a deck {id, t
# title, ask (the question on the front), pf (0 the picture on the back, 1 only the picture in front: "who is this?",
# 2 the picture and the front text), cards}. The decks: the glossary (a term, its first sentence), the best-known people
# of each century with a picture, the profiles' capitals (empire-facts.js) and their key events with a firm year
# (empire-glance.js) by region, and the stops of each reading path with the path's reason for each.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'flashcards'
New-Item -ItemType Directory -Force "$Repo\data\cards" | Out-Null
$FCD = New-Object Collections.Generic.List[object]
function FcCard([string]$id, [string]$f, [string]$b, [string]$img, [string]$l, [string]$h) { [pscustomobject]@{ id = $id; f = $f; b = $b; img = $img; l = $l; h = $h } }
function FcDeck([string]$id, [string]$g, [string]$t, [string]$s, [string]$d, [string]$ask, [int]$pf, $cards, [string]$img) {   # s: the tile's short label
  $cs = @($cards | Where-Object { $_ }); if ($cs.Count -lt 5) { return }
  $js = '{"id":' + (Js $id) + ',"t":' + (Js $t) + ',"ask":' + (Js $ask) + ',"pf":' + $pf + ',"cards":[' + "`n" + (($cs | ForEach-Object { '[' + (Js $_.id) + ',' + (Js $_.f) + ',' + (Js $_.b) + ',' + (Js $_.img) + ',' + (Js $_.l) + ',' + (Js $_.h) + ']' }) -join ",`n") + "`n]}`n"
  if ([EpochBuild.W]::WriteIfChanged("$Repo\data\cards\$id.json", $js)) { $script:NWRITE++ }
  $pic = @($cs | Where-Object { $_.img }); $first = if ($img) { $img } elseif ($pic.Count) { $pic[0].img } else { '' }
  $script:FCD.Add([pscustomobject]@{ id = $id; g = $g; t = $t; s = $(if ($s) { $s } else { $t }); d = $d; n = $cs.Count; pics = $pic.Count; img = $(if ($first -like '/images/*') { ThumbOf $first } else { $first }); v = [EpochBuild.W]::Sha1($js).Substring(0, 10) })
}
# words: the glossary, the terms the profiles mention most first (not the everyday words the worksheets also leave out)
$fcTerms = @($TERMS | Where-Object { -not $WSSTOP.ContainsKey($_.name) })
FcDeck 'glossary' 'words' 'The glossary' '' ("$($fcTerms.Count) terms of the glossary: offices, institutions, laws and ideas, each with its first sentence.") 'What does it mean?' 0 @(
  $fcTerms | Sort-Object @{ e = { $ESCORE[$_.slug] }; Descending = $true }, @{ e = { $_.name } } | ForEach-Object { FcCard $_.slug $_.name ([EpochBuild.W]::FirstSentence($_.desc, 240)) ([string]$_.img) ('/encyclopedia/' + $_.slug) 'A term' }) $(if ($BY.ContainsKey('code-of-hammurabi')) { [string]$BY['code-of-hammurabi'].img } else { '' })
# faces: each century's 40 best-known people with a picture that shows them (PicFace); centuries with fewer than twelve share a deck
function FcPeople($cs, $lst) {
  $lbl = if ($cs.Count -eq 1) { $cs[0] } else { (($cs[0] -replace ' century', '') -replace ' BCE', '') + ' to ' + $cs[-1] }   # "26th to 14th century BCE"
  if ($cs.Count -gt 1 -and ($cs[0] -match 'BCE') -ne ($cs[-1] -match 'BCE')) { $lbl = $cs[0] + ' to the ' + $cs[-1] }
  $top = @($lst | Sort-Object @{ e = { $_.sc }; Descending = $true }, @{ e = { $_.e.i } } | Select-Object -First 40)
  FcDeck ('people-' + (CenturySlug $cs[0]) + $(if ($cs.Count -gt 1) { '-to-' + (CenturySlug $cs[-1]) } else { '' })) 'people' ('People of the ' + $lbl) ($lbl.Substring(0, 1).ToUpperInvariant() + $lbl.Substring(1)) ("The best-known people of the $lbl with a picture: who is who?") 'Who is this?' 1 @(
    $top | ForEach-Object { FcCard $_.e.slug $_.e.name ([EpochBuild.W]::FirstSentence($_.e.desc, 200)) ([string]$_.e.img) ('/encyclopedia/' + $_.e.slug) ([string]$_.e.dates + $(if ($_.r) { ' · ' + $_.r } else { '' })) }) ''
}
$fcBufC = New-Object Collections.Generic.List[string]; $fcBuf = New-Object Collections.Generic.List[object]
foreach ($c in $PCENTS) {
  $lst = @($PBYC[$c] | Where-Object { PicFace $_.e -Strict })
  if ($lst.Count -lt 12) { $fcBufC.Add($c); foreach ($x in $lst) { $fcBuf.Add($x) }; continue }
  if ($fcBufC.Count) { FcPeople $fcBufC.ToArray() $fcBuf.ToArray(); $fcBufC.Clear(); $fcBuf.Clear() }
  FcPeople @($c) $lst
}
if ($fcBufC.Count) { FcPeople $fcBufC.ToArray() $fcBuf.ToArray() }
# capitals and key events, by the region of the profile, oldest first
$FCCAP = @{}; foreach ($m in [regex]::Matches([IO.File]::ReadAllText("$Repo\empire-facts.js", $U8), '(?m)^  "([^"]+)": \{capital:"((?:[^"\\]|\\.)*)"')) { $FCCAP[$m.Groups[1].Value] = [regex]::Unescape($m.Groups[2].Value) }
function FcSpan($em) { $sp = if ($em['points']) { @([double]$em['points'][0][0], [double]$em['points'][-1][0]) } else { @([double]$em['start'], $(if ($null -eq $em['end']) { 2025 } else { [double]$em['end'] })) }; (YearLabel ([int]$sp[0])) + '–' + $(if ($null -eq $em['end'] -and $sp[1] -ge 2025) { 'present' } else { YearLabel ([int]$sp[1]) }) }
foreach ($rr in $BREG) {
  $ems = @($EMPS | Where-Object { [string]$_['region'] -eq $rr } | Sort-Object @{ e = { if ($_['points']) { [double]$_['points'][0][0] } else { [double]$_['start'] } } }, @{ e = { [string]$_['name'] } })
  $rs = [EpochBuild.W]::ToSlug($rr)
  FcDeck ('capitals-' + $rs) 'capitals' ('Capitals: ' + $rr) $rr ("The capitals of the profiled states and empires of $rr, from their key facts.") 'What was its capital?' 2 @(
    $ems | Where-Object { -not $_['kind'] -and $FCCAP[[string]$_['name']] } | ForEach-Object { $nm = [string]$_['name']; FcCard ([EpochBuild.W]::ToSlug($nm)) $nm $FCCAP[$nm] $(if ($LOGO.ContainsKey($nm)) { '/logos/thumbs/' + [Uri]::EscapeDataString($nm) + '.png' } else { '' }) (ProfUrl $nm) (FcSpan $_) }) ''
  $evc = New-Object Collections.Generic.List[object]
  foreach ($em in $ems) {
    $nm = [string]$em['name']; if (-not $GLANCE.Contains($nm)) { continue }; $k = 0
    foreach ($gev in @($GLANCE[$nm]['ev'])) { $k++; $yv = [EpochBuild.W]::Firm([string]$gev[0], $false); if ($yv -eq $MINV) { continue }; $evc.Add((FcCard ([EpochBuild.W]::ToSlug($nm) + '-' + $k) ([string]$gev[1]) (YearLabel $yv) '' (ProfUrl $nm) $nm)) }
  }
  $evImg = @($ems | Where-Object { $LOGO.ContainsKey([string]$_['name']) } | Select-Object -First 1)
  FcDeck ('events-' + $rs) 'events' ('Key events: ' + $rr) $rr ("The dated key events of the profiles of ${rr}: in which year?") 'In which year?' 0 $evc $(if ($evImg.Count) { '/logos/thumbs/' + [Uri]::EscapeDataString([string]$evImg[0]['name']) + '.png' } else { '' })
}
# paths: each stop and the path's reason for it
foreach ($p in $RP) {
  FcDeck ('path-' + [string]$p['slug']) 'paths' ([string]$p['title']) '' ([string]$p['tagline']) 'Why is it on the path?' 2 @(
    @($p['steps']) | ForEach-Object { FcCard ([string]$_['href'] -replace '^/(encyclopedia|empire|religion|language|culture|movement|state)/', '') ([string]$_['name']) ([string]$_['why']) ([string]$_['img']) ([string]$_['href']) ([string]$_['meta']) }) ''
}
$FCG = [ordered]@{ words = @('Words of history', 'The terms historians use, one card each.'); people = @('Faces of the past', 'A portrait on the front: who is it?'); capitals = @('Capitals', 'The seats of the profiled states and empires, region by region.'); events = @('Key events', 'The turning points of the profiles: the year on the back.'); paths = @('Reading paths', 'The stops of a path and why each one is on it.') }
$fcb = New-Object Text.StringBuilder
foreach ($g in $FCG.Keys) {
  $ds = @($FCD | Where-Object { $_.g -eq $g }); if (-not $ds.Count) { continue }
  [void]$fcb.Append('<section class="fc-group" aria-labelledby="fc-g-' + $g + '"><h2 class="ref-sec-title" id="fc-g-' + $g + '">' + $FCG[$g][0] + ' <span class="n">' + $ds.Count + $(if ($ds.Count -eq 1) { ' deck' } else { ' decks' }) + '</span></h2><p class="fc-gnote">' + $FCG[$g][1] + '</p><ul class="fc-decks' + $(if ($ds.Count -gt 12) { ' fc-many' } else { '' }) + '">')
  foreach ($dk in $ds) {
    [void]$fcb.Append('<li><a class="fc-deck" href="#' + $dk.id + '" data-deck="' + $dk.id + '" data-title="' + (Hx $dk.t) + '" data-v="' + $dk.v + '" data-n="' + $dk.n + '" data-pics="' + $dk.pics + '">' + $(if ($dk.img) { '<span class="fc-deck-img"><img src="' + (Hx $dk.img) + '" alt="" loading="lazy" width="48" height="48"></span>' } else { '<span class="fc-deck-img fc-deck-mono" aria-hidden="true">' + (Hx $dk.s.Substring(0, 1)) + '</span>' }) +
      '<span class="fc-deck-b"><span class="fc-deck-t">' + (Hx $dk.s) + '</span><span class="fc-deck-n">' + $dk.n + ' cards</span><span class="fc-deck-s"></span></span></a></li>')
  }
  [void]$fcb.Append("</ul></section>`n")
}
SetBlock "$Repo\flashcards" 'fc-decks' $fcb.ToString().TrimEnd()
$FCN = ($FCD | Measure-Object -Property n -Sum).Sum
Say ("flashcards: {0} decks, {1:N0} cards" -f $FCD.Count, $FCN)

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# My timeline (/passport, passport.js): when the reading pages a reader has seen are about. data/spans/<c>.json, one
# file per first character of the page's last address part, {key: [first, (last when it differs,) name]}: entries by
# slug (their dates, [EpochBuild.W]::Span), state pages "s:<id>" (the register's years; a living state to this year; the
# states with a profile go to it), country histories "c:<slug>" (their first state's founding to this year) and
# speeches "p:<slug>" (their year). Profiles, centuries, people by century and years are placed from the page's own
# data. SPANS_V (all the files' hash) is stamped into passport.js.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'my timeline: data/spans'
New-Item -ItemType Directory -Force "$Repo\data\spans" | Out-Null
$SPN = [ordered]@{}
function SpanAdd([string]$key, [string]$part, [int]$a, [int]$b, [string]$name) {
  $c = $part.Substring(0, 1); if ($c -notmatch '^[a-z0-9]$') { $c = '_' }
  if (-not $SPN.Contains($c)) { $SPN[$c] = New-Object Text.StringBuilder }
  $sb = $SPN[$c]; [void]$sb.Append($(if ($sb.Length) { ",`n" } else { '' })).Append((Js $key)).Append(':[').Append($a)
  if ($b -ne $a) { [void]$sb.Append(',').Append($b) }
  [void]$sb.Append(',').Append((Js $name)).Append(']')
}
foreach ($e in $ENT) { $sp = $EYRS[$e.slug]; if ($sp) { SpanAdd $e.slug $e.slug ([int]$sp[0]) ([int]$sp[1]) $e.name } }
foreach ($n in $POL['nodes']) { if ($null -eq $n['s'] -or $n['p']) { continue }; SpanAdd ('s:' + $n['id']) ([string]$n['id']) ([int]$n['s']) $(if ($null -eq $n['e']) { $YEAR } else { [int]$n['e'] }) ([string]$n['n']) }
foreach ($m in ($CPAGE.Keys | Sort-Object)) {
  $f0 = $null; foreach ($n in $CSTATES[$m]) { if ($null -ne $n['s'] -and ($null -eq $f0 -or [int]$n['s'] -lt $f0)) { $f0 = [int]$n['s'] } }
  if ($null -ne $f0) { SpanAdd ('c:' + $CPAGE[$m]) $CPAGE[$m] $f0 $YEAR $m }
}
foreach ($spx in $SPS) { SpanAdd ('p:' + $spx['slug']) ([string]$spx['slug']) ([int]$spx['year']) ([int]$spx['year']) ([string]$spx['title']) }
$spAll = New-Object Text.StringBuilder; $spFiles = 0
foreach ($c in ($SPN.Keys | Sort-Object)) {
  $js = "{`n" + $SPN[$c].ToString() + "`n}`n"; [void]$spAll.Append($js)
  if ([EpochBuild.W]::WriteIfChanged("$Repo\data\spans\$c.json", $js)) { $NWRITE++ }
  $spFiles++
}
foreach ($f in (Get-ChildItem "$Repo\data\spans" -Filter '*.json')) { if (-not $SPN.Contains($f.BaseName)) { Remove-Item $f.FullName } }
$SPANSV = [EpochBuild.W]::Sha1($spAll.ToString()).Substring(0, 10)
$t = [IO.File]::ReadAllText("$Repo\passport.js", $U8); $t2 = [regex]::Replace($t, "var SPANS_V = '[0-9a-f]*';", "var SPANS_V = '$SPANSV';"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\passport.js", $t2)) { $NWRITE++ }
Say ("my timeline: {0} files, {1:N0} KB" -f $spFiles, [Math]::Round($spAll.Length / 1024))

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Generated blocks in the hand-written index pages, enc-page.js version, stale pages, sitemaps
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

# ── games-data.js (Which Came First?, Guess the Year, Picture Puzzle, Word Hunt) and the Kids corner (/kids) ──────────
# Pictures: scripts/game-pictures.tsv, chosen by eye (and images/games/<slug>.jpg, 800 px, from fetch-game-images.ps1).
# Cards: [slug, name, kind, first year, last year, dates, picture, big picture, caption, fit for Kids mode, credit, source]
function GameCredit($e) { if (-not $e.cr) { return '' }; ((@([string]$e.cr['artist'], [string]$e.cr['licence']) | Where-Object { $_ }) -join ' · ') }
$GPICS = [ordered]@{}; $GPSETS = New-Object Collections.Generic.List[string]
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\game-pictures.tsv", $U8)) {
  if ($l -match '^# sets: (.+)$') { foreach ($sn in ($Matches[1] -split '\|')) { $GPSETS.Add($sn.Trim()) }; continue }
  if (-not $l -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t"); $GPICS[$c[0]] = @($(if ($c.Count -gt 1) { $c[1] } else { '' }), $(if ($c.Count -gt 2 -and $c[2]) { [int]$c[2] } else { 0 }))
}
# a person's first year is the birth (the games say "born …"): scripts/person-dates.tsv gives it where the dates are a
# reign, an accession or a death; "-" there keeps a person whose birth is not known out of the dated games
$GBORN = @{}
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\person-dates.tsv", $U8)) {
  if (-not $l -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t"); if ($c.Count -gt 2 -and $c[2]) { $GBORN[$c[0]] = $c[2] }
}
$gCards = New-Object Collections.Generic.List[string]; $gPuz = @{}; $gMiss = New-Object Collections.Generic.List[string]; $gDated = 0; $gBig = 0
foreach ($gs in $GPICS.Keys) {
  if (-not $BY.ContainsKey($gs) -or -not $BY[$gs].img) { $gMiss.Add($gs); continue }
  $e = $BY[$gs]; $gsp = [EpochBuild.W]::Span($e.dates)
  if ($e.type -eq 'person' -and $GBORN.ContainsKey($gs)) {
    if ($GBORN[$gs] -eq '-') { $gsp = $null }
    else { $gb = [int]$GBORN[$gs]; $gsp = @($gb, $(if ($gsp -and $gsp[1] -gt $gb) { $gsp[1] } else { $gb })) }
  }
  $big = if (Test-Path "$Repo\images\games\$gs.jpg") { "/images/games/$gs.jpg" } else { '' }
  if ($gsp) { $gDated++ }; if ($big) { $gBig++ }
  $kind = if ($SING.ContainsKey($e.type)) { $SING[$e.type] } else { $e.type }
  $gCards.Add('[' + (Js $gs) + ',' + (Js $e.name) + ',' + (Js $kind) + ',' + $(if ($gsp) { [string]$gsp[0] + ',' + [string]$gsp[1] } else { 'null,null' }) + ',' + (Js $e.dates) + ',' + (Js $e.img) + ',' + (Js $big) + ',' +
    (Js ([EpochBuild.W]::Summary($e.desc, 170))) + ',' + $(if ($e.conflict) { 0 } else { 1 }) + ',' + (Js (GameCredit $e)) + ',' + (Js $(if ($e.cr) { [string]$e.cr['source'] } else { '' })) + ']')
  $ps = $GPICS[$gs][0]
  if ($ps -and $big) { if (-not $gPuz.ContainsKey($ps)) { $gPuz[$ps] = New-Object Collections.Generic.List[object] }; $gPuz[$ps].Add(@($GPICS[$gs][1], $gs)) }
}
$gPuzJs = (@($GPSETS | Where-Object { $gPuz.ContainsKey($_) } | ForEach-Object { '{"set":' + (Js $_) + ',"items":[' + ((@($gPuz[$_] | Sort-Object { $_[0] } | ForEach-Object { Js $_[1] })) -join ',') + ']}' })) -join ','
# Word Hunt themes: scripts/word-hunt.tsv (@key, title, introduction, picture; then WORD, clue, entry). Hard grids show
# only the clues, so a clue that gives its own word away or names another word of its theme stops the build.
$gWords = New-Object Collections.Generic.List[string]; $wTheme = $null; $wList = $null; $wBad = New-Object Collections.Generic.List[string]
$wClues = New-Object Collections.Generic.List[object]; $wFaults = New-Object Collections.Generic.List[string]
function FlushTheme {
  if ($script:wTheme) { $script:gWords.Add($script:wTheme + ',"words":[' + ($script:wList -join ',') + ']}') }
  foreach ($x in $script:wClues) {
    $f = ClueOwnFault $x[0] $x[1]; if ($f) { $script:wFaults.Add("$($x[0]) $f") }
    foreach ($y in $script:wClues) { if ($y[0] -ne $x[0] -and (ClueNamed $x[2] $y[0])) { $script:wFaults.Add("the clue of $($x[0]) names $($y[0])") } }
  }
  $script:wClues.Clear()
}
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\word-hunt.tsv", $U8)) {
  if (-not $l -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t")
  if ($c[0].StartsWith('@')) {
    FlushTheme
    $wp = $c[3]; $wimg = if ($wp -and (Test-Path "$Repo\images\games\$wp.jpg")) { "/images/games/$wp.jpg" } elseif ($wp -and $BY.ContainsKey($wp) -and $BY[$wp].img) { $BY[$wp].img } else { $wBad.Add("picture $wp"); '' }
    $script:wTheme = '{"k":' + (Js $c[0].Substring(1)) + ',"t":' + (Js $c[1]) + ',"intro":' + (Js $c[2]) + ',"img":' + (Js $wimg); $script:wList = New-Object Collections.Generic.List[string]; continue
  }
  if ($c[0] -notmatch '^[A-Z]{3,12}$') { $wBad.Add("word $($c[0])"); continue }
  $wl = if ($c.Count -gt 2 -and $c[2]) { if ($BY.ContainsKey($c[2])) { '/encyclopedia/' + $c[2] } else { $wBad.Add("entry $($c[2])"); '' } } else { '' }
  $script:wList.Add('[' + (Js $c[0]) + ',' + (Js $c[1]) + ',' + (Js $wl) + ']'); $wClues.Add(@($c[0], $c[1], (ClueSet $c[1])))
}
FlushTheme
if ($wFaults.Count) { throw ('scripts/word-hunt.tsv: clues that give an answer away: ' + ($wFaults -join '; ')) }
$gameJs = "// games-data.js - built by scripts/build-pages.ps1 from scripts/game-pictures.tsv and scripts/word-hunt.tsv. Do not edit.`n" +
  "var GAME_CARDS = [`n" + ($gCards -join ",`n") + "`n];`nvar GAME_PUZZLES = [" + $gPuzJs + "];`nvar GAME_WORDS = [`n" + ($gWords -join ",`n") + "`n];`n"
[void][EpochBuild.W]::WriteIfChanged("$Repo\games-data.js", $gameJs); $GAMESV = [EpochBuild.W]::Sha1($gameJs).Substring(0, 10)
$t = [IO.File]::ReadAllText("$Repo\games", $U8); $t2 = [regex]::Replace($t, 'games-data\.js\?v=[0-9a-f]*', "games-data.js?v=$GAMESV")
if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\games", $t2)) { $NWRITE++ }
Say ("games: {0} pictures ({1} dated, {2} large), {3} puzzle sets, {4} Word Hunt themes{5}" -f $gCards.Count, $gDated, $gBig, $gPuz.Count, $gWords.Count, $(if ($gMiss.Count -or $wBad.Count) { '; skipped: ' + (($gMiss + $wBad) -join ', ') } else { '' }))
# History Connections: scripts/connections.tsv ("@" starts a puzzle; then four groups: level, name, four tiles "Label=slug",
# or "Label=/empire/..." for a profile or state page) -> connections-data.js, its ?v= stamped into /games. An unknown
# entry or page stops the build: every tile links to what it names.
$czOut = New-Object Collections.Generic.List[string]; $czBad = New-Object Collections.Generic.List[string]; $czCur = $null; $czN = 0
function FlushConn { if ($script:czCur) { if ($script:czCur.Count -ne 4) { $script:czBad.Add("puzzle $($script:czN): $($script:czCur.Count) groups") } else { $script:czOut.Add('{"g":[' + ($script:czCur -join ',') + ']}') } } }
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\connections.tsv", $U8)) {
  if (-not $l -or $l.StartsWith('#')) { continue }
  if ($l.StartsWith('@')) { FlushConn; $czN++; $czCur = New-Object Collections.Generic.List[string]; continue }
  $c = $l.Split("`t"); if ($c.Count -ne 6) { $czBad.Add("puzzle ${czN}: $l"); continue }
  $tiles = for ($i = 2; $i -lt 6; $i++) {
    $kv = $c[$i] -split '=', 2; $sl = $kv[1]
    if ($sl.StartsWith('/')) { if (-not (Test-Path (Join-Path $Repo ($sl.TrimStart('/') -replace '/', '\')))) { $czBad.Add("puzzle ${czN}: no page $sl") } }
    elseif (-not $BY.ContainsKey($sl)) { $czBad.Add("puzzle ${czN}: unknown entry $sl") }
    '[' + (Js $kv[0]) + ',' + (Js $sl) + ']'
  }
  $czCur.Add('[' + (Js $c[1]) + ',' + [int]$c[0] + ',[' + ($tiles -join ',') + ']]')
}
FlushConn
if ($czBad.Count) { throw ('scripts/connections.tsv: ' + ($czBad -join '; ')) }
$connJs = "// connections-data.js - built by scripts/build-pages.ps1 from scripts/connections.tsv. Do not edit.`n// puzzles: {g: [[group name, level 1-4, [[tile, entry slug or page path] x4]] x4]}`nvar CONN_PUZZLES = [`n" + ($czOut -join ",`n") + "`n];`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\connections-data.js", $connJs)) { $NWRITE++ }; $CONNV = [EpochBuild.W]::Sha1($connJs).Substring(0, 10)
$t = [IO.File]::ReadAllText("$Repo\games", $U8); $t2 = [regex]::Replace($t, 'connections-data\.js\?v=[0-9a-f]*', "connections-data.js?v=$CONNV"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\games", $t2)) { $NWRITE++ }
Say "connections: $($czOut.Count) puzzles"
# The History Crossword (games.js #cross): scripts/crossword-words.tsv (ANSWER, a plain clue, the entry it links to;
# answers A-Z, words split by a space or hyphen) and scripts/crosswords.tsv (the puzzles made by
# scripts/make-crosswords.ps1, only ever appended to) -> crossword-data.js, loaded by games.js when the tab first opens
# (CW_SRC in /games, its ?v= stamped here). CW_DATA = {w: [[answer, clue, entry]], p: [[answer index, 0 across or
# 1 down, row, column, ...] a puzzle]}. An answer without a clue, an unknown entry or an answer twice stops the build,
# and so does a clue that gives its own answer away or names another answer of the same puzzle.
$cwIdx = @{}; $cwRows = New-Object Collections.Generic.List[string]; $cwBad = New-Object Collections.Generic.List[string]; $cwSet = @{}
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\crossword-words.tsv", $U8)) {
  if (-not $l.Trim() -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t")
  if ($c.Count -ne 3 -or $c[0] -cnotmatch '^[A-Z]+(?:[ -][A-Z]+)*$') { $cwBad.Add("words: '$l'"); continue }
  if (-not $BY.ContainsKey($c[2])) { $cwBad.Add("words: unknown entry $($c[2]) for $($c[0])"); continue }
  $cwKey = $c[0] -replace '[ -]', ''
  if ($cwIdx.ContainsKey($cwKey)) { $cwBad.Add("words: $cwKey twice"); continue }
  $cwF = ClueOwnFault $c[0] $c[1]; if ($cwF) { $cwBad.Add("words: the clue of $($c[0]) $cwF") }
  $cwSet[$cwKey] = ClueSet $c[1]
  $cwIdx[$cwKey] = $cwRows.Count; $cwRows.Add('[' + (Js $c[0]) + ',' + (Js $c[1]) + ',' + (Js $c[2]) + ']')
}
$cwPz = New-Object Collections.Generic.List[string]
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\crosswords.tsv", $U8)) {
  if ($l -notmatch '^\d+\t') { continue }
  $cwParts = $l.Split("`t"); $cwNums = New-Object Collections.Generic.List[string]
  foreach ($p in ($cwParts | Select-Object -Skip 1)) {
    $q = $p.Split('|')
    if (-not $cwIdx.ContainsKey($q[3])) { $cwBad.Add("crossword $($cwParts[0]): no clue for $($q[3])"); continue }
    $cwNums.Add([string]$cwIdx[$q[3]] + ',' + $(if ($q[0] -eq 'D') { '1' } else { '0' }) + ',' + $q[1] + ',' + $q[2])
  }
  $cwIn = @($cwParts | Select-Object -Skip 1 | ForEach-Object { $_.Split('|')[3] } | Where-Object { $cwSet.ContainsKey($_) })
  foreach ($cwA in $cwIn) { foreach ($cwO in $cwIn) { if ($cwO -ne $cwA -and (ClueNamed $cwSet[$cwA] $cwO)) { $cwBad.Add("crossword $($cwParts[0]): the clue of $cwA names $cwO") } } }
  $cwPz.Add('[' + ($cwNums -join ',') + ']')
}
if ($cwBad.Count) { throw ('crossword: ' + ($cwBad -join '; ')) }
$cwJs = "// crossword-data.js - built by scripts/build-pages.ps1 from scripts/crossword-words.tsv and scripts/crosswords.tsv.`n// w: [answer, clue, entry]; p: a puzzle a day, [answer, 0 across or 1 down, row, column, ...]. Do not edit.`nvar CW_DATA = {w:[`n" + ($cwRows -join ",`n") + "`n],`np:[`n" + ($cwPz -join ",`n") + "`n]};`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\crossword-data.js", $cwJs)) { $NWRITE++ }; $CWV = [EpochBuild.W]::Sha1($cwJs).Substring(0, 10)
$t = [IO.File]::ReadAllText("$Repo\games", $U8); $t2 = [regex]::Replace($t, 'crossword-data\.js\?v=[0-9a-f]*', "crossword-data.js?v=$CWV"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\games", $t2)) { $NWRITE++ }
Say ("crossword: {0} answers, {1} puzzles, crossword-data.js {2:N0} KB" -f $cwRows.Count, $cwPz.Count, ($cwJs.Length / 1KB))
# Who Said It? (#said): data/quotes.json (scripts/fetch-quotes.ps1 imports each quotation's exact words from a free
# source listed in scripts/quote-sources.tsv; nothing is typed) -> said-data.js, loaded when the tab first opens (SAID_SRC
# in /games, its ?v= stamped here). Five quotations a day in the file's order, repeated after the last. Each has three
# other people to choose from, all with a picture: other speakers of about the same time first, then the best known of
# the speaker's age and region; never one who shares a name with the speaker (the two Plinys). An unknown speaker stops
# the build. SAID = {p: [[slug, name, dates, picture]], q: [[text, speaker, work, credit, url, source, licence, [others], note]]}
if (Test-Path "$Repo\data\quotes.json") {
  $QTS = @($JSS.DeserializeObject([IO.File]::ReadAllText("$Repo\data\quotes.json", $U8)))
  $sdBad = New-Object Collections.Generic.List[string]
  function SdMid([string]$slug) { $sp = $EYRS[$slug]; if ($sp) { ([double]$sp[0] + [double]$sp[1]) / 2 } else { $null } }
  function SdWords([string]$n) { @(([EpochBuild.W]::ToSlug($n)) -split '-' | Where-Object { $_.Length -ge 4 -and $_ -notmatch '^(the|of|and|great|saint|king|queen|emperor|elder|younger)$' }) }
  $sdSpk = @{}; foreach ($q in $QTS) { $sl = [string]$q['speaker']; if (-not $BY.ContainsKey($sl) -or $BY[$sl].type -ne 'person') { $sdBad.Add("speaker $sl") } else { $sdSpk[$sl] = 1 } }
  if ($sdBad.Count) { throw ('data/quotes.json: ' + (($sdBad | Select-Object -Unique) -join ', ')) }
  # the people who can stand beside a speaker: with a picture and years (their middle year and name words worked out once)
  $sdPool = @($PPL | Where-Object { $_.sp -and (PicFace $_.e -Strict) } | ForEach-Object { [pscustomobject]@{ slug = $_.e.slug; mid = ([double]$_.sp[0] + [double]$_.sp[1]) / 2; w = @(SdWords $_.e.name); r = $_.r; sc = [int]$_.sc } })
  $sdP = New-Object Collections.Generic.List[string]; $sdIx = @{}
  function SdPerson([string]$slug) { if (-not $sdIx.ContainsKey($slug)) { $e = $BY[$slug]; $sdIx[$slug] = $sdP.Count; $sdP.Add('[' + (Js $slug) + ',' + (Js $e.name) + ',' + (Js ([string]$e.dates)) + ',' + (Js $(if (PicFace $e) { ThumbOf $e.img } else { '' })) + ']') }; return $sdIx[$slug] }
  # a speaker's eight likeliest companions; each quotation draws three of them by its id, never the writer through whom
  # the words reach us (named in its work or note: Plato for Socrates, Thucydides for Pericles, Voltaire for Peter)
  $sdQ = New-Object Collections.Generic.List[string]; $sdCand = @{}; $sdRx = @{}
  function SdNamed([string]$slug, [string]$text) {
    if (-not $sdRx.ContainsKey($slug)) { $nm = [string]$BY[$slug].name; $last = @($nm -split ' ')[-1]; $alts = @($nm) + @($(if ($last -ne $nm -and $last.Length -ge 5 -and $last -notmatch '^(Great|Elder|Younger|Saint|First|Second|Third|Fourth)$') { $last })); $sdRx[$slug] = New-Object Regex ('\b(?:' + (($alts | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')\b') }
    $sdRx[$slug].IsMatch($text)
  }
  foreach ($q in $QTS) {
    $sl = [string]$q['speaker']; $me = $BY[$sl]
    if (-not $sdCand.ContainsKey($sl)) {
      $mid = SdMid $sl; $myW = SdWords $me.name; $myR = PersonRegion $me
      $win = if ($mid -gt 1500) { 60 } else { 100 }
      $cand = @(foreach ($o in $sdPool) {
        if ($null -eq $mid -or $o.slug -eq $sl) { continue }; $d = [Math]::Abs($o.mid - $mid); if ($d -gt $win) { continue }
        if (@($o.w | Where-Object { $myW -contains $_ }).Count) { continue }
        [pscustomobject]@{ slug = $o.slug; sc = $(if ($sdSpk.ContainsKey($o.slug)) { 1000 } else { 0 }) + $(if ($o.r -and $o.r -eq $myR) { 200 } else { 0 }) + $o.sc - $d / 4 }
      })
      $sdCand[$sl] = @($cand | Sort-Object @{ e = { $_.sc }; Descending = $true }, @{ e = { $_.slug } } | Select-Object -First 8 | ForEach-Object { $_.slug })
    }
    $via = [string]$q['work'] + ' ' + [string]$q['note']
    $others = @(TyShuffle @($sdCand[$sl] | Where-Object { -not (SdNamed $_ $via) }) ('said|' + [string]$q['id']) | Select-Object -First 3)
    if ($others.Count -lt 3) { $sdBad.Add("too few people beside $sl") }
    $sdQ.Add('[' + (Js ([string]$q['text'])) + ',' + (SdPerson $sl) + ',' + (Js ([string]$q['work'])) + ',' + (Js ([string]$q['credit'])) + ',' + (Js ([string]$q['url'])) + ',' + (Js ([string]$q['source'])) + ',' + (Js ([string]$q['licence'])) + ',[' + (($others | ForEach-Object { SdPerson $_ }) -join ',') + '],' + (Js ([string]$q['note'])) + ']')
  }
  if ($sdBad.Count) { throw ('Who Said It?: ' + (($sdBad | Select-Object -Unique) -join ', ')) }
  $sdJs = "// said-data.js - built by scripts/build-pages.ps1 from data/quotes.json (scripts/fetch-quotes.ps1, scripts/quote-sources.tsv). Do not edit.`n// p: [slug, name, dates, picture]; q: [text, speaker, work, credit, url, source, licence, [three others], note]: five a day, in order.`nvar SAID = {p:[`n" + ($sdP -join ",`n") + "`n],`nq:[`n" + ($sdQ -join ",`n") + "`n]};`n"
  if ([EpochBuild.W]::WriteIfChanged("$Repo\said-data.js", $sdJs)) { $NWRITE++ }; $SAIDV = [EpochBuild.W]::Sha1($sdJs).Substring(0, 10)
  $t = [IO.File]::ReadAllText("$Repo\games", $U8); $t2 = [regex]::Replace($t, 'said-data\.js\?v=[0-9a-f]*', "said-data.js?v=$SAIDV"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\games", $t2)) { $NWRITE++ }
  Say ("who said it: {0} quotations by {1} people, {2} days before the first comes back" -f $QTS.Count, $sdSpk.Count, [Math]::Floor($QTS.Count / 5))
}
# The Kids corner: scripts/kids-corner.tsv (@theme lines, entry lines with a line for young readers, ! facts)
$kdThemes = New-Object Collections.Generic.List[object]; $kdFacts = New-Object Collections.Generic.List[string]; $kdBad = New-Object Collections.Generic.List[string]; $kdT = $null
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\kids-corner.tsv", $U8)) {
  if (-not $l -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t")
  if ($c[0] -eq '!') {
    $fl = if ($c.Count -gt 2) { $c[2] } else { '' }
    if ($fl -match '^/encyclopedia/(.+)$' -and -not $BY.ContainsKey($Matches[1])) { $kdBad.Add($fl); $fl = '' }
    if ($fl -match '^/empire/(.+)$' -and -not (Test-Path "$Repo\empire\$($Matches[1])")) { $kdBad.Add($fl); $fl = '' }
    $kdFacts.Add('[' + (Js $c[1]) + ',' + (Js $fl) + ']'); continue
  }
  if ($c[0].StartsWith('@')) { $kdT = [pscustomobject]@{ k = $c[0].Substring(1); t = $c[1]; intro = $c[2]; pic = $c[3]; items = New-Object Collections.Generic.List[object] }; $kdThemes.Add($kdT); continue }
  if (-not $BY.ContainsKey($c[0]) -or -not $BY[$c[0]].img) { $kdBad.Add($c[0]); continue }
  $kdT.items.Add(@($BY[$c[0]], $c[1]))
}
$kdNav = New-Object Text.StringBuilder; $kdBody = New-Object Text.StringBuilder
foreach ($th in $kdThemes) {
  $tp = if ($BY.ContainsKey($th.pic)) { $BY[$th.pic].img } else { '' }
  [void]$kdNav.Append('<li><a class="kd-door" href="#t-' + $th.k + '"><span class="kd-door-img"><img src="' + $tp + '" alt="" loading="lazy"></span><span class="kd-door-t">' + (Hx $th.t) + '</span><span class="kd-door-n">' + $th.items.Count + ' to explore</span></a></li>')
  [void]$kdBody.Append('<section class="kd-sec" id="t-' + $th.k + '" aria-labelledby="t-' + $th.k + '-h"><h2 class="kd-h" id="t-' + $th.k + '-h">' + (Hx $th.t) + '</h2><p class="kd-intro">' + (Hx $th.intro) + '</p><ul class="kd-cards">')
  foreach ($it in $th.items) {
    $ie = $it[0]; $isz = ImgSize $ie.img
    [void]$kdBody.Append('<li><a class="kd-card" href="/encyclopedia/' + $ie.slug + '"><span class="kd-card-img"><img src="' + $ie.img + '" alt=""' + $(if ($isz) { ' width="' + $isz[0] + '" height="' + $isz[1] + '"' } else { '' }) + ' loading="lazy"></span><span class="kd-card-b"><span class="kd-card-t">' + (Hx $ie.name) + '</span><span class="kd-card-d">' + (Hx $it[1]) + '</span></span></a></li>')
  }
  [void]$kdBody.Append('</ul><p class="kd-more"><a class="kd-btn" href="/games#words-' + $th.k + '">Play the ' + (Hx $th.t) + ' Word Hunt &rarr;</a></p></section>')
}
SetBlock "$Repo\kids" 'kids-doors' ('<ul class="kd-doors">' + $kdNav.ToString() + '</ul>')
SetBlock "$Repo\kids" 'kids-themes' $kdBody.ToString()
SetBlock "$Repo\kids" 'kids-facts' ('<script>var KIDS_FACTS = [' + ($kdFacts -join ',') + '];</script>')
Say ("kids corner: {0} themes, {1} pictures, {2} facts{3}" -f $kdThemes.Count, (($kdThemes | ForEach-Object { $_.items.Count } | Measure-Object -Sum).Sum), $kdFacts.Count, $(if ($kdBad.Count) { '; skipped: ' + ($kdBad -join ', ') } else { '' }))
$az = '<ul class="ref-az">' + (($LETTERS | Where-Object { $byLetter[$_].Count } | ForEach-Object { '<li><a href="/encyclopedia/browse/' + $_ + '"><b>' + (LetterLabel $_) + '</b><span>' + $byLetter[$_].Count.ToString('N0') + '</span></a></li>' }) -join '') + '</ul>'
$cents = '<ul class="ref-cent-list">' + (($CENTORDER | ForEach-Object { '<li><a href="/encyclopedia/conflicts/' + (CenturySlug $_) + '">' + (Hx ($_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1))) + ' <span>' + $CENT[$_].Count + '</span></a></li>' }) -join '') + '</ul>'
# Discover: eight pictures a day from the most-mentioned entries (in profiles and state histories), one of each kind
$DKINDS = @('person', 'conflict', 'place', 'work', 'idea', 'polity', 'group', 'event')
$dByKind = @{}; foreach ($dk in $DKINDS) { $dByKind[$dk] = New-Object Collections.Generic.List[object] }
foreach ($e in $ENT) {
  if (-not $e.img) { continue }
  # a picture of the thing itself: no maps or diagrams, and no flags or coats of arms (most states would show one)
  $dsrc = PicSource $e.img; if ((PicIsChart $dsrc) -or $dsrc -match '(?i)(?<![a-z])(flag|flags|coat[_ ]of[_ ]arms|emblem|seal)(?![a-z])') { continue }
  $dk = if ($e.conflict) { 'conflict' } elseif ($e.type -eq 'institution') { 'polity' } else { [string]$e.type }
  if (-not $dByKind.ContainsKey($dk)) { continue }
  $stm = if ($ESM) { $ESM[$e.slug] } else { $null }
  $dByKind[$dk].Add([pscustomobject]@{ e = $e; n = $e.emp.Count * 3 + $(if ($stm) { [int]$stm[0] } else { 0 }) })
}
$dTop = @{}; foreach ($dk in $DKINDS) { $dTop[$dk] = @($dByKind[$dk] | Sort-Object -Property @{ e = { $_.n }; Descending = $true }, @{ e = { $_.e.name } } | Select-Object -First 10) }
$dRows = New-Object Collections.Generic.List[string]; $dTiles = New-Object Collections.Generic.List[string]
for ($di2 = 0; $di2 -lt 10; $di2++) { foreach ($dk in $DKINDS) { if ($di2 -lt $dTop[$dk].Count) { $o = $dTop[$dk][$di2].e; $tl = TypeLine $o; $dRows.Add('[' + (Js $o.slug) + ',' + (Js $o.name) + ',' + (Js ($tl -replace ' · .*$', '')) + ',' + (Js $o.img) + ']'); if ($dTiles.Count -lt 8) { $dTiles.Add('<li><a class="disc-card" href="/encyclopedia/' + $o.slug + '"><span class="disc-img"><img src="' + $o.img + '" alt="" loading="lazy"></span><span class="disc-b"><span class="disc-t">' + (Hx $o.name) + '</span><span class="disc-k">' + (Hx ($tl -replace ' · .*$', '')) + '</span></span></a></li>') } } } }
$discover = '<h2 class="ref-sec-title" id="enc-disc-title">Discover</h2><ul class="enc-disc" id="enc-disc">' + ($dTiles -join '') + '</ul>' +
  '<script>(function () { var D = [' + ($dRows -join ',') + '], d = Math.floor(Date.now() / 864e5), u = document.getElementById("enc-disc"), h = ""; function x(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); } for (var i = 0; i < 8 && D.length; i++) { var r = D[(d * 8 + i) % D.length]; h += "<li><a class=\"disc-card\" href=\"/encyclopedia/" + x(r[0]) + "\"><span class=\"disc-img\"><img src=\"" + x(r[3]) + "\" alt=\"\" loading=\"lazy\"></span><span class=\"disc-b\"><span class=\"disc-t\">" + x(r[1]) + "</span><span class=\"disc-k\">" + x(r[2]) + "</span></span></a></li>"; } u.innerHTML = h; })();</script>'
SetBlock "$Repo\encyclopedia\index" 'browse' ('<section class="ref-browse" id="enc-browse" aria-labelledby="enc-az-title">' + $discover + '<h2 class="ref-sec-title" id="enc-az-title">Browse A&ndash;Z</h2>' + $az +
  '<p class="enc-article-foot"><a class="enc-random-link" href="/encyclopedia/glossary">Glossary: ' + $TERMS.Count + ' historical terms explained &rarr;</a> <a class="enc-random-link" href="/centuries/">History by century &rarr;</a></p>' +
  '<h2 class="ref-sec-title">Conflicts &amp; Resolutions by century</h2>' + $cents + '</section>')
$t = [IO.File]::ReadAllText("$Repo\encyclopedia\index", $U8); $t2 = [regex]::Replace($t, 'index-data\.js\?v=[0-9a-f]*', "index-data.js?v=$IDXV"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\encyclopedia\index", $t2)) { $NWRITE++ }
$t = [IO.File]::ReadAllText("$Repo\enc-page.js", $U8); $t2 = [regex]::Replace($t, "var IDX_V = '[^']*';", "var IDX_V = '$IDXV';"); if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\enc-page.js", $t2)) { $NWRITE++ }
SetBlock "$Repo\state\index" 'regions' ('<section class="ref-browse" aria-labelledby="st-reg-title"><h2 class="ref-sec-title" id="st-reg-title">Browse by region</h2><ul class="ref-cent-list">' + (($REGIONS.Keys | Where-Object { $REGIONS[$_].Count } | ForEach-Object { '<li><a href="/state/browse/' + $_ + '">' + (Hx (RegionLabel $_)) + ' <span>' + $REGIONS[$_].Count + '</span></a></li>' }) -join '') + '</ul></section>')
SetBlock "$Repo\today-in-history\index" 'calendar' ('<section class="day-cal-wrap day-cal-year" aria-labelledby="cal-title"><h2 class="ref-sec-title" id="cal-title">Every day of the year</h2><div class="day-cal-grid">' + ((1..12 | ForEach-Object { MonthCal $_ '' }) -join '') + '</div></section>')
# the Research Hub's section cards and the home page's doors, map, centuries and countries (counts kept current)
function PicOf($slugs) { foreach ($s in $slugs) { if ($BY.ContainsKey($s) -and $BY[$s].img) { return $BY[$s].img } }; Say "  no picture among: $($slugs -join ', ')"; return '' }
$nImg = @($ENT | Where-Object { $_.img }).Count; $nTih = 0; foreach ($k in $DAYS) { $nTih += @($HIST[$k]).Count }
$SECTIONS = [ordered]@{
  profiles     = @{ t = 'Profiles'; h = '/profiles'; k = "$($EMPS.Count) profiles"; d = 'In-depth histories of states and empires, religions, languages, cultures and movements: their origins, great ages and legacies, with key facts and timelines.'; pic = @('colosseum', 'augustus', 'hagia-sophia') }
  encyclopedia = @{ t = 'Encyclopedia'; h = '/encyclopedia/'; k = $NENT.ToString('N0') + ' entries'; d = "People, places, events, institutions and ideas, with $($nImg.ToString('N0')) historical pictures."; pic = @('library-of-alexandria', 'house-of-wisdom', 'encyclopedie') }
  states       = @{ t = 'States'; h = '/state/'; k = $POL['nodes'].Count.ToString('N0') + ' states'; d = 'Every recorded kingdom, principality, republic and chiefdom, with its lineage and connections.'; pic = @('peace-of-westphalia', 'congress-of-vienna') }
  atlas        = @{ t = 'Atlas'; h = '/atlas'; k = 'From ' + (Yr $minS) + ' to today'; d = 'The world in any year: slide through five thousand years and watch states appear and vanish.'; pic = @('catalan-atlas', 'tabula-rogeriana', 'cantino-planisphere', 'piri-reis-map') }
  countries    = @{ t = 'Country Histories'; h = '/countries/'; k = "$($CPAGE.Count) countries"; d = 'The history of each present-day country, told through the states that lay on its soil.'; pic = @('great-wall-of-china', 'machu-picchu', 'petra') }
  centuries    = @{ t = 'Centuries'; h = '/centuries/'; k = "$($CENTPAGES.Count) centuries"; d = 'World history one century at a time: the great powers, key events, people and a map.'; pic = @('bayeux-tapestry', 'battle-of-hastings', 'magna-carta') }
  years        = @{ t = 'Year by Year'; h = '/years/'; k = $YEARLIST.Count.ToString('N0') + ' years'; d = 'What happened in a single year: its events, the people born and the people who died, the states founded and ended.'; pic = @('primary-chronicle') }
  people       = @{ t = 'People'; h = '/people/'; k = $PPL.Count.ToString('N0') + ' people'; d = 'Rulers, thinkers, artists and explorers, century by century and region by region, with a chart of who lived when.'; pic = @('las-meninas') }
  timeline     = @{ t = 'World Timeline'; h = '/timeline'; k = 'Every state'; d = 'Five thousand years of states and empires on one line, region by region: see who lived alongside whom.'; pic = @('standard-of-ur') }
  explorer     = @{ t = 'Empire Explorer'; h = '/explorer'; k = 'Power curves'; d = 'Compare the rise and fall of nearly four hundred states and empires on one timeline.'; pic = @('pax-romana', 'trajans-column', 'roman-legion') }
  race         = @{ t = 'Rise and Fall Race'; h = '/race'; k = "$($POLS.Count) to race"; d = 'Up to four states and empires race year by year: who led, when they overtook each other and how long each held on.'; pic = @('charioteer-of-delphi') }
  connections  = @{ t = 'Connections'; h = '/connections'; k = $POL['links'].Count.ToString('N0') + ' links'; d = 'Who succeeded, conquered, ruled or merged with whom: the states as one network.'; pic = @('congress-of-berlin', 'treaty-of-tordesillas', 'congress-of-vienna') }
  paths        = @{ t = 'Reading Paths'; h = '/paths/'; k = "$($RP.Count) paths"; d = 'Themed routes across profiles and entries, from the Silk Road to the steppe empires.'; pic = @('marco-polo', 'ibn-battuta', 'zheng-he') }
  write        = @{ t = 'Write in Ancient Scripts'; h = '/write'; k = '12 languages'; d = 'Cuneiform, hieroglyphs, Linear B, runes, Brahmi and more: a keyboard that shows every sign with its sound, and your writing as a picture.'; pic = @('rosetta-stone', 'code-of-hammurabi') }
  faiths       = @{ t = 'Faith Maps'; h = '/faiths'; k = '18 religions'; d = 'Where each religion began, how it spread and where it last lived on, century by century on a turning globe.'; pic = @('borobudur', 'hagia-sophia') }
  speeches     = @{ t = 'Great Speeches'; h = '/speeches/'; k = "$($SPS.Count) speeches"; d = 'The words that moved history: the setting, the key passage, what followed, and the complete text where it is free to read.'; pic = @('pericles', 'cicero', 'abraham-lincoln') }
  today        = @{ t = 'Today in History'; h = '/today-in-history/'; k = $nTih.ToString('N0') + ' events'; d = 'What happened on each day of the year, across five thousand years.'; pic = @('mesoamerican-long-count-calendar', 'anglo-saxon-chronicle') }
  glossary     = @{ t = 'Glossary'; h = '/encyclopedia/glossary'; k = "$($TERMS.Count) terms"; d = 'Offices, institutions, laws and ideas of the past, each explained in a sentence.'; pic = @('code-of-hammurabi', 'corpus-juris-civilis', 'domesday-book') }
  quiz         = @{ t = 'History Quiz'; h = '/quiz'; k = 'New every day'; d = 'Guess the empire, person, event or place from four clues, or practise as long as you like.'; pic = @('rosetta-stone', 'sphinx', 'great-sphinx-of-giza') }
  games        = @{ t = 'Games'; h = '/games'; k = 'Nine games'; d = 'Picture puzzles, word hunts, timelines, a globe, a daily Connections and a daily Crossword: games with real pictures and real dates, for every age.'; pic = @('pythian-games') }
  flashcards   = @{ t = 'Flashcards'; h = '/flashcards'; k = "$($FCN.ToString('N0')) cards"; d = 'Terms, faces, capitals and dates in decks of cards: the ones you miss come back sooner, the ones you know wait longer.'; pic = @('house-of-wisdom', 'imperial-examination') }
  passport     = @{ t = 'My Passport'; h = '/passport'; k = 'Your stamps'; d = 'The pages you read, the centuries you visit and the games you play, with stamps to collect. Kept in your own browser.'; pic = @('xuanzang') }
  kids         = @{ t = 'Kids corner'; h = '/kids'; k = 'For young explorers'; d = 'Pyramids, knights, Vikings and explorers: picture stories, a fact of the day and games for younger readers.'; pic = @('great-pyramid-of-giza') }
  start        = @{ t = 'Find Your Way In'; h = '/start'; k = 'Four questions'; d = 'Tell us what draws you to history and get the reading paths and tools that suit you.'; pic = @('piri-reis-map', 'cantino-planisphere', 'tabula-rogeriana') }
  community    = @{ t = 'Community'; h = '/community'; k = 'Readers and writers'; d = 'Essays and opinions from the Institute''s readers, and a place to share your own.'; pic = @('althing', 'roman-forum') }
  contributors = @{ t = 'Write for Us'; h = '/contributors'; k = 'Contribute'; d = 'Research, write or check facts with the Institute: three ways to take part.'; pic = @('book-of-kells', 'johannes-gutenberg') }
  series       = @{ t = 'Research Series'; h = '/research-series'; k = "$($ESSAYS.Count) essays"; d = 'Thematic essays on the forces behind the rise and collapse of civilisations.'; pic = @('thucydides', 'ibn-khaldun', 'edward-gibbon') }
  teachers     = @{ t = "Teachers' Corner"; h = '/teachers/'; k = "$($wsN.path + $wsN.century) worksheets"; d = 'Printable worksheets with answer keys on the reading paths and the centuries, and ideas for teaching with the site.'; pic = @('john-amos-comenius', 'sankore-madrasah') }
  dataset      = @{ t = 'Open Data'; h = '/dataset'; k = 'CC BY 4.0'; d = "The states register ($($POL['nodes'].Count.ToString('N0')) states, $($POL['links'].Count.ToString('N0')) relations) and the power curves, free to reuse."; pic = @('rhind-mathematical-papyrus', 'moscow-mathematical-papyrus', 'domesday-book') }
}
function HubCard($s, [string]$cls) {
  $img = PicOf $s.pic
  '<li><a class="' + $cls + '" href="' + $s.h + '">' + $(if ($img) { '<span class="' + $cls + '-img"><img src="' + $img + '" alt="" loading="lazy"></span>' } else { '<span class="' + $cls + '-img ' + $cls + '-mono" aria-hidden="true">' + (Hx $s.t.Substring(0, 1)) + '</span>' }) +
    '<span class="' + $cls + '-b"><span class="' + $cls + '-k">' + (Hx $s.k) + '</span><span class="' + $cls + '-t">' + (Hx $s.t) + '</span><span class="' + $cls + '-d">' + (Hx $s.d) + '</span></span></a></li>'
}
SetBlock "$Repo\atlas" 'atlas-presets' (($PRESETS | ForEach-Object { '<button type="button">' + (Hx $_[0]) + '</button>' }) -join '')   # in the page, so the map does not move when atlas.js runs
SetBlock "$Repo\atlas" 'atlas-centuries' ('<ul class="cty-chips atl-cents">' + (($CENTPAGES | ForEach-Object { '<li><a href="/centuries/' + (CenturySlug $_) + '">' + (Hx (CentTitle $_)) + '</a></li>' }) -join '') + '</ul>')
# the hub in four groups that fill their rows: what to read, what to explore, what to play, the Institute itself
$HUBGROUPS = @(@('Read', @('profiles', 'encyclopedia', 'states', 'countries', 'people', 'speeches', 'today', 'glossary')),
  @('Through time', @('atlas', 'timeline', 'faiths', 'centuries', 'years')), @('Explore', @('explorer', 'race', 'connections', 'paths', 'write', 'start')),
  @('Play', @('quiz', 'games', 'flashcards', 'kids', 'passport')), @('The Institute', @('series', 'teachers', 'dataset', 'community', 'contributors')))
SetBlock "$Repo\research" 'hub' (($HUBGROUPS | ForEach-Object { '<section class="hub-group" aria-label="' + $_[0] + '"><h2 class="hub-group-t">' + $_[0] + '</h2><ul class="hub-grid' + $(switch (@($_[1]).Count) { 5 { ' hub-5' } 6 { ' hub-6' } default { '' } }) + '">' + (($_[1] | ForEach-Object { HubCard $SECTIONS[$_] 'hub-card' }) -join '') + '</ul></section>' }) -join '')
# the home page's doors: read, explore, and the lighter ways in (a day's events, speeches, games, the Kids corner)
SetBlock "$Repo\index" 'home-doors' ('<ul class="doors">' + ((@('profiles', 'encyclopedia', 'states', 'countries', 'atlas', 'centuries', 'explorer', 'paths', 'today', 'speeches', 'games', 'kids') | ForEach-Object { HubCard $SECTIONS[$_] 'door' }) -join '') + '</ul>')
# /connections names the register's size in its title and og:title ("Connections Map of 5,468 States"): kept current
$cnF = "$Repo\connections"; $cnT = [IO.File]::ReadAllText($cnF, $U8)
$cnT2 = [regex]::Replace($cnT, 'Connections Map of [\d,]+ States', 'Connections Map of ' + @($POL['nodes']).Count.ToString('N0', $INV) + ' States')
if ([EpochBuild.W]::WriteIfChanged($cnF, $cnT2)) { $NWRITE++ }
$hm = WorldDots 1000
# the hero globe's points: the states of 1000 CE as [lng100, lat100, profile] triplets (the page spins them client-side)
$hg = New-Object Text.StringBuilder
foreach ($n in $POL['nodes']) {
  if (-not (Alive $n 1000)) { continue }
  $q = $STATEXY[[string]$n['id']]; if (-not $q -or $q[2]) { continue }   # approximate places stay off the hero, as on the flat strip
  $ll = [EpochGeo.G]::Inv([double]$q[0], [double]$q[1])
  if ($hg.Length) { [void]$hg.Append(',') }
  [void]$hg.Append([int][Math]::Round($ll[0] * 100)).Append(',').Append([int][Math]::Round($ll[1] * 100)).Append(',').Append($(if ($n['p']) { 1 } else { 0 }))
}
SetBlock "$Repo\index" 'home-map' ('<figure class="home-map"><a href="/atlas?year=1000" aria-label="Open the atlas at the year 1000">' + (MapSvg ([double[]]@(0, 20, 1000, ($MAPH - 20))) $hm[0] 'World map: the states that existed in the year 1000' 'map-world') + '<canvas id="home-globe" aria-hidden="true" hidden></canvas>' + '</a><figcaption>The world in 1000 CE: <b>' + $hm[1] + ' recorded states</b>. <a href="/atlas?year=1000">Travel through time in the atlas &rarr;</a></figcaption>' +
  '<script>var HOME_GLOBE=[' + $hg.ToString() + '];var HOME_GLOBE_SRC="/maps/globe-land.js?v=' + $GLOBEV + '";</script></figure>')
SetBlock "$Repo\index" 'home-centuries' ('<ol class="cen-bars cen-bars-home">' + (($CENTPAGES | ForEach-Object { $ii = $CENTINFO[$_]; '<li><a href="/centuries/' + $ii.slug + '" title="' + (Hx (CentTitle $_)) + ': ' + $ii.alive + ' states"><span class="cen-bar" style="height:' + ([Math]::Max(2, $ii.alive / $maxA * 100)).ToString('0.0', $INV) + '%"></span><span class="cen-lbl">' + (Hx (($_ -replace ' century', '') -replace ' BCE', ' BC')) + '</span></a></li>' }) -join '') + '</ol>')
SetBlock "$Repo\index" 'home-countries' ('<ul class="cty-chips">' + ((@($CINFO.Keys | Sort-Object @{ e = { $CINFO[$_].n }; Descending = $true } | Select-Object -First 18) | ForEach-Object { '<li><a href="/countries/' + $CINFO[$_].slug + '">' + (Hx $_) + ' <span>' + $CINFO[$_].n + '</span></a></li>' }) -join '') + '<li><a class="cty-all" href="/countries/">All ' + $CPAGE.Count + ' countries &rarr;</a></li></ul>')

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Open data (/dataset): the states register and the power curves as CSV and JSON (root files, CC BY 4.0)
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function Csv($v) { $s = [string]$v; if ($s -match '[",\r\n]') { return '"' + $s.Replace('"', '""') + '"' }; return $s }
function IntOrBlank($v) { if ($null -eq $v) { '' } else { [string][int][Math]::Round([double]$v) } }
$LOCSRC = @{ 0 = 'capital'; 1 = 'recorded location'; 2 = 'capital'; 3 = 'capital (matched by name)'; 4 = 'set by hand'; 9 = 'approximate (centre of the present-day country)' }
$odNodes = @($POL['nodes'] | Sort-Object @{ e = { if ($null -eq $_['s']) { 1e9 } else { [double]$_['s'] } } }, @{ e = { [string]$_['id'] } })
# the 94 empires carry no capital in the register: take it from their key facts (empire-facts.js)
$FACTCAP = @{}; foreach ($m in [regex]::Matches([IO.File]::ReadAllText("$Repo\empire-facts.js", $U8), '(?m)^  "([^"]+)": \{capital:"((?:[^"\\]|\\.)*)"')) { $FACTCAP[$m.Groups[1].Value] = $m.Groups[2].Value }
$csvS = New-Object Text.StringBuilder(1500000); $jsS = New-Object Text.StringBuilder(2500000)
[void]$csvS.Append("id,name,type,region,broad_region,start_year,end_year,approximate_dates,capital,present_day_countries,latitude,longitude,location_source,profile_url,page_url`n")
$nPlaced = 0
foreach ($n in $odNodes) {
  $id = [string]$n['id']; $g = $GEOD[$id]; $lat = ''; $lng = ''; $ls = ''
  if ($g) { $lat = ([double]$g[0]).ToString('0.###', $INV); $lng = ([double]$g[1]).ToString('0.###', $INV); $ls = $LOCSRC[[int]$g[2]]; if ([int]$g[2] -ne 9) { $nPlaced++ } }
  $mo = (@($n['mo']) | Where-Object { $_ } | ForEach-Object { [string]$_ }) -join '; '
  $rgl = if ($n['rg']) { RegionLabel ([string]$n['rg']) } else { '' }
  $prof = if ($n['p']) { $SITE + [string]$n['p'] } else { '' }
  $cap = [string]$n['c']; if (-not $cap -and $n['p'] -and $EMPURL.ContainsKey([string]$n['p'])) { $cap = [string]$FACTCAP[[string]$EMPURL[[string]$n['p']]['name']] }
  [void]$csvS.Append((@($id, [string]$n['n'], [string]$n['t'], $rgl, [string]$n['b'], (IntOrBlank $n['s']), (IntOrBlank $n['e']), $(if ($n['x']) { 'yes' } else { '' }), $cap, $mo, $lat, $lng, $ls, $prof, ($SITE + (StateUrl $n))) | ForEach-Object { Csv $_ }) -join ',').Append("`n")
  if ($jsS.Length) { [void]$jsS.Append(",`n") }
  [void]$jsS.Append('{"id":' + (Js $id) + ',"name":' + (Js ([string]$n['n'])) + ',"type":' + (Js ([string]$n['t'])) + ',"region":' + (Js $rgl) + ',"broad_region":' + (Js ([string]$n['b'])) +
    ',"start_year":' + $(if ($null -eq $n['s']) { 'null' } else { IntOrBlank $n['s'] }) + ',"end_year":' + $(if ($null -eq $n['e']) { 'null' } else { IntOrBlank $n['e'] }) + ',"approximate_dates":' + $(if ($n['x']) { 'true' } else { 'false' }) +
    ',"capital":' + $(if ($cap) { Js $cap } else { 'null' }) + ',"present_day_countries":[' + ((@($n['mo']) | Where-Object { $_ } | ForEach-Object { Js ([string]$_) }) -join ',') + ']' +
    ',"latitude":' + $(if ($lat) { $lat } else { 'null' }) + ',"longitude":' + $(if ($lng) { $lng } else { 'null' }) + ',"location_source":' + $(if ($ls) { Js $ls } else { 'null' }) +
    ',"profile_url":' + $(if ($prof) { Js $prof } else { 'null' }) + ',"page_url":' + (Js ($SITE + (StateUrl $n))) + '}')
}
$csvR = New-Object Text.StringBuilder(600000); $jsR = New-Object Text.StringBuilder(900000); $nRel = 0
[void]$csvR.Append("source_id,relation,target_id,from_year,until_year`n")
foreach ($l in $POL['links']) {
  $s = [string]$l['s']; $t = [string]$l['t']; if (-not ($NODE.ContainsKey($s) -and $NODE.ContainsKey($t))) { continue }
  [void]$csvR.Append((@($s, [string]$l['r'], $t, (IntOrBlank $l['f']), (IntOrBlank $l['u'])) | ForEach-Object { Csv $_ }) -join ',').Append("`n")
  if ($jsR.Length) { [void]$jsR.Append(",`n") }
  [void]$jsR.Append('{"source_id":' + (Js $s) + ',"relation":' + (Js ([string]$l['r'])) + ',"target_id":' + (Js $t) + ',"from_year":' + $(if ($null -eq $l['f']) { 'null' } else { IntOrBlank $l['f'] }) + ',"until_year":' + $(if ($null -eq $l['u']) { 'null' } else { IntOrBlank $l['u'] }) + '}')
  $nRel++
}
$odHead = '"source":"The Epoch Institute","url":"' + $SITE + '/dataset","licence":"CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)","citation":"The Epoch Institute (' + $YEAR + '). States Register [Data set]. ' + $SITE + '/dataset"'
$OD = [ordered]@{
  'epoch-institute-states.csv' = $csvS.ToString(); 'epoch-institute-state-relations.csv' = $csvR.ToString()
  'epoch-institute-states.json' = '{' + $odHead + ",`n" + '"states":[' + "`n" + $jsS.ToString() + "`n],`n" + '"relations":[' + "`n" + $jsR.ToString() + "`n]}`n"
}
# power curves: one row per turning point (the score 0-10 at that year, scaled to the profile's own peak)
$csvP = New-Object Text.StringBuilder(200000); $jsP = New-Object Text.StringBuilder(400000); $nPts = 0
[void]$csvP.Append("name,region,profile_url,year,score`n")
foreach ($em in $POLS) {
  $nm = [string]$em['name']; $url = $SITE + '/empire/' + [EpochBuild.W]::ToSlug($nm); $pts = $em['points']
  foreach ($pt in $pts) { [void]$csvP.Append((@($nm, [string]$em['region'], $url, (IntOrBlank $pt[0]), ([double]$pt[1]).ToString('0.##', $INV)) | ForEach-Object { Csv $_ }) -join ',').Append("`n"); $nPts++ }
  if ($jsP.Length) { [void]$jsP.Append(",`n") }
  [void]$jsP.Append('{"name":' + (Js $nm) + ',"region":' + (Js ([string]$em['region'])) + ',"profile_url":' + (Js $url) + ',"start_year":' + (IntOrBlank $pts[0][0]) + ',"end_year":' + (IntOrBlank $pts[-1][0]) + ',"peak_year":' + (IntOrBlank (PeakYear $em)) +
    ',"points":[' + (($pts | ForEach-Object { '[' + (IntOrBlank $_[0]) + ',' + ([double]$_[1]).ToString('0.##', $INV) + ']' }) -join ',') + ']}')
}
$OD['epoch-institute-power-curves.csv'] = $csvP.ToString()
$OD['epoch-institute-power-curves.json'] = '{"source":"The Epoch Institute","url":"' + $SITE + '/dataset","licence":"CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)","note":"Interpretive scores (0-10) at each turning point, scaled to each profile''s own peak: compare shapes, not sizes.","profiles":[' + "`n" + $jsP.ToString() + "`n]}`n"
$ODSIZE = @{}; foreach ($f in $OD.Keys) { if ([EpochBuild.W]::WriteIfChanged("$Repo\$f", $OD[$f])) { $NWRITE++ }; $ODSIZE[$f] = $U8.GetByteCount($OD[$f]) }
function FileSize([string]$f) { $b = $ODSIZE[$f]; if ($b -ge 1MB) { ($b / 1MB).ToString('0.0', $INV) + ' MB' } else { [string][Math]::Max(1, [Math]::Round($b / 1KB)) + ' KB' } }
function Dl([string]$f, [string]$label) { '<a class="od-dl-btn" href="/' + $f + '" download>' + $label + ' <span>' + (FileSize $f) + '</span></a>' }
# the page's block: two datasets, their downloads, columns and sample rows, and the Dataset JSON-LD
$minY = [int](($POL['nodes'] | Where-Object { $null -ne $_['s'] } | ForEach-Object { [double]$_['s'] } | Measure-Object -Minimum).Minimum)
function IsoYear([int]$y) { if ($y -le 0) { $iy = $y + 1; '-' + ([Math]::Abs($iy)).ToString('0000') } else { $y.ToString('0000') } }
$minP = [int](($POLS | ForEach-Object { [double]$_['points'][0][0] } | Measure-Object -Minimum).Minimum)
$sample = @('kingdom-of-france', 'joseon', 'ayutthaya-kingdom', 'kingdom-of-zimbabwe', 'republic-of-venice', 'kingdom-of-hawaii') | Where-Object { $NODE.ContainsKey($_) } | ForEach-Object { $NODE[$_] }
$sampleP = @('Roman Empire', 'Mongol Empire', 'Ottoman Empire', 'Mali Empire') | Where-Object { $EMPURL.ContainsKey('/empire/' + [EpochBuild.W]::ToSlug($_)) } | ForEach-Object { $EMPURL['/empire/' + [EpochBuild.W]::ToSlug($_)] }
function Spark($em) {   # a small line of the power curve
  $pts = $em['points']; $x0 = [double]$pts[0][0]; $x1 = [double]$pts[-1][0]; $w = [Math]::Max(1, $x1 - $x0)
  '<svg class="od-spark" viewBox="0 0 120 30" aria-hidden="true"><polyline points="' + (($pts | ForEach-Object { ((([double]$_[0] - $x0) / $w) * 118 + 1).ToString('0.#', $INV) + ',' + (29 - [double]$_[1] * 2.8).ToString('0.#', $INV) }) -join ' ') + '"/></svg>'
}
$ldStates = '{"@type":"Dataset","@id":"' + $SITE + '/dataset#states","name":"The Epoch Institute States Register","description":' + (Js ("Every state recorded by The Epoch Institute: $($odNodes.Count.ToString('N0')) kingdoms, empires, principalities, republics and chiefdoms from $(Yr $minY) to today, with years, type, region, capital, present-day countries and map position, and $($nRel.ToString('N0')) dated relations between them (succession, conquest, vassalage, union, colonial rule).")) +
  ',"url":"' + $SITE + '/dataset","identifier":"' + $SITE + '/dataset#states","keywords":["historical states","world history","gazetteer","empires","kingdoms","historical geography"],"license":"https://creativecommons.org/licenses/by/4.0/","isAccessibleForFree":true,"creator":' + $ORG + ',"publisher":' + $ORG +
  ',"temporalCoverage":"' + (IsoYear $minY) + '/' + $YEAR + '","spatialCoverage":{"@type":"Place","name":"World"},"variableMeasured":["start year","end year","type of state","region","capital","present-day countries","latitude","longitude","relation between states"]' +
  ',"distribution":[{"@type":"DataDownload","encodingFormat":"text/csv","contentUrl":"' + $SITE + '/epoch-institute-states.csv"},{"@type":"DataDownload","encodingFormat":"text/csv","contentUrl":"' + $SITE + '/epoch-institute-state-relations.csv"},{"@type":"DataDownload","encodingFormat":"application/json","contentUrl":"' + $SITE + '/epoch-institute-states.json"}]}'
$ldCurves = '{"@type":"Dataset","@id":"' + $SITE + '/dataset#curves","name":"The Epoch Institute Power Curves","description":' + (Js "The Institute's interpretive power curves for $($POLS.Count) state and empire profiles: a score from 0 to 10 at each turning point of a state's history, scaled to its own peak. They describe the shape of a state's rise and fall, not its absolute size.") +
  ',"url":"' + $SITE + '/dataset","identifier":"' + $SITE + '/dataset#curves","keywords":["empires","rise and fall","historical power","world history"],"license":"https://creativecommons.org/licenses/by/4.0/","isAccessibleForFree":true,"creator":' + $ORG + ',"publisher":' + $ORG +
  ',"temporalCoverage":"' + (IsoYear $minP) + '/' + $YEAR + '","variableMeasured":["year","power score (0-10, scaled to the profile''s peak)"]' +
  ',"distribution":[{"@type":"DataDownload","encodingFormat":"text/csv","contentUrl":"' + $SITE + '/epoch-institute-power-curves.csv"},{"@type":"DataDownload","encodingFormat":"application/json","contentUrl":"' + $SITE + '/epoch-institute-power-curves.json"}]}'
$odHtml = '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"DataCatalog","name":"The Epoch Institute Open Data","url":"' + $SITE + '/dataset","publisher":' + $ORG + ',"dataset":[{"@id":"' + $SITE + '/dataset#states"},{"@id":"' + $SITE + '/dataset#curves"}]},' + $ldStates + ',' + $ldCurves + ']}</script>' + "`n" +
  '<section class="od-set" id="states" aria-labelledby="od-states"><p class="od-kicker">Dataset 1</p><h2 class="od-title" id="od-states">The States Register</h2>' +
  '<p class="od-desc">Every state the Institute has recorded, from ' + (Hx (Yr $minY)) + ' to today: kingdoms, empires, principalities, republics and chiefdoms, with their years, type, region, capital, present-day countries and map position, and the dated relations between them: who succeeded, conquered, ruled or merged with whom.</p>' +
  '<ul class="od-facts"><li><b>' + $odNodes.Count.ToString('N0') + '</b> states</li><li><b>' + $nRel.ToString('N0') + '</b> relations</li><li><b>' + $nPlaced.ToString('N0') + '</b> placed at a capital or seat</li><li><b>' + $REGIONS.Count + '</b> regions</li></ul>' +
  '<div class="od-dl">' + (Dl 'epoch-institute-states.csv' 'States, CSV') + (Dl 'epoch-institute-state-relations.csv' 'Relations, CSV') + (Dl 'epoch-institute-states.json' 'Both, JSON') + '</div>' +
  '<div class="od-table-wrap"><table class="dataset-table"><caption>Six rows of the register</caption><thead><tr><th>Name</th><th>Type</th><th>Years</th><th>Capital</th><th>Today</th><th>Position</th></tr></thead><tbody>' +
  (($sample | ForEach-Object { $g = $GEOD[[string]$_['id']]; '<tr><td><a href="' + (StateUrl $_) + '">' + (Hx ([string]$_['n'])) + '</a></td><td>' + (Hx (TypeLabel $_['t'])) + '</td><td>' + (Hx (SpanShort $_['s'] $_['e'])) + '</td><td>' + (Hx ([string]$_['c'])) + '</td><td>' + (Hx ((@($_['mo']) | Select-Object -First 2) -join ', ')) + '</td><td>' + $(if ($g) { ([double]$g[0]).ToString('0.0', $INV) + ', ' + ([double]$g[1]).ToString('0.0', $INV) } else { '' }) + '</td></tr>' }) -join '') + '</tbody></table></div>' +
  '<details class="od-cols"><summary>The columns</summary><dl>' +
  '<dt>States file</dt><dd>id (as in /state/&lt;id&gt;), name, type, region, broad_region, start_year and end_year (negative = BCE; an empty end year: the state exists today), approximate_dates, capital, present_day_countries (separated by &#8220;; &#8221;; empty for most of the 94 great empires, which spanned many), latitude and longitude, location_source (capital, recorded location, capital matched by name, set by hand, or approximate: the centre of the present-day country), profile_url, page_url.</dd>' +
  '<dt>Relations file</dt><dd>source_id, relation, target_id, from_year, until_year. Relations: ' + (Hx ((@($POL['links'] | ForEach-Object { [string]$_['r'] } | Sort-Object -Unique)) -join ', ')) + '. A succession is stored once, as successor-of.</dd></dl></details>' +
  '<p class="od-explore">Explore it on the site: <a href="/atlas">the Atlas</a> · <a href="/state/">States</a> · <a href="/connections">Connections</a> · <a href="/countries/">Country histories</a></p></section>' + "`n" +
  '<section class="od-set" id="curves" aria-labelledby="od-curves"><p class="od-kicker">Dataset 2</p><h2 class="od-title" id="od-curves">Power Curves</h2>' +
  '<p class="od-desc">The curves behind the <a href="/explorer">Empire Explorer</a> and the profiles&#8217; &#8220;Rise &amp; fall&#8221; charts: a score from 0 to 10 at each turning point of a state&#8217;s history. They are the Institute&#8217;s interpretive judgements, based on the works cited in each profile, and every curve is scaled to its own peak: compare the shapes, not the sizes.</p>' +
  '<ul class="od-facts"><li><b>' + $POLS.Count + '</b> profiles</li><li><b>' + $nPts.ToString('N0') + '</b> points</li><li><b>' + (Hx (Yr $minP)) + '</b> to today</li></ul>' +
  '<div class="od-dl">' + (Dl 'epoch-institute-power-curves.csv' 'Curves, CSV') + (Dl 'epoch-institute-power-curves.json' 'Curves, JSON') + '</div>' +
  '<div class="od-table-wrap"><table class="dataset-table"><caption>Four of the curves</caption><thead><tr><th>Profile</th><th>Years</th><th>Peak</th><th>Points</th><th>Curve</th></tr></thead><tbody>' +
  (($sampleP | ForEach-Object { $p0 = $_['points']; '<tr><td><a href="/empire/' + [EpochBuild.W]::ToSlug([string]$_['name']) + '">' + (Hx ([string]$_['name'])) + '</a></td><td>' + (Hx (SpanShort $p0[0][0] $p0[-1][0])) + '</td><td>' + (Hx (Yr (PeakYear $_))) + '</td><td>' + $p0.Count + '</td><td>' + (Spark $_) + '</td></tr>' }) -join '') + '</tbody></table></div>' +
  '<details class="od-cols"><summary>The columns</summary><dl><dt>CSV</dt><dd>One row per point: name, region, profile_url, year (negative = BCE), score (0&#8211;10).</dd><dt>JSON</dt><dd>One object per profile: name, region, profile_url, start_year, end_year, peak_year and points as [year, score] pairs.</dd></dl></details></section>'
SetBlock "$Repo\dataset" 'open-data' $odHtml
Say ("open data: {0} states ({1} placed), {2} relations, {3} curve points" -f $odNodes.Count, $nPlaced, $nRel, $nPts)

# stale generated pages (entries, states or days that no longer exist)
$htPlain = "# Generated by scripts/build-pages.ps1: the pages in this folder are extensionless HTML.`n<FilesMatch `"^[a-z0-9-]+$`">`n  ForceType text/html`n</FilesMatch>`n"
foreach ($dir in 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'essays', 'articles', 'teachers') { if ([EpochBuild.W]::WriteIfChanged("$Repo\$dir\.htaccess", $htPlain)) { $NWRITE++ } }
$nDel = 0
foreach ($dir in 'encyclopedia', 'encyclopedia\browse', 'encyclopedia\conflicts', 'state', 'state\browse', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'essays', 'articles', 'teachers') {
  $full = Join-Path $Repo $dir; if (-not (Test-Path $full)) { continue }
  foreach ($f in Get-ChildItem $full -File) {
    if ($f.Extension -or $f.Name -eq 'index' -or $f.Name.StartsWith('.')) { continue }
    if (-not $WROTE.ContainsKey($f.FullName.ToLowerInvariant())) { Remove-Item $f.FullName; $nDel++ }
  }
}

# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# Search: search-pages.js (the site's own pages: country histories, centuries, speeches, paths, essays, the tools, and
# the years that have a page) and search-index.js packed: a slug that follows from its name is written 0 and restored
# by a line in the file itself (so every reader of SEARCH_INDEX keeps working), and a row with a picture ends in 1.
# Both versions are stamped into shared-nav.js.
# ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Say 'search: site pages and the packed index'
$ORDW = @('', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth',
  'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth', 'thirtieth')
$sgRows = New-Object System.Collections.Generic.List[string]
function SgRow([string]$n, [string]$h, [string]$k, [string]$a) { $sgRows.Add('[' + (Js $n) + ',' + (Js $h) + ',' + (Js $k) + ',' + (Js $a) + ']') }
# the tools and section pages under plain names, and the words people use for them
$HANDP = @(@('World Atlas', '/atlas', 'atlas|map|maps|world map|globe|historical maps|what was here|history near me|states near me|history of my town'), @('World Timeline', '/timeline', 'timeline|chronology|time line'),
  @('Country Histories', '/countries/', 'countries|country histories'), @('History by Century', '/centuries/', 'centuries|century'), @('Year by Year', '/years/', 'years|year pages'),
  @('People in History', '/people/', 'people|who lived when'), @('Empire Explorer', '/explorer', 'explorer|power curves|rise and fall chart'),
  @('Rise and Fall Race', '/race', 'race|rise and fall race|empire race|bar chart race|compare empires|strongest empire'),
  @('Connections Map', '/connections', 'connections map|relations|network of states'), @('Reading Paths', '/paths/', 'paths|reading paths|where to start reading'),
  @('Great Speeches', '/speeches/', 'speeches|famous speeches'), @('Write in Ancient Scripts', '/write', 'write|scripts|cuneiform|hieroglyphs|runes|ancient alphabets|scribe'),
  @('Faith Maps', '/faiths', 'faith maps|spread of religions|religion maps'), @('History Quiz', '/quiz', 'quiz|daily quiz|trivia'),
  @('Flashcards', '/flashcards', 'flashcards|flash cards|cards|memorise|memorize|revision|revise|spaced repetition'),
  @('History Games', '/games', 'games|play|crossword|word hunt|emblem pairs|globe hunt|which came first|guess the year|daily ten|picture puzzle|connections game|order the ages'), @('Who Said It?', '/games#said', 'who said it|quotes|famous quotes|quotations|sayings'),
  @('Kids Corner', '/kids', 'kids|children|for kids|kids mode'), @('Glossary', '/encyclopedia/glossary', 'glossary|terms|definitions'),
  @('Find Your Way In', '/start', 'start|where to begin|beginners|what kind of reader'), @('My Passport', '/passport', 'passport|my history|stamps|my reading|my timeline|reading history'),
  @('Today in History', '/today-in-history/', 'today in history|on this day|this day in history|anniversaries'), @('Encyclopedia', '/encyclopedia/', 'encyclopedia|a-z|entries'),
  @('States', '/state/', 'states|register of states|kingdoms'), @('Profiles', '/profiles', 'profiles|empires|civilisations|civilizations'),
  @('Research Series', '/research-series', 'research series|essays'), @('Open Data', '/dataset', 'open data|dataset|download|csv'),
  @('Research Hub', '/research', 'research hub'), @("Teachers' Corner", '/teachers/', 'teachers|worksheets|classroom|lessons'),
  @('Community', '/community', 'community|articles by readers'), @('About the Institute', '/about', 'about|mission|who we are'),
  @('Write for the Institute', '/contributors', 'write for us|contributors|contribute'), @('Contact', '/contact', 'contact|email|suggest a correction'))
foreach ($hp in $HANDP) { SgRow $hp[0] $hp[1] 'page' $hp[2] }
foreach ($m in ($CPAGE.Keys | Sort-Object)) { SgRow $m ('/countries/' + $CPAGE[$m]) 'country' ('history of ' + $m) }
foreach ($c in $CENTPAGES) {   # "15th century": also "fifteenth century" and "1400s"
  $cm = [regex]::Match($c, '^(\d+)[a-z]{2} century( BCE)?$'); $al = ''
  if ($cm.Success) { $cn = [int]$cm.Groups[1].Value; $bce = $(if ($cm.Groups[2].Success) { ' bce' } else { '' }); $al = $(if ($cn -lt $ORDW.Count) { $ORDW[$cn] + ' century' + $bce + '|' } else { '' }) + (($cn - 1) * 100) + 's' + $bce }
  SgRow (CentTitle $c) ('/centuries/' + (CenturySlug $c)) 'century' $al
}
foreach ($spx in $SPS) { SgRow ([string]$spx['title']) ('/speeches/' + [string]$spx['slug']) 'speech' ([string]$spx['speaker']) }
foreach ($p in $RP) { SgRow ([string]$p['title']) ('/paths/' + [string]$p['slug']) 'path' '' }
foreach ($ey in $ESSAYS) { SgRow ([string]$ey.hd['title']) ('/essays/' + $ey.slug) 'essay' '' }
$sgText = "// search-pages.js - written by scripts/build-pages.ps1. Do not edit. The site's own pages for the search (header and /search):`n" +
  "// [name, address, kind, other names]; SEARCH_YEARS: the years that have a page (/years/<y>), BCE negative.`n" +
  "var SEARCH_PAGES = [`n" + ($sgRows -join ",`n") + "`n];`nvar SEARCH_YEARS = [" + ($YEARLIST -join ',') + "];`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\search-pages.js", $sgText)) { $NWRITE++ }
$SGV = [EpochBuild.W]::Sha1($sgText).Substring(0, 10)
# packing: slugs are made from names exactly as the restoring line does (accents dropped, lower case, & as "and", other
# runs of signs as "-"), and only for names that are plain ASCII once their accents are dropped, so both agree
$A0 = "[$([char]0x300)-$([char]0x36F)]"
function NameSlug([string]$n) { $d = $n.Normalize([Text.NormalizationForm]::FormD) -creplace $A0, ''; if ($d -match '[^\x00-\x7F]') { return $null }; (($d.ToLowerInvariant() -creplace '&', 'and') -creplace '[^a-z0-9]+', '-').Trim('-') }
function JsonStr([string]$lit) { if ($lit.IndexOf('\') -lt 0) { $lit.Substring(1, $lit.Length - 2) } else { [string]$JSS.DeserializeObject($lit) } }
$SIDEC = '(function () { for (var i = 0, r; i < SEARCH_INDEX.length; i++) { r = SEARCH_INDEX[i]; if (r[0] === 0) r[0] = r[1].normalize(''NFD'').replace(/[' + '\' + 'u0300-' + '\' + 'u036f]/g, '''').toLowerCase().replace(/&/g, ''and'').replace(/[^a-z0-9]+/g, ''-'').replace(/^-|-$/g, ''''); } })();   // packed by scripts/build-pages.ps1: a slug written 0 is made from its name'
$STRX = '"(?:[^"\\]|\\.)*"'
# make-home-data and make-search-states leave out empty trailing fields (no aliases, weight 0): a row that gets the
# picture flag has them written out ("" and 0) so the flag stays in its place
$rxE = [regex]"^\[(?<s>$STRX|0),(?<n>$STRX),(?<t>$STRX)(?:,(?<a>$STRX))?(?:,(?<w>-?[\d.]+))?(?:,[01])?\](?<c>,?)$"
$rxS = [regex]"^\[(?<s>$STRX),(?<n>$STRX),(?<t>$STRX)(?:,(?<a>$STRX))?(?:,[01])?\](?<c>,?)$"
$siIn = [IO.File]::ReadAllText("$Repo\search-index.js", $U8).Replace("`r`n", "`n").TrimEnd("`n")
$siOut = New-Object System.Collections.Generic.List[string]; $part = ''; $nZero = 0; $nE = 0; $nS = 0
foreach ($l in $siIn.Split("`n")) {
  if ($l.Contains('packed by scripts/build-pages.ps1')) { continue }
  if ($l.StartsWith('// search-index.js')) { $siOut.Add('// search-index.js - site-wide search over encyclopedia entries: [slug (0: made from the name, see the line after the list), name, type, aliases, weight 0-8, 1 if it has a picture]. Generated.'); continue }
  if ($l.StartsWith('// states (register')) { $siOut.Add('// states (register, /state/<id>): [id, name, type, aliases, 1 if it has a picture]. Generated from data/polities.json.'); continue }
  if ($l.StartsWith('var SEARCH_INDEX')) { $part = 'e' } elseif ($l.StartsWith('var SEARCH_STATES')) { $part = 's' }
  elseif ($l -eq '];') { $siOut.Add($l); if ($part -eq 'e') { $siOut.Add($SIDEC) }; $part = ''; continue }
  $m = if ($part -eq 'e') { $rxE.Match($l) } elseif ($part -eq 's') { $rxS.Match($l) } else { $null }
  if (-not $m -or -not $m.Success) { $siOut.Add($l); continue }
  $name = JsonStr $m.Groups['n'].Value
  if ($part -eq 'e') {
    $made = NameSlug $name; $slug = if ($m.Groups['s'].Value -eq '0') { if (-not $made) { throw "search-index.js: no slug for $name" }; $made } else { JsonStr $m.Groups['s'].Value }
    $pic = $BY.ContainsKey($slug) -and $BY[$slug].img
    $al = $m.Groups['a'].Value; $wt = $m.Groups['w'].Value
    $tail = if ($pic) { ',' + $(if ($al) { $al } else { '""' }) + ',' + $(if ($wt) { $wt } else { '0' }) + ',1' } else { $(if ($al) { ',' + $al } else { '' }) + $(if ($wt) { $(if ($al) { '' } else { ',""' }) + ',' + $wt } else { '' }) }
    $siOut.Add('[' + $(if ($made -ceq $slug) { $nZero++; '0' } else { Js $slug }) + ',' + $m.Groups['n'].Value + ',' + $m.Groups['t'].Value + $tail + ']' + $m.Groups['c'].Value); $nE++
  } else {
    $id = JsonStr $m.Groups['s'].Value; $im = if ($STX.ContainsKey($id)) { [string]$STX[$id]['img'] } else { '' }
    $pic = $im -and (Test-Path (Join-Path $Repo ($im.TrimStart('/') -replace '/', '\')))
    $al = $m.Groups['a'].Value
    $siOut.Add('[' + $m.Groups['s'].Value + ',' + $m.Groups['n'].Value + ',' + $m.Groups['t'].Value + $(if ($al) { ',' + $al } elseif ($pic) { ',""' } else { '' }) + $(if ($pic) { ',1' } else { '' }) + ']' + $m.Groups['c'].Value); $nS++
  }
}
$siText2 = ($siOut -join "`n") + "`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\search-index.js", $siText2)) { $NWRITE++ }
$SIV = [EpochBuild.W]::Sha1($siText2).Substring(0, 10)
$t = [IO.File]::ReadAllText("$Repo\shared-nav.js", $U8)
$t2 = [regex]::Replace([regex]::Replace($t, "var SEARCH_INDEX_SRC = '/search-index\.js\?v=[^']*';", "var SEARCH_INDEX_SRC = '/search-index.js?v=$SIV';"), "var SEARCH_PAGES_SRC = '/search-pages\.js\?v=[^']*';", "var SEARCH_PAGES_SRC = '/search-pages.js?v=$SGV';")
if ($t2 -ne $t -and [EpochBuild.W]::WriteIfChanged("$Repo\shared-nav.js", $t2)) { $NWRITE++ }
Say ("search-pages.js: {0} rows, {1} years; search-index.js: {2:N0} entries ({3:N0} slugs made from the name), {4:N0} states, {5:N0} KB" -f $sgRows.Count, $YEARLIST.Count, $nE, $nZero, $nS, ($siText2.Length / 1KB))

# sitemaps: hand-written pages and profiles too (lastmod from their content)
foreach ($p in @('/', '/about', '/research', '/research-series', '/profiles', '/community', '/contributors', '/dataset', '/explorer', '/connections', '/atlas', '/quiz', '/contact', '/start', '/games', '/kids', '/timeline', '/write', '/faiths', '/flashcards', '/race', '/encyclopedia/', '/state/', '/today-in-history/')) {
  $file = if ($p -eq '/') { "$Repo\index" } elseif ($p.EndsWith('/')) { Join-Path $Repo ($p.Trim('/') + '\index') } else { Join-Path $Repo $p.TrimStart('/') }
  [void](Stamp $p ([IO.File]::ReadAllText($file, $U8)))
}
$PROF = @(); foreach ($dir in 'empire', 'religion', 'language', 'culture', 'movement') { foreach ($f in Get-ChildItem "$Repo\$dir" -File -ErrorAction SilentlyContinue | Where-Object { -not $_.Extension }) { $p = "/$dir/" + $f.Name; [void](Stamp $p ([IO.File]::ReadAllText($f.FullName, $U8))); $PROF += $p } }
function UrlXml([string]$p, [string]$imgPath) {
  '<url><loc>' + (Hx ($SITE + $p)) + '</loc><lastmod>' + $SMNEW[$p][1] + '</lastmod>' + $(if ($imgPath) { '<image:image><image:loc>' + (Hx ($SITE + $imgPath)) + '</image:loc></image:image>' } else { '' }) + '</url>'
}
function WriteSitemap([string]$name, $urls) {
  $x = '<?xml version="1.0" encoding="UTF-8"?>' + "`n" + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' + "`n" + ($urls -join "`n") + "`n</urlset>`n"
  if ([EpochBuild.W]::WriteIfChanged("$Repo\sitemaps\$name", $x)) { $script:NWRITE++ }
}
function SitemapOf([string]$p) {
  if ($p -like '/empire/*' -or $p -like '/religion/*' -or $p -like '/language/*' -or $p -like '/culture/*' -or $p -like '/movement/*') { return 'profiles' }
  if ($p -like '/encyclopedia/browse/*' -or $p -like '/encyclopedia/conflicts/*' -or $p -eq '/encyclopedia/' -or $p -eq '/encyclopedia/glossary') { return 'pages' }
  if ($p -like '/encyclopedia/*') { return 'encyclopedia' }
  if ($p -like '/state/browse/*' -or $p -eq '/state/') { return 'pages' }
  if ($p -like '/state/*') { return 'states' }
  if ($p -like '/years/?*') { return 'years' }
  return 'pages'
}
$IMGOF = @{}
foreach ($e in $ENT) { if ($e.img) { $IMGOF['/encyclopedia/' + $e.slug] = $e.img } }
foreach ($p in $PROF) { $og = '/images/og/' + $p.Substring($p.LastIndexOf('/') + 1) + '.jpg'; if (Test-Path (Join-Path $Repo ($og.TrimStart('/') -replace '/', '\'))) { $IMGOF[$p] = $og } }
foreach ($ey in $ESSAYS) { if ($ey.pic) { $IMGOF['/essays/' + $ey.slug] = $ey.pic } }
foreach ($kv in $STX.GetEnumerator()) { $im = [string]$kv.Value['img']; if ($im -and (Test-Path (Join-Path $Repo ($im.TrimStart('/') -replace '/', '\')))) { $IMGOF['/state/' + $kv.Key] = $im } }
$SMG = [ordered]@{ pages = New-Object System.Collections.Generic.List[string]; profiles = New-Object System.Collections.Generic.List[string]; encyclopedia = New-Object System.Collections.Generic.List[string]; states = New-Object System.Collections.Generic.List[string]; years = New-Object System.Collections.Generic.List[string] }
$LATEST = @{}
foreach ($p in ($SMNEW.Keys | Sort-Object)) {
  $grp = SitemapOf $p; $SMG[$grp].Add((UrlXml $p $IMGOF[$p]))
  if (-not $LATEST.ContainsKey($grp) -or [string]::CompareOrdinal($SMNEW[$p][1], $LATEST[$grp]) -gt 0) { $LATEST[$grp] = $SMNEW[$p][1] }
}
foreach ($grp in $SMG.Keys) { WriteSitemap "$grp.xml" $SMG[$grp] }
$idx = '<?xml version="1.0" encoding="UTF-8"?>' + "`n" + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n" +
  ((@($SMG.Keys) | ForEach-Object { '<sitemap><loc>' + $SITE + '/sitemaps/' + $_ + '.xml</loc><lastmod>' + $LATEST[$_] + '</lastmod></sitemap>' }) -join "`n") + "`n</sitemapindex>`n"
if ([EpochBuild.W]::WriteIfChanged("$Repo\sitemap.xml", $idx)) { $NWRITE++ }
[IO.File]::WriteAllLines($stateFile, [string[]]@($SMNEW.Keys | Sort-Object | ForEach-Object { $_ + "`t" + $SMNEW[$_][0] + "`t" + $SMNEW[$_][1] }), $U8)
# pages whose content changed in this build, for scripts/ping-indexnow.ps1 (run it after deploying)
$chg = New-Object System.Collections.Generic.List[string]
foreach ($p in ($CHANGED.Keys | Sort-Object)) { $chg.Add($SITE + $p) }
[IO.File]::WriteAllLines("$PSScriptRoot\changed-urls.txt", $chg, $U8)
# the stylesheets cut from shared.css for each kind of page (css/), now that every page is written
$NODE = (Get-Command node -ErrorAction SilentlyContinue).Source; if (-not $NODE) { $NODE = "$env:LOCALAPPDATA\epoch-tools\node\node.exe" }
if (Test-Path $NODE) { foreach ($l in (& $NODE --max-old-space-size=6000 "$PSScriptRoot\split-css.js")) { Say "css: $l" }; if ($LASTEXITCODE) { throw 'split-css.js failed' } }
else { Write-Warning 'node not found: run  node scripts/split-css.js  before deploying, or css/ stays as it was' }
Say "done: $NWRITE files written, $nDel stale pages deleted, $($SMNEW.Count) URLs in the sitemaps, $($chg.Count) changed URLs"
