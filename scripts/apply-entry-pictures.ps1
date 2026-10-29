# Applies the hand-picked entry pictures (scripts/entry-pictures.tsv) to encyclopedia-data.js and data/enc-preview: an
# entry without a picture gets img and credit (after its description), its preview card gets "i". An entry that already
# has a picture keeps it. Idempotent: a second run changes nothing. Run it after every enc-merge (which starts again from
# the saved originals), then clean-credits, make-previews, make-home-data and build-pages.
#   powershell -ExecutionPolicy Bypass -File scripts\apply-entry-pictures.ps1
param([string]$Repo = (Split-Path $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$u8 = New-Object Text.UTF8Encoding($false)
$pic = @{}
foreach ($l in [IO.File]::ReadAllLines("$Repo\scripts\entry-pictures.tsv", $u8)) {
  if (-not $l -or $l.StartsWith('#')) { continue }
  $c = $l.Split("`t"); if ($c.Count -lt 4) { throw "entry-pictures.tsv: bad line '$l'" }
  if (-not (Test-Path "$Repo\images\encyclopedia\$($c[0]).jpg")) { Write-Warning "no picture file for $($c[0])"; continue }
  $pic[$c[0]] = $c
}
function Js([string]$s) { '"' + $s.Replace('\', '\\').Replace('"', '\"') + '"' }

# encyclopedia-data.js: one entry per line; img and credit follow desc
$path = "$Repo\encyclopedia-data.js"; $lines = [IO.File]::ReadAllLines($path, $u8)
$nNew = 0; $nHad = 0; $seen = @{}
$rxDesc = New-Object Text.RegularExpressions.Regex(',desc:"(?:[^"\\]|\\.)*"')
for ($i = 0; $i -lt $lines.Length; $i++) {
  $l = $lines[$i]; if (-not $l.StartsWith('  {slug:"')) { continue }
  $slug = [regex]::Match($l, '^  \{slug:"([^"]+)"').Groups[1].Value; if (-not $pic.ContainsKey($slug)) { continue }
  $seen[$slug] = 1
  if ($l.Contains(',img:"')) { $nHad++; continue }
  $d = $rxDesc.Match($l); if (-not $d.Success) { Write-Warning "no description in $slug"; continue }
  $p = $pic[$slug]; $at = $d.Index + $d.Length
  $lines[$i] = $l.Substring(0, $at) + ',img:' + (Js "/images/encyclopedia/$slug.jpg") + ',credit:{artist:' + (Js $p[1]) + ',licence:' + (Js $p[2]) + ',source:' + (Js $p[3]) + '}' + $l.Substring($at)
  $nNew++
}
$missing = @($pic.Keys | Where-Object { -not $seen.ContainsKey($_) })
if ($missing.Count) { Write-Warning ("entry-pictures.tsv names entries that do not exist: " + ($missing -join ', ')) }
if ($nNew) { [IO.File]::WriteAllText($path, (($lines -join "`n") + "`n"), $u8) }

# data/enc-preview/*.json: {slug: {n, t, d, s, i}}; a card without a picture has "i":""
$nPrev = 0
$rxCard = New-Object Text.RegularExpressions.Regex('"([^"]+)":\{"n":"(?:[^"\\]|\\.)*","t":"(?:[^"\\]|\\.)*","d":"(?:[^"\\]|\\.)*","s":"(?:[^"\\]|\\.)*","i":""(?=\})')
foreach ($f in Get-ChildItem "$Repo\data\enc-preview" -Filter *.json) {
  $t = [IO.File]::ReadAllText($f.FullName, $u8)
  $t2 = $rxCard.Replace($t, {
    param($mm)
    $slug = $mm.Groups[1].Value
    if ($pic.ContainsKey($slug)) { $mm.Value.Substring(0, $mm.Value.Length - 2) + '"/images/encyclopedia/' + $slug + '.jpg"' } else { $mm.Value }
  })
  if ($t2 -ne $t) { [IO.File]::WriteAllText($f.FullName, $t2, $u8); $nPrev++ }
}
"entry pictures: $nNew added, $nHad entries had one already; $nPrev preview files updated"
