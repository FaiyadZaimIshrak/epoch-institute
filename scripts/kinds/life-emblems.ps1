# Emblems of the "great lives" profiles: the person's own portrait (their entry's picture, already chosen and credited
# there), cropped square with the head kept (the crop sits 12% from the top of what is cut), saved as
# logos-src/<Profile Name>.png. Then run scripts/resize-logos.ps1.
#   powershell -File scripts\kinds\life-emblems.ps1 [-Only "Name|slug","Name|slug"]
# Without -Only it makes one for every life profile whose own entry (scripts/kinds/self.tsv) has a picture and whose
# emblem does not exist yet.
param([string[]]$Only)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = Split-Path (Split-Path $PSScriptRoot)
$U8 = New-Object Text.UTF8Encoding($false)
$pairs = @()
if ($Only) { foreach ($o in $Only) { $q = $o -split '\|'; $pairs += , @($q[0], $q[1]) } }
else {
  $sd = [IO.File]::ReadAllText("$repo\shared-data.js", $U8)
  $lives = [regex]::Matches($sd, '\{"name":\s*"([^"]+)",\s*"region":\s*"[^"]+",\s*"kind":\s*"life"') | ForEach-Object { $_.Groups[1].Value }
  $self = @{}; foreach ($l in [IO.File]::ReadAllLines("$repo\scripts\kinds\self.tsv", $U8)) { if ($l -and $l[0] -ne '#') { $c = $l.Split("`t"); if ($c.Count -ge 2) { $self[$c[0]] = $c[1] } } }
  foreach ($n in $lives) { if ($self.ContainsKey($n) -and -not (Test-Path "$repo\logos-src\$n.png")) { $pairs += , @($n, $self[$n]) } }
}
$made = 0
foreach ($p in $pairs) {
  $src = "$repo\images\encyclopedia\$($p[1]).jpg"; if (-not (Test-Path $src)) { Write-Host "no picture: $($p[0])"; continue }
  $img = [Drawing.Image]::FromFile($src)
  $side = [Math]::Min($img.Width, $img.Height); $x = [int](($img.Width - $side) / 2); $y = [int](($img.Height - $side) * 0.12)
  $bmp = New-Object Drawing.Bitmap 480, 480
  $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, (New-Object Drawing.Rectangle 0, 0, 480, 480), (New-Object Drawing.Rectangle $x, $y, $side, $side), [Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $img.Dispose()
  $bmp.Save("$repo\logos-src\$($p[0]).png", [Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $made++
}
Write-Host "life emblems made: $made"
