# Emblems for the pages: logos/<Name>.png at most 240 px (profile headers show them at 100 px) and
# logos/thumbs/<Name>.png at most 104 px (profile grid 52 px, related/compare lists 28-40 px), made from the full-size
# originals in logos-src/ (kept in git, not deployed; the OG share cards are rendered from them).
# First run moves the originals from logos/ to logos-src/. Re-runnable: add or replace a picture in logos-src/ and run
#   powershell -File scripts\resize-logos.ps1
param([string]$Repo = (Split-Path $PSScriptRoot))
Add-Type -AssemblyName System.Drawing
$src = Join-Path $Repo 'logos-src'; $out = Join-Path $Repo 'logos'; $th = Join-Path $out 'thumbs'
if (-not (Test-Path $src)) {
  New-Item -ItemType Directory $src | Out-Null
  Get-ChildItem $out -File -Filter *.png | Move-Item -Destination $src
}
New-Item -ItemType Directory -Force $out, $th | Out-Null

function Save-Fit([string]$from, [string]$to, [int]$max) {
  $img = [System.Drawing.Image]::FromFile($from)
  try {
    $w = $img.Width; $h = $img.Height
    if ($w -le $max -and $h -le $max) { $img.Dispose(); $img = $null; Copy-Item $from $to -Force; return }
    $k = [Math]::Min($max / $w, $max / $h); $nw = [Math]::Max(1, [int][Math]::Round($w * $k)); $nh = [Math]::Max(1, [int][Math]::Round($h * $k))
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $ia = New-Object System.Drawing.Imaging.ImageAttributes; $ia.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $nw, $nh)), 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $ia)
    $g.Dispose(); $ia.Dispose()
    $bmp.Save($to, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  } finally { if ($img) { $img.Dispose() } }
}

$n = 0; $before = 0; $after = 0; $thumbs = 0
foreach ($f in Get-ChildItem $src -File -Filter *.png) {
  $o = Join-Path $out $f.Name; $t = Join-Path $th $f.Name
  Save-Fit $f.FullName $o 240; Save-Fit $f.FullName $t 104
  $before += $f.Length; $after += (Get-Item $o).Length; $thumbs += (Get-Item $t).Length; $n++
}
"emblems: $n  originals {0:N1} MB -> logos {1:N1} MB, thumbs {2:N1} MB" -f ($before / 1MB), ($after / 1MB), ($thumbs / 1MB)
