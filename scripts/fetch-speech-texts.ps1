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

# fetching, cleaning and selecting: shared with scripts/fetch-quotes.ps1
. (Join-Path $PSScriptRoot 'lib\source-text.ps1')

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
  'xerxes-to-the-persian-nobles' = @(, @('as rich as our own nay', 'as rich as our own - nay'))   # the transcription's dash lost
  'gregory-vii-deposes-henry-iv' = @(@('seized thy throne . for', 'seized thy throne for'), @('deserted-holding', ('deserted' + $MD + 'holding')), @('rend it-I bind', ('rend it' + $MD + 'I bind')))   # Henderson prints dashes
  'savonarola-defies-the-pope'   = @(, @('send me to help!', 'send me to hell!'))   # "mandami all'inferno"
  'cranmer-last-speech'          = @(, @('glorified and yon edified', 'glorified and you edified'))
  'frederick-before-leuthen'     = @(, @('Sehweidnitz', 'Schweidnitz'))
  'pitt-on-taxing-america'       = @(@('arbitrary reigns. Parliaments', 'arbitrary reigns, Parliaments'), @('they are ail inhabitants', 'they are all inhabitants'))
  'red-jacket-to-the-missionary' = @(@('Their feats extended', 'Their seats extended'), @('strong and powerfal', 'strong and powerful'))   # a long s read as f
  'kossuth-in-new-york'          = @(@('fatherland-lost', ('fatherland' + $MD + 'lost')), @('your, glorious peace', 'your glorious peace'))
  'gandhi-at-his-trial'          = @(@('Chauri Chuara', 'Chauri Chaura'), @('extenating', 'extenuating'), @('I do not except that kind', 'I do not expect that kind'))
}
# paragraphs split by a page break or a plate in the scanned book: the paragraph that ends with the given words is
# joined to the next one (after $FIXES)
$JOINS = @{
  'mazzini-to-the-young-men-of-italy' = @('Could Attilio and Emilio')   # the plate of Mazzini stands between the halves
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
    if ($JOINS.ContainsKey($slug)) {
      foreach ($jn in $JOINS[$slug]) {
        $x = -1; for ($k = 0; $k -lt $paras.Count - 1; $k++) { if ($paras[$k].TrimEnd().EndsWith($jn)) { $x = $k; break } }
        if ($x -lt 0) { throw "join: no paragraph ends with '$jn'" }
        $paras[$x] = $paras[$x].TrimEnd() + ' ' + $paras[$x + 1].TrimStart(); $paras.RemoveAt($x + 1)
      }
    }
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
