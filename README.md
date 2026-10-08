# CAP Cadet Check-In

A simple CAP attendance station with both a keyboard barcode-reader mode and a phone-camera mode.

## Features

- **Scanner page:** `index.html` for a USB/Bluetooth barcode scanner that types CAPIDs like a keyboard.
- **Camera page:** `camera/index.html`, available at `/camera/` on GitHub Pages, for supported phone browsers with a rear camera.
- **Google Sheets:** `Log` is always the first sheet and keeps the master history. Each new date automatically gets its own attendance sheet after `Log`.
- **Roster:** optional `Roster` sheet maps CAPIDs to names and stays last so the dated attendance tabs remain together.
- **Offline queue:** scans are stored in the browser until the connection returns; the station code is not stored in the queue.
- **Email reports:** a scheduled Apps Script trigger emails staff once per day when there are check-ins.

## Google Sheets layout

The workbook is kept in this order:

1. **Log** — `Date | Time | CAPID | Name`
2. **10-8-26** — the attendance for 10/8/26, with `CAPID | Time | Name`
3. **Next meeting date** — same format
4. More dated attendance tabs as needed
5. **Roster** — `CAPID | Name`

Google Sheets does not accept `/` in a sheet-tab name, so the tab uses a dash format such as `10-8-26`. The dated sheet itself displays the exact date as `10/8/26` at the top.

## Setup

### 1. Back end

1. Create or open the Google Sheet that will hold attendance.
2. **Extensions > Apps Script.** Replace the existing `Code.gs` with the provided version.
3. Check `TZ` near the top of `Code.gs` (default `America/New_York`).
4. Run **`setup`** once from the Apps Script editor and approve the permissions.
   - Creates/repairs the `Log` and `Roster` tabs.
   - Moves `Log` to the first tab and `Roster` to the last tab.
   - Creates dated attendance tabs for any existing rows in `Log`.
   - Creates the scheduled email trigger.
5. **Deploy > New deployment > Web app.** Execute as **Me**. Who has access: **Anyone**.
6. Copy the Web App URL.

### 2. Front end

Put these files in the same GitHub Pages repository:

- `index.html`
- `config.html`
- `config.js`
- `app.css`
- `camera/index.html`

Set the Apps Script Web App URL in `config.js` as `API_URL`.

Your normal scanner page will be your site root, and the camera page will be at `/camera/` relative to that site.

### 3. First-time configuration

1. Open `.../config.html`.
2. Leave the current Admin PIN blank on first setup and click **Load settings**.
3. Enter staff email(s), the report time, a station code, and a new admin PIN.
4. Save settings.
5. Send a test email.

## Using the scanner page

Open the site root on the scanning computer. Enter the station code once for that page session, then scan CAP membership cards.

The page accepts the scanner's keyboard input and automatically submits once six digits are received. Pressing Enter also submits a scan. Duplicate scans of the same CAPID on the same day are reported as already checked in.

## Using camera mode

Open the `/camera/` page on a supported HTTPS browser. Enter the station code, tap **Start camera**, and hold the barcode inside the on-screen box.

The camera mode uses the browser's built-in `BarcodeDetector` support. If the browser does not provide that API, the page gives a fallback message and the normal barcode-reader page can still be used.

Camera permission must be allowed for the site, and the page must be loaded over HTTPS (GitHub Pages does this automatically).

## Attendance behavior

- One check-in per CAPID per date.
- The master `Log` keeps every recorded check-in.
- A new dated attendance tab is created automatically for the date of the first scan.
- Existing `Log` rows can be backfilled into dated tabs by running `setup` again.
- If a name is present in `Roster`, it is copied into both `Log` and the dated sheet.
- Reports use the master `Log` data.

## Privacy

The GitHub repository contains no cadet roster data. CAPIDs, names, and attendance times are stored in the private Google Sheet. Keep that sheet shared only with authorized staff.
