# Shared by scripts/fetch-speech-texts.ps1 and scripts/fetch-quotes.ps1 (dot-sourced): fetching a library page
# (Wikisource through the parse API, others raw, cached in $Cache), cleaning its HTML to plain paragraphs, and
# selecting a part of it ("start phrase".."end phrase", @paragraphs, #anchors, all). The caller sets $UA, $Cache,
# $Refresh, $J (a JavaScriptSerializer) and $U8 first.
# ── fetching ────────────────────────────────────────────────────────────────────────────────────────────────────────
$script:lastHit = [DateTime]::MinValue
function Get-Url([string]$url) {
  $wait = 2500 - ([DateTime]::Now - $script:lastHit).TotalMilliseconds; if ($wait -gt 0) { Start-Sleep -Milliseconds ([int]$wait) }
  for ($try = 0; $try -lt 5; $try++) {
    try {
      $wc = New-Object Net.WebClient; $wc.Headers.Add('User-Agent', $UA); $wc.Encoding = [Text.Encoding]::UTF8
      $s = $wc.DownloadString($url); $script:lastHit = [DateTime]::Now; return $s
    } catch [Net.WebException] {
      $script:lastHit = [DateTime]::Now
      $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
      if ($code -eq 404) { throw "404 for $url" }
      Start-Sleep -Seconds (8 * ($try + 1))
    }
  }
  throw "could not fetch $url"
}
# a page's HTML: Wikisource pages through the parse API (rendered, with the scanned pages transcluded), others raw
function Get-PageHtml([string]$url) {
  $key = ($url -replace '^https?://', '' -replace '[^A-Za-z0-9._-]+', '_'); if ($key.Length -gt 150) { $key = $key.Substring(0, 150) }
  $file = Join-Path $Cache ($key + '.html')
  if ((Test-Path $file) -and -not $Refresh) { return [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8) }
  $m = [regex]::Match($url, '^https://([a-z]+\.wikisource\.org)/wiki/(.+)$')
  if ($m.Success) {
    $title = [Uri]::UnescapeDataString($m.Groups[2].Value.Split('#')[0])
    $api = 'https://' + $m.Groups[1].Value + '/w/api.php?action=parse&format=json&formatversion=2&prop=text&redirects=1&disableeditsection=1&disablelimitreport=1&page=' + [Uri]::EscapeDataString($title)
    $d = $J.DeserializeObject((Get-Url $api))
    if ($d['error']) { throw "Wikisource: $($d['error']['info']) ($title)" }
    $html = [string]$d['parse']['text']
  } else { $html = Get-Url ($url.Split('#')[0]) }
  [IO.File]::WriteAllText($file, $html, $U8)
  return $html
}

# ── cleaning ────────────────────────────────────────────────────────────────────────────────────────────────────────
# removes every element whose opening tag matches $open (a regex for the whole tag), with its nested content
function Remove-Blocks([string]$html, [string]$open) {
  while ($true) {
    $m = [regex]::Match($html, $open, 'IgnoreCase'); if (-not $m.Success) { return $html }
    $name = [regex]::Match($m.Value, '^<([a-zA-Z0-9]+)').Groups[1].Value
    if ($m.Value.EndsWith('/>')) { $html = $html.Remove($m.Index, $m.Length); continue }
    $rx = New-Object Text.RegularExpressions.Regex ('<(/?)' + $name + '\b[^>]*>'), 'IgnoreCase'
    $depth = 0; $end = -1; $pos = $m.Index
    foreach ($t in $rx.Matches($html, $pos)) {
      if ($t.Groups[1].Value -eq '/') { $depth-- } elseif (-not $t.Value.EndsWith('/>')) { $depth++ }
      if ($depth -eq 0) { $end = $t.Index + $t.Length; break }
    }
    if ($end -lt 0) { $end = $html.Length }
    $html = $html.Remove($m.Index, $end - $m.Index)
  }
}
function Clean-Html([string]$html) {
  $html = [regex]::Replace($html, '(?is)<(style|script)\b.*?</\1>', '')
  $html = [regex]::Replace($html, '(?s)<!--.*?-->', '')
  # headings are editorial (chapter and section numbers, titles Wikisource editors added), never part of a speech
  $html = [regex]::Replace($html, '(?is)<(h[1-6])\b[^>]*>.*?</\1>', '')
  $html = [regex]::Replace($html, '(?is)<a\b[^>]*>\s*Latin\s*</a>', '')   # "(Latin)" links beside each chapter of a translation
  foreach ($o in @(
      '<div[^>]*class="[^"]*\bwst-header\b[^"]*"[^>]*>', '<table[^>]*id="headertemplate"[^>]*>', '<div[^>]*id="headertemplate"[^>]*>',
      '<div[^>]*class="[^"]*\b(ws-noexport|noprint|licenseContainer|mw-references-wrap|reflist|wst-toc|toc|navbox|wst-translation-license|wst-license)\b[^"]*"[^>]*>',
      '<table[^>]*class="[^"]*\b(toc|navbox|wst-license|licenseContainer|ws-noexport)\b[^"]*"[^>]*>', '<table[^>]*id="toc"[^>]*>',
      '<ol[^>]*class="[^"]*\breferences\b[^"]*"[^>]*>', '<sup[^>]*class="[^"]*\breference\b[^"]*"[^>]*>',
      '<span[^>]*class="[^"]*\b(pagenum|ws-pagenum|mw-editsection|wst-pagenum)\b[^"]*"[^>]*>', '<figure\b[^>]*>', '<span[^>]*typeof="mw:File[^"]*"[^>]*>',
      '<(div|span)[^>]*class="[^"]*\bwst-sidenote\b[^"]*"[^>]*>'   # marginal notes and page references (Jowett's analyses, "Steph. 17")
    )) { $html = Remove-Blocks $html $o }
  return $html
}
# cleaned HTML -> paragraphs of plain text (line breaks inside a paragraph kept as \n)
$LSEP = [string][char]0x2028   # a line break inside a paragraph, until the paragraphs are split
function To-Paras([string]$html) {
  $h = [regex]::Replace($html, '(?i)<br\s*/?>', $LSEP)
  $h = [regex]::Replace($h, '(?i)</(p|div|h[1-6]|li|blockquote|dd|dt|tr|table|section|center)>|<(p|h[1-6]|li|tr|blockquote|center)\b[^>]*>', "`n`n")
  $h = [regex]::Replace($h, '<[^>]+>', '')
  $h = [Net.WebUtility]::HtmlDecode($h)
  # old pages write punctuation as Windows-1252 codes (&#151; for an em dash), which decode to invisible controls
  foreach ($cp in @(@(0x85, 0x2026), @(0x91, 0x2018), @(0x92, 0x2019), @(0x93, 0x201C), @(0x94, 0x201D), @(0x96, 0x2013), @(0x97, 0x2014))) { $h = $h.Replace([string][char]$cp[0], [string][char]$cp[1]) }
  $out = New-Object Collections.Generic.List[string]
  foreach ($p in ($h -split "`n\s*`n")) {
    $t = (($p -split $LSEP) | ForEach-Object { ($_ -replace '[\s ]+', ' ').Trim() } | Where-Object { $_ }) -join "`n"
    $t = $t.Trim()
    if (-not $t) { continue }
    $t = ($t -replace '\s*\(\s*\)\s*$', '' -replace '^\s*\(\s*\)\s*', '').Trim()   # what is left of "(Latin)" once its link is gone
    if (-not $t) { continue }
    if ($t -match '^\[?\s*\d+\s*\]?$' -or $t -match '^[\[\(]?\s*(edit|↑|\*|\d+\s*\])\s*[\]\)]?$' -or $t -match '^Layout \d$') { continue }   # section and page numbers, stray marks, layout switches
    $out.Add($t)
  }
  return , $out
}
function Find-Para($paras, [string]$phrase, [int]$from) {
  $ph = ($phrase -replace '\s+', ' ').ToLowerInvariant()
  for ($i = $from; $i -lt $paras.Count; $i++) { if (($paras[$i] -replace '\s+', ' ').ToLowerInvariant().Contains($ph)) { return $i } }
  return -1
}
function Select-Part([string]$html, [string]$sel) {
  $sel = $sel.Trim()
  if ($sel -match '^@(\d+)\.\.(@(\d+))?$') {   # by paragraph numbers (as -Peek shows them), inclusive
    $paras = To-Paras (Clean-Html $html); $a = [int]$Matches[1]; $b = if ($Matches[3]) { [int]$Matches[3] } else { $paras.Count - 1 }
    $res = New-Object Collections.Generic.List[string]; for ($x = $a; $x -le [Math]::Min($b, $paras.Count - 1); $x++) { $res.Add($paras[$x]) }
    return , $res
  }
  if ($sel -match '^#([^.]*)\.\.(#(.*))?$') {   # by anchors: from the element with id=from up to (not including) the one with id=to
    $a = [regex]::Match($html, 'id="' + [regex]::Escape($Matches[1]) + '"'); if (-not $a.Success) { throw "anchor #$($Matches[1]) not found" }
    $start = $html.LastIndexOf('<', $a.Index)
    $end = $html.Length
    if ($Matches[3]) { $b = [regex]::Match($html.Substring($a.Index + 1), 'id="' + [regex]::Escape($Matches[3]) + '"'); if (-not $b.Success) { throw "anchor #$($Matches[3]) not found" }; $end = $html.LastIndexOf('<', $a.Index + 1 + $b.Index) }
    $paras = To-Paras (Clean-Html $html.Substring($start, $end - $start))
    return , $paras
  }
  $paras = To-Paras (Clean-Html $html)
  if ($sel -eq 'all') { return , $paras }
  $pm = [regex]::Match($sel, '^"(.+)"\.\."(.+)"$'); if (-not $pm.Success) { throw "bad select: $sel" }
  $i = Find-Para $paras $pm.Groups[1].Value 0; if ($i -lt 0) { throw "start phrase not found: $($pm.Groups[1].Value)" }
  $k = Find-Para $paras $pm.Groups[2].Value $i; if ($k -lt 0) { throw "end phrase not found: $($pm.Groups[2].Value)" }
  # the start paragraph is trimmed to begin at the phrase (a speech often starts mid-paragraph after "he said:")
  $first = $paras[$i]; $at = $first.ToLowerInvariant().IndexOf($pm.Groups[1].Value.ToLowerInvariant()); if ($at -gt 0) { $first = $first.Substring($at) }
  # the end paragraph is cut after the end phrase, carried on to the end of its sentence (with closing quotes)
  function CutEnd([string]$t, [int]$from) {
    $e = $t.ToLowerInvariant().IndexOf($pm.Groups[2].Value.ToLowerInvariant(), $from); if ($e -lt 0) { return $t }
    $e += $pm.Groups[2].Value.Length
    $cq = [string][char]0x201D + [string][char]0x2019   # closing curly quotes, joined in at run time (a literal one would end the quoted string)
    $tail = [regex]::Match($t.Substring($e), ('^[^.!?' + "`n" + ']*?[.!?]+["' + $cq + ')\]]*|^["' + $cq + ')\]]+'))
    if ($tail.Success -and $tail.Length -le 40) { $e += $tail.Length }
    return $t.Substring(0, $e)
  }
  $res = New-Object Collections.Generic.List[string]
  for ($x = $i; $x -le $k; $x++) {
    if ($x -eq $i -and $x -eq $k) { $t = $paras[$x]; $s0 = [Math]::Max(0, $t.ToLowerInvariant().IndexOf($pm.Groups[1].Value.ToLowerInvariant())); $res.Add((CutEnd $t $s0).Substring($s0)) }
    elseif ($x -eq $i) { $res.Add($first) }
    elseif ($x -eq $k) { $res.Add((CutEnd $paras[$x] 0)) }
    else { $res.Add($paras[$x]) }
  }
  return , $res
}
