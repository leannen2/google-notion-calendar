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

async function getDatabases() {
  const notion = await getNotionClient();

  try {
    const response = await notion.search({
      filter: {
        value: "database",
        property: "object",
      },
      sort: {
        direction: "ascending",
        timestamp: "last_edited_time",
      },
    });
    return response;
  } catch (err) {
    console.log("Error occurred while fetching all databases.");
    reject(err);
  }
}

async function getDatabase() {
  const notion = await getNotionClient();
  const databaseId = "f0790247-3558-443c-8c07-e2d86fa47b69";

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

router.get("/databases", async (req, res) => {
  try {
    response = await getDatabases();
    formatted = response.results.map((result) => ({
      id: result.id,
      title: result.title[0].plain_text,
    }));
    console.log(formatted);
    res.json(formatted);
  } catch (err) {
    res.status(500).send("Fetching databases failed");
  }
});

router.get("/database/:id", async (req, res) => {
  try {
    response = await getDatabase();
    res.json(response);
  } catch (err) {
    res.status(500).send("Fetching database failed");
  }
});

router.get("/", async (req, res) => {
  res.send("working");
});

module.exports = router;
