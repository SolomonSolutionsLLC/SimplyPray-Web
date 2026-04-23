const SPREADSHEET_ID = "1HfXszHABOCBmgcOfWjtup0ScSWK65yZDlEIk_AC2rvY";
const SHEET_NAME = "Signups";

function doPost(e) {
  try {
    const email = (e && e.parameter && e.parameter.email ? String(e.parameter.email) : "").trim().toLowerCase();
    const source = (e && e.parameter && e.parameter.source ? String(e.parameter.source) : "unknown").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply_(false, "Please enter a valid email address.");
    }

    const sheet = getSheet_();
    if (isDuplicateEmail_(sheet, email)) {
      return reply_(true, "You're already on the list.");
    }

    sheet.appendRow([
      new Date().toISOString(),
      email,
      source,
      e && e.parameter ? JSON.stringify(e.parameter) : "{}"
    ]);

    return reply_(true, "Thanks. You are on the launch notification list.");
  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return reply_(false, "Signup failed: " + err.message);
  }
}

// Also handle GET for easy browser testing: /exec?email=test@example.com&source=test
function doGet(e) {
  return doPost(e);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["timestamp_utc", "email", "source", "raw_payload"]);
  }
  return sheet;
}

function isDuplicateEmail_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim().toLowerCase() === email) {
      return true;
    }
  }
  return false;
}

// ContentService returns JSON with proper CORS headers (unlike HtmlService)
function reply_(ok, message) {
  const payload = JSON.stringify({
    type: "simplypray-signup",
    ok: ok,
    message: message
  });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}
