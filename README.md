# Today's Journal Web App

This is a lightweight web app version of your paper "About My Day" sheet, named "Today's Journal" for everyday use.
Journal entries and photos are stored centrally in Supabase for link-based access.

## Features

- Daily form with 2 check-in blocks (Morning and Afternoon)
- Eight emotions with multi-select, plus activities, notes, speech, and O.T.
- Save and load history from any device using the app link
- Automatic saving to shared cloud storage
- Remembers the last child name and staff initials
- Plano ISD 2026-27 holiday, break, and early-release notices
- Previous/next/today controls limited to the current school year, plus separate month and exact-date pickers
- Compact upcoming-holiday banner and automatic "No school" entries on closure days
- Phone-friendly controls and a fixed mobile save button
- Opens directly without a login for anyone who has the app link
- Camera/photo attachments for every check-in (up to 8 per section)
- Searchable past-day archive with month filtering, reopening, editing, and individual deletion
- Familiar low-ink paper-style print view with thin lines, clear spacing, and attached photos
- Small Print action at the top on phone and desktop
- Automatic localized date/time with the device's global IANA timezone

## Run Locally

1. Open this folder in VS Code.
2. Right-click `index.html` and choose "Open with Live Server" (if extension installed),
   or open `index.html` directly in your browser.

You can also run it from a terminal:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`. Use **Fill sample** to preview a completed day without saving it.

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
- Anyone with the link can view, add, edit, or delete journal data, so share the link carefully.

## Supabase Central Storage Setup

1. Open the Supabase project and select **SQL Editor**.
2. Create a new query, paste all of `supabase-setup.sql`, and click **Run**.
3. In **Authentication -> URL Configuration**, set the site URL to
   `https://bement2050.github.io/studentapp/` and add the same value as a redirect URL.
4. Run `supabase-public-access.sql` to enable direct link access without sign-in.

The public/publishable browser key is used by the web app. Never place a secret or
service-role key in this repository.
