# CAP Cadet Check-In

Scan a CAP membership card barcode, log the cadet, and email staff an attendance report at a set time.

- **Front end:** `index.html` (scanner) and `config.html` (settings), hosted free on GitHub Pages.
- **Back end:** `Code.gs` in Google Apps Script, storing data in a Google Sheet and sending the email. GitHub Pages cannot send scheduled email by itself, so this part does it, even when no computer is on.

## Setup (about 15 minutes)

### 1. Back end
1. Create a new Google Sheet (name it anything, e.g. "Squadron Attendance").
2. **Extensions > Apps Script.** Delete the starter code and paste in all of `Code.gs`.
3. Check `TZ` at the top of the file (default `America/New_York`).
4. Choose the function **setup** in the toolbar and click **Run**. Approve the permissions (it needs the Sheet and permission to send mail). This creates the `Log` and `Roster` tabs and the 10-minute timer.
5. **Deploy > New deployment > Web app.** Execute as: **Me**. Who has access: **Anyone**. Deploy, then copy the Web app URL.

### 2. Front end
1. Paste that URL into `config.js` as `API_URL`.
2. Create a GitHub repository and upload `index.html`, `config.html`, `config.js`.
3. **Settings > Pages**, set the source to the `main` branch, root folder. Your site will be at `https://<user>.github.io/<repo>/`.

### 3. First-time configuration
1. Open `.../config.html`, leave the PIN blank, click **Load settings**.
2. Enter staff email(s), the send time, a station code, and choose an admin PIN. Save.
3. Click **Send test email now** to confirm email works.
4. On the scanning computer, open `.../index.html` and enter the station code once.

### 4. Roster (optional but recommended)
Fill the `Roster` tab in the Sheet with `CAPID` in column A and `Name` in column B. Names then appear on the screen and in the email. Unlisted cadets are still logged by CAPID.

## How it behaves
- The scanner acts like a keyboard: it types the barcode digits and presses Enter. The page keeps its input focused. Test with a real card to confirm the barcode reads as the CAPID.
- One entry per cadet per day; rescans show "Already checked in".
- If the internet drops, scans are saved in the browser and uploaded later.
- The email goes out once per day, at or after the configured time (checked every 10 minutes, so it can arrive up to ~10 minutes late), and only if someone checked in. It has a table plus a CSV attachment.
- Everything is also in the `Log` tab of your Sheet.

## Privacy notes
Cadets are minors, so the repo holds no cadet data. Names and CAPIDs live only in your Google Sheet. The station code stops strangers from using the web app URL to look up names. Keep the Sheet shared only with staff.

## Limits
Free Google accounts can send about 100 emails per day via Apps Script, which is plenty for this.
