# Tells IndexNow (Bing, Yandex and partner engines) which pages the last build changed, so they recrawl them
# sooner. Run AFTER deploying: build-pages.ps1 writes scripts/changed-urls.txt, the deploy publishes the pages,
# then  powershell -File scripts\ping-indexnow.ps1  submits them in batches. Harmless to run twice.
$ErrorActionPreference = 'Stop'
$key = '7887eeb120e9bc53cc20304b26431942'   # proven by https://the-epoch-institute.org/<key>.txt (committed at the repo root)
$list = "$PSScriptRoot\changed-urls.txt"
if (-not (Test-Path $list)) { 'no changed-urls.txt: run scripts/build-pages.ps1 first'; exit }
$urls = @([IO.File]::ReadAllLines($list) | Where-Object { $_ -like 'https://the-epoch-institute.org/*' })
if (-not $urls.Count) { 'nothing changed in the last build'; exit }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
for ($i = 0; $i -lt $urls.Count; $i += 9000) {
  $batch = $urls[$i..([Math]::Min($i + 8999, $urls.Count - 1))]
  $body = (@{ host = 'the-epoch-institute.org'; key = $key; keyLocation = "https://the-epoch-institute.org/$key.txt"; urlList = @($batch) } | ConvertTo-Json -Depth 3)
  $r = Invoke-WebRequest -Uri 'https://api.indexnow.org/indexnow' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
  "submitted $(@($batch).Count) URLs: HTTP $($r.StatusCode)"
}
