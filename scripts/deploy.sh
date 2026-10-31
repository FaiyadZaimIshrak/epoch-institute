#!/usr/bin/env bash
# Deploys the site to public_html over SSH with rsync. It does what .cpanel.yml did when cPanel deployed from its own
# clone of the repository: the same files and folders, --delete only in the twelve generated folders, the same mkdir
# and rm steps (each step below names its line in .cpanel.yml, removed after the switch on 27 Oct 2026: see the git
# history). .github/workflows/deploy.yml runs it on every push to master; it also runs by hand from a clean clone on
# Linux, macOS or WSL. docs/DEPLOY.md has the details.
#
#   DRY_RUN=1 scripts/deploy.sh   list what would be sent and deleted (rsync -n) and print the server commands
#   scripts/deploy.sh             deploy the commit that is checked out
#
# Environment: SSH_HOST, SSH_PORT, SSH_USER (default: the Namecheap account), SSH_KEY_FILE (default: ssh's own keys
# and agent), DEPLOY_PATH (default /home/theeiorh/public_html/), DRY_RUN=1 for a dry run. The server's host key must
# be in ~/.ssh/known_hosts (the workflow puts it there with ssh-keyscan).
#
# Files are compared by checksum, not by time: a fresh checkout gives every file a new time, so rsync's usual check
# would rewrite all of them. Times are not copied, so a file the deploy leaves alone keeps its time on the server and
# its Last-Modified, as with cPanel; a file it changes gets the time of the deploy. The price is that the server reads
# the whole site once per deploy to compare.
set -euo pipefail
shopt -s nullglob

SSH_HOST=${SSH_HOST:-server905.web-hosting.com}
SSH_PORT=${SSH_PORT:-21098}
SSH_USER=${SSH_USER:-theeiorh}
SSH_KEY_FILE=${SSH_KEY_FILE:-}
DEPLOY_PATH=${DEPLOY_PATH:-/home/theeiorh/public_html/}
DRY_RUN=${DRY_RUN:-0}
# forgive stray spaces or line breaks in pasted secrets
SSH_HOST=${SSH_HOST//[[:space:]]/}
SSH_PORT=${SSH_PORT//[[:space:]]/}
SSH_USER=${SSH_USER//[[:space:]]/}

# What .cpanel.yml copied, line by line
ROOT_FILES=('*.html' '*.css' '*.js' '*.csv' '*.json' .htaccess  # line 8: each must match (generator.html is left out)
  send.php .user.ini)                                              # + the forms' mail handler and its PHP settings (Oct 2026)
ROOT_EXTRA=('*.txt' '*.xml' '*.svg' '*.png' '*.ico')              # line 9: copied when present
PAGES=(index about research research-series profiles community contributors dataset explorer connections atlas quiz
  contact start games kids search timeline passport write faiths flashcards race inventions governance)  # line 10
GENERATED=(encyclopedia state today-in-history countries centuries paths speeches years people essays articles
  teachers societies)                                              # line 11: the only folders synced with --delete (societies: Oct 2026)
DIRS=(sitemaps fonts css)                                          # line 12 (css/: scripts/split-css.js, Oct 2026)
DATA=(data/.htaccess data/history.json data/international-days.json data/polities.json data/enc-states.json
  data/years.json data/days data/enc-preview data/states data/scribe data/faiths data/cards data/spans data/societies data/inventions.json)  # line 14
PROFILES=(empire religion language culture movement government logos images maps)              # line 15
KINDS=(culture ideology movement)                                  # line 16: copied when present

say() { printf '%s\n' "$*"; }
die() {
  if [ "${GITHUB_ACTIONS:-}" = true ]; then printf '::error::%s\n' "$*"; fi
  printf 'deploy: %s\n' "$*" >&2
  exit 1
}

cd "$(dirname "${BASH_SOURCE[0]}")/.."
git rev-parse --git-dir > /dev/null 2>&1 || die "run this from a git checkout of the site"

case "$DRY_RUN" in '' | 0 | false | no) DRY_RUN=0 ;; *) DRY_RUN=1 ;; esac
case "$SSH_PORT" in '' | *[!0-9]*) die "SSH_PORT must be a number, not '$SSH_PORT'" ;; esac
if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ]; then die "SSH_HOST and SSH_USER must not be empty"; fi
case "$DEPLOY_PATH" in */) ;; *) DEPLOY_PATH=$DEPLOY_PATH/ ;; esac
case "$DEPLOY_PATH" in
  / | [!/]* | *[!A-Za-z0-9._/-]* | *//* | */./* | */../*) die "DEPLOY_PATH must be a plain absolute path, not '$DEPLOY_PATH'" ;;
esac
command -v rsync > /dev/null || die "rsync is not installed (Git Bash on Windows has none: use WSL, Linux or macOS)"
command -v ssh > /dev/null || die "ssh is not installed"

# --- What to send: everything must be there before anything is sent

root=()
for p in "${ROOT_FILES[@]}"; do
  n=0
  for f in $p; do
    if [ -e "$f" ]; then
      n=$((n + 1))
      # generator.html is not deployed: line 19 deletes it on the server, so it is never sent
      if [ "$f" != generator.html ]; then root+=("$f"); fi
    fi
  done
  [ "$n" -gt 0 ] || die "nothing in the repository root matches $p"
done
extra=()
for p in "${ROOT_EXTRA[@]}"; do
  for f in $p; do
    if [ -e "$f" ]; then extra+=("$f"); fi
  done
done
missing=()
for f in "${PAGES[@]}" "${DIRS[@]}" feeds/.htaccess "${DATA[@]}" "${PROFILES[@]}"; do
  if [ ! -e "$f" ]; then missing+=("$f"); fi
done
for d in "${GENERATED[@]}"; do
  # an empty folder synced with --delete would empty the folder on the server
  if [ ! -d "$d" ] || [ -z "$(ls -A "$d")" ]; then missing+=("$d/ (missing or empty)"); fi
done
[ ${#missing[@]} -eq 0 ] || die "missing from the checkout: ${missing[*]}"
kinds=()
for d in "${KINDS[@]}"; do
  if [ -d "$d" ]; then kinds+=("$d"); fi
done

# Only a commit is deployed, as cPanel deployed from its clean clone: no changed, untracked or ignored files in what
# is sent, and no CRLF line endings that core.autocrlf put into a Windows working tree
paths=("${root[@]}" "${PAGES[@]}" "${GENERATED[@]}" "${DIRS[@]}" feeds/.htaccess "${DATA[@]}" "${PROFILES[@]}")
if [ ${#extra[@]} -gt 0 ]; then paths+=("${extra[@]}"); fi
if [ ${#kinds[@]} -gt 0 ]; then paths+=("${kinds[@]}"); fi
dirty=$(git --literal-pathspecs status --porcelain --untracked-files=all --ignored -- "${paths[@]}")
crlf=$(git --literal-pathspecs ls-files --eol -- "${paths[@]}" \
  | awk -F '\t' '{ split($1, e, " ") } e[1] == "i/lf" && e[2] == "w/crlf" { print $2 }')
if [ -n "$dirty$crlf" ]; then
  say "These deployed files differ from commit $(git rev-parse --short HEAD):"
  if [ -n "$dirty" ]; then sed -n '1,20p' <<< "$dirty"; fi
  if [ -n "$crlf" ]; then sed -n '1,10s/^/CRLF line endings: /p' <<< "$crlf"; fi
  if [ "$DRY_RUN" = 1 ]; then
    say "(a dry run goes on; a deploy would stop here)"
  else
    die "deploy a clean checkout of a commit (commit or stash the changes; on Windows, deploy from Actions)"
  fi
fi

# --- One SSH connection for every step (shared through a control socket where ssh supports it)

TMP=$(mktemp -d /tmp/epoch-deploy.XXXXXX)
CFG=$TMP/ssh_config
{
  printf 'Host deploy-target\n  HostName %s\n  Port %s\n  User %s\n' "$SSH_HOST" "$SSH_PORT" "$SSH_USER"
  printf '  BatchMode yes\n  StrictHostKeyChecking yes\n  ConnectTimeout 30\n  ServerAliveInterval 30\n  ServerAliveCountMax 6\n'
  if [ -n "$SSH_KEY_FILE" ]; then printf '  IdentityFile "%s"\n  IdentitiesOnly yes\n' "$SSH_KEY_FILE"; fi
  case "$(uname -s)" in
    MINGW* | MSYS* | CYGWIN*) ;; # the Windows builds of ssh cannot share a connection
    *) printf '  ControlMaster auto\n  ControlPath %s/mux\n  ControlPersist 120\n' "$TMP" ;;
  esac
} > "$CFG"
SSH=(ssh -F "$CFG")
T=deploy-target
P=$DEPLOY_PATH
finish() {
  # close the shared connection, if one was opened, and remove the temporary files
  "${SSH[@]}" -O exit "$T" > /dev/null 2>&1 || :
  rm -rf "$TMP"
}
trap finish EXIT

RSYNC=(rsync --archive --no-times --no-owner --no-group --checksum '--chmod=D755,F644' --itemize-changes -e "ssh -F $CFG")
if [ "$DRY_RUN" = 1 ]; then RSYNC+=(--dry-run); fi
: > "$TMP/counts"
: > "$TMP/changes"

# sends with rsync, listing every change (<f sent, *deleting, cd new folder, . permissions);
# $1 = the step, then rsync's arguments
send() {
  local step=$1
  shift
  if [ "${GITHUB_ACTIONS:-}" = true ]; then say "::group::$step"; else say "-- $step"; fi
  "${RSYNC[@]}" "$@" | tee "$TMP/out" || die "rsync failed: $step"
  if [ "${GITHUB_ACTIONS:-}" = true ]; then say "::endgroup::"; fi
  awk -v step="$step" '/^<f/ { s++ } /^\*deleting/ { d++ } /^cd/ { n++ } /^\./ { o++ }
    END { printf "%s\t%d\t%d\t%d\t%d\n", step, s, d, n, o }' "$TMP/out" >> "$TMP/counts"
  awk '/^(<f|\*deleting|cd|\.)/' "$TMP/out" >> "$TMP/changes"
}

# runs a script on the server with DEPLOYPATH set, as in .cpanel.yml, or in a dry run prints it; $1 = what it does.
# umask 022: the folders it makes get 755 like the rest (rsync sets the mode of everything it sends itself)
remote() {
  local script line
  script="umask 022
DEPLOYPATH=$P
$(cat)"
  if [ "$DRY_RUN" = 1 ]; then
    say "-- $1: on the server this would run"
    while IFS= read -r line; do say "     $line"; done <<< "$script"
  else
    say "-- $1"
    "${SSH[@]}" "$T" /bin/sh -es <<< "$script" || die "the server could not $1"
  fi
}

# --- Deploy

say "Deploying $(git log -1 --format='%h %s') to $SSH_USER@$SSH_HOST:$P"
if [ "$DRY_RUN" = 1 ]; then say "Dry run: rsync -n lists what would change; the server commands are printed, not run."; fi
say "-- checking the server"
"${SSH[@]}" "$T" "test -d $P && command -v rsync > /dev/null && rsync --version | head -n 1" \
  || die "cannot use $P with rsync on $SSH_HOST:$SSH_PORT over SSH (see the message above)"

remote "make the folders (.cpanel.yml lines 11, 13, 14)" << EOF
for d in ${GENERATED[*]}; do [ -f "\${DEPLOYPATH}\$d" ] && /bin/rm -f "\${DEPLOYPATH}\$d"; /bin/mkdir -p "\${DEPLOYPATH}\$d"; done
/bin/mkdir -p \${DEPLOYPATH}feeds
/bin/mkdir -p \${DEPLOYPATH}data
EOF
send "root files (line 8)" "${root[@]}" "$T:$P"
if [ ${#extra[@]} -gt 0 ]; then send "more root files (line 9)" "${extra[@]}" "$T:$P"; fi
# before the pages: they link the stylesheets in css/, which must be there first (a page sent earlier would load none)
send "sitemaps, fonts and stylesheets (line 12)" "${DIRS[@]}" "$T:$P"
send "root pages (line 10)" "${PAGES[@]}" "$T:$P"
send "generated folders, with --delete (line 11)" --delete "${GENERATED[@]}" "$T:$P"
send "feeds/.htaccess (line 13)" feeds/.htaccess "$T:${P}feeds/"
send "data (line 14)" "${DATA[@]}" "$T:${P}data/"
send "profiles, logos, images and maps (line 15)" "${PROFILES[@]}" "$T:$P"
if [ ${#kinds[@]} -gt 0 ]; then send "other profile kinds (line 16)" "${kinds[@]}" "$T:$P"; fi
remote "clean up (.cpanel.yml lines 17-19)" << 'EOF'
/bin/rm -f ${DEPLOYPATH}index.html ${DEPLOYPATH}about.html ${DEPLOYPATH}research.html ${DEPLOYPATH}research-series.html ${DEPLOYPATH}profiles.html ${DEPLOYPATH}community.html ${DEPLOYPATH}contributors.html ${DEPLOYPATH}dataset.html ${DEPLOYPATH}explorer.html
/bin/rm -f ${DEPLOYPATH}empire/*.html
/bin/rm -f ${DEPLOYPATH}generator.html ${DEPLOYPATH}epoch-institute-empire-dataset.csv ${DEPLOYPATH}epoch-institute-empire-dataset.json
EOF

# --- Summary

if [ "$DRY_RUN" = 1 ]; then
  title="Dry run of $(git rev-parse --short HEAD), nothing changed ($SECONDS s): what a deploy would do"
  cols="to send|to delete"
else
  title="Deployed $(git rev-parse --short HEAD) in $SECONDS s"
  cols="sent|deleted"
fi
say ""
say "$title"
awk -F '\t' -v c="$cols" 'BEGIN { split(c, h, "|") }
  { printf "  %-44s %6d %s, %5d %s, %4d new folders, %5d other changes\n", $1, $2, h[1], $3, h[2], $4, $5 }' "$TMP/counts"
if [ "${GITHUB_ACTIONS:-}" = true ]; then
  # the same summary and the first changes as a note at the top of the run's page
  msg=$(awk -F '\t' -v c="$cols" 'BEGIN { split(c, h, "|") }
    { printf "%%0A%s: %d %s, %d %s, %d new folders, %d other changes", $1, $2, h[1], $3, h[2], $4, $5 }' "$TMP/counts")
  first=$(awk 'NR <= 20 { printf "%%0A  %s", $0 } END { if (NR > 20) printf "%%0A  … and %d more", NR - 20 }' "$TMP/changes")
  say "::notice title=Deploy summary::$title$msg$first"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    say "### $title"
    say ""
    say "| Step | Files ${cols%|*} | Files ${cols#*|} | New folders | Other changes |"
    say "|---|---:|---:|---:|---:|"
    awk -F '\t' '{ printf "| %s | %d | %d | %d | %d |\n", $1, $2, $3, $4, $5 }' "$TMP/counts"
  } >> "$GITHUB_STEP_SUMMARY"
fi
