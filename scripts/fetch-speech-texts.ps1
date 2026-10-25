# Imports the complete texts of the Great Speeches that are in the public domain (or freely licensed) from the
# libraries that hold them - mostly Wikisource, through the MediaWiki parse API - and writes one file per speech:
#   data/speech-texts/<slug>.json  {slug, title, url, source, credit, licence, lang, paras[], words, fetched}
# The texts are copied from the source, never retyped. Which page and which part of it holds each speech is set in
# scripts/speech-sources.tsv (tab-separated; several rows with the same slug are joined in order):
#   slug  url  select  credit  lang
#   select: all | #from-anchor..#to-anchor (to is exclusive; empty = to the end) | "start phrase".."end phrase"
#           (phrases are matched in the cleaned text, case-insensitively; the end phrase's paragraph is kept)
# Pages are cached raw in -Cache (default: a folder under %TEMP%), so a rerun only cleans again.
# Prints, per speech, the word count and the first and last words, to check the boundaries. Usage:
#   powershell -File scripts\fetch-speech-texts.ps1 [-Only slug1,slug2] [-Refresh] [-Cache <dir>]
#   ... -Peek <url> -Find <word>   lists the paragraphs of a (cached) page that contain <word>, as short snippets with
#   their numbers and the paragraph count, to choose start and end phrases without reading the whole page.
param([string[]]$Only, [switch]$Refresh, [string]$Cache = (Join-Path $env:TEMP 'epoch-speech-cache'), [string]$Peek, [string[]]$Find)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web.Extensions
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = Split-Path $PSScriptRoot -Parent
$J = New-Object Web.Script.Serialization.JavaScriptSerializer; $J.MaxJsonLength = 67108864
$U8 = New-Object Text.UTF8Encoding($false)
$UA = 'EpochInstituteBuild/1.0 (https://the-epoch-institute.org; speech texts from public-domain sources)'
if (-not (Test-Path $Cache)) { New-Item -ItemType Directory -Path $Cache | Out-Null }
$outDir = Join-Path $Repo 'data\speech-texts'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# ── fetching ────────────────────────────────────────────────────────────────────────────────────────────────────────
$script:lastHit = [DateTime]::MinValue
function Get-Url([string]$url) {
  $wait = 2500 - ([DateTime]::Now - $script:lastHit).TotalMilliseconds; if ($wait -gt 0) { Start-Sleep -Milliseconds ([int]$wait) }
  for ($try = 0; $try -lt 5; $try++) {
    try {
      $wc = New-Object Net.WebClient; $wc.Headers.Add('User-Agent', $UA); $wc.Encoding = [Text.Encoding]::UTF8
      $s = $wc.DownloadString($url); $script:lastHit = [DateTime]::Now; return $s
    } catch [Net.WebException] {
      $script:lastHit = [DateTime]::Now
      $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
      if ($code -eq 404) { throw "404 for $url" }
      Start-Sleep -Seconds (8 * ($try + 1))
    }
  }
  throw "could not fetch $url"
}
# a page's HTML: Wikisource pages through the parse API (rendered, with the scanned pages transcluded), others raw
function Get-PageHtml([string]$url) {
  $key = ($url -replace '^https?://', '' -replace '[^A-Za-z0-9._-]+', '_'); if ($key.Length -gt 150) { $key = $key.Substring(0, 150) }
  $file = Join-Path $Cache ($key + '.html')
  if ((Test-Path $file) -and -not $Refresh) { return [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8) }
  $m = [regex]::Match($url, '^https://([a-z]+\.wikisource\.org)/wiki/(.+)$')
  if ($m.Success) {
    $title = [Uri]::UnescapeDataString($m.Groups[2].Value.Split('#')[0])
    $api = 'https://' + $m.Groups[1].Value + '/w/api.php?action=parse&format=json&formatversion=2&prop=text&redirects=1&disableeditsection=1&disablelimitreport=1&page=' + [Uri]::EscapeDataString($title)
    $d = $J.DeserializeObject((Get-Url $api))
    if ($d['error']) { throw "Wikisource: $($d['error']['info']) ($title)" }
    $html = [string]$d['parse']['text']
  } else { $html = Get-Url ($url.Split('#')[0]) }
  [IO.File]::WriteAllText($file, $html, $U8)
  return $html
}

# ── cleaning ────────────────────────────────────────────────────────────────────────────────────────────────────────
# removes every element whose opening tag matches $open (a regex for the whole tag), with its nested content
function Remove-Blocks([string]$html, [string]$open) {
  while ($true) {
    $m = [regex]::Match($html, $open, 'IgnoreCase'); if (-not $m.Success) { return $html }
    $name = [regex]::Match($m.Value, '^<([a-zA-Z0-9]+)').Groups[1].Value
    if ($m.Value.EndsWith('/>')) { $html = $html.Remove($m.Index, $m.Length); continue }
    $rx = New-Object Text.RegularExpressions.Regex ('<(/?)' + $name + '\b[^>]*>'), 'IgnoreCase'
    $depth = 0; $end = -1; $pos = $m.Index
    foreach ($t in $rx.Matches($html, $pos)) {
      if ($t.Groups[1].Value -eq '/') { $depth-- } elseif (-not $t.Value.EndsWith('/>')) { $depth++ }
      if ($depth -eq 0) { $end = $t.Index + $t.Length; break }
    }
    if ($end -lt 0) { $end = $html.Length }
    $html = $html.Remove($m.Index, $end - $m.Index)
  }
}
function Clean-Html([string]$html) {
  $html = [regex]::Replace($html, '(?is)<(style|script)\b.*?</\1>', '')
  $html = [regex]::Replace($html, '(?s)<!--.*?-->', '')
  # headings are editorial (chapter and section numbers, titles Wikisource editors added), never part of a speech
  $html = [regex]::Replace($html, '(?is)<(h[1-6])\b[^>]*>.*?</\1>', '')
  $html = [regex]::Replace($html, '(?is)<a\b[^>]*>\s*Latin\s*</a>', '')   # "(Latin)" links beside each chapter of a translation
  foreach ($o in @(
      '<div[^>]*class="[^"]*\bwst-header\b[^"]*"[^>]*>', '<table[^>]*id="headertemplate"[^>]*>', '<div[^>]*id="headertemplate"[^>]*>',
      '<div[^>]*class="[^"]*\b(ws-noexport|noprint|licenseContainer|mw-references-wrap|reflist|wst-toc|toc|navbox|wst-translation-license|wst-license)\b[^"]*"[^>]*>',
      '<table[^>]*class="[^"]*\b(toc|navbox|wst-license|licenseContainer|ws-noexport)\b[^"]*"[^>]*>', '<table[^>]*id="toc"[^>]*>',
      '<ol[^>]*class="[^"]*\breferences\b[^"]*"[^>]*>', '<sup[^>]*class="[^"]*\breference\b[^"]*"[^>]*>',
      '<span[^>]*class="[^"]*\b(pagenum|ws-pagenum|mw-editsection|wst-pagenum)\b[^"]*"[^>]*>', '<figure\b[^>]*>', '<span[^>]*typeof="mw:File[^"]*"[^>]*>',
      '<(div|span)[^>]*class="[^"]*\bwst-sidenote\b[^"]*"[^>]*>'   # marginal notes and page references (Jowett's analyses, "Steph. 17")
    )) { $html = Remove-Blocks $html $o }
  return $html
}
# cleaned HTML -> paragraphs of plain text (line breaks inside a paragraph kept as \n)
$LSEP = [string][char]0x2028   # a line break inside a paragraph, until the paragraphs are split
function To-Paras([string]$html) {
  $h = [regex]::Replace($html, '(?i)<br\s*/?>', $LSEP)
  $h = [regex]::Replace($h, '(?i)</(p|div|h[1-6]|li|blockquote|dd|dt|tr|table|section|center)>|<(p|h[1-6]|li|tr|blockquote|center)\b[^>]*>', "`n`n")
  $h = [regex]::Replace($h, '<[^>]+>', '')
  $h = [Net.WebUtility]::HtmlDecode($h)
  # old pages write punctuation as Windows-1252 codes (&#151; for an em dash), which decode to invisible controls
  foreach ($cp in @(@(0x85, 0x2026), @(0x91, 0x2018), @(0x92, 0x2019), @(0x93, 0x201C), @(0x94, 0x201D), @(0x96, 0x2013), @(0x97, 0x2014))) { $h = $h.Replace([string][char]$cp[0], [string][char]$cp[1]) }
  $out = New-Object Collections.Generic.List[string]
  foreach ($p in ($h -split "`n\s*`n")) {
    $t = (($p -split $LSEP) | ForEach-Object { ($_ -replace '[\s ]+', ' ').Trim() } | Where-Object { $_ }) -join "`n"
    $t = $t.Trim()
    if (-not $t) { continue }
    $t = ($t -replace '\s*\(\s*\)\s*$', '' -replace '^\s*\(\s*\)\s*', '').Trim()   # what is left of "(Latin)" once its link is gone
    if (-not $t) { continue }
    if ($t -match '^\[?\s*\d+\s*\]?$' -or $t -match '^[\[\(]?\s*(edit|↑|\*|\d+\s*\])\s*[\]\)]?$' -or $t -match '^Layout \d$') { continue }   # section and page numbers, stray marks, layout switches
    $out.Add($t)
  }
  return , $out
}
function Find-Para($paras, [string]$phrase, [int]$from) {
  $ph = ($phrase -replace '\s+', ' ').ToLowerInvariant()
  for ($i = $from; $i -lt $paras.Count; $i++) { if (($paras[$i] -replace '\s+', ' ').ToLowerInvariant().Contains($ph)) { return $i } }
  return -1
}
function Select-Part([string]$html, [string]$sel) {
  $sel = $sel.Trim()
  if ($sel -match '^@(\d+)\.\.(@(\d+))?$') {   # by paragraph numbers (as -Peek shows them), inclusive
    $paras = To-Paras (Clean-Html $html); $a = [int]$Matches[1]; $b = if ($Matches[3]) { [int]$Matches[3] } else { $paras.Count - 1 }
    $res = New-Object Collections.Generic.List[string]; for ($x = $a; $x -le [Math]::Min($b, $paras.Count - 1); $x++) { $res.Add($paras[$x]) }
    return , $res
  }
  if ($sel -match '^#([^.]*)\.\.(#(.*))?$') {   # by anchors: from the element with id=from up to (not including) the one with id=to
    $a = [regex]::Match($html, 'id="' + [regex]::Escape($Matches[1]) + '"'); if (-not $a.Success) { throw "anchor #$($Matches[1]) not found" }
    $start = $html.LastIndexOf('<', $a.Index)
    $end = $html.Length
    if ($Matches[3]) { $b = [regex]::Match($html.Substring($a.Index + 1), 'id="' + [regex]::Escape($Matches[3]) + '"'); if (-not $b.Success) { throw "anchor #$($Matches[3]) not found" }; $end = $html.LastIndexOf('<', $a.Index + 1 + $b.Index) }
    $paras = To-Paras (Clean-Html $html.Substring($start, $end - $start))
    return , $paras
  }
  $paras = To-Paras (Clean-Html $html)
  if ($sel -eq 'all') { return , $paras }
  $pm = [regex]::Match($sel, '^"(.+)"\.\."(.+)"$'); if (-not $pm.Success) { throw "bad select: $sel" }
  $i = Find-Para $paras $pm.Groups[1].Value 0; if ($i -lt 0) { throw "start phrase not found: $($pm.Groups[1].Value)" }
  $k = Find-Para $paras $pm.Groups[2].Value $i; if ($k -lt 0) { throw "end phrase not found: $($pm.Groups[2].Value)" }
  # the start paragraph is trimmed to begin at the phrase (a speech often starts mid-paragraph after "he said:")
  $first = $paras[$i]; $at = $first.ToLowerInvariant().IndexOf($pm.Groups[1].Value.ToLowerInvariant()); if ($at -gt 0) { $first = $first.Substring($at) }
  # the end paragraph is cut after the end phrase, carried on to the end of its sentence (with closing quotes)
  function CutEnd([string]$t, [int]$from) {
    $e = $t.ToLowerInvariant().IndexOf($pm.Groups[2].Value.ToLowerInvariant(), $from); if ($e -lt 0) { return $t }
    $e += $pm.Groups[2].Value.Length
    $cq = [string][char]0x201D + [string][char]0x2019   # closing curly quotes, joined in at run time (a literal one would end the quoted string)
    $tail = [regex]::Match($t.Substring($e), ('^[^.!?' + "`n" + ']*?[.!?]+["' + $cq + ')\]]*|^["' + $cq + ')\]]+'))
    if ($tail.Success -and $tail.Length -le 40) { $e += $tail.Length }
    return $t.Substring(0, $e)
  }
  $res = New-Object Collections.Generic.List[string]
  for ($x = $i; $x -le $k; $x++) {
    if ($x -eq $i -and $x -eq $k) { $t = $paras[$x]; $s0 = [Math]::Max(0, $t.ToLowerInvariant().IndexOf($pm.Groups[1].Value.ToLowerInvariant())); $res.Add((CutEnd $t $s0).Substring($s0)) }
    elseif ($x -eq $i) { $res.Add($first) }
    elseif ($x -eq $k) { $res.Add((CutEnd $paras[$x] 0)) }
    else { $res.Add($paras[$x]) }
  }
  return , $res
}

if ($Peek) {
  $paras = To-Paras (Clean-Html (Get-PageHtml $Peek))
  "paragraphs: $($paras.Count)"
  for ($i = 0; $i -lt $paras.Count; $i++) {
    if ($Find -contains '*') { '{0,5}: {1}' -f $i, ($paras[$i].Substring(0, [Math]::Min(70, $paras[$i].Length)) -replace "`n", ' / '); continue }   # the start of every paragraph
    foreach ($f in $Find) {
      $at = $paras[$i].ToLowerInvariant().IndexOf($f.ToLowerInvariant())
      if ($at -ge 0) { $s = [Math]::Max(0, $at - 40); '{0,5}: ...{1}...' -f $i, ($paras[$i].Substring($s, [Math]::Min(150, $paras[$i].Length - $s)) -replace "`n", ' / '); break }
    }
  }
  return
}

# ── the sources ─────────────────────────────────────────────────────────────────────────────────────────────────────
$MD = [string][char]0x2014
$FIXES = @{
  'cicero-against-catiline' = @(, @('do you mean to ease abusing', 'do you mean to cease abusing'))   # an OCR slip in the Wikisource copy
  'urban-ii-at-clermont'    = @(@('beloved by Godas shines', ('beloved by God' + $MD + 'as shines')), @('your works set apart from all nations', ('your works' + $MD + 'set apart from all nations')))   # dashes lost in the Sourcebook copy (Munro 1895 has them)
}
$rows = @(); $titles = @{}
$sd = [IO.File]::ReadAllText((Join-Path $Repo 'speeches-data.js'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($sd, '\{slug:"([^"]+)",title:"([^"]+)"')) { $titles[$m.Groups[1].Value] = $m.Groups[2].Value }
foreach ($line in [IO.File]::ReadAllLines((Join-Path $PSScriptRoot 'speech-sources.tsv'), [Text.Encoding]::UTF8)) {
  if (-not $line.Trim() -or $line.StartsWith('#')) { continue }
  $c = $line.Split("`t"); if ($c.Count -lt 5) { throw "speech-sources.tsv: 5 columns expected: $line" }
  if (-not $titles.ContainsKey($c[0])) { throw "speech-sources.tsv: unknown speech $($c[0])" }
  $rows += , @($c[0], $c[1], $c[2], $c[3], $c[4])
}
$slugs = @($rows | ForEach-Object { $_[0] } | Select-Object -Unique)
if ($Only) { $slugs = @($slugs | Where-Object { $Only -contains $_ }) }
$today = (Get-Date).ToString('yyyy-MM-dd'); $nOk = 0; $nBad = 0
foreach ($slug in $slugs) {
  try {
    $parts = @($rows | Where-Object { $_[0] -eq $slug })
    $paras = New-Object Collections.Generic.List[string]
    foreach ($p in $parts) { foreach ($t in (Select-Part (Get-PageHtml $p[1]) $p[2])) { $paras.Add($t) } }
    if (-not $paras.Count) { throw 'no text' }
    # obvious slips of the scanned copies, corrected (old -> new, matched exactly)
    if ($FIXES.ContainsKey($slug)) { for ($x = 0; $x -lt $paras.Count; $x++) { foreach ($fx in $FIXES[$slug]) { $paras[$x] = $paras[$x].Replace($fx[0], $fx[1]) } } }
    # paragraph numbers some translations print at the start of a paragraph ("2 In the first place ...")
    $oq = [string][char]0x201C   # an opening curly quote may stand between the number and the text: 36"I shall ...
    for ($x = 0; $x -lt $paras.Count; $x++) { $paras[$x] = [regex]::Replace($paras[$x], ('^\d{1,2} ?(?=["' + $oq + ']?[A-Z])'), '') }
    $words = 0; foreach ($t in $paras) { $words += ($t -split '\s+' | Where-Object { $_ }).Count }
    $url = $parts[0][1]; $src = if ($url -match 'wikisource\.org') { 'Wikisource' } elseif ($url -match 'gutenberg\.org') { 'Project Gutenberg' } elseif ($url -match 'fordham\.edu') { 'Internet History Sourcebooks, Fordham University' } elseif ($url -match 'reaganlibrary\.gov') { 'Ronald Reagan Presidential Library' } else { ([Uri]$url).Host }
    $lic = if ($src -eq 'Wikisource') { 'The text is in the public domain; the Wikisource transcription is shared under CC BY-SA 4.0.' } else { 'The text is in the public domain.' }
    $o = New-Object 'Collections.Generic.Dictionary[string,object]'
    $o['slug'] = [string]$slug; $o['title'] = [string]$titles[$slug]; $o['url'] = [string]$url; $o['source'] = [string]$src; $o['credit'] = [string]$parts[0][3]
    $o['licence'] = [string]$lic; $o['lang'] = [string]$parts[0][4]; $o['words'] = [int]$words; $o['fetched'] = $today; $o['paras'] = [string[]]$paras.ToArray()
    [IO.File]::WriteAllText((Join-Path $outDir ($slug + '.json')), $J.Serialize($o), $U8)
    $all = ($paras -join ' ') -split '\s+' | Where-Object { $_ }
    '{0,-44} {1,6} words  [{2} ...] ... [... {3}]' -f $slug, $words, (($all | Select-Object -First 7) -join ' '), (($all | Select-Object -Last 7) -join ' ')
    $nOk++
  } catch { "{0,-44} FAILED: {1}" -f $slug, $_.Exception.Message; $nBad++ }
}
"done: $nOk written, $nBad failed"
