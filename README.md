# Today's Journal Web App

This is a lightweight web app version of your paper "About My Day" sheet, named "Today's Journal" for everyday use.
Journal entries and photos are stored centrally in Supabase for link-based access.

## Features

- Daily form with 2 check-in blocks (Morning and Afternoon)
- Eight emotions with multi-select, plus activities, notes, speech, and O.T.
- Save and load history from any device using the app link
- Automatic saving to shared cloud storage
- Remembers the last child name and staff initials
- Plano ISD 2026-27 calendar notices (holiday, break, early release)
- Compact date picker at the top and unlimited previous/next/today navigation at the bottom
- Automatic "No school" entries on closure days
- Phone-friendly controls with automatic saving
- Password-protected sign-in for the three configured staff accounts
- Keeps users signed in on their device by default
- Lets every user change their password; the superuser can change any account password
- Camera/photo attachments for every check-in (up to 8 per section)
- Familiar low-ink paper-style print view with thin lines, clear spacing, and attached photos
- Small Print action at the top on phone and desktop
- Automatic localized date/time with the device's global IANA timezone
- Google Cloud voice typing for daily notes and parent notes

## Run Locally

1. Open this folder in VS Code.
2. Right-click `index.html` and choose "Open with Live Server" (if extension installed),
   or open `index.html` directly in your browser.

You can also run it from a terminal:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy for Free (GitHub Pages)

1. Create a new GitHub repo.
2. Push this folder to the repo.
3. In GitHub: `Settings -> Pages`.
4. Under "Build and deployment":
   - Source: `Deploy from a branch`
   - Branch: `main` and `/ (root)`
5. Save. Wait around 1 minute.
6. Your app URL will look like:
   `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/`

## Notes About Central Storage

- Entries and photos are stored in Supabase, not in browser storage or the GitHub repository.
- Photos are resized before secure upload. JSON export includes the photos as embedded data so the backup is complete.
- The app requires an internet connection to read or save journal data.
- The sign-in screen protects normal access to the app. Password changes are stored as
  salted hashes in that browser, so a changed password applies to that browser/device.
- Supabase currently uses link-based public database policies. The browser login is an
  access gate, not server-enforced security; do not use it for sensitive records without
  migrating the Supabase policies to authenticated users.

## Staff Accounts

- `JKarim` / `Karim2026`
- `Amamo` / `Mamo2026`
- `BAlemayehu` / `B9!vQ2#L7@pX` (superuser)
- `SGebreyes` / `Sunrise!482`
- `GChere` / `Cobalt#731`
- `TAlemayehu` / `Maple$864`
- `AAlemayehu` / `River@295`

Open **Account** after signing in to change a password. `BAlemayehu` can select and
change any configured user's password. The daily opening/closing report is only shown
after an admin or superuser signs in; currently `BAlemayehu` is the only privileged viewer.

Run the latest `supabase-public-access.sql` in Supabase SQL Editor to enable shared
opening/closing totals across devices. Until then, the report uses activity from the
current browser only.

The privileged usage report includes per-user daily totals, exact opening and closing
times, every journal date viewed, session duration, active/incomplete sessions, device
type, browser, platform, and timezone. It retains up to 30 days in the report and is
available only from an admin or superuser account.

## Supabase Central Storage Setup

1. Open the Supabase project and select **SQL Editor**.
2. Create a new query, paste all of `supabase-setup.sql`, and click **Run**.
3. In **Authentication -> URL Configuration**, set the site URL to
   `https://bement2050.github.io/studentapp/` and add the same value as a redirect URL.
4. Run `supabase-public-access.sql` to enable direct link access without sign-in.

The public/publishable browser key is used by the web app. Never place a secret or
service-role key in this repository.

## Google Cloud Speech-to-Text Setup

The microphone buttons send short recordings to the server-side function in
`speech-function/`. The Google service-account JSON must stay outside this repository;
never copy it into `app.js` or commit it to GitHub.

Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), then deploy
from this folder in PowerShell:

```powershell
gcloud auth login
gcloud config set project evocative-lodge-442118-j6
gcloud services enable speech.googleapis.com cloudfunctions.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com
gcloud functions deploy transcribeAudio --gen2 --runtime=nodejs24 --region=us-central1 --source=speech-function --entry-point=transcribeAudio --trigger-http --allow-unauthenticated --service-account=speech-to-text-sa@evocative-lodge-442118-j6.iam.gserviceaccount.com --memory=256MiB --timeout=70s --max-instances=2
```

The Google account used with `gcloud auth login` must be an owner or otherwise have
permission to enable services and deploy Cloud Functions. The deployed function runs as
the limited `speech-to-text-sa` service account represented by the provided JSON key.

The browser endpoint is configured as `APP_CONFIG.speechToTextUrl` in `app.js`. If the
deploy command returns a different URL, replace that setting. Microphone access works on
HTTPS (including GitHub Pages) or localhost and requires the user to grant permission.
