# Google Sheets Email Capture Setup

This project is already wired to submit waitlist emails to a Google Apps Script web app.

## Sheet used

- Spreadsheet ID: `1HfXszHABOCBmgcOfWjtup0ScSWK65yZDlEIk_AC2rvY`
- Suggested tab name: `Signups`

## 1. Add Apps Script code

1. Open your Google Sheet.
2. Go to `Extensions` -> `Apps Script`.
3. Replace the editor contents with:
   - [`docs/google-apps-script/Code.gs`](./google-apps-script/Code.gs)
4. Save.

## 2. Deploy as web app

1. Click `Deploy` -> `New deployment`.
2. Type: `Web app`.
3. Execute as: `Me`.
4. Who has access: `Anyone`.
5. Deploy and authorize access.
6. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/.../exec`).

## 3. Configure the website

1. Open [`index.html`](../index.html).
2. Find `GOOGLE_SHEETS_SIGNUP_ENDPOINT`.
3. Replace `REPLACE_WITH_GOOGLE_APPS_SCRIPT_WEB_APP_URL` with your deployed Web app URL.

## 4. Verify

1. Submit a test email on the homepage.
2. Confirm a new row appears in the `Signups` tab.
3. Submit the same email again to verify duplicate handling ("You're already on the list.").
