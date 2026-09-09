# About My Day Web App

This is a lightweight web app version of your paper "About My Day" sheet.
It stores data in the browser (local storage), so there are no server costs.

## Features

- Daily form with 4 check-in blocks (Morning, Afternoon, Evening, End of day)
- Mood, activities, notes, speech, and O.T.
- Save and load history from the same browser
- Export all saved entries to JSON
- Automatic draft saving and recovery
- Remembers the last child name and staff initials
- Plano ISD 2026-27 holiday, break, and early-release notices
- Previous/next day controls plus a month picker for quickly reviewing saved days
- Compact upcoming-holiday banner and automatic "No school" entries on closure days
- Phone-friendly controls and a fixed mobile save button
- Offline support after the first visit
- Camera/photo attachments for every check-in (up to 8 per section)
- Searchable past-day archive with month filtering, reopening, editing, and individual deletion
- Familiar low-ink paper-style print view with thin lines, clear spacing, and attached photos
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

## Notes About Shared Use

- Local storage means data is saved per browser/device. The built-in sample is never saved unless you click **Save day**.
- Photos are resized before being stored in the browser's device database. JSON export includes the photos as embedded data so the backup is complete.
- If all 3 users share one device/browser, this is perfect.
- If each person uses a different device and you want shared live data, the next step is adding Firebase/Supabase.
