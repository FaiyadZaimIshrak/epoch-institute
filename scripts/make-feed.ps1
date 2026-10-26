# Writes the daily RSS feed (Today in History + the encyclopedia entry of the day) for the last 14 days, ending today
# (UTC), from data/days/<mm-dd>.json and home-data.js (HOME_ENTRIES: the home page's "entry of the day", day % count).
# Run every morning by .github/workflows/daily-feed.yml (pwsh on Linux), which writes it to public_html/feeds/today.xml
# through cPanel; it also runs in Windows PowerShell 5.1:  powershell -File scripts\make-feed.ps1 -Out feed.xml
# -Date yyyy-MM-dd: the feed as it would be on that day (for testing)
param([string]$Repo = (Split-Path $PSScriptRoot), [string]$Out = 'today.xml', [int]$Days = 14, [string]$Date = '')
$ErrorActionPreference = 'Stop'
$SITE = 'https://the-epoch-institute.org'
$u8 = New-Object Text.UTF8Encoding($false)
$INV = [Globalization.CultureInfo]::InvariantCulture
$MONTHS = 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'
function X([string]$s) { [Security.SecurityElement]::Escape($s) }
function Cdata([string]$s) { '<![CDATA[' + $s.Replace(']]>', ']]]]><![CDATA[>') + ']]>' }
function Abs([string]$html) { $html -replace 'href="/', ('href="' + $SITE + '/') -replace 'src="/', ('src="' + $SITE + '/') }

# the encyclopedia entries of the day, in the home page's order
$homeJs = [IO.File]::ReadAllText((Join-Path $Repo 'home-data.js'), $u8)
$block = [regex]::Match($homeJs, '(?s)var HOME_ENTRIES = \[(.*?)\n\];').Groups[1].Value
$ENTRIES = @(foreach ($m in [regex]::Matches($block, '\{slug:"((?:[^"\\]|\\.)*)",name:"((?:[^"\\]|\\.)*)",type:"[^"]*",dates:"((?:[^"\\]|\\.)*)",img:"((?:[^"\\]|\\.)*)",desc:"((?:[^"\\]|\\.)*)"\}')) {
  [pscustomobject]@{ slug = $m.Groups[1].Value; name = ($m.Groups[2].Value -replace '\\"', '"'); dates = $m.Groups[3].Value; img = $m.Groups[4].Value; desc = ($m.Groups[5].Value -replace '\\"', '"' -replace '\\\\', '\') }
})
if (-not $ENTRIES.Count) { throw 'home-data.js: no HOME_ENTRIES found' }

$now = if ($Date) { [DateTime]::ParseExact($Date, 'yyyy-MM-dd', $INV, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal) } else { [DateTime]::UtcNow }
$today = $now.Date   # (a variable called $today: PowerShell names ignore case, so the parameter is -Date)
$items = New-Object Collections.Generic.List[string]
for ($k = 0; $k -lt $Days; $k++) {
  $d = $today.AddDays(-$k)
  $key = $d.ToString('MM-dd', $INV); $slug = $MONTHS[$d.Month - 1] + '-' + $d.Day; $label = "$($d.Day) $((Get-Culture).TextInfo.ToTitleCase($MONTHS[$d.Month - 1]))"
  $file = Join-Path $Repo "data/days/$key.json"
  if (-not (Test-Path $file)) { continue }
  $day = [IO.File]::ReadAllText($file, $u8) | ConvertFrom-Json
  $evs = @($day.events | Sort-Object { [int]$_.year })
  if (-not $evs.Count) { continue }
  $hero = if ($null -ne $day.hero -and [int]$day.hero -ge 0 -and [int]$day.hero -lt @($day.events).Count) { @($day.events)[[int]$day.hero] } else { $evs[0] }
  $title = "$label in history: $($hero.title)" + $(if ($evs.Count -gt 1) { ", and $($evs.Count - 1) more" } else { '' })
  $pic = if ($day.pic) { [string]@($day.pic)[0] } else { '' }
  $sb = New-Object Text.StringBuilder
  if ($pic) { [void]$sb.Append('<p><img src="' + $SITE + $pic + '" alt="' + (X $hero.title) + '" width="320"></p>') }
  foreach ($e in $evs) {
    $text = if ($e.html) { Abs ([string]$e.html) } else { X ([string]$e.description) }
    [void]$sb.Append('<p><b>' + (X ([string]$e.yearDisplay)) + '</b> &#8212; <b>' + (X ([string]$e.title)) + '.</b> ' + $text + '</p>')
  }
  if ($day.intl) { [void]$sb.Append('<p><i>Today is ' + (X ([string]$day.intl.name)) + '.</i></p>') }
  # the entry of the day: the same as the home page shows on that day (UTC day number modulo the list)
  $dayNo = [int][Math]::Floor(($d - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalDays)
  $en = $ENTRIES[$dayNo % $ENTRIES.Count]
  [void]$sb.Append('<p><b>Entry of the day:</b> <a href="' + $SITE + '/encyclopedia/' + $en.slug + '">' + (X $en.name) + '</a>' + $(if ($en.dates) { ' (' + (X $en.dates) + ')' } else { '' }) + '. ' + (X $en.desc) + '</p>')
  [void]$sb.Append('<p><a href="' + $SITE + '/today-in-history/' + $slug + '">All of ' + $label + ' in history &#8594;</a> &#183; <a href="' + $SITE + '/quiz">Today&#8217;s quiz</a> &#183; <a href="' + $SITE + '/games#first-daily">The Daily Ten</a></p>')
  $pub = $d.AddMinutes(5).ToString('ddd, dd MMM yyyy HH:mm:ss', $INV) + ' +0000'
  $items.Add("<item>`n  <title>$(X $title)</title>`n  <link>$SITE/today-in-history/$slug</link>`n  <guid isPermaLink=`"false`">epoch-today-$($d.ToString('yyyy-MM-dd', $INV))</guid>`n  <pubDate>$pub</pubDate>`n  <description>$(Cdata $sb.ToString())</description>" +
    $(if ($pic) { "`n  <media:content url=`"$SITE$pic`" medium=`"image`"/>" } else { '' }) + "`n</item>")
}
$build = $now.ToString('ddd, dd MMM yyyy HH:mm:ss', $INV) + ' +0000'
$xml = '<?xml version="1.0" encoding="UTF-8"?>' + "`n" +
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">' + "`n<channel>`n" +
  "<title>The Epoch Institute &#8212; Today in History</title>`n<link>$SITE/today-in-history/</link>`n" +
  "<atom:link href=`"$SITE/feeds/today.xml`" rel=`"self`" type=`"application/rss+xml`"/>`n" +
  "<description>What happened on this day in history, with an encyclopedia entry of the day: a new item every morning.</description>`n" +
  "<language>en-gb</language>`n<lastBuildDate>$build</lastBuildDate>`n<ttl>360</ttl>`n" +
  "<image><url>$SITE/logo.png</url><title>The Epoch Institute &#8212; Today in History</title><link>$SITE/today-in-history/</link></image>`n" +
  ($items -join "`n") + "`n</channel>`n</rss>`n"
[IO.File]::WriteAllText($Out, $xml, $u8)
"feed: $($items.Count) days, $([Math]::Round($xml.Length / 1KB)) KB -> $Out"
