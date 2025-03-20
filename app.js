var express = require("express");
var cors = require("cors");
var path = require("path");
require('dotenv').config({ path: path.join(__dirname, '.env') });
var mongoose = require("mongoose");
var bodyParser = require("body-parser")

const neo4j = require('neo4j-driver')


//NEO4J CONNECTION


//const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
//driver.getServerInfo().then(serverInfo=>console.log('Connected to Neo4J', serverInfo)).catch(err=>console.log(err));



//MONGODB DATABASE CONNECTION

var db = mongoose
  .connect(process.env.CONN_STRING, {dbName: 'edumatch'})
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
app.use(cors());

/* {
  origin: "https://edumatch.netlify.app",
  credentials: false,
} */
app.use(bodyParser.text({ type: 'text/csv', limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//ROUTES
app.get("/", (req, res) => {
  res.status(200).send({message:"hello"})
})
superuserRouter = require("./routes/superuser.route")
app.use("/superuser", superuserRouter);

adminRouter = require("./routes/admin.route")
app.use("/admin", adminRouter) //used cors on admin routes

studentRouter = require("./routes/student.route")
app.use("/student", studentRouter) //used cors on student routes

//DEVELOPMENT SERVER

//Get port from environment and store in Express.
const port = process.env.PORT || "3000";
app.listen(port);
console.log("Server listening on port " + port);
console.log(`Visit http://localhost:${port}/`);



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





