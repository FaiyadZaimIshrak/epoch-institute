# Checks the site as it is on disk (run after build-pages.ps1 and the profile regeneration, before committing):
#   - every internal href/src (/path, without ?query and #fragment) points to a file or folder index that exists,
#     or to a state that state/.htaccess redirects to its profile
#   - every page has one <h1>, a <title>, a meta description of at most 160 characters, a canonical URL equal to its
#     own address, og:title and og:url, and JSON-LD that parses
#   - the stylesheets in css/ are what scripts/split-css.js cuts from shared.css for the pages as they are (needs node)
#   powershell -ExecutionPolicy Bypass -File scripts\check-site.ps1
param([string]$Repo = (Split-Path $PSScriptRoot), [int]$Show = 25)
$ErrorActionPreference = 'Stop'
$SITE = 'https://the-epoch-institute.org'
Add-Type -AssemblyName System.Web.Extensions, System.Web
$JSS = New-Object System.Web.Script.Serialization.JavaScriptSerializer; $JSS.MaxJsonLength = [int]::MaxValue
$U8 = New-Object Text.UTF8Encoding($false)
$clock = [Diagnostics.Stopwatch]::StartNew()

# pages: extensionless files of the site (root pages, the profile folders, encyclopedia/, state/, today-in-history/,
# countries/, centuries/, paths/, speeches/ and the other generated folders) and 404.html
$pages = New-Object System.Collections.Generic.List[object]
foreach ($f in Get-ChildItem $Repo -File) { if (-not $f.Extension -and $f.Name -notmatch '^\.') { $pages.Add($f) } }
foreach ($d in 'empire', 'religion', 'language', 'culture', 'movement', 'encyclopedia', 'encyclopedia\browse', 'encyclopedia\conflicts', 'state', 'state\browse', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'essays', 'articles', 'teachers') {
  foreach ($f in Get-ChildItem (Join-Path $Repo $d) -File -ErrorAction SilentlyContinue) { if (-not $f.Extension) { $pages.Add($f) } }
}
$redir = @{}; foreach ($l in [IO.File]::ReadAllLines("$Repo\state\.htaccess", $U8)) { if ($l -match '^Redirect 301 (\S+) ') { $redir[$Matches[1]] = 1 } }
$exists = @{}
function Exists([string]$path) {
  if ($exists.ContainsKey($path)) { return $exists[$path] }
  $ok = $false
  if ($redir.ContainsKey($path)) { $ok = $true }
  else {
    $rel = [Uri]::UnescapeDataString($path.TrimStart('/')) -replace '/', '\'; $full = Join-Path $Repo $rel
    if ($path -eq '/') { $ok = Test-Path "$Repo\index" -PathType Leaf }
    elseif (Test-Path -LiteralPath $full -PathType Leaf) { $ok = $true }
    elseif (Test-Path -LiteralPath $full -PathType Container) { $ok = Test-Path -LiteralPath (Join-Path $full 'index') -PathType Leaf }
  }
  $exists[$path] = $ok; return $ok
}
$bad = New-Object System.Collections.Generic.List[string]; $nLinks = 0; $nPages = 0; $noLogo = @{}
$rxRef = New-Object Text.RegularExpressions.Regex('(?:href|src)="(/[^"]*)"')
foreach ($f in $pages) {
  $h = [IO.File]::ReadAllText($f.FullName, $U8); $nPages++
  $rel = $f.FullName.Substring($Repo.Length).Replace('\', '/'); $self = if ($rel -eq '/index') { '/' } elseif ($rel.EndsWith('/index')) { $rel.Substring(0, $rel.Length - 5) } else { $rel }
  if ($f.Name -eq '404.html') { $self = $null }
  # links (skip <script> bodies: links built in JavaScript are not real links of the page)
  $html = [regex]::Replace($h, '(?s)<script\b[^>]*>.*?</script>', '')
  foreach ($m in $rxRef.Matches($html)) {
    $u = $m.Groups[1].Value; if ($u.StartsWith('//')) { continue }
    $p = $u -replace '[?#].*$', ''; if (-not $p) { continue }; $nLinks++
    if ($p.StartsWith('/feeds/')) { continue }   # written on the server every morning (.github/workflows/daily-feed.yml)
    if (-not (Exists $p)) { if ($p.StartsWith('/logos/')) { $noLogo[$p] = 1 } else { $bad.Add("$self : broken link $u") } }   # missing emblems are hidden by onerror
  }
  if (-not $self) { continue }
  $h1 = ([regex]::Matches($html, '<h1[\s>]')).Count; if ($h1 -ne 1) { $bad.Add("$self : $h1 <h1>") }
  if ($h -notmatch '<title>[^<]+</title>') { $bad.Add("$self : no <title>") }
  $dm = [regex]::Match($h, '<meta name="description" content="([^"]*)"'); if (-not $dm.Success) { $bad.Add("$self : no description") } elseif ([Web.HttpUtility]::HtmlDecode($dm.Groups[1].Value).Length -gt 160) { $bad.Add("$self : description longer than 160") }
  $cm = [regex]::Match($h, '<link rel="canonical" href="([^"]*)"'); if (-not $cm.Success) { $bad.Add("$self : no canonical") } elseif ($cm.Groups[1].Value -ne ($SITE + $self)) { $bad.Add("$self : canonical is $($cm.Groups[1].Value)") }
  if ($h -notmatch 'property="og:title"' -or $h -notmatch 'property="og:url"') { $bad.Add("$self : og:title/og:url missing") }
  foreach ($j in [regex]::Matches($h, '(?s)<script type="application/ld\+json">(.*?)</script>')) { try { [void]$JSS.DeserializeObject($j.Groups[1].Value) } catch { $bad.Add("$self : JSON-LD does not parse ($($_.Exception.Message.Substring(0, 60)))") } }
}
# the stylesheets in css/ must be what scripts/split-css.js cuts from shared.css and the pages as they are now
$NODE = (Get-Command node -ErrorAction SilentlyContinue).Source; if (-not $NODE) { $NODE = "$env:LOCALAPPDATA\epoch-tools\node\node.exe" }
if (Test-Path $NODE) { $cssOut = & $NODE --max-old-space-size=6000 "$Repo\scripts\split-css.js" --check; if ($LASTEXITCODE) { $bad.Add("css/ : $cssOut") } }
else { $bad.Add('css/ : node not found, so the stylesheets cut from shared.css could not be checked') }
"pages: $nPages  internal links checked: $nLinks  problems: $($bad.Count)  ($([int]$clock.Elapsed.TotalSeconds) s)"
if ($noLogo.Count) { "profiles without an emblem file (image hidden on the page): " + (@($noLogo.Keys | ForEach-Object { [Uri]::UnescapeDataString(($_ -replace '^/logos/(thumbs/)?', '' -replace '\.png$', '')) } | Sort-Object -Unique) -join ', ') }
$bad | Group-Object { $_ -replace '^.*? : ', '' -replace '/[a-z0-9-]+(\?|#|$)', '/*$1' } | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object { "  {0,6} x {1}" -f $_.Count, $_.Name }
$bad | Select-Object -First $Show | ForEach-Object { "  $_" }
if ($bad.Count) { exit 1 }
