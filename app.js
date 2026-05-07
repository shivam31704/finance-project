require('dotenv').config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const routes = require("./routes/appRoutes");

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(routes);

app.listen(8080, () => {
  console.log("server is running on port 8080");
});
