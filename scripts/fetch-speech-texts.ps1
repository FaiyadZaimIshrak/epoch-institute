# Imports the complete texts of the Great Speeches that are in the public domain (or freely licensed) from the
# libraries that hold them - mostly Wikisource, through the MediaWiki parse API - and writes one file per speech:
#   data/speech-texts/<slug>.json  {slug, title, url, source, credit, licence, lang, paras[], words, fetched}
# The texts are copied from the source, never retyped. Which page and which part of it holds each speech is set in
# scripts/speech-sources.tsv (tab-separated; several rows with the same slug are joined in order):
#   slug  url  select  credit  lang
#   select: all | #from-anchor..#to-anchor (to is exclusive; empty = to the end) | "start phrase".."end phrase"
#           (phrases are matched in the cleaned text, case-insensitively; the end phrase's paragraph is kept)
# Pages are cached raw in -Cache (default: a folder under %TEMP%), so a rerun only cleans again.
# Prints, per speech, the word count and the first and last words, to check the boundaries. Usage:
#   powershell -File scripts\fetch-speech-texts.ps1 [-Only slug1,slug2] [-Refresh] [-Cache <dir>]
#   ... -Sources <tsv> -OutDir <dir>   reads another sources file (speeches not yet in speeches-data.js are allowed,
#   titled by their slug) and writes there: drafts are imported and checked before they join the site.
#   ... -Peek <url> -Find <word>   lists the paragraphs of a (cached) page that contain <word>, as short snippets with
#   their numbers and the paragraph count, to choose start and end phrases without reading the whole page.
param([string[]]$Only, [switch]$Refresh, [string]$Sources, [string]$OutDir, [string]$Cache = (Join-Path $env:TEMP 'epoch-speech-cache'), [string]$Peek, [string[]]$Find)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web.Extensions
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = Split-Path $PSScriptRoot -Parent
$J = New-Object Web.Script.Serialization.JavaScriptSerializer; $J.MaxJsonLength = 67108864
$U8 = New-Object Text.UTF8Encoding($false)
$UA = 'EpochInstituteBuild/1.0 (https://the-epoch-institute.org; speech texts from public-domain sources)'
if (-not (Test-Path $Cache)) { New-Item -ItemType Directory -Path $Cache | Out-Null }
$outDir = if ($OutDir) { $OutDir } else { Join-Path $Repo 'data\speech-texts' }
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# fetching, cleaning and selecting: shared with scripts/fetch-quotes.ps1
. (Join-Path $PSScriptRoot 'lib\source-text.ps1')

if ($Peek) {
  $paras = To-Paras (Clean-Html (Get-PageHtml $Peek))
  "paragraphs: $($paras.Count)"
  for ($i = 0; $i -lt $paras.Count; $i++) {
    if ($Find -contains '*') { '{0,5}: {1}' -f $i, ($paras[$i].Substring(0, [Math]::Min(70, $paras[$i].Length)) -replace "`n", ' / '); continue }   # the start of every paragraph
    foreach ($f in $Find) {
      $at = $paras[$i].ToLowerInvariant().IndexOf($f.ToLowerInvariant())
      if ($at -ge 0) { $s = [Math]::Max(0, $at - 40); '{0,5}: ...{1}...' -f $i, ($paras[$i].Substring($s, [Math]::Min(150, $paras[$i].Length - $s)) -replace "`n", ' / '); break }
    }
  }
  return
}

# ── the sources ─────────────────────────────────────────────────────────────────────────────────────────────────────
$MD = [string][char]0x2014
# a licence line of its own, where "in the public domain" alone would not say enough
$LICENCES = @{
  'churchill-we-shall-fight' = 'The speech as Hansard records it: Parliamentary information licensed under the Open Parliament Licence v3.0. The Wikisource transcription is shared under CC BY-SA 4.0.'
  'jinnah-to-the-constituent-assembly' = 'Spoken in the Constituent Assembly of Pakistan in 1947 and printed in its debates; in the public domain in Pakistan.'
}
$FIXES = @{
  # England's Black Tribunal: the drop cap, the printer's unclear marks, and the margin notes and speakers' names that the
  # transcription runs into the sentences (the note "Strafford" stood beside "an unjust Sentence that I suffered")
  'charles-i-on-the-scaffold' = @(
    @('I Shall be very little', 'I shall be very little'), @(('clear me of' + [char]0x25AA + ' I will not'), 'clear me of, I will not'), @(('before you all' + [char]0x25AA + ' That'), 'before you all, That'),
    @('an unjust Sentence * that I suffered for to take effect is * Strafford, punished now', 'an unjust Sentence that I suffered for to take effect is punished now'),
    @('* Pointing to Dr. Juxod. ', ''), @('* Turning to some Gentlemen that wrote. ', ''), @('* Meaning if he did blunt the edge. ', ''), @('* Pointing to Dr. Juxon. ', ''),
    @('your own salvations. Dr. Juxon.', 'your own salvations.'), @('Will your Majesty (though', '[Dr. Juxon:] Will your Majesty (though'), @('the world''s satisfaction. King.', 'the world''s satisfaction.'),
    @('I thank you very heartily (my Lord', '[The King:] I thank you very heartily (my Lord'), @('Then turning to the Officers, said, Sirs, excuse me', '[Then, turning to the officers:] Sirs, excuse me'))
  'mandela-statement-from-the-dock' = @(, @('Liliesleaf 5[farm, Rivonia,]', 'Liliesleaf [farm, Rivonia,]'))   # a footnote figure
  'hajjaj-at-kufa' = @(, @(('shoots against you.' + [char]0x201D), 'shoots against you.'))   # the quotation's closing mark
  'jinnah-to-the-constituent-assembly' = @(, @(' [=corrupt employment practices]', ''))   # the transcriber's gloss
  'cicero-against-catiline' = @(, @('do you mean to ease abusing', 'do you mean to cease abusing'))   # an OCR slip in the Wikisource copy
  'urban-ii-at-clermont'    = @(@('beloved by Godas shines', ('beloved by God' + $MD + 'as shines')), @('your works set apart from all nations', ('your works' + $MD + 'set apart from all nations')))   # dashes lost in the Sourcebook copy (Munro 1895 has them)
  'xerxes-to-the-persian-nobles' = @(, @('as rich as our own nay', 'as rich as our own - nay'))   # the transcription's dash lost
  'gregory-vii-deposes-henry-iv' = @(@('seized thy throne . for', 'seized thy throne for'), @('deserted-holding', ('deserted' + $MD + 'holding')), @('rend it-I bind', ('rend it' + $MD + 'I bind')))   # Henderson prints dashes
  'savonarola-defies-the-pope'   = @(, @('send me to help!', 'send me to hell!'))   # "mandami all'inferno"
  'cranmer-last-speech'          = @(, @('glorified and yon edified', 'glorified and you edified'))
  'frederick-before-leuthen'     = @(, @('Sehweidnitz', 'Schweidnitz'))
  'pitt-on-taxing-america'       = @(@('arbitrary reigns. Parliaments', 'arbitrary reigns, Parliaments'), @('they are ail inhabitants', 'they are all inhabitants'))
  'red-jacket-to-the-missionary' = @(@('Their feats extended', 'Their seats extended'), @('strong and powerfal', 'strong and powerful'))   # a long s read as f
  'kossuth-in-new-york'          = @(@('fatherland-lost', ('fatherland' + $MD + 'lost')), @('your, glorious peace', 'your glorious peace'))
  'eisenhower-atoms-for-peace'   = @(@('I, who has spent', 'I, who have spent'), @('not idle works', 'not idle words'), @('These is at least', 'There is at least'), @('we much start', 'we must start'), @('the United Stats', 'the United States'), @('lead this work out of fear', 'lead this world out of fear'))   # the transcription's slips ("who have spent" as the article quotes it)
  'jefferson-first-inaugural'    = @(, @('his long- lost liberty', 'his long-lost liberty'))   # a line-end hyphen kept by the transcription
  'emmet-speech-from-the-dock'   = @(, @('character; when. my country', 'character; when my country'))
  'seattle-speech'               = @(, @('Washington [1], can', 'Washington, can'))   # the transcription's note marker
  'napoleon-farewell-to-the-guard' = @(, @('found you On the road', 'found you on the road'))
  'caesar-on-the-catilinarians'  = @(, @('wisdom m those', 'wisdom in those'))
  'wu-speech-at-mu'              = @(@('he has received);* he', 'he has received); he'), @('appointed by Heaven.* In', 'appointed by Heaven. In'))   # Legge's footnote marks (the notes are not printed)
  'richard-ii-at-smithfield'     = @(@("yonder abbey.'[66]", "yonder abbey.'"), @("dearly abye it.'[67]", "dearly abye it.'"), @('a great outrage;[68]', 'a great outrage;'), @("the king's draper,[69]", "the king's draper,"))   # the edition's footnote marks
  'powhatan-to-john-smith'       = @(, @('my [III.76.] brethren', 'my brethren'))   # the reprint's page mark
  'rumbold-on-the-scaffold'      = @(, @('there should be. so many', 'there should be so many'))
  'washington-at-newburgh'       = @(@('much credit for, the goodness', 'much credit for the goodness'), @('such measures?. Can', 'such measures? Can'))
  'gandhi-at-his-trial'          = @(@('Chauri Chuara', 'Chauri Chaura'), @('extenating', 'extenuating'), @('I do not except that kind', 'I do not expect that kind'))
}
# paragraphs split by a page break or a plate in the scanned book: the paragraph that ends with the given words is
# joined to the next one (after $FIXES)
$AUTOJOIN = @('john-ball-at-blackheath', 'lloyd-george-limehouse', 'charles-i-on-the-scaffold', 'cixi-reform-edict')
# the name of a source that is not one of the libraries above (address pattern, name, a licence line where the page has its own)
$PASSAGE = 'Quoted in part, for comment; the speech itself is still in copyright.'
$LICENCES['de-gaulle-appeal-of-18-june'] = $PASSAGE; $LICENCES['churchill-iron-curtain'] = $PASSAGE
$LICENCES['macmillan-wind-of-change'] = 'Spoken as Prime Minister in 1960: Crown copyright, which has expired. Quoted as Wikipedia gives it (CC BY-SA 4.0).'
$SRCNAMES = @(
  @('franpritchett\.com', 'Frances Pritchett, Columbia University'), @('nps\.gov', 'National Park Service'),
  @('wikipedia\.org', 'Wikipedia', 'Quoted as Wikipedia gives it; the article is shared under CC BY-SA 4.0.'),
  @('wikiquote\.org', 'Wikiquote', 'Quoted as Wikiquote gives it; the page is shared under CC BY-SA 4.0.'),
  @('distantreader\.org/stacks/earlyprint', 'EarlyPrint (EEBO-TCP)', 'The text is in the public domain; the EEBO-TCP transcription is released under CC0.'),
  @('etc\.usf\.edu/lit2go', 'Lit2Go, University of South Florida'), @('progress\.org', 'progress.org'),
  @('mkgandhi\.org', 'mkgandhi.org, Bombay Sarvodaya Mandal', 'Gandhi''s writings and speeches have been in the public domain in India since 2009.'),
  @('un\.org', 'United Nations', 'A statement made in court: South African law (Copyright Act 1978, section 12(8)) gives no copyright in speeches delivered in legal proceedings.'),
  @('history\.state\.gov', 'Office of the Historian, US Department of State', 'A work of the United States government, in the public domain.'),
  @('marxists\.org', 'Marxists Internet Archive', $PASSAGE), @('bbc\.co\.uk', 'BBC World Service', $PASSAGE), @('avalon\.law\.yale\.edu', 'The Avalon Project, Yale Law School', $PASSAGE)
)
$JOINS = @{
  'charles-i-on-the-scaffold' = @('that may hurt me.', 'and this honest man')   # a margin note stood between the halves
  'mazzini-to-the-young-men-of-italy' = @('Could Attilio and Emilio')   # the plate of Mazzini stands between the halves
  'richard-ii-at-smithfield'          = @('a great outrage;', "the king's draper,")   # page breaks of the Harvard Classics
}
$rows = @(); $titles = @{}
$sd = [IO.File]::ReadAllText((Join-Path $Repo 'speeches-data.js'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($sd, '\{slug:"([^"]+)",title:"([^"]+)"')) { $titles[$m.Groups[1].Value] = $m.Groups[2].Value }
$srcFile = if ($Sources) { $Sources } else { Join-Path $PSScriptRoot 'speech-sources.tsv' }
foreach ($line in [IO.File]::ReadAllLines($srcFile, [Text.Encoding]::UTF8)) {
  if (-not $line.Trim() -or $line.StartsWith('#')) { continue }
  $c = $line.Split("`t"); if ($c.Count -lt 5) { throw "speech-sources.tsv: 5 columns expected: $line" }
  if (-not $titles.ContainsKey($c[0])) { if ($Sources) { $titles[$c[0]] = $c[0] } else { throw "speech-sources.tsv: unknown speech $($c[0])" } }
  $rows += , @($c[0], $c[1], $c[2], $c[3], $c[4])
}
$slugs = @($rows | ForEach-Object { $_[0] } | Select-Object -Unique)
if ($Only) { $slugs = @($slugs | Where-Object { $Only -contains $_ }) }
$today = (Get-Date).ToString('yyyy-MM-dd'); $nOk = 0; $nBad = 0
foreach ($slug in $slugs) {
  try {
    $parts = @($rows | Where-Object { $_[0] -eq $slug })
    $paras = New-Object Collections.Generic.List[string]
    foreach ($p in $parts) { foreach ($t in (Select-Part (Get-PageHtml $p[1]) $p[2])) { $paras.Add($t) } }
    if (-not $paras.Count) { throw 'no text' }
    # obvious slips of the scanned copies, corrected (old -> new, matched exactly)
    if ($FIXES.ContainsKey($slug)) { for ($x = 0; $x -lt $paras.Count; $x++) { foreach ($fx in $FIXES[$slug]) { $paras[$x] = $paras[$x].Replace($fx[0], $fx[1]) } } }
    # a scanned book's page breaks cut paragraphs in two: one that starts in lower case goes back to the one before it,
    # and footnote numbers ([55]) are dropped
    if ($AUTOJOIN -contains $slug) {
      # (and the spaces a scan leaves before ; ! ? : and its raised footnote figures)
      for ($x = 0; $x -lt $paras.Count; $x++) { $paras[$x] = [regex]::Replace([regex]::Replace($paras[$x], '\s*\[\d+\]', ''), ' ([;!?:])', '$1').Replace([string][char]0xB9, '') }
      for ($x = $paras.Count - 1; $x -gt 0; $x--) { if ($paras[$x] -cmatch '^[a-z]') { $paras[$x - 1] = $paras[$x - 1].TrimEnd() + ' ' + $paras[$x]; $paras.RemoveAt($x) } }
    }
    if ($JOINS.ContainsKey($slug)) {
      foreach ($jn in $JOINS[$slug]) {
        $x = -1; for ($k = 0; $k -lt $paras.Count - 1; $k++) { if ($paras[$k].TrimEnd().EndsWith($jn)) { $x = $k; break } }
        if ($x -lt 0) { throw "join: no paragraph ends with '$jn'" }
        $paras[$x] = $paras[$x].TrimEnd() + ' ' + $paras[$x + 1].TrimStart(); $paras.RemoveAt($x + 1)
      }
    }
    # paragraph numbers some translations print at the start of a paragraph ("2 In the first place ...")
    $oq = [string][char]0x201C   # an opening curly quote may stand between the number and the text: 36"I shall ...
    for ($x = 0; $x -lt $paras.Count; $x++) { $paras[$x] = [regex]::Replace($paras[$x], ('^\d{1,2} ?(?=["' + $oq + ']?[A-Z])'), '') }
    # paragraph markers a transcriber added: [[3]] The second thing ...
    for ($x = 0; $x -lt $paras.Count; $x++) { $paras[$x] = [regex]::Replace($paras[$x], '\s*\[\[\d+\]\]\s*', ' ').Trim() }
    $words = 0; foreach ($t in $paras) { $words += ($t -split '\s+' | Where-Object { $_ }).Count }
    $url = $parts[0][1]; $src = if ($url -match 'wikisource\.org') { 'Wikisource' } elseif ($url -match 'gutenberg\.org') { 'Project Gutenberg' } elseif ($url -match 'fordham\.edu') { 'Internet History Sourcebooks, Fordham University' } elseif ($url -match 'reaganlibrary\.gov') { 'Ronald Reagan Presidential Library' } else { ([Uri]$url).Host }
    $lic = if ($src -eq 'Wikisource') { 'The text is in the public domain; the Wikisource transcription is shared under CC BY-SA 4.0.' } else { 'The text is in the public domain.' }
    if ($LICENCES.ContainsKey($slug)) { $lic = $LICENCES[$slug] }
    foreach ($sn in $SRCNAMES) { if ($url -match $sn[0]) { $src = $sn[1]; if ($sn.Count -gt 2 -and -not $LICENCES.ContainsKey($slug)) { $lic = $sn[2] } } }
    $o = New-Object 'Collections.Generic.Dictionary[string,object]'
    $o['slug'] = [string]$slug; $o['title'] = [string]$titles[$slug]; $o['url'] = [string]$url; $o['source'] = [string]$src; $o['credit'] = [string]$parts[0][3]
    $o['licence'] = [string]$lic; $o['lang'] = [string]$parts[0][4]; $o['words'] = [int]$words; $o['fetched'] = $today; $o['paras'] = [string[]]$paras.ToArray()
    [IO.File]::WriteAllText((Join-Path $outDir ($slug + '.json')), $J.Serialize($o), $U8)
    $all = ($paras -join ' ') -split '\s+' | Where-Object { $_ }
    '{0,-44} {1,6} words  [{2} ...] ... [... {3}]' -f $slug, $words, (($all | Select-Object -First 7) -join ' '), (($all | Select-Object -Last 7) -join ' ')
    $nOk++
  } catch { "{0,-44} FAILED: {1}" -f $slug, $_.Exception.Message; $nBad++ }
}
"done: $nOk written, $nBad failed"
