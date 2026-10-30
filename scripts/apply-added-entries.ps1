# Applies the encyclopedia entries added after the merges (scripts/added-entries.json; R9, 29 Oct 2026: the sites,
# objects, texts and people that the culture and movement profiles name). An entry missing from encyclopedia-data.js
# is appended to ENCYCLOPEDIA with its picture and credit and gets a row of link patterns in encyclopedia-links.js
# ([slug, [[text, mode], ...]]: mode 0 proper name, 1 lowercase term, 2 name with either-case first letter). The row
# goes in front of the profile-only rows when they exist (index fs: every later row moves up and byEmpire follows),
# else at the end; an event also gets its years in y. A row that a rebuild of the links file wrote differently is set
# back to these patterns. "patterns" give an existing entry another name to be found by ([slug, text, mode]; an entry
# that has no row at all gets one), "pictures" replace the picture of an existing entry ([slug, artist, licence,
# source]; the file is images/encyclopedia/<slug>.jpg) and "fixes" correct the description of an existing entry
# ([slug, old text, new text]). "forms" are profile-only short names ([slug, text, mode, {profile: [sections]}]: "Kabir"
# would also link inside "Ali Bey al-Kabir" in the entries and state texts, so it is a form of the Bhakti, Hinduism and
# Sikhism profiles only): a row after fs, put first in byEmpire[profile], and the profile named on the entry with those
# sections. "drop" takes a name out of an existing entry's row ([slug, text, mode]: "the Thirty", an aka of the Thirty
# Tyrants, starts further left than "Thirty Years' War" or "Thirty Comrades", so it took them on 155 pages, and "the
# Combat of the Thirty" on that entry's own page; 30 Oct 2026: "homeland" for Bantustan, "king of kings" for Negus
# nagast, "Moon" for Muhu, "Kitab" for Kitob and "astronomy" for Babylonian astronomy linked wrongly almost everywhere).
# "exclude" keeps an entry off one profile's page ([slug, profile] into ENC_LINKS.ex: the Kitob form "Kitab" names book
# titles on the Sokoto and Ghaznavid profiles). Idempotent: a second run changes nothing.
# Run it after apply-entry-pictures (that is, after every enc-merge), then clean-credits, make-previews,
# make-home-data and build-pages; the profiles link the new entries after their next scan (run-scan, enc-prof-apply)
# and regen-profiles. A scan rebuilds byEmpire and enc2/prof-forms the rows after fs, so run it again after either
# (it puts the forms back).
#   powershell -ExecutionPolicy Bypass -File scripts\apply-added-entries.ps1
param([string]$Repo = (Split-Path $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$u8 = New-Object Text.UTF8Encoding($false)
. "$PSScriptRoot\lib\enc-fn.ps1"
$A = [IO.File]::ReadAllText("$Repo\scripts\added-entries.json", $u8) | ConvertFrom-Json
function Js([string]$s) { '"' + $s.Replace('\', '\\').Replace('"', '\"') + '"' }
foreach ($e in @($A.entries)) { if ($e.img -and -not (Test-Path "$Repo$($e.img -replace '/', '\')")) { throw "no picture file for $($e.slug): $($e.img)" } }

# ---- encyclopedia-data.js (one entry a line; new entries go at the end, as the merges add them) ----
$path = "$Repo\encyclopedia-data.js"; $text = [IO.File]::ReadAllText($path, $u8); $text0 = $text
$have = @{}; foreach ($m in [regex]::Matches($text, '(?m)^  \{slug:"([^"]+)"')) { $have[$m.Groups[1].Value] = 1 }
$add = New-Object Collections.Generic.List[string]
foreach ($e in @($A.entries)) {
  if ($have.ContainsKey($e.slug)) { continue }
  $f = 'slug:' + (Js $e.slug) + ',name:' + (Js $e.name) + ',type:' + (Js $e.type)
  if ($e.subtype) { $f += ',subtype:' + (Js $e.subtype) }
  $aka = @($e.aka | Where-Object { $_ }); if ($aka.Count) { $f += ',aka:[' + (($aka | ForEach-Object { Js $_ }) -join ',') + ']' }
  if ($e.dates) { $f += ',dates:' + (Js $e.dates) }
  $f += ',desc:' + (Js $e.desc)
  if ($e.img) { $f += ',img:' + (Js $e.img) + ',credit:{artist:' + (Js $e.credit.artist) + ',licence:' + (Js $e.credit.licence) + ',source:' + (Js $e.credit.source) + '}' }
  $add.Add('  {' + $f + ',empires:[]}')
}
if ($add.Count) {
  $end = $text.IndexOf("`n];", $text.IndexOf('var ENCYCLOPEDIA = ['))
  $text = $text.Substring(0, $end) + ",`n" + ($add -join ",`n") + $text.Substring($end)
}
$nPic = 0
foreach ($x in @($A.pictures | Where-Object { $_ })) {
  $m = [regex]::Match($text, '(?m)^  \{slug:"' + [regex]::Escape([string]$x[0]) + '".*$'); if (-not $m.Success) { Write-Warning "pictures: no entry $($x[0])"; continue }
  $cr = ',img:' + (Js "/images/encyclopedia/$($x[0]).jpg") + ',credit:{artist:' + (Js $x[1]) + ',licence:' + (Js $x[2]) + ',source:' + (Js $x[3]) + '}'
  $line = $m.Value; if ($line.Contains(',source:' + (Js $x[3]) + '}')) { continue }   # by its source: clean-credits may have tidied the author since
  $line2 = [regex]::Replace($line, ',img:"(?:[^"\\]|\\.)*",credit:\{artist:"(?:[^"\\]|\\.)*",licence:"(?:[^"\\]|\\.)*",source:"(?:[^"\\]|\\.)*"\}', { param($q) $cr })
  if ($line2 -eq $line) { $d = [regex]::Match($line, ',desc:"(?:[^"\\]|\\.)*"'); $line2 = $line.Substring(0, $d.Index + $d.Length) + $cr + $line.Substring($d.Index + $d.Length) }
  $text = $text.Substring(0, $m.Index) + $line2 + $text.Substring($m.Index + $m.Length); $nPic++
}
$nFix = 0
foreach ($x in @($A.fixes | Where-Object { $_ })) {
  $m = [regex]::Match($text, '(?m)^  \{slug:"' + [regex]::Escape([string]$x[0]) + '".*$'); if (-not $m.Success) { Write-Warning "fixes: no entry $($x[0])"; continue }
  $o = (Js $x[1]).Trim('"'); $n = (Js $x[2]).Trim('"'); $line = $m.Value
  if ($line.Contains($n)) { continue }
  if (-not $line.Contains($o)) { Write-Warning "fixes: the old text is not in $($x[0])"; continue }
  $text = $text.Substring(0, $m.Index) + $line.Replace($o, $n) + $text.Substring($m.Index + $m.Length); $nFix++
}
# every entry carries an "empires" list, empty or not: the 55 entries of the speeches release (24-25 Oct 2026) had
# none, so enc-prof-apply could never record the profiles that name them
$nEmp = 0
$text = [regex]::Replace($text, '(?m)^(  \{slug:"[^\n]*?)\}(,?)$', { param($q) if ($q.Groups[1].Value.Contains(',empires:[')) { $q.Value } else { $script:nEmp++; $q.Groups[1].Value + ',empires:[]}' + $q.Groups[2].Value } })
function Slug($n) { $s = ([string]$n).Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''; (($s.ToLower() -replace "['’]", '') -replace '[^a-z0-9]+', '-').Trim('-') }
$nMen = 0   # forms: the profiles that name the entry by its short form, with the sections (as enc-prof-apply writes them)
foreach ($x in @($A.forms | Where-Object { $_ })) {
  $m = [regex]::Match($text, '(?m)^  \{slug:"' + [regex]::Escape([string]$x[0]) + '".*$'); if (-not $m.Success) { throw "forms: no entry $($x[0])" }
  $line = $m.Value; $men = @()
  foreach ($p in $x[3].PSObject.Properties) {
    if ($line.Contains('{name:' + (ConvertTo-Json $p.Name -Compress) + ',')) { continue }
    $men += '{name:' + (ConvertTo-Json $p.Name -Compress) + ',slug:"' + (Slug $p.Name) + '",sections:[' + ((@($p.Value) | ForEach-Object { '"' + $_ + '"' }) -join ',') + ']}'
  }
  if (-not $men.Count) { continue }
  $em = [regex]::Match($line, 'empires:\[(.*)\]\},?$'); $inner = $em.Groups[1].Value
  $line2 = $line.Substring(0, $em.Groups[1].Index) + $(if ($inner) { $inner + ',' } else { '' }) + ($men -join ',') + $line.Substring($em.Groups[1].Index + $em.Groups[1].Length)
  $text = $text.Substring(0, $m.Index) + $line2 + $text.Substring($m.Index + $m.Length); $nMen += $men.Count
}
if ($text -ne $text0) { [IO.File]::WriteAllText($path, $text, $u8) }

# ---- encyclopedia-links.js ----
$el = [IO.File]::ReadAllText("$Repo\encyclopedia-links.js", $u8)
$i0 = $el.IndexOf('var ENC_LINKS = ') + 16; $i1 = $el.IndexOf("};`n", $i0)
$L = $el.Substring($i0, $i1 - $i0 + 1) | ConvertFrom-Json
$fsNow = if ($null -ne $L.PSObject.Properties['fs']) { [int]$L.fs } else { $L.e.Count }
$rowAt = @{}   # the main rows (profile-only forms after fs are not an entry's row)
for ($i = 0; $i -lt $fsNow; $i++) { if ([string]$L.e[$i][0] -ne '@g') { $rowAt[[string]$L.e[$i][0]] = $i } }
$ins = New-Object Collections.Generic.List[object]; $nSet = 0
foreach ($e in @($A.entries)) {
  if (-not $e.links) { throw "no link patterns for $($e.slug)" }
  $pats = @(@($e.links) | ForEach-Object { , @([string]$_[0], [int]$_[1]) })
  foreach ($p in $pats) { [void](EncRx $p[0] $p[1]) }   # a pattern that does not compile stops the run
  if ($rowAt.ContainsKey($e.slug)) {   # a rebuilt links file may have written the row from the name: set it back
    $i = $rowAt[$e.slug]; if ((ConvertTo-Json @(, $L.e[$i][1]) -Compress -Depth 4) -ne (ConvertTo-Json @(, $pats) -Compress -Depth 4)) { $L.e[$i] = @([string]$e.slug, $pats); $nSet++ }
    continue
  }
  $ins.Add(@([string]$e.slug, $pats))
}
$nY = 0
foreach ($e in @($A.entries)) {
  if ($e.type -ne 'event' -or -not $e.dates -or $null -ne $L.y.PSObject.Properties[$e.slug]) { continue }
  $r = EncYears $e.dates; if (-not $r) { continue }
  $L.y | Add-Member -NotePropertyName $e.slug -NotePropertyValue @([int]$r[0], [int]$r[1], 'e'); $nY++
}
foreach ($x in @($A.fixes | Where-Object { $_ })) {   # a corrected date: the event's years in y follow
  if ($null -eq $L.y.PSObject.Properties[[string]$x[0]]) { continue }
  $d = [regex]::Match($text, '(?m)^  \{slug:"' + [regex]::Escape([string]$x[0]) + '"[^\n]*?,dates:"((?:[^"\\]|\\.)*)"'); if (-not $d.Success) { continue }
  $r = EncYears $d.Groups[1].Value; $cur = $L.y.([string]$x[0]); if (-not $r -or ([int]$cur[0] -eq [int]$r[0] -and [int]$cur[1] -eq [int]$r[1])) { continue }
  $L.y.([string]$x[0]) = @([int]$r[0], [int]$r[1], [string]$cur[2]); $nY++
}
$nPat = 0   # "patterns": another name for an existing entry ([slug, text, mode]: "Akrotiri" for Akrotiri (prehistoric city))
foreach ($x in @($A.patterns | Where-Object { $_ })) {
  $s = [string]$x[0]
  if (-not $rowAt.ContainsKey($s)) {   # an existing entry that never had a row (the speeches' entries of 24-25 Oct 2026)
    $ln = [regex]::Match($text, '(?m)^  \{slug:"' + [regex]::Escape($s) + '"[^\n]*'); if (-not $ln.Success) { Write-Warning "patterns: no entry $s"; continue }
    [void](EncRx ([string]$x[1]) ([int]$x[2]))
    $nr = $null; foreach ($q in $ins) { if ([string]$q[0] -eq $s) { $nr = $q } }
    if ($nr) { if (@($nr[1] | Where-Object { [string]$_[0] -ceq [string]$x[1] }).Count) { continue }; $ins[$ins.IndexOf($nr)] = @($s, @(@($nr[1]) + , @([string]$x[1], [int]$x[2]))) }
    else {
      $ins.Add(@($s, @(, @([string]$x[1], [int]$x[2]))))
      $d = [regex]::Match($ln.Value, ',type:"event"[^\n]*?,dates:"((?:[^"\\]|\\.)*)"')
      if ($d.Success -and $null -eq $L.y.PSObject.Properties[$s]) { $r = EncYears $d.Groups[1].Value; if ($r) { $L.y | Add-Member -NotePropertyName $s -NotePropertyValue @([int]$r[0], [int]$r[1], 'e'); $nY++ } }
    }
    $nPat++; continue
  }
  $i = $rowAt[[string]$x[0]]; $old = @($L.e[$i][1])
  if (@($old | Where-Object { [string]$_[0] -ceq [string]$x[1] }).Count) { continue }
  [void](EncRx ([string]$x[1]) ([int]$x[2]))
  $L.e[$i] = @([string]$x[0], @($old + , @([string]$x[1], [int]$x[2]))); $nPat++
}
$nDrop = 0   # "drop": a name taken out of an entry's row ([slug, text, mode]); a rebuilt links file writes it again from aka
foreach ($x in @($A.drop | Where-Object { $_ })) {
  $s = [string]$x[0]; if (-not $rowAt.ContainsKey($s)) { Write-Warning "drop: no row for $s"; continue }
  $i = $rowAt[$s]; $old = @($L.e[$i][1])
  $keep = @($old | Where-Object { -not ([string]$_[0] -ceq [string]$x[1] -and [int]$_[1] -eq [int]$x[2]) })
  if ($keep.Count -eq $old.Count) { continue }
  if (-not $keep.Count) { throw "drop: it would leave $s without a name" }
  $L.e[$i] = @($s, @($keep | ForEach-Object { , @([string]$_[0], [int]$_[1]) })); $nDrop++
}
if ($ins.Count) {
  $rows = New-Object Collections.Generic.List[object]; foreach ($r in $L.e) { $rows.Add($r) }
  if ($null -ne $L.PSObject.Properties['fs']) {
    $fs = [int]$L.fs; $k = $ins.Count; $rows.InsertRange($fs, $ins)
    foreach ($p in $L.byEmpire.PSObject.Properties) { $p.Value = @(@($p.Value) | ForEach-Object { if ([int]$_ -ge $fs) { [int]$_ + $k } else { [int]$_ } }) }
    $L.fs = $fs + $k
  } else { $rows.AddRange($ins) }
  $L.e = $rows.ToArray()
}
$nForm = 0; $nFirst = 0   # "forms": a profile-only row after fs, first in byEmpire of each of its profiles
foreach ($x in @($A.forms | Where-Object { $_ })) {
  if ($null -eq $L.PSObject.Properties['fs']) { throw 'forms need the profile-only rows (ENC_LINKS.fs)' }
  [void](EncRx ([string]$x[1]) ([int]$x[2])); $ix = -1
  for ($i = [int]$L.fs; $i -lt $L.e.Count; $i++) {
    $r = $L.e[$i]; if ([string]$r[0] -eq [string]$x[0] -and @($r[1]).Count -eq 1 -and [string]$r[1][0][0] -ceq [string]$x[1] -and [int]$r[1][0][1] -eq [int]$x[2]) { $ix = $i; break }
  }
  if ($ix -lt 0) { $L.e = @($L.e) + , @([string]$x[0], @(, @([string]$x[1], [int]$x[2]))); $ix = $L.e.Count - 1; $nForm++ }
  foreach ($p in $x[3].PSObject.Properties) {
    $cur = if ($null -ne $L.byEmpire.PSObject.Properties[$p.Name]) { @($L.byEmpire.($p.Name) | ForEach-Object { [int]$_ }) } else { @() }
    if ($cur -contains $ix) { continue }
    $L.byEmpire | Add-Member -NotePropertyName $p.Name -NotePropertyValue @(@($ix) + $cur) -Force; $nFirst++
  }
}
$nEx = 0   # "exclude": [slug, profile]: that profile's page never links the entry (ENC_LINKS.ex, which generator.html and the scans honour)
foreach ($x in @($A.exclude | Where-Object { $_ })) {
  $s = [string]$x[0]; $p = [string]$x[1]
  if ($null -eq $L.PSObject.Properties['ex']) { $L | Add-Member -NotePropertyName ex -NotePropertyValue ([pscustomobject]@{}) }
  $cur = if ($null -ne $L.ex.PSObject.Properties[$p]) { @($L.ex.$p | ForEach-Object { [string]$_ }) } else { @() }
  if ($cur -contains $s) { continue }
  $L.ex | Add-Member -NotePropertyName $p -NotePropertyValue @($cur + $s) -Force; $nEx++
}
if ($ins.Count -or $nY -or $nPat -or $nSet -or $nForm -or $nFirst -or $nDrop -or $nEx) {
  [IO.File]::WriteAllText("$Repo\encyclopedia-links.js", $el.Substring(0, $i0) + (EncJson $L) + $el.Substring($i1 + 1), $u8)
}
"entries added: $($add.Count)  empty empires lists added: $nEmp  link rows added: $($ins.Count)  rows set back: $nSet  names added to rows: $nPat  names taken out: $nDrop  event years: $nY  forms added: $nForm  forms put first: $nFirst  profiles named: $nMen  exclusions: $nEx  pictures replaced: $nPic  descriptions fixed: $nFix"
