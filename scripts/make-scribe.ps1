# Builds data/scribe/<language>.json, the languages of the "Write in ..." tool (scribe.js, on the language profiles and
# /write; each page loads only its own), from scripts/scribe/*.tsv (files starting with _ are tables that a "values"
# line reads), writes their version into scribe.js (LANGS_V), and with -Hanzi also data/scribe/hanzi.json (Classical Chinese characters, from the
# Unicode Unihan database). Glyphs are written in the TSVs as Unicode character names ("HEBREW LETTER ALEF", several
# joined by " + "), so no code point is ever typed by hand; every name is checked against UnicodeData.txt, which is
# downloaded once into %LOCALAPPDATA%\epoch-tools\ucd (with Unihan.zip for -Hanzi). Stops on any unknown name.
#   powershell -File scripts\make-scribe.ps1 [-Hanzi]
# TSV lines (tab-separated; # starts a comment):
#   lang    <slug> <name> <one sentence on how the language was written>
#   script  <id> <label> key=value ... (engine=letters|abugida|syllabic|hiero|han, rules=, font=, dir=ltr|rtl, material=)
#   about   <the script in a sentence: where and when it was used>
#   note    <how to type, shown under the keyboard>
#   group   <label of a row of keys>
#   key     <value> <glyph names> [hint] [typed forms, comma-separated]      a key: types <value>, shows the glyph
#   word    <VALUE> <glyph names> <meaning> [typed forms]                     a word sign (typed in capitals in cuneiform)
#   det     <value> <glyph names> <what it marks>                             a determinative, typed {value}
#   sign    <value> <glyph names>                                             a value that can be typed, without a key
#   final   <glyph names> <glyph names>                                       a letter and its form at the end of a word
#   mark    <vowel> <glyph names> [hint]                                      the vowel mark for a vowel ("Vowel marks")
#   punct   <typed> <glyph names> [hint]                                      punctuation (a word divider ...)
#   sample  <romanised text> <meaning> <source>
#   values  <file>                                                            sign lines from another file (cuneiform)
param([string]$Repo = (Split-Path $PSScriptRoot), [switch]$Hanzi)
$ErrorActionPreference = 'Stop'
$U8 = New-Object Text.UTF8Encoding($false)
$tools = Join-Path $env:LOCALAPPDATA 'epoch-tools\ucd'
if (-not (Test-Path $tools)) { [void](New-Item -ItemType Directory -Force $tools) }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Fetch([string]$file) {
  $p = Join-Path $tools $file
  if (-not (Test-Path $p)) { Invoke-WebRequest "https://www.unicode.org/Public/UCD/latest/ucd/$file" -OutFile $p -UseBasicParsing -TimeoutSec 300 }
  return $p
}
$CP = @{}
foreach ($l in [IO.File]::ReadAllLines((Fetch 'UnicodeData.txt'))) { $f = $l.Split(';'); if (-not $f[1].StartsWith('<')) { $CP[$f[1]] = [Convert]::ToInt32($f[0], 16) } }
$bad = New-Object Collections.Generic.List[string]
function Glyph([string]$names, [string]$where) {
  # a Chinese character is written as itself (CJK ideographs have no names of their own in UnicodeData.txt)
  if ($names.Length -le 2 -and $names.Length -ge 1 -and [char]::ConvertToUtf32($names, 0) -ge 0x3400) { return $names }
  $s = New-Object Text.StringBuilder
  foreach ($n in ($names -split '\s\+\s')) {
    $n = $n.Trim(); if (-not $n) { continue }
    if ($CP.ContainsKey($n)) { [void]$s.Append([char]::ConvertFromUtf32($CP[$n])) } else { $bad.Add("$where`: unknown character name '$n'") }
  }
  return $s.ToString()
}
function Js([string]$s) {   # a JSON string, with the characters themselves (UTF-8)
  $b = New-Object Text.StringBuilder; [void]$b.Append('"')
  foreach ($ch in $s.ToCharArray()) { switch ($ch) { '"' { [void]$b.Append('\"') } '\' { [void]$b.Append('\\') } "`n" { [void]$b.Append('\n') } "`t" { [void]$b.Append('\t') } default { if ([int]$ch -lt 32) { [void]$b.Append(('\u{0:x4}' -f [int]$ch)) } else { [void]$b.Append($ch) } } } }
  [void]$b.Append('"'); return $b.ToString()
}
function Arr($items) { '[' + (($items | ForEach-Object { $_ }) -join ',') + ']' }

$langs = New-Object Collections.Generic.List[object]
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'scribe') -Filter *.tsv | Where-Object { $_.Name -notlike '_*' } | Sort-Object Name) {
  $lang = $null; $scripts = New-Object Collections.Generic.List[object]; $sc = $null
  $lines = New-Object Collections.Generic.List[object]
  $n = 0
  # U+0301 in a line stands for that character (the combining accents of the Greek keys, which are invisible in a file)
  foreach ($l in [IO.File]::ReadAllLines($file.FullName, $U8)) { $n++; if ($l.Trim() -and -not $l.TrimStart().StartsWith('#')) { $lines.Add(@($n, [regex]::Replace($l, 'U\+([0-9A-F]{4,5})', { param($m) [char]::ConvertFromUtf32([Convert]::ToInt32($m.Groups[1].Value, 16)) }), $file.Name)) } }
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $c = $lines[$i][1].Split("`t"); $where = $lines[$i][2] + ':' + $lines[$i][0]
    switch ($c[0]) {
      'lang' { $lang = @{ slug = $c[1]; name = $c[2]; blurb = $c[3] } }
      'script' {
        $sc = @{ id = $c[1]; label = $c[2]; opt = [ordered]@{}; about = ''; note = ''; groups = New-Object Collections.Generic.List[object]; signs = New-Object Collections.Generic.List[string]; words = New-Object Collections.Generic.List[string]; dets = New-Object Collections.Generic.List[string]; finals = New-Object Collections.Generic.List[string]; marks = New-Object Collections.Generic.List[string]; punct = New-Object Collections.Generic.List[string]; samples = New-Object Collections.Generic.List[string]; seen = @{} }
        foreach ($kv in $c[3..($c.Count - 1)]) { if ($kv -match '^(\w+)=(.*)$') { $sc.opt[$Matches[1]] = $(if ($Matches[1] -eq 'space') { Glyph $Matches[2] $where } else { $Matches[2] }) } }   # space: the word divider's name
        $scripts.Add($sc)
      }
      'about' { $sc.about = $c[1] }
      'note' { $sc.note = $c[1] }
      'group' { $sc.groups.Add(@{ label = $c[1]; keys = New-Object Collections.Generic.List[string] }) }
      'key' {
        $g = Glyph $c[2] $where; $alts = if ($c.Count -gt 4 -and $c[4]) { @($c[4].Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }) } else { @() }
        $sc.groups[$sc.groups.Count - 1].keys.Add((Arr @((Js $c[1]), (Js $g), (Js $(if ($c.Count -gt 3) { $c[3] } else { '' }))) ))
        if (-not $sc.seen.ContainsKey($c[1])) { $sc.seen[$c[1]] = 1; $sc.signs.Add((Arr @((Js $c[1]), (Js $g), (Arr ($alts | ForEach-Object { Js $_ }))))) }
      }
      'sign' { $g = Glyph $c[2] $where; if (-not $sc.seen.ContainsKey($c[1])) { $sc.seen[$c[1]] = 1; $sc.signs.Add((Arr @((Js $c[1]), (Js $g), '[]'))) } }
      'word' {
        $g = Glyph $c[2] $where; $alts = if ($c.Count -gt 4 -and $c[4]) { @($c[4].Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }) } else { @() }
        $sc.words.Add((Arr @((Js $c[1]), (Js $g), (Js $c[3]), (Arr ($alts | ForEach-Object { Js $_ })))))
        if ($sc.groups.Count) { $sc.groups[$sc.groups.Count - 1].keys.Add((Arr @((Js $c[1]), (Js $g), (Js $c[3]), '1'))) }
      }
      'det' { $g = Glyph $c[2] $where; $sc.dets.Add((Arr @((Js $c[1]), (Js $g), (Js $c[3])))); if ($sc.groups.Count) { $sc.groups[$sc.groups.Count - 1].keys.Add((Arr @((Js $c[1]), (Js $g), (Js $c[3]), '2'))) } }
      'final' { $sc.finals.Add((Arr @((Js (Glyph $c[1] $where)), (Js (Glyph $c[2] $where))))) }
      'mark' { $sc.marks.Add((Arr @((Js $c[1]), (Js (Glyph $c[2] $where)), (Js $(if ($c.Count -gt 3) { $c[3] } else { '' }))))) }
      'punct' {
        $g = Glyph $c[2] $where; $sc.punct.Add((Arr @((Js $c[1]), (Js $g))))
        if ($sc.groups.Count) { $sc.groups[$sc.groups.Count - 1].keys.Add((Arr @((Js $c[1]), (Js $g), (Js $(if ($c.Count -gt 3) { $c[3] } else { '' })), '3'))) }
      }
      'sample' { $sc.samples.Add((Arr @((Js $c[1]), (Js $c[2]), (Js $c[3])))) }
      'values' {
        foreach ($vl in [IO.File]::ReadAllLines((Join-Path (Join-Path $PSScriptRoot 'scribe') $c[1]), $U8)) {
          if (-not $vl.Trim() -or $vl.StartsWith('#')) { continue }
          $v = $vl.Split("`t"); if ($v[0] -ne 'sign') { continue }
          $g = Glyph $v[2] ($c[1] + ':' + $v[1]); if (-not $sc.seen.ContainsKey($v[1])) { $sc.seen[$v[1]] = 1; $sc.signs.Add((Arr @((Js $v[1]), (Js $g), '[]'))) }
        }
      }
      default { $bad.Add("$where`: unknown line type '$($c[0])'") }
    }
  }
  if (-not $lang) { $bad.Add("$($file.Name): no lang line"); continue }
  $sj = foreach ($s in $scripts) {
    '{"id":' + (Js $s.id) + ',"label":' + (Js $s.label) + ',' + (($s.opt.Keys | ForEach-Object { (Js $_) + ':' + (Js $s.opt[$_]) }) -join ',') +
      ',"about":' + (Js $s.about) + ',"note":' + (Js $s.note) +
      ',"groups":' + (Arr ($s.groups | ForEach-Object { '[' + (Js $_.label) + ',' + (Arr $_.keys) + ']' })) +
      ',"signs":' + (Arr $s.signs) + ',"words":' + (Arr $s.words) + ',"dets":' + (Arr $s.dets) + ',"finals":' + (Arr $s.finals) +
      ',"marks":' + (Arr $s.marks) + ',"punct":' + (Arr $s.punct) + ',"samples":' + (Arr $s.samples) + '}'
  }
  $langs.Add(@($lang.slug, ('{"slug":' + (Js $lang.slug) + ',"name":' + (Js $lang.name) + ',"blurb":' + (Js $lang.blurb) + ',"scripts":' + (Arr $sj) + '}')))
  "{0}: {1} script(s), {2} signs" -f $lang.name, $scripts.Count, (($scripts | ForEach-Object { $_.signs.Count }) -join '+')
}
if ($bad.Count) { $bad | ForEach-Object { "  $_" }; throw "scribe: $($bad.Count) problem(s)" }
# one file per language, data/scribe/<slug>.json: {slug, name, blurb, scripts: [{id, label, engine, rules, font, dir,
# material ..., about, note, groups: [[label, [[value, glyph, hint, kind (1 word sign, 2 determinative, 3 punctuation)]]]],
# signs: [[value, glyph, [typed forms]]], words: [[value, glyph, meaning, [typed forms]]], dets, finals, marks, punct,
# samples: [[text, meaning, source]]}]}
$dir = Join-Path $Repo 'data\scribe'; if (-not (Test-Path $dir)) { [void](New-Item -ItemType Directory -Force $dir) }
$all = New-Object Text.StringBuilder; $nw = 0
foreach ($l in $langs) {
  $p = Join-Path $dir ($l[0] + '.json'); [void]$all.Append($l[1])
  $old = if (Test-Path $p) { [IO.File]::ReadAllText($p, $U8) } else { '' }
  if ($old -ne $l[1]) { [IO.File]::WriteAllText($p, $l[1], $U8); $nw++ }
}
"data/scribe: $($langs.Count) languages, $nw written"
# the version scribe.js asks for (so a changed file is not taken from a cache)
$sha = [BitConverter]::ToString((New-Object Security.Cryptography.SHA1Managed).ComputeHash($U8.GetBytes($all.ToString()))).Replace('-', '').Substring(0, 10).ToLower()
$sj2 = Join-Path $Repo 'scribe.js'
if (Test-Path $sj2) { $t = [IO.File]::ReadAllText($sj2, $U8); $t2 = [regex]::Replace($t, "LANGS_V = '[0-9a-f]*'", "LANGS_V = '$sha'"); if ($t2 -ne $t) { [IO.File]::WriteAllText($sj2, $t2, $U8); "scribe.js: LANGS_V = $sha" } }

# -Hanzi: data/scribe/hanzi.json, the characters the pinyin search of Classical Chinese offers: traditional characters
# with a Tang reading (kTang, about 3,800 characters of the Tang age) or in the Hong Kong school list (kGradeLevel), with
# their Mandarin reading (kMandarin) and the first sense of their English definition (kDefinition), most frequent first
# (kHanyuPinlu). {"c": [[character, pinyin, meaning], ...]}. Unicode Unihan database (Unicode License v3).
if ($Hanzi) {
  $uz = Join-Path $tools 'unihan'
  if (-not (Test-Path (Join-Path $uz 'Unihan_Readings.txt'))) { Expand-Archive (Fetch 'Unihan.zip') -DestinationPath $uz -Force }
  $F = @{}
  foreach ($file in 'Unihan_Readings.txt', 'Unihan_DictionaryLikeData.txt', 'Unihan_Variants.txt') {
    foreach ($l in [IO.File]::ReadLines((Join-Path $uz $file))) {
      if (-not $l.StartsWith('U+')) { continue }
      $p = $l.Split("`t"); if ($p[1] -notin 'kMandarin', 'kDefinition', 'kHanyuPinlu', 'kTang', 'kGradeLevel', 'kTraditionalVariant') { continue }
      $cpt = [Convert]::ToInt32($p[0].Substring(2), 16); if (-not $F.ContainsKey($cpt)) { $F[$cpt] = @{} }; $F[$cpt][$p[1]] = $p[2]
    }
  }
  $rows = New-Object Collections.Generic.List[object]
  foreach ($cpt in $F.Keys) {
    $e = $F[$cpt]
    if (-not ($e.kTang -or $e.kGradeLevel) -or -not $e.kMandarin -or -not $e.kDefinition) { continue }
    # a simplified form (its traditional variant is another character) is left out: Classical Chinese is written in the traditional forms
    if ($e.kTraditionalVariant -and ($e.kTraditionalVariant.Split(' ') -notcontains ('U+{0:X4}' -f $cpt))) { continue }
    $freq = 0; if ($e.kHanyuPinlu) { foreach ($m in [regex]::Matches($e.kHanyuPinlu, '\((\d+)\)')) { $freq += [int]$m.Groups[1].Value } }
    $mean = ($e.kDefinition -split ';')[0].Trim(); if ($mean.Length -gt 44) { $cut = $mean.LastIndexOf(',', 44); if ($cut -lt 10) { $cut = $mean.LastIndexOf(' ', 44) }; $mean = $mean.Substring(0, $cut).Trim() }
    $rows.Add([pscustomobject]@{ c = [char]::ConvertFromUtf32($cpt); p = $e.kMandarin.Split(' ')[0]; m = $mean; f = $freq; g = [int]$(if ($e.kGradeLevel) { $e.kGradeLevel } else { 9 }) })
  }
  $sorted = $rows | Sort-Object @{ Expression = 'f'; Descending = $true }, g, c
  $hz = '{"c":[' + (($sorted | ForEach-Object { '[' + (Js $_.c) + ',' + (Js $_.p) + ',' + (Js $_.m) + ']' }) -join ',') + ']}'
  [IO.File]::WriteAllText((Join-Path $dir 'hanzi.json'), $hz, $U8)
  $hsha = [BitConverter]::ToString((New-Object Security.Cryptography.SHA1Managed).ComputeHash($U8.GetBytes($hz))).Replace('-', '').Substring(0, 10).ToLower()
  "data/scribe/hanzi.json: {0} characters, {1:n0} bytes" -f $rows.Count, $U8.GetByteCount($hz)
  $t = [IO.File]::ReadAllText($sj2, $U8); $t2 = [regex]::Replace($t, "HANZI_V = '[0-9a-z]*'", "HANZI_V = '$hsha'"); if ($t2 -ne $t) { [IO.File]::WriteAllText($sj2, $t2, $U8); "scribe.js: HANZI_V = $hsha" }
}
