# Regenerates the 394 empire/* profile pages from generator.html without opening a browser.
# Runs generator.html's buildPage() in headless Edge (slices of 40 pages: one page for all crashes the renderer)
# behind its own local server, and writes each page keeping the existing file's BOM and CRLF line endings, so an
# unchanged profile produces a byte-identical file. Usage:  powershell -File scripts\regen-profiles.ps1
param([int]$Port = 8766)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edge)) { throw 'Microsoft Edge not found' }

# the harness: loads generator.html in a frame and prints a slice of pages as base64 lines
$work = Join-Path $env:TEMP 'epoch-regen'
New-Item -ItemType Directory -Force $work | Out-Null
@'
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body><pre id="out">RUNNING</pre>
<iframe id="f" src="/generator.html" style="display:none"></iframe>
<script>
document.getElementById('f').onload = function () {
  var w = this.contentWindow, lines = [];
  try {
    var emps = w.eval('EMPIRES');
    var qa = /[?&]a=(\d+)/.exec(location.search), qb = /[?&]b=(\d+)/.exec(location.search);
    for (var i = qa ? +qa[1] : 0; i < Math.min(emps.length, qb ? +qb[1] : 100000); i++) {
      var html = w.buildPage(emps[i]);
      var b64 = btoa(unescape(encodeURIComponent(html)));
      lines.push(w.profileUrl(emps[i]).slice(1) + '\t' + b64);
    }
    document.getElementById('out').textContent = 'DONE\n' + lines.join('\n');
  } catch (e) { document.getElementById('out').textContent = 'ERROR ' + e; }
};
</script></body></html>
'@ | Set-Content -Encoding utf8 (Join-Path $work 'genpages.html')

# a minimal static server (extensionless files -> text/html, like the site's .htaccess); /__x maps to the harness dir
$server = Start-Job { param($root, $test, $port)
  $types = @{ '.js' = 'application/javascript'; '.css' = 'text/css'; '.json' = 'application/json'; '.html' = 'text/html'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.woff2' = 'font/woff2' }
  $l = New-Object Net.HttpListener
  $l.Prefixes.Add("http://localhost:$port/")
  $l.Start()
  while ($l.IsListening) {
    $ctx = $l.GetContext()
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      $file = if ($path.StartsWith('/__')) { Join-Path $test $path.Substring(3) } else { Join-Path $root $path.TrimStart('/') }
      $res = $ctx.Response
      if (Test-Path $file -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($file)
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'text/html; charset=utf-8' }
        $bytes = [IO.File]::ReadAllBytes($file)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else { $res.StatusCode = 404 }
      $res.Close()
    } catch { try { $ctx.Response.Abort() } catch {} }
  }
} -ArgumentList $repo, $work, $Port

try {
  # wait for the server to answer
  $up = $false
  for ($i = 0; $i -lt 40 -and -not $up; $i++) { Start-Sleep -Milliseconds 250; try { [void](Invoke-WebRequest "http://localhost:$Port/generator.html" -UseBasicParsing -TimeoutSec 2); $up = $true } catch {} }
  if (-not $up) { throw "local server on :$Port did not start" }

  # slices of 40 pages, each in a job with a time limit, so a crashed renderer is killed and reported, not waited on
  $parts = New-Object Collections.Generic.List[string]
  for ($s = 0; $s -lt 2000; $s += 40) {
    $j = Start-Job { param($edge, $url) & $edge --headless=new --disable-gpu --no-first-run --disable-sync --user-data-dir="$env:TEMP\edgeregen" --virtual-time-budget=120000 --dump-dom $url 2>$null | Out-String } -ArgumentList $edge, "http://localhost:$Port/__genpages.html?a=$s&b=$($s + 40)"
    if (-not (Wait-Job $j -Timeout 300)) { Stop-Job $j; Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | Where-Object { $_.CommandLine -match 'edgeregen' -and $_.CommandLine -notmatch '--type=' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; throw "generation slice $s hung" }
    $dom = Receive-Job $j; Remove-Job $j
    if ($dom -notmatch '<pre id="out">DONE') { throw ("generation slice $s failed: " + $dom.Substring(0, [Math]::Min(500, $dom.Length))) }
    $part = [regex]::Match($dom, '(?s)<pre id="out">DONE\s*(.*?)</pre>').Groups[1].Value.Trim()
    if (-not $part) { break }
    $parts.Add($part); Write-Host "generated slice $s"
  }

  # write the pages, keeping each existing file's BOM and line endings
  $body = $parts -join "`n"
  $n = 0; $written = 0
  foreach ($line in ($body -split "`n")) {
    $line = $line.Trim(); if (-not $line) { continue }
    $slug, $b64 = $line -split "`t", 2
    if (-not $b64) { $slug, $b64 = $line -split '\s+', 2 }
    $html = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
    $path = Join-Path $repo ($slug -replace '/', '\')
    New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
    $bom = $true; $crlf = $true
    if (Test-Path $path) {
      $old = [IO.File]::ReadAllBytes($path)
      $bom = $old.Length -ge 3 -and $old[0] -eq 0xEF -and $old[1] -eq 0xBB -and $old[2] -eq 0xBF
      $crlf = [Text.Encoding]::UTF8.GetString($old).Contains("`r`n")
    }
    $html = $html -replace "`r`n", "`n"; if ($crlf) { $html = $html -replace "`n", "`r`n" }
    $bytes = (New-Object Text.UTF8Encoding($bom)).GetPreamble() + [Text.Encoding]::UTF8.GetBytes($html)
    if (-not (Test-Path $path) -or [Convert]::ToBase64String([IO.File]::ReadAllBytes($path)) -ne [Convert]::ToBase64String($bytes)) { [IO.File]::WriteAllBytes($path, $bytes); $written++ }
    $n++
  }
  "pages generated: $n  written (changed): $written"
  if ($n -lt 300) { throw "only $n pages came back: check generator.html" }
} finally {
  Stop-Job $server -ErrorAction SilentlyContinue; Remove-Job $server -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | Where-Object { $_.CommandLine -match 'edgeregen' -and $_.CommandLine -notmatch '--type=' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
}
