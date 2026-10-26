# Saves the community articles approved in the Apps Script (EPOCH_API_URL ?action=confirmed_articles) to
# data/community/articles.json, the snapshot build-pages.ps1 turns into /articles/<slug> pages, so a build never
# depends on the network. Only the title, author, date (ts, ms) and paragraphs are kept: never contact details.
# Run it after approving an article, then build. -Check prints what the snapshot would change and writes nothing.
param([string]$Repo = (Split-Path $PSScriptRoot), [switch]$Check)
$ErrorActionPreference = 'Stop'; $U8 = New-Object Text.UTF8Encoding($false)
$sd = [IO.File]::ReadAllText("$Repo\shared-data.js", $U8)
$api = [regex]::Match($sd, "EPOCH_API_URL\s*=\s*'([^']+)'").Groups[1].Value
if (-not $api) { throw 'EPOCH_API_URL not found in shared-data.js' }
# the script answers in JSONP (it serves the browsers' jsonp()), so the wrapper is cut away
$r = Invoke-WebRequest "$api`?action=confirmed_articles&callback=cb" -UseBasicParsing -TimeoutSec 90
$txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
$a = $txt.IndexOf('('); $b = $txt.LastIndexOf(')'); if ($a -lt 0 -or $b -lt $a) { throw "not a JSONP answer: $($txt.Substring(0, [Math]::Min(200, $txt.Length)))" }
$list = @($txt.Substring($a + 1, $b - $a - 1) | ConvertFrom-Json)
$out = New-Object Collections.Generic.List[object]
foreach ($x in $list) {
  if (-not $x.title -or -not $x.content) { continue }
  $out.Add([ordered]@{ title = [string]$x.title; author = [string]$x.author; ts = [long]$x.ts; content = @($x.content | ForEach-Object { [string]$_ } | Where-Object { $_.Trim() }) })
}
$json = '[' + (($out | ForEach-Object { "`n  " + (ConvertTo-Json $_ -Compress -Depth 4) }) -join ',') + "`n]`n"
# ConvertTo-Json (PowerShell 5.1) writes < > & ' as unicode escapes; keep them readable, they are plain JSON text
foreach ($e in @(@('3c', '<'), @('3e', '>'), @('26', '&'), @('27', "'"))) { $json = $json.Replace('\' + 'u00' + $e[0], $e[1]) }
$file = "$Repo\data\community\articles.json"
$old = if (Test-Path $file) { [IO.File]::ReadAllText($file, $U8) } else { '' }
"articles approved: $($out.Count)" + $(if ($old -eq $json) { ' (snapshot unchanged)' } else { ' (snapshot changes)' })
if ($Check -or $old -eq $json) { return }
New-Item -ItemType Directory -Force (Split-Path $file) | Out-Null
[IO.File]::WriteAllText($file, $json, $U8)
"written: data/community/articles.json"
