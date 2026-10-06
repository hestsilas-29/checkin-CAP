# CAP Cadet Check-In

Scan a CAP membership card barcode, log the CAPID, and email staff an attendance report at a set time.

- **Front end:** `index.html` (scanner) and `config.html` (settings), hosted free on GitHub Pages.
- **Back end:** `Code.gs` in Google Apps Script, storing data in a Google Sheet and sending the email. GitHub Pages cannot send scheduled email by itself, so this part does it, even when no computer is on.

## Setup (about 15 minutes)

### 1. Back end
1. Create a new Google Sheet (name it anything, e.g. "Squadron Attendance").
2. **Extensions > Apps Script.** Delete the starter code and paste in all of `Code.gs`.
3. Check `TZ` at the top of the file (default `America/New_York`).
4. Choose the function **setup** in the toolbar and click **Run**. Approve the permissions (it needs the Sheet and permission to send mail). This creates the `Log` tab and the 10-minute timer.
5. **Deploy > New deployment > Web app.** Execute as: **Me**. Who has access: **Anyone**. Deploy, then copy the Web app URL.

### 2. Front end
1. Paste that URL into `config.js` as `API_URL`.
2. Create a GitHub repository and upload `index.html`, `config.html`, `config.js`.
3. **Settings > Pages**, set the source to the `main` branch, root folder. Your site will be at `https://<user>.github.io/<repo>/`.

### 3. First-time configuration
1. Open `.../config.html`, leave the PIN blank, click **Load settings**.
2. Enter staff email(s), the send time, a station code, and choose an admin PIN. Save.
3. Click **Send test email now** to confirm email works.
4. Open `.../index.html` on the scanning computer and enter the station code.

## How it behaves
- The scanner acts like a keyboard: it types the barcode digits. The page checks in automatically as soon as 6 digits are entered (Enter also works). Test with a real card to confirm the barcode reads as the CAPID.
- The station code is kept in memory only, so it is requested again every time the page is refreshed or reopened.
- One entry per CAPID per day; rescans show "Already checked in".
- If the internet drops, scans are saved in the browser (without the station code) and uploaded once the code is entered and the connection returns.
- The email goes out once per day, at or after the configured time (checked every 10 minutes, so it can arrive up to ~10 minutes late), and only if someone checked in. It has a table of times and CAPIDs plus a CSV attachment.
- Everything is also in the `Log` tab of your Sheet.

## Privacy notes
The repo holds no cadet data, and the system stores only CAPIDs and check-in times, no names. They live in your Google Sheet, so keep it shared with staff only.

## Limits
Free Google accounts can send about 100 emails per day via Apps Script, which is plenty for this.0 emails per day via Apps Script, which is plenty for this.
