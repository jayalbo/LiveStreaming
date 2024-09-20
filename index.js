require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

// Serve static files from the "event" directory
app.use("/event", express.static(path.join(__dirname, "event")));
app.use("/admin", express.static(path.join(__dirname, "event/admin.html")));

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Agora Events Server is running!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
