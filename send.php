<?php
// send.php: the site's forms into the Institute's own mailboxes (research@, outreach@ and info@, on this same server).
// GET is a health check; POST is one message (multipart or url-encoded), routed by its `kind` (and /contact's `topic`):
// the recipient never comes from the request. Answers JSON to the pages' scripts (Accept: application/json), else a
// small page (the /contact form without JavaScript). A copy of every message is kept for 30 days in a private folder
// outside the website, and newsletter sign-ups are listed there too: see docs/MAIL.md. PHP 7.4 or later.
declare(strict_types=1);
ini_set('display_errors', '0');   // a warning printed into the answer would break the pages' JSON

const SITE = 'https://the-epoch-institute.org';
const DOMAIN = 'the-epoch-institute.org';
// what goes where: [mailbox, the subject's first words]
const ROUTES = [
  'contact:correction' => ['research', 'Correction'],
  'contact:suggest'    => ['research', 'Suggestion'],
  'contact:write'      => ['research', 'Writing for the Institute'],
  'contact:data'       => ['research', 'Data and images'],
  'contact:press'      => ['outreach', 'Press and partnerships'],
  'contact:other'      => ['info', 'Message'],
  'article'            => ['research', 'Article submission'],
  'opinion'            => ['info', 'Opinion for the Community page'],
  'application'        => ['research', 'Application to contribute'],
  'newsletter'         => ['info', 'Newsletter sign-up'],
];
// the fields of each form: name => [label, required, longest (characters), several lines]
const FIELDS = [
  'contact'     => ['name' => ['Name', true, 100, false], 'email' => ['Email', true, 254, false], 'page' => ['Page', false, 300, false],
                    'message' => ['Message', true, 10000, true]],
  'article'     => ['name' => ['Name', true, 100, false], 'email' => ['Email', true, 254, false], 'profession' => ['Profession', true, 100, false],
                    'affiliation' => ['Institute or organisation', false, 200, false], 'title' => ['Title', true, 300, false],
                    'article' => ['Article', false, 200000, true]],
  'opinion'     => ['name' => ['Name', true, 100, false], 'opinion' => ['Opinion', true, 5000, true]],
  'application' => ['name' => ['Name', true, 100, false], 'email' => ['Email', true, 254, false], 'role' => ['Role or title', true, 200, false],
                    'region' => ['Country or region', true, 200, false], 'interests' => ['Research interests', true, 2000, true],
                    'message' => ['Why they would like to contribute', false, 5000, true]],
  'newsletter'  => ['email' => ['Email', true, 254, false], 'source' => ['Signed up on', false, 60, false]],
];
const MAX_FILE = 10 * 1024 * 1024;   // an article's file
const FILE_TYPES = [   // extension => [type, its first bytes ('' = UTF-8 text)]
  'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', "PK\x03\x04"],
  'odt'  => ['application/vnd.oasis.opendocument.text', "PK\x03\x04"],
  'doc'  => ['application/msword', "\xD0\xCF\x11\xE0"],
  'rtf'  => ['application/rtf', '{\\rtf'],
  'pdf'  => ['application/pdf', '%PDF'],
  'txt'  => ['text/plain; charset=UTF-8', ''],
];
const KEEP_DAYS = 30;                       // the private copies
const LIMITS = [[600, 5], [86400, 30]];     // one sender: at most 5 messages in 10 minutes and 30 in a day
const DAY_TOTAL = 300;                      // everyone together, in a day (UTC)

// EPOCH_MAIL_TEST (set only by the local test server, never by a request): the messages are written as .eml files
// into that folder instead of being mailed, and the private folder is its "private" subfolder
$TEST = (string) getenv('EPOCH_MAIL_TEST');
$JSON = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

// ── Answers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

function done(int $status, string $error = ''): void {
  global $JSON;
  http_response_code($status);
  if ($JSON) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($error === '' ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
  // the /contact form sent without JavaScript: a page of its own, with the way back
  $ref = $_SERVER['HTTP_REFERER'] ?? '';
  $back = strpos($ref, SITE . '/') === 0 ? substr($ref, strlen(SITE)) : '/contact';
  [$title, $text] = $error === '' ? ['Thank you', 'Your message is with the Institute. We will reply by email.'] : ['Not sent', $error];
  header('Content-Type: text/html; charset=utf-8');
  echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' .
    '<meta name="robots" content="noindex"><title>' . h($title) . ' — The Epoch Institute</title><style>' .
    'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f4efe4;color:#2b2416;font:18px/1.6 Georgia,serif}' .
    '@media (prefers-color-scheme:dark){body{background:#0b0c10;color:#e8e2d2}a{color:#d4b469}}main{max-width:560px}' .
    'h1{font-weight:normal;font-size:30px;margin:0 0 12px}a{color:#7a5c14}</style></head><body><main><h1>' . h($title) . '</h1><p>' . h($text) .
    '</p><p><a href="' . h($back) . '">&larr; Back</a> &middot; <a href="/">The Epoch Institute</a></p></main></body></html>';
  exit;
}

// ── The private folder: outside the website if the host allows, else a closed folder inside it ─────────────────────
function ensure_dir(string $d): bool { return (@is_dir($d) || @mkdir($d, 0700, true)) && @is_writable($d); }

function private_dir(): array {
  global $TEST;
  if ($TEST !== '') { $d = $TEST . '/private'; return [ensure_dir($d) ? $d : '', 'test']; }
  $home = dirname(__DIR__) . '/epoch-mail';
  if (ensure_dir($home)) return [$home, 'home'];
  $site = __DIR__ . '/.epoch-mail';
  if (ensure_dir($site)) {
    if (!is_file($site . '/.htaccess')) @file_put_contents($site . '/.htaccess', "Require all denied\n");
    return [$site, 'site'];
  }
  return ['', 'none'];
}

function ini_bytes(string $v): int {
  $v = trim($v); $n = (int) $v;
  switch (strtolower(substr($v, -1))) { case 'g': return $n * 1073741824; case 'm': return $n * 1048576; case 'k': return $n * 1024; }
  return $n;
}

// ── Senders: rate limits (by address, hashed with a salt kept in the private folder) ─────────────────────────────────
function client_ip(): string { return (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? ''); }   // behind Cloudflare, the reader's

function salt(string $dir): string {
  $f = $dir . '/salt';
  $s = is_file($f) ? trim((string) file_get_contents($f)) : '';
  if ($s === '') { $s = bin2hex(random_bytes(16)); @file_put_contents($f, $s); }
  return $s;
}

// counts this message against the limits; false when one is reached
function rate_ok(string $dir): bool {
  $now = time();
  if (!ensure_dir($dir . '/rate')) return true;   // no store: never block a reader for it
  $h = @fopen($dir . '/rate/' . substr(hash('sha256', salt($dir) . client_ip()), 0, 24) . '.json', 'c+');
  if (!$h) return true;
  flock($h, LOCK_EX);
  $t = json_decode((string) stream_get_contents($h), true);
  $t = array_values(array_filter(is_array($t) ? $t : [], function ($x) use ($now) { return is_int($x) && $x > $now - 86400; }));
  $ok = true;
  foreach (LIMITS as [$span, $max]) {
    $n = 0; foreach ($t as $x) { if ($x > $now - $span) $n++; }
    if ($n >= $max) $ok = false;
  }
  if ($ok) { $t[] = $now; ftruncate($h, 0); rewind($h); fwrite($h, (string) json_encode($t)); fflush($h); }
  flock($h, LOCK_UN); fclose($h);
  if (!$ok) return false;
  $g = @fopen($dir . '/rate/total-' . gmdate('Ymd') . '.txt', 'c+');
  if (!$g) return true;
  flock($g, LOCK_EX);
  $n = (int) stream_get_contents($g);
  if ($n < DAY_TOTAL) { ftruncate($g, 0); rewind($g); fwrite($g, (string) ($n + 1)); fflush($g); }
  flock($g, LOCK_UN); fclose($g);
  return $n < DAY_TOTAL;
}

// copies older than KEEP_DAYS and rate records older than a day go
function prune(string $dir): void {
  $cut = time() - KEEP_DAYS * 86400;
  foreach (glob($dir . '/inbox/*/*') ?: [] as $f) { if (is_file($f) && filemtime($f) < $cut) @unlink($f); }
  foreach (glob($dir . '/inbox/*', GLOB_ONLYDIR) ?: [] as $d) @rmdir($d);   // only an empty one goes
  foreach (glob($dir . '/rate/*') ?: [] as $f) { if (is_file($f) && filemtime($f) < time() - 2 * 86400) @unlink($f); }
}

// ── Reading the form ─────────────────────────────────────────────────────────────────────────────────────────────────
function field(string $k): string { $v = $_POST[$k] ?? ''; return is_string($v) ? $v : ''; }

// one line (nothing that could break a header) or several, without control characters
function clean(string $v, bool $lines): string {
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  $v = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $v);
  if (!$lines) $v = (string) preg_replace('/\s+/u', ' ', $v);
  return trim($v);
}

function chars(string $s): int { return (int) preg_match_all('/./us', $s); }

// the article's file, checked by its extension, size and first bytes; null when none was sent
function upload(): ?array {
  $f = $_FILES['file'] ?? null;
  if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
  $tooBig = 'The file is too large (10 MB at most). Please email it to research@' . DOMAIN . ' instead.';
  if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $f['size'] > MAX_FILE) done(413, $tooBig);
  if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) done(400, 'The file did not arrive. Please try again.');
  $ext = strtolower(pathinfo((string) $f['name'], PATHINFO_EXTENSION));
  if (!isset(FILE_TYPES[$ext])) done(415, 'Please send a Word, OpenDocument, RTF, PDF or text file.');
  $data = (string) file_get_contents($f['tmp_name']);
  [$type, $magic] = FILE_TYPES[$ext];
  if ($magic === '' ? !preg_match('//u', $data) : strncmp($data, $magic, strlen($magic)) !== 0) {
    done(415, 'That file is not what its name says. Please send a Word, OpenDocument, RTF, PDF or text file.');
  }
  // the name: letters, digits and plain punctuation (no path, quote or control characters), at most 80 characters, so
  // its encoded form keeps the mail's header lines under 998 characters
  $name = (string) preg_replace('/[^\p{L}\p{M}\p{N}\p{Pd} ._(),\'&+\[\]]+/u', '_', basename(str_replace('\\', '/', (string) $f['name'])));
  $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '', ' .');
  if ($name === '' || strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== $ext) $name = 'article.' . $ext;
  if (chars($name) > 80) $name = preg_replace('/^(.{0,70}).*$/us', '$1', $name) . '.' . $ext;
  return ['name' => $name, 'type' => $type, 'data' => $data];
}

// ── Writing the mail ─────────────────────────────────────────────────────────────────────────────────────────────────
// a header's text: plain ASCII as it is, anything else as UTF-8 encoded-words (folded, none longer than the limit)
function header_text(string $s): string {
  if (!preg_match('/[^\x20-\x7E]/', $s)) return $s;
  $words = []; $cur = '';
  foreach (preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
    if (strlen($cur . $ch) > 45) { $words[] = $cur; $cur = ''; }
    $cur .= $ch;
  }
  if ($cur !== '') $words[] = $cur;
  return implode("\r\n ", array_map(function ($w) { return '=?UTF-8?B?' . base64_encode($w) . '?='; }, $words));
}

// a name and address for Reply-To: the name always quoted (or encoded), so a colon or @ in it ("Eve Bcc: x@y") stays
// part of the name and cannot read as an address list
function mailbox(string $name, string $email): string {
  if ($name === '') return '<' . $email . '>';
  $n = preg_match('/[^\x20-\x7E]/', $name) ? header_text($name) : '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $name) . '"';
  return $n . ' <' . $email . '>';
}

// ── The request ─────────────────────────────────────────────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET' || $method === 'HEAD') {
  [$dir, $where] = private_dir();
  $JSON = true;
  header('Content-Type: application/json; charset=utf-8');
  $up = ini_bytes((string) ini_get('upload_max_filesize')); $post = ini_bytes((string) ini_get('post_max_size'));
  echo json_encode(['ok' => true, 'php' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'mail' => function_exists('mail'),
    'uploads' => (bool) ini_get('file_uploads'), 'maxUpload' => $post > 0 ? min($up, $post) : $up, 'private' => $where, 'writable' => $dir !== '']);
  exit;
}
if ($method !== 'POST') { header('Allow: GET, POST'); done(405, 'Not available.'); }
// a body larger than post_max_size arrives empty
if (!$_POST && !$_FILES && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) done(413, 'That was too large to send. Please email it to research@' . DOMAIN . ' instead.');

// only the Institute's own pages may post here
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
$from = $origin !== '' ? $origin : (string) preg_replace('#^(https?://[^/]+).*$#s', '$1', $referer);
if (!($from === SITE || ($TEST !== '' && preg_match('#^http://localhost(:\d+)?$#', $from)))) done(403, 'Please use the form on the-epoch-institute.org.');

$kind = clean(field('kind'), false);
$key = $kind === 'contact' ? 'contact:' . (clean(field('topic'), false) ?: 'other') : $kind;
if (!isset(ROUTES[$key], FIELDS[$kind])) done(400, 'This form is not known.');
[$box, $label] = ROUTES[$key];
$to = $box . '@' . DOMAIN;

[$dir, $where] = private_dir();
$logLine = function (string $result, int $bytes = 0) use ($dir, $key, $to) {
  if ($dir !== '' && ensure_dir($dir . '/log')) @file_put_contents($dir . '/log/' . gmdate('Y-m') . '.log', gmdate('c') . "\t$key\t$to\t$bytes\t$result\n", FILE_APPEND | LOCK_EX);
};

// the field people do not see: filled in, it was a robot (thanked, and nothing is sent)
if (trim(field('_gotcha')) !== '') { $logLine('honeypot'); done(200); }
if ($dir !== '' && !rate_ok($dir)) {
  $logLine('rate limit');
  done(429, 'Too many messages have come from here today. Please try again later, or write to ' . $to . '.');
}

$v = []; $missing = []; $errors = [];
foreach (FIELDS[$kind] as $f => [$name, $required, $max, $lines]) {
  $x = clean(field($f), $lines);
  if ($x !== '' && !preg_match('//u', $x)) { $errors[] = $name . ' could not be read.'; $x = ''; }
  if ($required && $x === '') $missing[] = $name;
  if (chars($x) > $max) $errors[] = $name . ' is too long (' . number_format($max) . ' characters at most).';
  $v[$f] = $x;
}
if (($v['email'] ?? '') !== '' && !filter_var($v['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'The email address does not look right.';
if ($kind === 'opinion' && preg_match_all('#https?://|www\.#i', $v['opinion']) > 5) $errors[] = 'Please keep links to a few.';
$file = null;
if ($kind === 'article') {
  $file = upload();
  $words = count(preg_split('/\s+/u', $v['article'], -1, PREG_SPLIT_NO_EMPTY) ?: []);
  if (!$file && $words < 100) $errors[] = 'Please attach your article, or paste the whole text (at least 100 words).';
}
if ($missing) array_unshift($errors, 'Please fill in: ' . implode(', ', $missing) . '.');
if ($errors) { $logLine('refused'); done(400, implode(' ', $errors)); }

// the subject: what it is, and the page, title or name
$detail = $kind === 'article' ? $v['title'] : ($key === 'contact:correction' && $v['page'] !== '' ? $v['page'] : ($v['name'] ?? $v['email']));
$subject = $label . ($detail !== '' ? ': ' . $detail : '');
if (chars($subject) > 150) $subject = preg_replace('/^(.{0,147}).*$/us', '$1', $subject) . '...';

// the text: every field, the long ones last, then where and when it was sent
$when = gmdate('j F Y, H:i') . ' UTC';
$text = $label . ', sent from the website on ' . $when . "\n\n";
foreach (FIELDS[$kind] as $f => [$name, , , $lines]) {
  if (!$lines && $v[$f] !== '') $text .= $name . ': ' . $v[$f] . "\n";
}
if (($v['email'] ?? '') !== '' && $kind !== 'newsletter') $text .= "(Reply to this email to answer them.)\n";
foreach (FIELDS[$kind] as $f => [$name, , , $lines]) {
  if ($lines && $v[$f] !== '') $text .= "\n" . $name . ":\n" . $v[$f] . "\n";
}
if ($file) $text .= "\nAttached: " . $file['name'] . ' (' . max(1, (int) round(strlen($file['data']) / 1024)) . " KB)\n";
$hints = [
  'article' => 'To publish it on the site, see docs/MAIL.md (data/community/articles.json).',
  'opinion' => 'To show it on the Community page, add it to the OPINIONS list in the community page (docs/MAIL.md).',
  'newsletter' => 'Every sign-up is also listed in subscribers.csv in the private folder epoch-mail (docs/MAIL.md).',
];
if (isset($hints[$kind])) $text .= "\n" . $hints[$kind] . "\n";
$text .= "\n-- \nSent from " . (strpos($referer, SITE . '/') === 0 ? clean($referer, false) : SITE) . "\n";

// the mail itself: plain text (base64, so long pasted paragraphs are safe), the file attached when there is one
$headers = ['From: "Epoch Institute website" <' . $to . '>', 'MIME-Version: 1.0'];
if (($v['email'] ?? '') !== '' && $kind !== 'newsletter') $headers[] = 'Reply-To: ' . mailbox($v['name'] ?? '', $v['email']);
if ($file) {
  $b = 'epoch-' . bin2hex(random_bytes(12));
  $ascii = (string) preg_replace('/[^A-Za-z0-9 ._()-]/', '_', $file['name']);
  $headers[] = 'Content-Type: multipart/mixed; boundary="' . $b . '"';
  $body = "This is a message in MIME format.\r\n\r\n--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" .
    chunk_split(base64_encode($text)) . "--$b\r\nContent-Type: " . $file['type'] . ";\r\n name=\"" . $ascii . "\"\r\nContent-Transfer-Encoding: base64\r\n" .
    "Content-Disposition: attachment;\r\n filename=\"" . $ascii . "\";\r\n filename*=UTF-8''" . rawurlencode($file['name']) . "\r\n\r\n" .
    chunk_split(base64_encode($file['data'])) . "--$b--\r\n";
} else {
  $headers[] = 'Content-Type: text/plain; charset=UTF-8';
  $headers[] = 'Content-Transfer-Encoding: base64';
  $body = chunk_split(base64_encode($text));
}
$subjectHeader = header_text($subject);
if ($TEST !== '') {
  $sent = ensure_dir($TEST) && file_put_contents($TEST . '/' . gmdate('Ymd-His') . '-' . str_replace(':', '-', $key) . '-' . bin2hex(random_bytes(3)) . '.eml',
    'To: ' . $to . "\r\nSubject: " . $subjectHeader . "\r\n" . implode("\r\n", $headers) . "\r\n\r\n" . $body) !== false;
} else {
  $sent = function_exists('mail') && mail($to, $subjectHeader, $body, implode("\r\n", $headers), '-f' . $to);
}

// the private copy (and the newsletter list), then old copies go
$kept = false;
if ($dir !== '') {
  $stem = gmdate('Ymd-His') . '-' . str_replace(':', '-', $key) . '-' . bin2hex(random_bytes(3));
  $month = $dir . '/inbox/' . gmdate('Y-m');
  if (ensure_dir($month)) {
    $kept = @file_put_contents($month . '/' . $stem . '.txt', "To: $to\nSubject: $subject\n" . (($v['email'] ?? '') !== '' ? 'From: ' . ($v['name'] ?? '') . ' <' . $v['email'] . ">\n" : '') . "\n" . $text) !== false;
    if ($file) @file_put_contents($month . '/' . $stem . '-' . $file['name'], $file['data']);
  }
  if ($kind === 'newsletter') {
    $h = @fopen($dir . '/subscribers.csv', 'c+');
    if ($h) {
      flock($h, LOCK_EX);
      $known = false; $email = strtolower($v['email']);
      while (($row = fgetcsv($h, 0, ',', '"', '')) !== false) { if (isset($row[1]) && strtolower((string) $row[1]) === $email) { $known = true; break; } }
      if (!$known) {
        fseek($h, 0, SEEK_END);
        if (ftell($h) === 0) fputcsv($h, ['date', 'email', 'source'], ',', '"', '');
        fputcsv($h, [gmdate('Y-m-d H:i'), $v['email'], $v['source']], ',', '"', '');
      }
      fflush($h); flock($h, LOCK_UN); fclose($h);
    }
  }
  prune($dir);
}
$logLine($sent ? 'sent' : ($kept ? 'NOT SENT, kept' : 'NOT SENT'), strlen($body));
if (!$sent && !$kept) done(500, 'Your message could not be sent. Please write to ' . $to . '.');
done(200);
