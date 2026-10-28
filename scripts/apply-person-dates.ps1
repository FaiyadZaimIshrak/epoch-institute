# Applies the hand-checked person dates (scripts/person-dates.tsv) to encyclopedia-data.js and data/enc-preview (adding
# the field where an entry had none), writes the house style "b. N" / "d. N" for people dated "born N" / "died N", and
# drops the doubled "around c." of some descriptions. Idempotent: a second run changes nothing. Run it after every
# enc-merge (which starts again from the saved originals), then make-previews, make-home-data and build-pages.
#   powershell -ExecutionPolicy Bypass -File scripts\apply-person-dates.ps1
param([string]$Repo = (Split-Path $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$u8 = New-Object Text.UTF8Encoding($false)
$fix = @{}
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\person-dates.tsv", $u8)) {
  if (-not $l -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t"); if ($c.Count -gt 1 -and $c[1]) { $fix[$c[0]] = $c[1] }
}
function Style([string]$d) { $d -replace '^born ', 'b. ' -replace '^died ', 'd. ' }
$rxAround = New-Object Text.RegularExpressions.Regex('\baround c\. (?=\d)')

# encyclopedia-data.js: one entry per line
$path = "$Repo\encyclopedia-data.js"; $lines = [IO.File]::ReadAllLines($path, $u8)
$nFix = 0; $nStyle = 0; $nAround = 0; $seen = @{}
for ($i = 0; $i -lt $lines.Length; $i++) {
  $l = $lines[$i]; if (-not $l.StartsWith('  {slug:"')) { continue }
  $m = [regex]::Match($l, '^  \{slug:"([^"]+)",name:"(?:[^"\\]|\\.)*",type:"([a-z]+)"'); if (-not $m.Success) { continue }
  $slug = $m.Groups[1].Value; $new = $l
  if ($m.Groups[2].Value -eq 'person') {
    $dm = [regex]::Match($new, ',dates:"((?:[^"\\]|\\.)*)"')
    if ($dm.Success) {
      $old = $dm.Groups[1].Value
      $want = if ($fix.ContainsKey($slug)) { $seen[$slug] = 1; $fix[$slug] } else { Style $old }
      if ($want -ne $old) {
        $new = $new.Substring(0, $dm.Groups[1].Index) + $want.Replace('\', '\\').Replace('"', '\"') + $new.Substring($dm.Groups[1].Index + $dm.Groups[1].Length)
        if ($fix.ContainsKey($slug)) { $nFix++ } else { $nStyle++ }
      }
    } elseif ($fix.ContainsKey($slug)) {   # an entry without dates gets the field, before its description
      $dp = $new.IndexOf(',desc:"')
      if ($dp -gt 0) { $seen[$slug] = 1; $new = $new.Substring(0, $dp) + ',dates:"' + $fix[$slug].Replace('\', '\\').Replace('"', '\"') + '"' + $new.Substring($dp); $nFix++ }
    }
  }
  if ($rxAround.IsMatch($new)) { $new = $rxAround.Replace($new, 'around '); $nAround++ }
  $lines[$i] = $new
}
$missing = @($fix.Keys | Where-Object { -not $seen.ContainsKey($_) })
if ($missing.Count) { Write-Warning ("person-dates.tsv names entries that are not people with dates: " + ($missing -join ', ')) }
[IO.File]::WriteAllText($path, (($lines -join "`n") + "`n"), $u8)

# data/enc-preview/*.json: {slug: {n, t, d, s, i}}
$nPrev = 0
$rxCard = New-Object Text.RegularExpressions.Regex('"([^"]+)":\{"n":"(?:[^"\\]|\\.)*","t":"Person","d":"((?:[^"\\]|\\.)*)"')
foreach ($f in Get-ChildItem "$Repo\data\enc-preview" -Filter *.json) {
  $t = [IO.File]::ReadAllText($f.FullName, $u8)
  $t2 = $rxCard.Replace($t, {
    param($mm)
    $slug = $mm.Groups[1].Value; $old = $mm.Groups[2].Value
    $want = if ($fix.ContainsKey($slug)) { $fix[$slug] } else { Style $old }
    if ($want -eq $old) { return $mm.Value }
    $g = $mm.Groups[2]; $mm.Value.Substring(0, $g.Index - $mm.Index) + $want.Replace('\', '\\').Replace('"', '\"') + '"'
  })
  $t2 = $rxAround.Replace($t2, 'around ')
  if ($t2 -ne $t) { [IO.File]::WriteAllText($f.FullName, $t2, $u8); $nPrev++ }
}
"person dates: $nFix fixed from person-dates.tsv, $nStyle written as b./d.; 'around c.' removed from $nAround descriptions; $nPrev preview files updated"
