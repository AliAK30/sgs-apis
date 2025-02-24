require("dotenv").config();
var express = require("express");
var cors = require("cors");
var path = require("path");
var mongoose = require("mongoose");
var bodyParser = require("body-parser")






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
app.use(bodyParser.text({ type: 'text/csv', limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//ROUTES
superuserRouter = require("./routes/superuser.route")
app.use("/superuser", superuserRouter);

adminRouter = require("./routes/admin.route")
app.use("/admin", adminRouter)

studentRouter = require("./routes/student.route")
app.use("/student", studentRouter)

//verify email addresses
app.use("/verify", async (req, res) => {
  const url = `https://api.quickemailverification.com/v1/verify?email=${req.query.email}&apikey=${process.env.API_KEY}`
  try {
    const response = await fetch(url)
    if (response.status === 200) {
      res.send(await response.json())
    }
    
  } catch (err) {
    console.log(err.message)
    res.status(500).send(err.message)
  }
});

//DEVELOPMENT SERVER

//Get port from environment and store in Express.
const port = process.env.PORT || "3000";
app.listen(port);
console.log("Server listening on port " + port);
console.log(`Visit http://localhost:${port}/`);
