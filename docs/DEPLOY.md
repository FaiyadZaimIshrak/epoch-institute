# Deploying the site

Every push to `master` deploys the site. The workflow `.github/workflows/deploy.yml` checks out the commit and runs
`scripts/deploy.sh`. The script copies the site over SSH with rsync into `/home/theeiorh/public_html/` on
`server905.web-hosting.com` (port 21098).

The script does what `.cpanel.yml` did when cPanel deployed from its own clone of the repository: the same files and
folders, in the same order, with the same clean-up. That clone is no longer needed.

## What a deploy does

| Step | `.cpanel.yml` line | Sent to public_html |
|---|---|---|
| Make folders | 11, 13, 14 | removes a *file* named like one of the 12 generated folders; makes those folders, `feeds/` and `data/` |
| Root files | 8 | `*.html` `*.css` `*.js` `*.csv` `*.json` `.htaccess`. `generator.html` is never sent: line 19 deletes it anyway |
| More root files | 9 | `*.txt` `*.xml` `*.svg` `*.png` `*.ico`, those that exist |
| Root pages | 10 | `index` `about` … `write` `faiths` (the PAGES list in the script) |
| Generated folders | 11 | `encyclopedia` `state` `today-in-history` `countries` `centuries` `paths` `speeches` `years` `people` `essays` `articles` `teachers`, **with `--delete`** |
| Sitemaps and fonts | 12 | `sitemaps/` `fonts/` |
| Feed settings | 13 | `feeds/.htaccess` only |
| Data | 14 | `data/.htaccess`, five JSON files, `days/` `enc-preview/` `states/` `scribe/` `faiths/` |
| Profiles and pictures | 15 | `empire/` `religion/` `language/` `logos/` `images/` `maps/` |
| Other profile kinds | 16 | `culture/` `ideology/` `movement/`, once they exist |
| Clean up | 17–19 | deletes the old `*.html` pages, `empire/*.html`, `generator.html` and the old empire dataset files |

- **Only changed files are sent.** Files are compared by checksum, because a fresh checkout gives every file a new
  time.
  - rsync writes each file under a temporary name and then renames it, so a visitor never gets half a file.
  - Files that did not change are left alone and keep their Last-Modified date.
  - Comparing means the server reads the whole site once (about 1.3 GB), so a deploy takes a few minutes.
- **Nothing else in public_html is deleted.** Deletions happen only inside the 12 generated folders (pages no longer in
  the repository) and to the files named in lines 17–19.
  - `feeds/today.xml`, written by the daily-feed workflow, is never touched.
  - Pictures, profiles and other files removed from the repository stay on the server, as before.
- **One deploy at a time.**
  - A push that arrives during a deploy waits for it to finish.
  - Dry runs queue separately, so they never delay or replace a real deploy.
  - Runs from any branch other than `master` are always dry runs.
- **Any failure stops the deploy and turns the run red:** a missing file, an SSH or rsync error, or a site that
  doesn't answer afterwards.

## Secrets

Add these in GitHub under Settings → Secrets and variables → Actions → New repository secret.

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | the private key made below: the whole file, including the BEGIN and END lines |
| `SSH_HOST` | `server905.web-hosting.com` |
| `SSH_PORT` | `21098` (Namecheap's SSH port on shared hosting, not 22) |
| `SSH_USER` | `theeiorh` |

The daily feed still writes `feeds/today.xml` through cPanel's API, so keep `CPANEL_HOST`, `CPANEL_USER` and
`CPANEL_API_TOKEN`. `CPANEL_REPO_PATH` is no longer used.

## One-time setup

1. **Make a key**, in PowerShell. Press Enter twice when asked for a passphrase, so it has none:
   ```powershell
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$HOME\.ssh\epoch-deploy"
   ```
2. **Authorize it in cPanel.**
   1. Open Security → SSH Access → Manage SSH Keys → Import Key.
   2. Name it `github-actions-deploy`.
   3. Paste the contents of `epoch-deploy.pub` into *Public Key*, leave the private key box empty, then click Import.
   4. Back in the list, click Manage next to the key, then Authorize.
3. **Try it.** Answer `yes` only if the fingerprint shown matches one below; the command then prints rsync's version.
   ```powershell
   ssh -i "$HOME\.ssh\epoch-deploy" -p 21098 theeiorh@server905.web-hosting.com "rsync --version"
   ```
4. **Add the four secrets.** This copies the private key for `SSH_PRIVATE_KEY`:
   ```powershell
   Get-Content "$HOME\.ssh\epoch-deploy" -Raw | Set-Clipboard
   ```
   Keep the key file somewhere safe, or delete it: GitHub keeps its own copy.

**Server host keys**, as seen on 27 Oct 2026. The "Set up SSH" step prints the keys it receives each run. If they ever
change, ask Namecheap before you trust the new ones.

| Type | Fingerprint |
|---|---|
| ED25519 | `SHA256:CHQ6+V9NDVHrm930HwO1nGIOQM1/dx+4LBsIdwGMKmo` |
| ECDSA | `SHA256:LylRmYeDDVtE8qk2lGalsMJdrfN57ili5fDYwnfYNmY` |
| RSA | `SHA256:vKZJ1RDYbnCXB/YvrwZT7E+Rmdf/BDIOV9wtD8WcUkY` |

## Dry run

A dry run lists what a deploy would change and changes nothing: it uses `rsync -n`, and the server commands are printed
instead of run.

- **In GitHub:**
  1. Open Actions → Deploy → Run workflow.
  2. Pick the branch. Leave "Dry run" ticked; it is ticked by default.
  3. Click Run workflow.

  The "Deploy" step lists each change under its step, and the run's page shows a summary table.
- **By hand**, from a clean clone (see below):
  ```bash
  DRY_RUN=1 SSH_KEY_FILE=~/.ssh/epoch-deploy scripts/deploy.sh
  ```

How to read the lines rsync prints:

| Line starts with | Meaning |
|---|---|
| `<f+++++++++` | a new file to send |
| `<fcs......` | a changed file to send (`c` checksum, `s` size) |
| `*deleting` | a file to delete; this happens only in the generated folders |
| `cd+++++++++` | a new folder |
| `.f...p.....` | permissions to set (files 644, folders 755) |

## Deploy by hand

You need bash, rsync and ssh: Linux, macOS or WSL. Git Bash on Windows has no rsync. If you can't use one of those,
use Run workflow with "Dry run" unticked instead.

The script deploys only a clean checkout of a commit. It stops if a deployed file is changed, untracked or ignored, or
has Windows line endings from `core.autocrlf`. Add the server's host key to `~/.ssh/known_hosts` first: connect once
with `ssh`, and check the fingerprint.

```bash
git clone https://github.com/FaiyadZaimIshrak/epoch-institute.git && cd epoch-institute
git checkout <commit>
DRY_RUN=1 SSH_KEY_FILE=~/.ssh/epoch-deploy scripts/deploy.sh   # look first
SSH_KEY_FILE=~/.ssh/epoch-deploy scripts/deploy.sh
```

A run by hand does not queue with the workflow. Check the Actions tab first to make sure no deploy is running.

The script reads these settings from the environment:
- `SSH_HOST`, `SSH_PORT`, `SSH_USER`: default to the values above.
- `SSH_KEY_FILE`: otherwise ssh's own keys and agent are used.
- `DEPLOY_PATH`: default `/home/theeiorh/public_html/`.
- `DRY_RUN`.

## Roll back

- **Revert in git and push.** This is the preferred way and it lasts. Run `git revert <bad commit>` and push; the
  deploy sends the reverted files.
- **Deploy an older commit.**
  1. Open Actions → Deploy → Run workflow.
  2. Under "Use workflow from", pick `master`.
  3. Untick "Dry run".
  4. Under "Commit", give the full SHA of a good commit.

  The next push deploys `master` again, so revert in git as well to make it stick. The commit must be from after the
  switch to SSH, because it needs `scripts/deploy.sh`; to go back further, revert in git.
- **Re-run an old deploy.** On the run of a good commit, click "Re-run all jobs". GitHub allows this for 30 days, and
  the run deploys that commit with that commit's own workflow.

The generated folders end up exactly as in the older commit. Files added since then elsewhere stay on the server, such
as a new picture, as they did with cPanel.

## Switching over from cPanel

1. Do the one-time setup.
2. Do a dry run from the `deploy-over-ssh` branch. Expect nothing, or almost nothing, to send or delete: the server
   already holds `master` as cPanel deployed it.
3. Merge the pull request. The push to `master` runs the first real deploy; check that it is green and sent little or
   nothing.
4. Remove cPanel's clone. In cPanel → Files → Git Version Control, click Remove next to the repository. That only takes
   it off cPanel's list, so then delete the folder itself, over SSH or with the File Manager:
   ```bash
   rm -rf /home/theeiorh/repositories/epoch-institute
   ```
   File usage (inodes) in cPanel's Statistics should drop by about 95,000.
5. Delete the `CPANEL_REPO_PATH` secret.
6. Later, delete `.cpanel.yml`, and its mentions here and in `CLAUDE.md`.

Until step 4, reverting the pull request brings back the deploy through cPanel.

## When something goes wrong

| Message | What to do |
|---|---|
| Missing repository secret | Add it (see Secrets). |
| SSH_PRIVATE_KEY is not a private key without a passphrase | Paste the whole private key file. If it has a passphrase, make a new key without one. |
| ssh-keyscan got no host key | The server did not answer: check `SSH_HOST` and `SSH_PORT` (21098). |
| Permission denied (publickey) | The key isn't authorized in cPanel (Manage → Authorize), or `SSH_USER` is wrong. |
| Host key verification failed | The host key changed (check with Namecheap) or isn't in `known_hosts` (by hand). |
| missing from the checkout | A file or folder in the copy lists is gone from the commit. Restore it, or take it out of the lists in `scripts/deploy.sh`. |
| deploy a clean checkout of a commit | By hand: commit or stash your changes. On Windows, deploy from Actions. |

## Changing what is deployed

The lists at the top of `scripts/deploy.sh` mirror `.cpanel.yml` line by line:
- a new file at the root must match one of the root patterns;
- a new root page goes in `PAGES`;
- a new folder that should mirror the repository exactly, with `--delete`, goes in `GENERATED`;
- a new profile folder goes in `PROFILES`.
