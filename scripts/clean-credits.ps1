# Cleans the picture credits' author field in place (idempotent): encyclopedia-data.js and empire-section-images.js
# (artist:"..."), data/states/*.json ("cr":{"a":"..."}). Wikimedia's Artist field arrives as HTML flattened to text:
# entities escaped once too often ("W. &amp; D. Downey" showed as "&amp;amp;"), "(talk)" links, "User:" prefixes, file
# names of the pictures a derivative work was made from, URLs and doubled text ("Unknown authorUnknown author"). Only the
# author string changes; licence and source stay. Run it after every enc-merge (it starts again from the originals).
#   -Review <file>  writes every change as before<TAB>after for checking by eye
#   -Check          reports what would change and writes nothing
param([string]$Repo = (Split-Path $PSScriptRoot), [string]$Review = '', [switch]$Check)
$ErrorActionPreference = 'Stop'
$U8 = New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Web

function CleanAuthor([string]$s) {
  if (-not $s) { return $s }
  $a = $s
  for ($k = 0; $k -lt 3; $k++) { $d = [Web.HttpUtility]::HtmlDecode($a); if ($d -eq $a) { break }; $a = $d }
  $a = $a -creplace "[\s$([char]0xA0)]+", ' '   # no-break spaces by char code: this file stays ASCII
  # wiki template markup nobody filled in names no one: File:Georgius_Agricola.jpg's Artist field is "{{creator:|Year = }}"
  $a = $a -replace '\{\{[^{}]*\}\}', ''
  if (-not $a.Trim() -and $s -match '\{\{') { return 'Unknown author' }
  # "(talk)", "(talk, middle dot, contribs)", "(talk, middle dot, contrib..." cut short
  $a = $a -replace "\s*\((?:talk|discussion|disc|contribs?)(?:\s*[$([char]0xB7)|]\s*contribs?\.?)?[^)]{0,12}(?:\)|\.\.\.|$)", ''
  # Commons' own wording when the uploader is taken to be the author
  $a = $a -replace '^No machine-readable author provided\.\s*(.+?)\s+assumed\s*\(based on copyright claims\)\.?$', '$1'
  # derivative works: "Map.svg: Author derivative work: Other" -> "Author; derivative work by Other"
  $m = [regex]::Match($a, '(?i)^(?:(?:File|Image):\s*)?(?:[^:]{1,120}?\.(?:svg|png|jpe?g|gif|tiff?|webp)\s*:\s*)?(?<o>.*?)\s*[,;]?\s*\b(?:[Dd]erivative work|[Dd]erivative)\s*:?\s*(?:by\s+)?(?<d>.+)$')
  if ($m.Success) { $o = $m.Groups['o'].Value.Trim(); $a = $(if ($o) { "$o; derivative work by " } else { '' }) + $m.Groups['d'].Value.Trim() }
  # "(Hdamm at de.wikipedia.org)": where a picture was first uploaded, not who made it
  $a = $a -replace '\s*\([^()]*wikipedia[^()]*\)', ''
  # a Flickr address stands for its photographer: "https://www.flickr.com/photos/name/" -> "name (Flickr)"
  $a = $a -replace 'https?://(?:www\.)?flickr\.com/(?:photos|people)/([^/\s]+)/?\S*', '$1 (Flickr)'
  # a picture's file name before its author ("Darbarscene.jpg: Cordanrad"), also inside a list of several
  $a = [regex]::Replace($a, '(?i)(?:(?<=^)|(?<=;\s)|(?<=\s))(?:(?:File|Image):\s*)?[^:;]{1,120}?\.(?:svg|png|jpe?g|gif|tiff?|webp)\s*:\s*', '')
  # wiki user prefixes: "en:User:Markh" -> "Markh"
  $a = $a -replace '(?<![\w])(?:[a-z]{2,3}:)?User:\s*', ''
  $a = $a -replace '~commonswiki', ''
  # bare URLs inside a name ("Yves Picq http://veton.picq.fr")
  $u = $a -replace '\s*\(?https?://\S+\)?', ''
  if ($u.Trim()) { $a = $u } else { $a = ($a -replace '^\s*https?://(?:www\.)?([^/\s]+).*$', '$1') }
  $a = $a.Trim(' ', ',', ';', ':', '/', '-', "'", '"')
  $a = $a -replace '[\s\p{So}]+$', ''
  # doubled text: "Unknown authorUnknown author", "UnknownUnknown"
  if ($a.Length -ge 6 -and $a.Length % 2 -eq 0) { $h = $a.Length / 2; if ($a.Substring(0, $h) -ceq $a.Substring($h)) { $a = $a.Substring(0, $h) } }
  $a = $a -replace '\b(Unknown author|Unknown)\s*\1\b', '$1'
  # "*Original work: X" bullets, later steps of a derivative chain, names repeated
  $a = ($a -replace '\s*\*\s*', '; ') -replace '(?i)\bderivative work\s*:\s*(?:by\s+)?', 'derivative work by '
  $seen = @{}; $a = (@($a -split '\s*;\s*' | Where-Object { $k = $_.ToLowerInvariant(); if (-not $_ -or $seen[$k]) { $false } else { $seen[$k] = 1; $true } }) -join '; ')
  $a = $a -replace '\s{2,}', ' '
  # template boilerplate that names no one; then at most 140 characters, cut where a part or sentence ends (the
  # source link carries the full attribution)
  $a = (@($a -split '\s*;\s*' | Where-Object { $_ -and $_ -notmatch '^(?:own work|the svg code is valid\.?|public domain(?: image)?|details on google art project|camera location.*|view this and other.*)$' }) -join '; ')
  if ($a.Length -gt 140) {
    $cut = $a.LastIndexOf('; ', 140); if ($cut -lt 40) { $cut = $a.LastIndexOf('. ', 140); if ($cut -ge 40) { $cut++ } }
    if ($cut -lt 40) { $cut = $a.LastIndexOf(' ', 130) }
    $a = $a.Substring(0, $cut).TrimEnd(' ', ';', ',', ':') + " $([char]0x2026)"
  }
  $a = $a.Trim(' ', ',', ';', ':', '/', '-', "'", '"')
  if (-not $a) { return $s }
  return $a
}

# a JSON string literal the way the data files write them: quotes, backslashes and control characters escaped, the rest raw
function JStr([string]$s) {
  $b = New-Object Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    switch ($ch) { '"' { [void]$b.Append('\"') } '\' { [void]$b.Append('\\') } "`n" { [void]$b.Append('\n') } "`r" { [void]$b.Append('\r') } "`t" { [void]$b.Append('\t') }
      default { if ([int]$ch -lt 32) { [void]$b.Append(('\u{0:x4}' -f [int]$ch)) } else { [void]$b.Append($ch) } } }
  }
  '"' + $b.ToString() + '"'
}
function JParse([string]$lit) { ConvertFrom-Json ('[' + $lit + ']') | Select-Object -First 1 }

$script:changes = New-Object System.Collections.Generic.List[string]
function FixText([string]$text, [string]$pattern, [string]$where) {
  [regex]::Replace($text, $pattern, {
    param($mm)
    $old = JParse $mm.Groups['v'].Value; $src = JParse $mm.Groups['s'].Value
    $o = $script:Over[(FileTitle $src)]; $new = CleanAuthor $(if ($o) { $o } else { $old })
    if ($new -ceq $old) { return $mm.Value }
    $script:changes.Add("$where`t$old`t$new")
    return $mm.Groups['k'].Value + (JStr $new) + $mm.Groups['r'].Value + $mm.Groups['s'].Value
  })
}

# credit-overrides.tsv: File:<title> TAB the author as Commons gives it in full, for credits cut short at import
function FileTitle([string]$src) { if ($src -match '/wiki/(File:[^?#]+)') { [Uri]::UnescapeDataString($Matches[1]).Replace('_', ' ') } else { '' } }
$script:Over = @{}; $ovf = "$PSScriptRoot\credit-overrides.tsv"
if (Test-Path $ovf) { foreach ($l in [IO.File]::ReadAllLines($ovf, $U8)) { if ($l -and -not $l.StartsWith('#')) { $c = $l -split "`t"; if ($c.Count -ge 2) { $script:Over[$c[0]] = $c[1] } } } }
$STR = '"(?:[^"\\]|\\.)*"'
$files = @(
  @{ f = "$Repo\encyclopedia-data.js"; p = "(?<k>\bartist:)(?<v>$STR)(?<r>,licence:$STR,source:)(?<s>$STR)" },
  @{ f = "$Repo\empire-section-images.js"; p = "(?<k>\bartist:)(?<v>$STR)(?<r>,licence:$STR,source:)(?<s>$STR)" }
) + @(Get-ChildItem "$Repo\data\states" -Filter *.json | ForEach-Object { @{ f = $_.FullName; p = "(?<k>""cr"":\{""a"":)(?<v>$STR)(?<r>,""l"":$STR,""s"":)(?<s>$STR)" } })
$nfiles = 0
foreach ($x in $files) {
  $t = [IO.File]::ReadAllText($x.f, $U8); $before = $script:changes.Count
  $n = FixText $t $x.p ([IO.Path]::GetFileName($x.f))
  if ($script:changes.Count -gt $before -and -not $Check) { [IO.File]::WriteAllText($x.f, $n, $U8); $nfiles++ }
}
if ($Review) { [IO.File]::WriteAllLines($Review, [string[]]$script:changes, $U8) }
"credits changed: $($script:changes.Count) in $nfiles files$(if ($Check) { ' (check only: nothing written)' })"
