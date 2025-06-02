var express = require("express");
var cors = require("cors");
var path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
const University = require("./models/university");
const {globalLimiter} = require("./middlewares/rateLimiter")


//MONGODB DATABASE CONNECTION

var db = mongoose
  .connect(process.env.CONN_STRING, { dbName: "edumatch" })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

//Express APP
var app = express();
app.set('trust proxy', 1 /* number of proxies between user and server */)
//app.get('/ip', (request, response) => response.send(request.ip))
const corsOptions = { origin: "https://edumatch.netlify.app", credentials: true };
app.use(cors(corsOptions));
//app.options('*', cors(corsOptions));
//MIDDLEWARES
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.text({ type: "text/csv", limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(globalLimiter); //rate limit


//ROUTES
/* app.get("/", corsObj, (req, res) => {
  res.status(200).send({ message: "hello" });
}); */

app.get("/universities", async (req, res) => {
  try {
    const response = await University.find({}).select('-__v'); //dont send version
    
    return res.status(200).json(response);
  } catch (err) {
    console.log(err)
    return res.status(500).send({message: err.message, code: 'UNKNOWN_ERROR'})
  }
})

/* superuserRouter = require("./routes/superuser.route");
app.use("/superuser", superuserRouter); */

adminRouter = require("./routes/admin.route");
app.use("/admin", adminRouter); //used cors on admin routes

studentRouter = require("./routes/student.route");
app.use("/student", studentRouter); //used cors on student routes

passwordRouter = require("./routes/password.route");
app.use("/password", passwordRouter); //used cors on student routes

//DEVELOPMENT SERVER

//Get port from environment and store in Express.
const port = process.env.PORT || "3000";
app.listen(port);
console.log("Server listening on port " + port);
console.log(`Visit http://localhost:${port}/`);



//NEO4J CONNECTION

//const neo4j = require('neo4j-driver')

//const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
//driver.getServerInfo().then(serverInfo=>console.log('Connected to Neo4J', serverInfo)).catch(err=>console.log(err));


/* const myFunc = async () => {
  
  // Use the driver to run queries
  for(let i = 1; i < 45; i++)
  {
      await driver.executeQuery(
          'CREATE (:Option {name: $name})',
           { name: `a${i}` },
           { database: 'neo4j' }
      )
      await driver.executeQuery(
          'CREATE (:Option {name: $name})',
           { name: `b${i}` },
           { database: 'neo4j' }
      )
        
  }
  
  console.log("done")
  await driver.close()

};
myFunc(); */
