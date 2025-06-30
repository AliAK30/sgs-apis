var express = require("express");
var cors = require("cors");
var path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
const University = require("./models/university");
const {globalLimiter} = require("./middlewares/rateLimiter")
const http = require('http');
const {Server} = require('socket.io');
const verifyJwt = require("./middlewares/verifyJwt")


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

//HTTP SERVER FOR SOCKET.IO
const server = http.createServer(app);

const corsOptions = {
    origin: [
      "https://edumatch.netlify.app", 
      "http://localhost:8081",
      //"https://localhost:8080",
      "https://edumatch.southeastasia.cloudapp.azure.com"

    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true
}

// INITIALIZING SOCKET.IO
const io = new Server(server, {
  cors: corsOptions,
  // Connection settings for mobile compatibility
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true // Support for older clients if needed
});

// Store io instance in app for access in routes
app.set('io', io);

// Authentication middleware for Socket.IO
io.use(async (socket, next) => {

  try {

    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const role = '/'+socket.handshake.auth.role;
    
    const req= {headers: {
      authorization: `Bearer ${token}`,
      userid: userId
    }, baseUrl: role}

    const res = {edumatch_socket: socket}
    verifyJwt(req, res, next);

  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});



app.set('trust proxy', 1 /* number of proxies between user and server */)


app.use(cors(corsOptions));

//MIDDLEWARES
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.text({ type: "text/csv", limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(globalLimiter); //rate limit


//ROUTES

//app.get('/ip', (request, response) => response.send(request.ip))

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
app.use("/password", passwordRouter);


// SOCKET.IO CONNECTION HANDLING
io.on('connection', (socket) => {

  console.log(`User connected: ${socket.user.first_name} ${socket.user.last_name} (${socket.id})`);
  
  // explicitly joining user to their personal room when they authenticate
  socket.on('join_user_room', (userId) => {

    if (userId) {
      socket.join(`user_${userId}`);
      socket.userId = userId; // Store userId in socket for cleanup
      console.log(`User ${userId} joined room user_${userId}`);
      
      // Notify friends that user is online
      socket.broadcast.emit('user_status_change', { 
        user: socket.user, 
        isOnline: true,
        lastSeen: new Date()
      });
    }
  });
  
  // Handle user going online explicitly
  socket.on('user_online', (userId) => {
    if (userId) {
      socket.broadcast.emit('user_status_change', { 
        user: socket.user,
        isOnline: true,
        lastSeen: new Date()
      });
    }
  });
  
  // Handle user going offline explicitly
  socket.on('user_offline', (userId) => {
    if (userId) {
      socket.broadcast.emit('user_status_change', { 
        user: socket.user, 
        isOnline: false,
        lastSeen: new Date()
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Notify friends that user went offline
    if (socket.userId) {
      socket.broadcast.emit('user_status_change', { 
        user: socket.user, 
        isOnline: false,
        lastSeen: new Date()
      });
    }

    delete socket.userId;
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

});

// SOCKET.IO ERROR HANDLING
io.engine.on("connection_error", (err) => {
  console.log("Socket.IO connection error:", err.req);
  console.log("Socket.IO connection error code:", err.code);
  console.log("Socket.IO connection error message:", err.message);
  console.log("Socket.IO connection error context:", err.context);
});


//Get port from environment and store in Express.
const port = process.env.PORT || "3000";

//DEVELOPMENT SERVER
server.listen(port, ()=> {
  console.log("Server listening on port " + port);
  console.log(`Visit http://localhost:${port}/`);
  console.log("Socket.IO is ready for real-time connections");
});


