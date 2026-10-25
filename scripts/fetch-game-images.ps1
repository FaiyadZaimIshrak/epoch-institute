# Larger pictures for the games: the Picture Puzzle and Guess the Year show a picture big, and the encyclopedia's
# thumbnails are 320 px wide. For every picture in scripts/game-pictures.tsv that a puzzle uses, and every event or
# work whose dates are precise enough for Guess the Year, this downloads the same Wikimedia Commons file at 800 px
# into images/games/<slug>.jpg (the entry's credit applies unchanged). Existing files are kept unless -Refresh.
#   powershell -File scripts\fetch-game-images.ps1 [-Refresh]
param([switch]$Refresh)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web.Extensions
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = Split-Path $PSScriptRoot -Parent
$J = New-Object Web.Script.Serialization.JavaScriptSerializer
$UA = 'EpochInstituteBuild/1.0 (https://the-epoch-institute.org; game pictures from Wikimedia Commons)'
$out = Join-Path $Repo 'images\games'; if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$want = @{}
foreach ($l in [IO.File]::ReadAllLines((Join-Path $PSScriptRoot 'game-pictures.tsv'), [Text.Encoding]::UTF8)) { if ($l -and -not $l.StartsWith('#')) { $c = $l.Split("`t"); $want[$c[0]] = [bool]$c[1] } }
# precise dates: one year, or a range of at most 25 years (no centuries)
function Tight([string]$d) {
  if (-not $d -or $d -match '(?i)century|millenni') { return $false }
  $ys = @([regex]::Matches($d, '\d{1,4}') | ForEach-Object { [int]$_.Value }); if (-not $ys.Count) { return $false }
  return (($ys | Measure-Object -Maximum).Maximum - ($ys | Measure-Object -Minimum).Minimum) -le 25
}
$jobs = New-Object Collections.Generic.List[object]
foreach ($line in [IO.File]::ReadLines((Join-Path $Repo 'encyclopedia-data.js'), [Text.Encoding]::UTF8)) {
  $m = [regex]::Match($line, '^  \{slug:"([^"]+)",name:"[^"]+",type:"([^"]+)"'); if (-not $m.Success -or -not $want.ContainsKey($m.Groups[1].Value)) { continue }
  $slug = $m.Groups[1].Value; $type = $m.Groups[2].Value; $dates = [regex]::Match($line, ',dates:"([^"]*)"').Groups[1].Value
  $src = [regex]::Match($line, 'source:"([^"]+)"').Groups[1].Value
  if ($want[$slug] -or (@('event', 'work') -contains $type -and (Tight $dates))) { $jobs.Add(@($slug, $src)) }
}
"pictures to fetch: $($jobs.Count)"
$n = 0; $skip = 0; $fail = 0
foreach ($jb in $jobs) {
  $file = Join-Path $out ($jb[0] + '.jpg')
  if ((Test-Path $file) -and -not $Refresh) { $skip++; continue }
  try {
    $name = [Uri]::UnescapeDataString(($jb[1] -split '/wiki/')[-1])
    $wc = New-Object Net.WebClient; $wc.Headers.Add('User-Agent', $UA); $wc.Encoding = [Text.Encoding]::UTF8
    $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=' + [Uri]::EscapeDataString($name)
    $d = $J.DeserializeObject($wc.DownloadString($api))
    $page = @($d['query']['pages'].Values)[0]; $u = [string]$page['imageinfo'][0]['thumburl']; if (-not $u) { $u = [string]$page['imageinfo'][0]['url'] }
    Start-Sleep -Milliseconds 700
    $wc2 = New-Object Net.WebClient; $wc2.Headers.Add('User-Agent', $UA); $bytes = $wc2.DownloadData($u)
    $ms = New-Object IO.MemoryStream(, $bytes); $img = [Drawing.Image]::FromStream($ms)
    $w = [Math]::Min(800, $img.Width); $h = [int][Math]::Round($img.Height * $w / $img.Width)
    $bmp = New-Object Drawing.Bitmap($w, $h); $g = [Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'; $g.Clear([Drawing.Color]::White); $g.DrawImage($img, 0, 0, $w, $h); $g.Dispose(); $img.Dispose()
    $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object Drawing.Imaging.EncoderParameters(1); $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]80)
    $bmp.Save($file, $enc, $ep); $bmp.Dispose(); $n++
    Start-Sleep -Milliseconds 700
  } catch { "  failed: $($jb[0]) ($($_.Exception.Message))"; $fail++ }
}
"fetched $n, kept $skip, failed $fail"
