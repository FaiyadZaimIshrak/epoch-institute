# Imports the quotations of the Who Said It? game (/games#said) from public-domain texts - originals, translations
# published before 1930, US federal works - and writes data/quotes.json (a build input, not deployed):
#   [{id, speaker, text, work, credit, note, url, source, licence}]
# A quotation is never typed: scripts/quote-sources.tsv names the page and the words that start and end it, and this
# script copies what lies between them. Tab-separated columns:
#   speaker (an encyclopedia person with a picture)  url  "start phrase".."end phrase"  work  credit  note
# credit: the translator and year ("tr. James Legge, 1861"), or "original" for words written in English. note: how the
# words reach us or who speaks them ("Plutarch's account", "spoken by Mr Micawber"), shown with the answer.
# Checks: 5-45 words, no word of the speaker's own name (or another name of theirs) in the quotation, no quotation
# twice. Pages are cached in -Cache, so a rerun only cleans again. Usage:
#   powershell -File scripts\fetch-quotes.ps1 [-Only slug1,slug2] [-Refresh] [-Cache <dir>]
#   ... -Peek <url> -Find word1,word2   prints every cleaned paragraph of a page that holds one of the words, with
#       its number, to copy start and end phrases from exactly the text this script will read
#   ... -Test <file.tsv>                 imports the rows of another file (same columns) and prints each quotation
#       with its checks, writing nothing: to try rows before they go into quote-sources.tsv
param([string[]]$Only, [switch]$Refresh, [string]$Cache = (Join-Path $env:TEMP 'epoch-quote-cache'), [string]$Peek, [string[]]$Find, [string]$Test)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web.Extensions
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = Split-Path $PSScriptRoot -Parent
$J = New-Object Web.Script.Serialization.JavaScriptSerializer; $J.MaxJsonLength = 67108864
$U8 = New-Object Text.UTF8Encoding($false)
$UA = 'EpochInstitute/1.0 (the-epoch-institute.org)'
if (-not (Test-Path $Cache)) { New-Item -ItemType Directory -Path $Cache | Out-Null }

# fetching, cleaning and selecting: shared with scripts/fetch-speech-texts.ps1
. (Join-Path $PSScriptRoot 'lib\source-text.ps1')

if ($Peek) {
  $Find = @($Find | ForEach-Object { $_ -split ',' } | Where-Object { $_ })   # -File passes "a,b" as one string
  $paras = To-Paras (Clean-Html (Get-PageHtml $Peek))
  "paragraphs: $($paras.Count)"
  for ($i = 0; $i -lt $paras.Count; $i++) {
    foreach ($f in $Find) {
      if ($paras[$i].ToLowerInvariant().Contains($f.ToLowerInvariant())) { '{0,5}: {1}' -f $i, ($paras[$i].Substring(0, [Math]::Min(900, $paras[$i].Length)) -replace "`n", ' / '); break }
    }
  }
  return
}

# the people: encyclopedia entries (name, other names, picture)
$PEOPLE = @{}
foreach ($l in [IO.File]::ReadAllLines((Join-Path $Repo 'encyclopedia-data.js'), $U8)) {
  if (-not $l.StartsWith('  {slug:')) { continue }
  $slug = [regex]::Match($l, 'slug:"([^"]*)"').Groups[1].Value
  if ([regex]::Match($l, 'type:"([^"]*)"').Groups[1].Value -ne 'person') { continue }
  $aka = @([regex]::Matches([regex]::Match($l, 'aka:\[([^\]]*)\]').Groups[1].Value, '"([^"]*)"') | ForEach-Object { $_.Groups[1].Value })
  $PEOPLE[$slug] = @{ name = [regex]::Match($l, 'name:"([^"]*)"').Groups[1].Value; aka = $aka; img = [regex]::Match($l, 'img:"([^"]*)"').Groups[1].Value }
}
$NAMESTOP = @('the', 'of', 'von', 'van', 'de', 'der', 'da', 'del', 'di', 'la', 'le', 'ibn', 'bin', 'al', 'great', 'king', 'queen', 'emperor', 'saint', 'elder', 'younger', 'first', 'second', 'third')
$fold = { param($t) ($t.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '').ToLowerInvariant() }
function Import-Row($c) {
  $slug = $c[0].Trim(); $p = $PEOPLE[$slug]
  if (-not $p) { throw "no person entry $slug" }
  if (-not $p.img) { throw "$slug has no picture" }
  $paras = Select-Part (Get-PageHtml $c[1].Trim()) $c[2].Trim()
  $t = (($paras | ForEach-Object { $_ -replace "`n", ' ' }) -join ' ') -replace '\s+', ' '
  # the quotation marks around a speech in the source are the game's to add
  $q = '"' + [string][char]0x201C + [string][char]0x201D + [string][char]0x2018 + [string][char]0x2019 + "'"
  $t = $t.Trim().TrimStart($q.ToCharArray()).TrimEnd($q.ToCharArray()).Trim()
  # a quotation taken from inside a sentence says so: "...that government of the people"
  $ell = [string][char]0x2026
  if ($t -cmatch '^[a-z]') { $t = $ell + $t }
  if ($t -notmatch '[.!?;:' + [char]0x2026 + ']$') { $t = $t.TrimEnd(',', ' ') + $ell }
  $words = ($t -split '\s+' | Where-Object { $_ }).Count
  $probs = New-Object Collections.Generic.List[string]
  if ($words -lt 5 -or $words -gt 45) { $probs.Add("$words words") }
  $ft = & $fold $t
  foreach ($n in (@($p.name) + $p.aka)) {
    foreach ($w in ((& $fold $n) -split '[^a-z0-9]+')) {
      if ($w.Length -ge 4 -and $NAMESTOP -notcontains $w -and $ft -match ('\b' + [regex]::Escape($w) + '\b')) { $probs.Add("names the speaker: $w") }
    }
  }
  $url = $c[1].Trim()
  $src = if ($url -match 'wikisource\.org') { 'Wikisource' } elseif ($url -match 'gutenberg\.org') { 'Project Gutenberg' } elseif ($url -match 'gutenberg\.net\.au') { 'Project Gutenberg Australia' }
    elseif ($url -match 'avalon\.law\.yale\.edu') { 'The Avalon Project' } elseif ($url -match 'fordham\.edu') { 'Internet History Sourcebooks, Fordham University' } elseif ($url -match 'docsouth\.unc\.edu') { 'Documenting the American South, UNC' }
    elseif ($url -match 'history\.hanover\.edu') { 'Hanover Historical Texts Project' } elseif ($url -match 'classics\.mit\.edu') { 'The Internet Classics Archive' } else { ([Uri]$url).Host }
  $lic = if ($src -eq 'Wikisource') { 'Public domain; Wikisource transcription CC BY-SA 4.0' } else { 'Public domain' }
  # the note says how the words reach us or who speaks them ("Plutarch's account", "spoken by Mr Micawber"); shown with the answer
  return @{ speaker = $slug; text = $t; words = $words; work = $c[3].Trim(); credit = $c[4].Trim(); note = $(if ($c.Count -gt 5) { $c[5].Trim() } else { '' }); url = $url; source = $src; licence = $lic; probs = $probs }
}

$rows = @()
foreach ($line in [IO.File]::ReadAllLines($(if ($Test) { (Resolve-Path $Test).Path } else { Join-Path $PSScriptRoot 'quote-sources.tsv' }), $U8)) {
  if (-not $line.Trim() -or $line.StartsWith('#')) { continue }
  $c = $line.Split("`t"); if ($c.Count -lt 5) { throw "quote-sources.tsv: 5 columns expected: $line" }
  $rows += , $c
}
$out = New-Object Collections.Generic.List[object]; $seen = @{}; $count = @{}; $nBad = 0
foreach ($c in $rows) {
  $slug = $c[0].Trim(); if ($Only -and $Only -notcontains $slug) { continue }
  try {
    $r = Import-Row $c
    if ($seen.ContainsKey($r.text)) { $r.probs.Add('twice') }
    if ($r.probs.Count) { "{0,-34} PROBLEM ({1}): {2}" -f $slug, ($r.probs -join '; '), $r.text; $nBad++; continue }
    $seen[$r.text] = 1; $count[$slug] = 1 + [int]$count[$slug]
    $o = New-Object 'Collections.Generic.Dictionary[string,object]'
    $o['id'] = $slug + '-' + $count[$slug]; $o['speaker'] = $slug; $o['text'] = $r.text; $o['work'] = $r.work; $o['credit'] = $r.credit
    $o['note'] = $r.note; $o['url'] = $r.url; $o['source'] = $r.source; $o['licence'] = $r.licence
    $out.Add($o)
    "{0,-34} {1,3} words  {2}" -f $slug, $r.words, $r.text
  } catch { "{0,-34} FAILED: {1}" -f $slug, $_.Exception.Message; $nBad++ }
}
if (-not $Only -and -not $Test) { [IO.File]::WriteAllText((Join-Path $Repo 'data\quotes.json'), $J.Serialize($out.ToArray()), $U8) }
"done: $($out.Count) quotations from $($count.Count) people, $nBad problems" + $(if ($Only -or $Test) { ' (nothing written)' } else { '' })
