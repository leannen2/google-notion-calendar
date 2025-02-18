var express = require("express");
var router = express.Router();

const fs = require("fs").promises;
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// Google Calendar API setup
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.log("No existing credentials found.");
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 *
 * If no saved credentials,
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items;
}

async function insertEvent(auth, event) {
  const calendar = google.calendar({ version: "v3", auth });
  return new Promise((resolve, reject) => {
    calendar.events.insert(
      {
        auth: auth,
        calendarId: "primary",
        resource: event,
      },
      (err, event) => {
        if (err) {
          console.error(
            "There was an error contacting the Calendar service:",
            err
          );
          reject(err);
        } else {
          console.log("Event created: ", event.data);
          resolve(event.data);
        }
      }
    );
  });
}

// Express routes
router.get("/auth", async (req, res) => {
  try {
    const authClient = await authorize();
    res.send("Authorization successful, you can now list events.");
  } catch (error) {
    console.error("Authorization failed", error);
    res.status(500).send("Authorization failed");
  }
});

router.get("/events", async (req, res) => {
  try {
    const authClient = await authorize();
    const events = await listEvents(authClient);
    res.json(events);
  } catch (error) {
    console.error("Failed to retrieve events", error);
    res.status(500).send("Failed to retrieve events");
  }
});

router.post("/events", async (req, res) => {
  const body = req.body;
  console.log("body ", body);
  try {
    const authClient = await authorize();
    const response = await insertEvent(authClient, body);
    res.json(response);
  } catch (error) {
    console.error("Failed to insert event", error);

    // Use the statusCode from the error object or default to 500 if not provided
    const statusCode = error.code || 500;
    res.status(statusCode).send("Failed to insert event: " + error.message);
  }
});

module.exports = router;
