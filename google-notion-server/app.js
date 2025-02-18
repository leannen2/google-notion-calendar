const express = require("express");

const app = express();
const PORT = 3000;
app.use(express.json());

var googleCalendarRouter = require("./routes/google-calendar");
app.use("/google-calendar", googleCalendarRouter);

var notionRouter = require("./routes/notion");
app.use("/notion", notionRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
