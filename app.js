require("dotenv").config();
var express = require("express");
var cors = require("cors");
var path = require("path");
var mongoose = require("mongoose");
const superuser = require("./models/superuser");


//DATABASE CONNECTION

var db = mongoose
  .connect(process.env.conString)
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

//Express APP
var app = express();

//MIDDLEWARES
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//ROUTES
superuserRouter = require("./routes/superuser.route")
app.use("/superuser", superuserRouter);

adminRouter = require("./routes/admin.route")
app.use("/admin", adminRouter)

//DEVELOPMENT SERVER

//Get port from environment and store in Express.
const port = process.env.PORT || "3000";
app.listen(port);
console.log("Server listening on port " + port);
console.log(`Visit http://localhost:${port}/`);
