# Present-day country outlines for the atlas and the mini maps, projected (Equal Earth, 1000 units wide).
#   powershell -ExecutionPolicy Bypass -File scripts\make-basemap.ps1 -Source <ne_50m_admin_0_countries.geojson>
# Source: Natural Earth 1:50m Admin 0 - Countries (public domain), e.g.
#   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
# Writes data/land.json: {w, h, countries: [{n (ADMIN), iso, ct (continent), sr (subregion), names (other names),
#   sov (sovereign: also on dependencies, so match it last), lab [lng, lat], lp [x, y],
#   bb [x0, y0, x1, y1] of the largest polygon, llbb [lng0, lat0, lng1, lat1] of all of it, r: rings as [x*100, y*100, ...]}]}
# Antarctica is left out. Run scripts\fetch-geo.ps1 and scripts\build-pages.ps1 afterwards.
param([string]$Source, [string]$Repo = (Split-Path $PSScriptRoot))
$ErrorActionPreference = 'Stop'
if (-not $Source -or -not (Test-Path $Source)) { throw 'give -Source <ne_50m_admin_0_countries.geojson>' }
if (-not ('EpochGeo.G' -as [type])) { Add-Type -TypeDefinition ([IO.File]::ReadAllText("$PSScriptRoot\lib\geo.cs")) }
Add-Type -AssemblyName System.Web.Extensions
$jss = New-Object System.Web.Script.Serialization.JavaScriptSerializer; $jss.MaxJsonLength = [int]::MaxValue
$ne = $jss.DeserializeObject([IO.File]::ReadAllText($Source))
function F([double]$v, [int]$d) { [EpochGeo.G]::Num($v, $d) }
$sb = New-Object Text.StringBuilder(4000000)
[void]$sb.Append('{"w":1000,"h":' + (F ([EpochGeo.G]::H) 3) + ',"countries":[')
$nC = 0; $nPts = 0
foreach ($f in $ne['features']) {
  $p = $f['properties']; $name = [string]$p['ADMIN']; if ($name -eq 'Antarctica') { continue }
  $g = $f['geometry']; if ($g['type'] -eq 'Polygon') { $polys = @(, $g['coordinates']) } else { $polys = $g['coordinates'] }
  $rings = New-Object System.Collections.Generic.List[string]; $bestA = -1; $bb = $null
  $l0 = 999; $b0 = 999; $l1 = -999; $b1 = -999
  foreach ($poly in $polys) {
    $ri = 0
    foreach ($ring in $poly) {
      $pts = New-Object 'double[]' (2 * $ring.Count); $k = 0
      foreach ($c in $ring) {
        $lng = [double]$c[0]; $lat = [double]$c[1]
        if ($lng -lt $l0) { $l0 = $lng }; if ($lng -gt $l1) { $l1 = $lng }; if ($lat -lt $b0) { $b0 = $lat }; if ($lat -gt $b1) { $b1 = $lat }
        $xy = [EpochGeo.G]::P($lng, $lat); $pts[$k++] = $xy[0]; $pts[$k++] = $xy[1]
      }
      if ($ri -eq 0) { $a = [EpochGeo.G]::Area($pts); if ($a -gt $bestA) { $bestA = $a; $bb = [EpochGeo.G]::Bbox($pts) } }
      $s = [EpochGeo.G]::Simplify($pts, 0.03)
      if ($s.Length -ge 8) { $rings.Add([EpochGeo.G]::IntJson($s, 100)); $nPts += $s.Length / 2 }
      $ri++
    }
  }
  $lab = [EpochGeo.G]::P([double]$p['LABEL_X'], [double]$p['LABEL_Y'])
  if ($nC) { [void]$sb.Append(',') }
  [void]$sb.Append('{"n":' + $jss.Serialize($name) + ',"iso":' + $jss.Serialize([string]$p['ISO_A3']) + ',"ct":' + $jss.Serialize([string]$p['CONTINENT']) + ',"sr":' + $jss.Serialize([string]$p['SUBREGION']) +
    ',"names":' + $jss.Serialize([string[]]@(@('NAME', 'NAME_LONG', 'NAME_EN', 'GEOUNIT', 'BRK_NAME', 'FORMAL_EN') | ForEach-Object { [string]$p[$_] } | Where-Object { $_ } | Select-Object -Unique)) +
    ',"sov":' + $jss.Serialize([string]$p['SOVEREIGNT']) +
    ',"lab":[' + (F ([double]$p['LABEL_X']) 3) + ',' + (F ([double]$p['LABEL_Y']) 3) + '],"lp":[' + (F $lab[0] 2) + ',' + (F $lab[1] 2) + ']' +
    ',"bb":[' + (($bb | ForEach-Object { F $_ 2 }) -join ',') + '],"llbb":[' + (F $l0 3) + ',' + (F $b0 3) + ',' + (F $l1 3) + ',' + (F $b1 3) + '],"r":[' + ($rings -join ',') + ']}')
  $nC++
}
[void]$sb.Append(']}')
[IO.File]::WriteAllText("$Repo\data\land.json", $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
"countries: $nC, points: $nPts, data\land.json: {0:N0} KB" -f ((Get-Item "$Repo\data\land.json").Length / 1KB)
