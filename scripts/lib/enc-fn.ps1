# PowerShell port of ENC_FN (the footer of encyclopedia-links.js; source: scratchpad states/desc/enc2/enc-fn.js) for the
# build scripts. Dot-source it. Keep it in step with ENC_FN (same rules: name groups, years, dated events).
$script:EncL = '\p{L}\p{M}\d'; $script:EncStop = 'Empire|Sultanate|Caliphate|Dynasty|dynasty|Kingdom|Confederation|Khaganate|Khanate|Shogunate|empire'
function EncEsc([string]$s) { [regex]::Replace($s, '[\^\$\\\.\*\+\?\(\)\[\]\{\}\|/]', { param($m) '\' + $m.Value }) }
function EncSrc([string]$t, [int]$mode) {
  if ($mode -eq 1) { $b = if ($t.EndsWith('y')) { (EncEsc $t.Substring(0, $t.Length - 1)) + '(?:y|ies)' } else { EncEsc $t }; return "(?<![$script:EncL])$b(?:s|es)?(?![$script:EncL])" }
  $fc = if ($mode -eq 2) { '[' + $t.Substring(0, 1).ToUpper() + $t.Substring(0, 1).ToLower() + ']' } else { EncEsc $t.Substring(0, 1) }
  $stop = if ($t -match "($script:EncStop)$") { '' } else { "(?!\s+(?:$script:EncStop)\b)" }
  return "(?<![$script:EncL])$fc$(EncEsc $t.Substring(1))(?:'s|s)?(?![$script:EncL])(?!-\p{L})$stop"
}
function EncRx([string]$t, [int]$mode) {
  $o = [Text.RegularExpressions.RegexOptions]::CultureInvariant; if ($mode -eq 1) { $o = $o -bor [Text.RegularExpressions.RegexOptions]::IgnoreCase }
  New-Object Text.RegularExpressions.Regex((EncSrc $t $mode), $o)
}
function EncYears([string]$s) {
  if ($s -notmatch '\d') { return $null }
  $c = [regex]::Match($s, '(\d+)(?:st|nd|rd|th)(?:\s*[–-]\s*(\d+)(?:st|nd|rd|th))?\s+centur(?:y|ies)', 'IgnoreCase')
  if ($c.Success) {
    $a = [int]$c.Groups[1].Value; $b = if ($c.Groups[2].Success) { [int]$c.Groups[2].Value } else { $a }
    if ($s -cmatch '\b(BCE|BC)\b') { return @((-$a * 100), (-($b - 1) * 100 - 1)) } else { return @((($a - 1) * 100 + 1), ($b * 100)) }
  }
  $nums = @([regex]::Matches($s, '(\d{1,4})(?:\s*(BCE|BC|CE|AD)\b)?') | ForEach-Object { @{ n = [int]$_.Groups[1].Value; era = $_.Groups[2].Value } })
  for ($i = 0; $i -lt $nums.Count; $i++) { $era = $nums[$i].era; for ($j = $i + 1; -not $era -and $j -lt $nums.Count; $j++) { $era = $nums[$j].era }; $nums[$i].y = if ($era -cmatch 'BC') { - $nums[$i].n } else { $nums[$i].n } }
  $ys = @($nums | ForEach-Object { $_.y }); $lo = ($ys | Measure-Object -Minimum).Minimum; $hi = ($ys | Measure-Object -Maximum).Maximum
  if ($s -match '^\s*(d\.|died)') { return @(($hi - 90), $hi) }
  if ($s -match '^\s*(b\.|born)') { return @($lo, ($lo + 90)) }
  if ($s -match '^\s*r\.') { return @(($lo - 40), ($hi + 30)) }
  if ($s -match '^\s*fl\.') { return @(($lo - 40), ($hi + 40)) }
  if ($s -match '[–-]\s*$') { return @($lo, 2030) }
  if ($s -cmatch '\bc\.') { return @(($lo - 10), ($hi + 10)) }
  return @($lo, $hi)
}
$script:EncYR = New-Object Text.RegularExpressions.Regex('(?:\b(?:AD|CE)\s+(\d{1,4})\b)|(?:\b(\d{1,4})\s*(BCE|BC|CE|AD)\b)|(?:\b(?:in|by|from|until|till|to|c\.|ca\.|circa|around|about|before|after|since|between|and)\s+(\d{3,4})\b(?!\s*(?:BCE|BC|men|soldiers|troops|people|ships|horses|km|kilometres|miles|years)\b))|(?:(?<![\d,.])\b(1\d{3}|20\d{2})(?![\d,]|\s*(?:BCE|BC|men|soldiers|troops|people|ships|horses|km|kilometres|miles)\b))', 'CultureInvariant')
$script:EncSent = New-Object Text.RegularExpressions.Regex('[.!?]["\u2019\u201D)]?\s+(?=[A-Z\u201C"\u2018(])', 'CultureInvariant')
function EncNear([string]$text, [int]$s, [int]$e) {
  $a = [Math]::Max(0, $s - 300); $b = [Math]::Min($text.Length, $e + 300)
  $m = $script:EncSent.Match($text, $a); while ($m.Success -and $m.Index -lt $s) { $a = $m.Index + $m.Length; $m = $m.NextMatch() }
  $m = $script:EncSent.Match($text, $e); if ($m.Success -and $m.Index -lt $b) { $b = $m.Index + 1 }
  $w = $text.Substring($a, $b - $a); $best = $null
  foreach ($m in $script:EncYR.Matches($w)) {
    $g = $m.Groups
    $y = if ($g[1].Success) { [int]$g[1].Value } elseif ($g[2].Success) { if ($g[3].Value -cmatch 'BC') { - [int]$g[2].Value } else { [int]$g[2].Value } } elseif ($g[4].Success) { [int]$g[4].Value } else { [int]$g[5].Value }
    $ts = $a + $m.Index; $te = $ts + $m.Length; $d = if ($te -le $s) { $s - $te } elseif ($ts -ge $e) { $ts - $e } else { 0 }
    if ($ts -lt $e -and $te -gt $s) { continue }
    if (-not $best -or $d -lt $best.d) { $best = @{ y = $y; d = $d } }
  }
  return $best
}
function EncFit($r, $y) { if (-not $r) { return $false }; $t = if ($r[2] -eq 'e') { 2 } elseif ($r[2] -eq 'p') { 0 } else { 10 }; return ($y -ge $r[0] - $t -and $y -le $r[1] + $t) }
function EncOver($r, $c) { if (-not $r -or -not $c) { return $false }; $t = if ($r[2] -eq 'p') { 0 } else { 30 }; return ($r[0] -le $c[1] + $t -and $r[1] -ge $c[0] - $t) }
# $Y: hashtable slug -> @(from, to, kind); $ex: hashtable of excluded slugs (or $null)
function EncPick($members, [string]$text, [int]$s, [int]$e, $ctx, $ex, $Y, $prim) {
  $m = @($members | Where-Object { -not ($ex -and $ex.ContainsKey($_)) }); if (-not $m.Count) { return $null }
  $ny = EncNear $text $s $e
  if ($ny) { $f = @($m | Where-Object { EncFit $Y[$_] $ny.y }); if ($f.Count -eq 1) { return $f[0] }; if (-not $f.Count) { return $null }; $m = $f }
  if ($ctx) {   # the member whose dates overlap the page/entry period most
    $g = @($m | Where-Object { EncOver $Y[$_] $ctx }); if ($g.Count -eq 1) { return $g[0] }
    if ($g.Count -gt 1) {
      $amt = @{}; foreach ($x in $g) { $r = $Y[$x]; $amt[$x] = [Math]::Min($r[1], $ctx[1]) - [Math]::Max($r[0], $ctx[0]) }
      $g = @($g | Sort-Object { - $amt[$_] }); if ($amt[$g[0]] -gt $amt[$g[1]]) { return $g[0] }
      $top = $amt[$g[0]]; $m = @($g | Where-Object { $amt[$_] -eq $top })
    }
  }
  if ($prim -and $m -contains $prim) { return $prim }   # the plain name's own entry (primary topic)
  return $null
}
function EncOk([string]$slug, [string]$text, [int]$s, [int]$e, $Y) {
  $r = $Y[$slug]; if (-not $r -or $r[2] -ne 'e') { return $true }
  $ny = EncNear $text $s $e; return (-not $ny -or $ny.d -gt 60 -or (EncFit $r $ny.y))
}

# JSON writer for ENC_LINKS (ConvertTo-Json in PS 5.1 wraps nested arrays as {value, Count} and runs out of depth)
Add-Type -AssemblyName System.Web
function EncJson($v) {
  if ($null -eq $v) { return 'null' }
  if ($v -is [psobject] -and -not ($v -is [Management.Automation.PSCustomObject])) { $v = $v.PSObject.BaseObject }
  if ($v -is [string] -or $v -is [char]) { return '"' + [Web.HttpUtility]::JavaScriptStringEncode([string]$v) + '"' }
  if ($v -is [bool]) { return $(if ($v) { 'true' } else { 'false' }) }
  if ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) { return [string]$v }
  if ($v -is [Collections.IDictionary]) { return '{' + (($v.Keys | ForEach-Object { (EncJson ([string]$_)) + ':' + (EncJson $v[$_]) }) -join ',') + '}' }
  if ($v -is [Management.Automation.PSCustomObject]) { return '{' + (($v.PSObject.Properties | ForEach-Object { (EncJson $_.Name) + ':' + (EncJson $_.Value) }) -join ',') + '}' }
  if ($v -is [Collections.IEnumerable]) { $parts = foreach ($x in $v) { EncJson $x }; return '[' + (@($parts) -join ',') + ']' }
  return '"' + [Web.HttpUtility]::JavaScriptStringEncode([string]$v) + '"'
}