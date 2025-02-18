var express = require("express");
var router = express.Router();

const fs = require("fs").promises;
const path = require("path");

const { Client } = require("@notionhq/client");
const TOKEN_PATH = path.join(process.cwd(), "notion-token.json");

async function getNotionClient() {
  try {
    const token_content = await fs.readFile(TOKEN_PATH, "utf8");
    var NOTION_API_KEY = JSON.parse(token_content)["token"];
    console.log("token: ", NOTION_API_KEY);
    const notion = new Client({ auth: NOTION_API_KEY });
    return notion;
  } catch (err) {
    console.log("No token found.");
    return null;
  }
}

async function getDatabase() {
  const notion = await getNotionClient();
  const databaseId = "f07902473558443c8c07e2d86fa47b6";

  try {
    var response = await notion.databases.retrieve({ database_id: databaseId });
    return response;
  } catch (err) {
    console.log("Error occurred while fetching database: ", err);
    reject(err);
  }
}

async function queryDatabase() {
  const notion = await getNotionClient();
  const databaseId = "f07902473558443c8c07e2d86fa47b69";

  var response = await notion.databases.query({
    database_id: databaseId,
    page_size: 100,
    start_cursor: undefined,
  });
  var allResponses = [...response.results];
  while (response.has_more) {
    response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: response.next_cursor,
    });
    allResponses = [...allResponses, ...response.results];
  }
  //   console.log(response);
  return allResponses;
}

router.get("/pages", async (req, res) => {
  try {
    response = await queryDatabase();
    res.json(response);
  } catch (error) {
    console.error("Fetching pages failed", error);
    res.status(500).send("Fetching pages failed");
  }
});

router.get("/database/:id", async (req, res) => {
  try {
    response = await getDatabase();
    res.json(response);
  } catch (err) {
    res.status(err.status).send(err.body);
  }
});

router.get("/", async (req, res) => {
  res.send("working");
});

module.exports = router;
