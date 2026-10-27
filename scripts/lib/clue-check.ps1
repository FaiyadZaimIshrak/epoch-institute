# Clue checks for the word games (dot-source it). A clue must never give its own answer away, and never name another
# answer of the same Word Hunt theme or of the same day's crossword. build-pages.ps1 stops on a clue that does;
# make-crosswords.ps1 keeps answers whose clues name each other out of one puzzle.
$script:ClueStop = @{}; foreach ($w in 'A AN AND AT DA DE DEL DI DU EL IN LA LE OF ON THE TO VAN VON'.Split(' ')) { $script:ClueStop[$w] = 1 }
# the words of a clue in capitals, accents dropped, split at apostrophes ("China's" -> CHINA, S)
function ClueWords([string]$s) {
  $n = $s.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
  @([regex]::Matches($n.ToUpperInvariant(), '[A-Z]+') | ForEach-Object { $_.Value })
}
# a clue's words and every run of up to five of them written together ("Zheng He" -> ZHENGHE), as a set
function ClueSet([string]$clue) {
  $ws = @(ClueWords $clue); $h = @{}
  for ($i = 0; $i -lt $ws.Count; $i++) { $s = ''; for ($j = $i; $j -lt $ws.Count -and $j -lt $i + 5; $j++) { $s += $ws[$j]; $h[$s] = 1 } }
  $h
}
# does a clue (its ClueSet) name an answer, as a word or its plural, or as the words of its name in a row?
function ClueNamed([hashtable]$set, [string]$answer) {
  $f = $answer -replace '[^A-Z]', ''
  $set.ContainsKey($f) -or $set.ContainsKey("${f}S") -or $set.ContainsKey("${f}ES")
}
# why a clue gives its own answer away, else $null. The answer as written: "SILK", "BLACK SEA", "ZHENGHE".
function ClueOwnFault([string]$answer, [string]$clue) {
  $full = $answer -replace '[^A-Z]', ''
  $parts = @($answer -split '[ -]' | Where-Object { $_.Length -ge 3 -and -not $script:ClueStop.ContainsKey($_) })
  foreach ($w in @(ClueWords $clue)) {
    if ($w -eq $full -or $w -eq "${full}S" -or $w -eq "${full}ES") { return "names the answer ($w)" }
    if ($full.Length -ge 4 -and $w.Contains($full)) { return "has the answer inside a word ($w)" }
    if ($parts.Count -gt 1) { foreach ($p in $parts) { if ($w -eq $p -or $w -eq "${p}S") { return "names part of the answer ($w)" } } }
    if ($w.Length -ge 4 -and -not $script:ClueStop.ContainsKey($w) -and $full.Contains($w)) { return "has a word inside the answer ($w)" }
    if ($full.Length -ge 5 -and $w.Length -ge 5 -and $w.Substring(0, 5) -eq $full.Substring(0, 5)) { return "has a word that begins like the answer ($w)" }
  }
  if (ClueNamed (ClueSet $clue) $answer) { return 'spells the answer out in two or more words' }
  return $null
}
