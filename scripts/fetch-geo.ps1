# Places every state of the register on the map: data/geo.json {id: [lat, lng, source]}.
#   powershell -ExecutionPolicy Bypass -File scripts\fetch-geo.ps1        (after scripts\make-basemap.ps1)
# Sources, in order of preference (Wikidata, CC0, via its SPARQL service; ids from scripts/geo-qids.tsv):
#   0  the capital (P36) whose name is the first capital in the register   1  the state's own coordinates (P625)
#   2  another capital (P36)   3  a place named like the register's capital, inside the present-day country: a capital
#      found above for another state, else the best-known such place (most Wikipedia language editions)
#   4  set by hand (scripts/geo-manual.tsv)   9  approximate: the centre of the first present-day country (data/land.json)
# A point more than 5 degrees outside all of a state's present-day countries is not used.
param([string]$Repo = (Split-Path $PSScriptRoot), [int]$Batch = 150)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web.Extensions, System.Web
$jss = New-Object System.Web.Script.Serialization.JavaScriptSerializer; $jss.MaxJsonLength = [int]::MaxValue
$U8 = New-Object Text.UTF8Encoding($false)
$UA = 'EpochInstituteAtlas/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)'
function Sparql([string]$q) {
  for ($try = 1; $try -le 4; $try++) {
    try {
      $r = Invoke-WebRequest 'https://query.wikidata.org/sparql' -Method Post -UseBasicParsing -TimeoutSec 120 -UserAgent $UA `
        -Headers @{ Accept = 'application/sparql-results+json' } -ContentType 'application/x-www-form-urlencoded; charset=utf-8' `
        -Body ('query=' + [Uri]::EscapeDataString($q))
      $txt = $U8.GetString($r.RawContentStream.ToArray())
      return $jss.DeserializeObject($txt)['results']['bindings']
    } catch { Write-Host "  retry $try ($($_.Exception.Message))"; Start-Sleep -Seconds (5 * $try) }
  }
  throw 'Wikidata query failed'
}
function Fold([string]$s) { $d = $s.Normalize([Text.NormalizationForm]::FormD); (-join ($d.ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne 'NonSpacingMark' })).ToLowerInvariant().Trim() }
function Pt([string]$wkt) { $m = [regex]::Match($wkt, 'Point\(([-\d.eE]+) ([-\d.eE]+)\)'); if ($m.Success) { @([double]$m.Groups[2].Value, [double]$m.Groups[1].Value) } else { $null } }   # -> lat, lng
function FirstCapital([string]$c) { if (-not $c) { return '' }; (($c -split '[,;/]')[0] -replace '\s*\([^)]*\)', '').Trim() }

$pol = $jss.DeserializeObject([IO.File]::ReadAllText("$Repo\data\polities.json", $U8))
$land = $jss.DeserializeObject([IO.File]::ReadAllText("$Repo\data\land.json", $U8))
# a country's own name first, then its other names, its sovereign's name last (dependencies carry it too)
$CTRY = @{}
foreach ($c in $land['countries']) { $CTRY[[string]$c['n']] = $c }
foreach ($c in $land['countries']) { foreach ($nm in @($c['names'])) { if ($nm -and -not $CTRY.ContainsKey([string]$nm)) { $CTRY[[string]$nm] = $c } } }
foreach ($c in $land['countries']) { $nm = [string]$c['sov']; if ($nm -and -not $CTRY.ContainsKey($nm)) { $CTRY[$nm] = $c } }
$QID = @{}; foreach ($l in [IO.File]::ReadAllLines("$PSScriptRoot\geo-qids.tsv", $U8)) { if ($l.StartsWith('#')) { continue }; $p = $l -split "`t"; if ($p.Count -eq 2) { $QID[$p[0]] = $p[1] } }
$NODES = @($pol['nodes'])
# the bounding boxes of a present-day country and of its dependencies (Falklands, Gibraltar ... for the United Kingdom)
$BOXESOF = @{}
foreach ($c in $land['countries']) {
  $keys = @([string]$c['n'], [string]$c['sov']) + @($c['names'] | ForEach-Object { [string]$_ })
  $sovF = $CTRY[[string]$c['sov']]   # a dependency is also filed under every name of its sovereign ("United States" for Guam)
  if ($sovF -and $sovF -ne $c) { $keys += @([string]$sovF['n']) + @($sovF['names'] | ForEach-Object { [string]$_ }) }
  foreach ($k in ($keys | Where-Object { $_ } | Select-Object -Unique)) { if (-not $BOXESOF.ContainsKey($k)) { $BOXESOF[$k] = New-Object System.Collections.Generic.List[object] }; $BOXESOF[$k].Add($c['llbb']) }
}
function Within($n, $pt, [double]$margin) {   # inside (the bounding box of) one of the state's present-day countries or their dependencies
  $mo = @($n['mo'] | Where-Object { $_ }); if (-not $mo.Count) { return $true }
  foreach ($m in $mo) {
    if (-not $BOXESOF.ContainsKey([string]$m)) { return $true }
    foreach ($b in $BOXESOF[[string]$m]) { if ($pt[1] -ge [double]$b[0] - $margin -and $pt[1] -le [double]$b[2] + $margin -and $pt[0] -ge [double]$b[1] - $margin -and $pt[0] -le [double]$b[3] + $margin) { return $true } }
  }
  return $false
}

# 1. coordinates and capitals of the states with a Wikidata id
$byQ = @{}; foreach ($n in $NODES) { $q = $QID[[string]$n['id']]; if ($q) { if (-not $byQ.ContainsKey($q)) { $byQ[$q] = New-Object System.Collections.Generic.List[object] }; $byQ[$q].Add($n) } }
$qs = @($byQ.Keys); $INFO = @{}
for ($i = 0; $i -lt $qs.Count; $i += $Batch) {
  $part = $qs[$i..([Math]::Min($i + $Batch, $qs.Count) - 1)]
  $q = 'SELECT ?item ?coord ?cap ?capLabel ?capCoord WHERE { VALUES ?item { ' + (($part | ForEach-Object { "wd:$_" }) -join ' ') + ' } ' +
       'OPTIONAL { ?item wdt:P625 ?coord. } OPTIONAL { ?item wdt:P36 ?cap. ?cap wdt:P625 ?capCoord. OPTIONAL { ?cap rdfs:label ?capLabel. FILTER(LANG(?capLabel) = "en") } } }'
  foreach ($b in (Sparql $q)) {
    $item = ([string]$b['item']['value']).Split('/')[-1]
    if (-not $INFO.ContainsKey($item)) { $INFO[$item] = @{ own = New-Object System.Collections.Generic.List[object]; caps = New-Object System.Collections.Generic.List[object] } }
    if ($b['coord']) { $pt = Pt ([string]$b['coord']['value']); if ($pt -and -not ($INFO[$item].own | Where-Object { $_[0] -eq $pt[0] -and $_[1] -eq $pt[1] })) { $INFO[$item].own.Add($pt) } }
    if ($b['capCoord']) { $pt = Pt ([string]$b['capCoord']['value']); if ($pt) { $INFO[$item].caps.Add(@($(if ($b['capLabel']) { [string]$b['capLabel']['value'] } else { '' }), $pt)) } }
  }
  Write-Host ("  wikidata {0}/{1}" -f [Math]::Min($i + $Batch, $qs.Count), $qs.Count); Start-Sleep -Milliseconds 400
}
$GEO = @{}; $SRC = @{}; $REJ = New-Object System.Collections.Generic.List[string]
foreach ($n in $NODES) {
  $id = [string]$n['id']; $q = $QID[$id]; if (-not $q -or -not $INFO.ContainsKey($q)) { continue }
  $inf = $INFO[$q]; $want = Fold (FirstCapital ([string]$n['c'])); $pick = $null; $how = -1
  if ($want) { foreach ($c in $inf.caps) { if ((Fold $c[0]) -eq $want -and (Within $n $c[1] 5)) { $pick = $c[1]; $how = 0; break } } }
  if (-not $pick) { foreach ($pt in $inf.own) { if (Within $n $pt 5) { $pick = $pt; $how = 1; break } } }
  if (-not $pick) { foreach ($c in $inf.caps) { if (Within $n $c[1] 5) { $pick = $c[1]; $how = 2; break } } }
  if ($pick) { $GEO[$id] = $pick; $SRC[$id] = $how }
  elseif ($inf.own.Count -or $inf.caps.Count) { $first = if ($inf.own.Count) { $inf.own[0] } else { $inf.caps[0][1] }; $REJ.Add("$id`t$($first[0])`t$($first[1])`t$(@($n['mo']) -join '/')") }
}
Write-Host "from Wikidata ids: $($GEO.Count); points outside the state's present-day countries (not used, listed in scripts\geo-rejected.tsv): $($REJ.Count)"
[IO.File]::WriteAllLines("$PSScriptRoot\geo-rejected.tsv", [string[]](@("# id`tlat`tlng`tpresent-day countries: Wikidata points rejected by fetch-geo.ps1 (review; set by hand in geo-manual.tsv)") + $REJ), $U8)

# 2. the register's capital, looked up by name inside the state's present-day countries
$todo = @($NODES | Where-Object { -not $GEO.ContainsKey([string]$_['id']) -and (FirstCapital ([string]$_['c'])) })
$names = @($todo | ForEach-Object { FirstCapital ([string]$_['c']) } | Sort-Object -Unique)
Write-Host "capital names to look up: $($names.Count) (for $($todo.Count) states)"
$KNOWN = @{}   # capitals met above, by name
foreach ($inf in $INFO.Values) { foreach ($c in $inf.caps) { if ($c[0]) { $k = Fold $c[0]; if (-not $KNOWN.ContainsKey($k)) { $KNOWN[$k] = New-Object System.Collections.Generic.List[object] }; $KNOWN[$k].Add($c[1]) } } }
$PLACES = @{}
for ($i = 0; $i -lt $names.Count; $i += 80) {
  $part = $names[$i..([Math]::Min($i + 80, $names.Count) - 1)]
  $vals = ($part | ForEach-Object { '"' + ($_ -replace '\\', '\\\\' -replace '"', '\"') + '"@en' }) -join ' '
  $q = 'SELECT ?lbl ?coord ?sl WHERE { VALUES ?lbl { ' + $vals + ' } ?item rdfs:label ?lbl; wdt:P625 ?coord. OPTIONAL { ?item wikibase:sitelinks ?sl. } }'
  foreach ($b in (Sparql $q)) {
    $l = [string]$b['lbl']['value']; $pt = Pt ([string]$b['coord']['value']); if (-not $pt) { continue }
    $sl = if ($b['sl']) { [int]$b['sl']['value'] } else { 0 }
    if (-not $PLACES.ContainsKey($l)) { $PLACES[$l] = New-Object System.Collections.Generic.List[object] }; $PLACES[$l].Add(@($sl, $pt))
  }
  Write-Host ("  names {0}/{1}" -f [Math]::Min($i + 80, $names.Count), $names.Count); Start-Sleep -Milliseconds 400
}
$n3 = 0
foreach ($n in $todo) {
  $id = [string]$n['id']; $nm = FirstCapital ([string]$n['c']); if (-not @($n['mo'] | Where-Object { $_ }).Count) { continue }
  $k = Fold $nm
  if ($KNOWN.ContainsKey($k)) { foreach ($pt in $KNOWN[$k]) { if (Within $n $pt 0.5) { $GEO[$id] = $pt; $SRC[$id] = 3; $n3++; break } } }
  if ($GEO.ContainsKey($id) -or -not $PLACES.ContainsKey($nm)) { continue }
  $bestPt = $null; $bestSl = -1
  foreach ($c in $PLACES[$nm]) { if ($c[0] -gt $bestSl -and (Within $n $c[1] 0.5)) { $bestSl = $c[0]; $bestPt = $c[1] } }
  if ($bestPt) { $GEO[$id] = $bestPt; $SRC[$id] = 3; $n3++ }
}
Write-Host "by capital name: $n3"

# 3. set by hand
foreach ($l in [IO.File]::ReadAllLines("$PSScriptRoot\geo-manual.tsv", $U8)) { if ($l.StartsWith('#')) { continue }; $p = $l -split "`t"; if ($p.Count -ge 3) { $GEO[$p[0]] = @([double]$p[1], [double]$p[2]); $SRC[$p[0]] = 4 } }
# 4. approximate: the centre of the first present-day country
$n9 = 0; $none = New-Object System.Collections.Generic.List[string]
foreach ($n in $NODES) {
  $id = [string]$n['id']; if ($GEO.ContainsKey($id)) { continue }
  $c = $null; foreach ($m in @($n['mo'] | Where-Object { $_ })) { if ($CTRY.ContainsKey([string]$m)) { $c = $CTRY[[string]$m]; break } }
  if ($c) { $GEO[$id] = @([double]$c['lab'][1], [double]$c['lab'][0]); $SRC[$id] = 9; $n9++ } else { $none.Add($id) }
}
Write-Host "approximate (country centre): $n9; not placed: $($none.Count) $(($none | Select-Object -First 20) -join ', ')"
$inv = [Globalization.CultureInfo]::InvariantCulture
$out = '{' + (($GEO.Keys | Sort-Object | ForEach-Object { '"' + $_ + '":[' + $GEO[$_][0].ToString('0.###', $inv) + ',' + $GEO[$_][1].ToString('0.###', $inv) + ',' + $SRC[$_] + ']' }) -join ",`n") + "}`n"
[IO.File]::WriteAllText("$Repo\data\geo.json", $out, $U8)
$cnt = @{}; foreach ($v in $SRC.Values) { $cnt[$v] = 1 + [int]$cnt[$v] }
Write-Host ('sources: ' + (($cnt.Keys | Sort-Object | ForEach-Object { "$_=$($cnt[$_])" }) -join ' ') + "; data\geo.json written ($($GEO.Count) states)")
