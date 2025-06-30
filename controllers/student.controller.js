const Student = require("../models/student");
const Group = require("../models/group");
const Friendship = require("../models/friendship")
const Notification = require("../models/notification")
const jwt = require("jsonwebtoken");
const {driver, addToGraph} = require("../neo4j");
const {formatName, getAgeInYears, compressImage, emitToUser, getUserRoom} = require("../utils/helpers")
const containerClient = require("../azure");
const {ObjectId} = require('mongoose').Types
const neo4j = require('neo4j-driver');

exports.register = async (req, res) => {

 try {

  if (req.body.email) {
      req.body.email = req.body.email.trim().toLowerCase();
    }

  if (req.body.first_name) {
      req.body.first_name = formatName(req.body.first_name);
    }
    if (req.body.last_name) {
      req.body.last_name = formatName(req.body.last_name);
    }

  const password =  req.body.password;
  delete req.body.password;
  req.body.questions = new Array(44).fill({q: 0, answer: ''});
  await Student.register(req.body, password);
  return res.status(200).json({ message: "Student registered successfully" });

 } catch (err) {
  switch(err.name) {
    case 'UserExistsError':
      console.error(err);
      return res.status(400).send({ message: err.message });
      
    
    default:
      console.error(console.log(err));
      return res.status(500).send({ message: err.message });
  }
 }
  
};

exports.login = async (req, res) => {
  
  try {
    const io = req.app.get('io');
    
    const { email, password } = req.body;


    const authenticate = Student.authenticate()
    
    const response = await authenticate(email.trim().toLowerCase(), password)
    const user = response.user;
    const sockets = await io.in(`user_${user.id}`).fetchSockets();
    if (sockets.length > 0) {
      return res.status(400).json({message: "You already have a session online!", code:'ALREADY_LOGGED_IN'})
    }
    
    if(!user)
    {
      res.status(401).json({message: "Email or password is incorrent, Please try again!", code: "UNAUTHORIZED",});
      return;
    }
    
  
      // Create a new JSON web token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        allowInsecureKeySizes: true,
        expiresIn: "9999d",
      });
  
      const temp_user = user.toObject();
  
      delete temp_user.hash;
      delete temp_user.salt;
      //temp_user.password = password;
      res.status(200).send({ message: "Login Successful", user: temp_user, token: token });
    
  } catch (err) {
    console.log(err)
    return res.status(500).send({message: err.message, code: 'UNKNOWN_ERROR'})
  }
  
};

exports.checkFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const requesterId = req.userId; // Assuming user is authenticated
    // Validate recipient exists
    const recipient = await Student.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Student does not exist', code:'STUDENT_NOT_FOUND' });
    }

    // Check if friendship already exists
    const friendRequest = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    }).select("status");
    return res.status(200).json(friendRequest);
  }catch (error) {
    console.error('Error retrieving friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

exports.sendFriendRequest =  async (req, res) => {
  try {

    
    const { recipientId } = req.body;
    const requesterId = req.userId; // Assuming user is authenticated

    // Validate recipient exists
    const recipient = await Student.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Student does not exist', code:'STUDENT_NOT_FOUND' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });
    if(existingFriendship) {
      if (existingFriendship.status === 'accepted') {
      return res.status(400).json({ 
        message: 'You are already friends', code:"FRIENDS_ALREADY" 
      });
    } else if(existingFriendship.status === 'pending') {
      return res.status(400).json({ 
        message: 'You have already sent a friend request to this user', code:"FRIEND_REQUEST_PENDING" 
      });
    } else if (existingFriendship.status === 'blocked') {
      return res.status(400).json({ 
        message: 'You can not send a friend request to this user, because you have already been rejected by this user.', code:"FRIEND_REQUEST_DENIED" 
      });
    }
    }
    

    // Create friendship request
    const friendship = new Friendship({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    await friendship.save();

    // Populate requester details for real-time notification
    
    const populatedFriendship = {recipientId: recipientId, requester: {
        _id: req.userId,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        picture: req.user.picture,
        uni_name: req.user.uni_name,
        friendshipId: friendship._id
      } };

    //Create friend request notification
    const notification = new Notification({
      recipient: recipientId,
      payload: populatedFriendship,
      type: 'fr'
    });
    await notification.save();

    // REAL-TIME: Notify recipient
    const io = req.app.get('io');
    emitToUser(io, recipientId, 'friend_request_received', populatedFriendship);

    res.status(200).json({
      message: 'Friend request sent successfully',
      status: friendship.status,
    });

  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.respondToFriendRequest = async (req, res) => {
  try {
    console.log("respond to friend request run")
    const { friendshipId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.userId;

    const friendship = await Friendship.findById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found', code:'NOT_FOUND' });
    }

    // Verify user is the recipient
    if (friendship.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to accept this friend request', CODE:'UNAUTHORIZED' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ message: 'You have already reponded to this friend request', CODE:'ALREADY_RESPONDED' });
    }

    if (action === 'accept') {
      friendship.status = 'accepted';
      friendship.respondedAt = new Date();
      await friendship.save();

        

      // Populate both users for real-time notification
      const populatedFriendship = {requesterId: friendship.requester.toString(), recipient: {
        _id: req.userId,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        picture: req.user.picture,
        uni_name: req.user.uni_name,
        isFavourite: friendship.isFavourite,
      } };

      //Create friend request notification
    const notification = new Notification({
      recipient: friendship.requester.toString(),
      payload: `${req.user.first_name} ${req.user.last_name} has accepted your friend request`,
      type: 'fr_accepted'
    });
    await notification.save();

      // REAL-TIME: Notify requester about acceptance
      const io = req.app.get('io');
      emitToUser(io, friendship.requester.toString(), 'friend_request_accepted', populatedFriendship);

      res.status(200).json(friendship);

    } else if (action === 'decline') {
      friendship.status = 'blocked';
      friendship.respondedAt = new Date();
      await friendship.save();

      /* 
      // REAL-TIME: Notify requester about decline (optional)
      const io = req.app.get('io');
      emitToUser(io, friendship.requester._id, 'friend_request_declined', {
        recipientId: userId
      }); */

      res.status(200).json({ message: 'Friend request declined' });
    } else {
      res.status(400).json({ message: 'This action is not permitted', CODE:'INVALID_ACTION' });
    }

  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    
    const notifications = await Notification.find({recipient: req.userId});
    res.status(200).json(notifications);
  }catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.notificationId);
    res.status(200).json(notification);
  }catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

exports.deleteAllNotifications = async (req, res) => {
  try {
    const response = await Notification.deleteMany({recipient: req.userId, type: {$ne:'fr'}});
    res.status(200).json(response);
  }catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

exports.getFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const friendships = await Friendship.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    }).populate('requester recipient', 'first_name last_name picture uni_name')

    // Format friends list (exclude current user from each friendship)
    const friends = friendships.map(friendship => {
      const friend = friendship.requester._id.toString() === userId.toString() 
        ? friendship.recipient 
        : friendship.requester;
      
      return {
        _id: friend._id,
        first_name: friend.first_name,
        last_name: friend.last_name,
        picture: friend.picture,
        uni_name: friend.uni_name,
        isFavourite: friendship.isFavourite,
      };
    });

    return res.status(200).json(friends);

  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

exports.getStudent = async (req, res) => {
  try {
    const {id} = req.params
    // Fetch the student (excluding `questions`)
    const student = await Student.findById(id)
      .select('-questions -__v') // Exclude the questions field
      .lean(); // Get plain JS object instead of Mongoose document

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: id, recipient: req.userId },
        { requester: req.userId, recipient: id }
      ], status:'accepted'
    });

    // Conditionally remove private fields based on `privacy` settings
    const privacy = student.privacy ?? {};
    if(existingFriendship)
    {
      if (privacy.picture < 1 && student.picture ) delete student.picture;
      if (privacy.email < 1) delete student.email;
      if (privacy.dob < 1) delete student.dob;
      else student.age = getAgeInYears(student.dob);
      if (privacy.phone_number < 1 && student.phone_number) delete student.phone_number;
      if (privacy.gpa < 1 && student.gpa) delete student.gpa;
      if (privacy.learning_style < 1) delete student.learning_style;
    } else {
      if (privacy.picture !== 2 && student.picture ) delete student.picture;
      if (privacy.email !== 2) delete student.email;
      if (privacy.dob !== 2) delete student.dob;
      else student.age = getAgeInYears(student.dob);
      if (privacy.phone_number !== 2 && student.phone_number) delete student.phone_number;
      if (privacy.gpa !== 2 && student.gpa) delete student.gpa;
      if (privacy.learning_style !== 2) delete student.learning_style;
    }
    

    return res.status(200).json(student)
    

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error getting details' });
  }
  
}

exports.updateStudent = async (req, res) => {

  try {
   
    await Student.findByIdAndUpdate(req.userId, {$set: req.body}, {runValidators: true});
    return res.status(200).json({newUser:false});
    
  } catch(error) {
    console.error('Updating student error:', error);
    return res.status(500).json({ message: 'Error updating student' });
  }
}

exports.searchStudents = async (req, res) => {
try {
  
    const searchString = req.query.name;
    let page = parseInt(req.query.page ?? "1");
    if (isNaN(page) || page < 1) page = 1; //check for negative numbers
    const limit = 6;
    const skip = (page - 1) * limit;
    
    if (!searchString || searchString.trim().length < 1) {
      return res.status(400).json({ code: 'INSUFFICIENT_CHARACTERS', message: 'Please provide a search term with at least 1 character' });
    }

    const basePipeline = [
      {
        $addFields: {
          full_name: { $concat: ["$first_name", " ", "$last_name"] },
        },
      },
      {
      $match: {
        full_name: { $regex: searchString, $options: "i" },
        _id: { $ne: new ObjectId(req.userId) } //exclude self
      }
      },
    ];

    // Step 1: Get total count
    const totalCountResult = await Student.aggregate([
      ...basePipeline,
      { $count: "total" },
    ]);
    const totalCount = totalCountResult[0]?.total ?? 0;

    // Step 2: Check if skip is beyond total
    if (skip >= totalCount) {
      
      return res.status(200).json({
      students: [],
      hasMore: false,
      totalCount: totalCount,
      currentPage: page,
    });

    }

    // Step 3: Get paginated results
    const students = await Student.aggregate([
      ...basePipeline,
      {
        $project: {
          _id: 1,
          full_name: 1,
          uni_name: 1,
          picture: {
            $cond: {
              if: { $eq: ["$privacy.picture", 2] },
              then: "$picture",
              else: null,
            },
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);



    const hasMore = skip + students.length < totalCount;
    //console.log(`length: ${students.length}, page ${page}, skip ${skip}`);
    return res.status(200).json({
      students,
      hasMore,
      totalCount,
      currentPage: page,
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Error searching for students' });
  }
}


exports.updateQuestions = async (req, res) => {
  try {
    const student = await Student.findById(req.userId);

    if (student.isSurveyCompleted) {
      return res.status(400).json({
        message: `Dear ${student.first_name}, you have already submitted the answers.`,
        code: 'RESUBMISSION',
      });
    }

    const existingAnswers = Array.isArray(student.questions) ? student.questions : [];
    const incomingAnswers = req.body.answers;

    const bulkOps = [];

    // Handle single-answer case first
    if (incomingAnswers.length === 1) {
      const { q, answer } = incomingAnswers[0];
      const existing = existingAnswers[q-1]
      

      if(answer !== existing.answer)
      await Student.updateOne(
        { _id: req.userId },
        { $set: { [`questions.${q - 1}`]: { q, answer } } }
      );

      
    } else {
      // Handle multiple-answer case
      for (const { q, answer } of incomingAnswers) {
        const existing = existingAnswers[q-1];

        if (existing.answer !== answer) {
          bulkOps.push({
            updateOne: {
                filter: { _id: req.userId },
                update: { $set: { [`questions.${q - 1}`]: { q, answer } } }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await Student.bulkWrite(bulkOps);
      }
    }

    // Set survey completion if flagged
    if (req.body.isSurveyCompleted === true) {
      await Student.updateOne(
        { _id: req.userId },
        { $set: { isSurveyCompleted: true } }
      );
    }

    return res.status(200).json({ message: "Questions updated successfully." });

  } catch (error) {
    console.error("Error updating questions:", error);
    return res.status(500).json({ message: error.message || error });
  }
};


exports.calculateLearningStyle = async (req, res) => {
  try {
    let student = await Student.findById(req.userId);

    let active = 0,
      reflective = 0,
      sensing = 0,
      intuitive = 0,
      visual = 0,
      verbal = 0,
      global = 0,
      sequential = 0;
    for (index in student.questions) {
      if (index % 4 == 0) {
        if (student.questions[index].answer == "a") {
          active++;
        } else {
          reflective++;
        }
      } else if (index % 4 == 1) {
        if (student.questions[index].answer == "a") {
          sensing++;
        } else {
          intuitive++;
        }
      } else if (index % 4 == 2) {
        if (student.questions[index].answer == "a") {
          visual++;
        } else {
          verbal++;
        }
      } else if (index % 4 == 3) {
        if (student.questions[index].answer == "a") {
          global++;
        } else {
          sequential++;
        }
      }
    }
    //console.log(active,reflective, sensing, intuitive, visual, verbal, global, sequential)
    let learning_style = {};
    if (active > reflective) {
      learning_style.dim1 = { name: "Active", score: active - reflective };
    } else {
      learning_style.dim1 = { name: "Reflective", score: reflective - active };
    }
    if (sensing > intuitive) {
      learning_style.dim2 = { name: "Sensing", score: sensing - intuitive };
    } else {
      learning_style.dim2 = { name: "Intuitive", score: intuitive - sensing };
    }
    if (visual > verbal) {
      learning_style.dim3 = { name: "Visual", score: visual - verbal };
    } else {
      learning_style.dim3 = { name: "Verbal", score: verbal - visual };
    }
    if (global > sequential) {
      learning_style.dim4 = { name: "Global", score: global - sequential };
    } else {
      learning_style.dim4 = { name: "Sequential", score: sequential - global };
    }
    //console.log(learning_style)
    const result = await Student.updateOne(
      { _id: req.userId },
      {
        learning_style: learning_style,
      }
    );

    if (result.modifiedCount >= 0) {
      console.log("Learning style updated successfully.");
      student.learning_style = learning_style;
      return res.status(200).json({student});
      if(addToGraph(student))
      {
        return res.status(200).json({student: student,message: "Learning style updated successfully.",});
      } else {
        return res.status(500).send({ message: 'Our Server is down, please try again later, Sorry for the inconvenience!' });
      }

      
    } else {
      return res.status(500).send({ message: 'Our Database Server is down, please try again later, Sorry for the inconvenience!' });
    }

  } catch (error) {
    console.error("Error identifing learning style:", error);
    res.status(500).send({ message: error });
    return;
  }
};

exports.uploadPicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');
    
    const format = req.file.mimetype.split('/')[1];
    console.log(format);
    const buffer = await compressImage(req.file.buffer);
    //console.log(buffer);
    
    // Create unique filename
    const filename = `students/${req.userId}/${Date.now()}-${req.file.originalname}`;
    
    // Upload to Azure
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    
    const response = await blockBlobClient.uploadData(buffer, {
      onProgress: (ev) => console.log(`Uploaded ${ev.loadedBytes} bytes`),
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    
    
    const url = process.env.SAS_URL+filename+process.env.SAS_TOKEN
    //console.log(url);
    const student = await Student.findByIdAndUpdate(req.userId,{picture: url})
    res.status(200).json({ user: student });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).send({message: 'Upload failed'});
  }
}

exports.getSimilarity = async (req, res) => {
  try{

    let {records} = await driver.executeQuery(
      "MATCH (s1: Student {id: $id1})-[:SELECTED]->(opt:Option)<-[:SELECTED]-(s2:Student {id: $id2}) \
      WITH s1, s2, count(opt) as options \
      RETURN toFloat(options)/(88-options)*100 as similarity",
      { id1: req.userId, id2: req.params.id},
      { database: "neo4j" }
    );
    if(records.length===0) return res.status(404).json({message: 'Either of you have not calculated their learning style.', code: 'NO_LEARNING_STYLE'});
    
    const similarity = Math.round(records[0].toObject().similarity);
    //console.log(similarity);
    return res.status(200).json({data1: similarity, data2: 100-similarity});
  }catch (err){
    console.error('Cant check similarity',err);
    return res.status(500).send({message: 'Error checking similarity'});
  }
}

exports.getSimilarities = async (req, res) => {
  try{
    const student = await Student.findById(req.userId);
    if(!student.isSurveyCompleted) return res.status(400).json({code: 'UNIDENTIFIED_LS',message: 'Please answer and submit all the questions on the analytics screen and then try again'});

    let page = parseInt(req.query.page ?? "1");
    if (isNaN(page) || page < 1) page = 1; //check for negative numbers
    const skip = (page - 1) * 6;
    
    let {records} = await driver.executeQuery(
      `MATCH (s1: Student {id: $id})-[:SELECTED]->(opt:Option)<-[:SELECTED]-(s2:Student) \
      WITH s1, s2, count(opt) as options \
      RETURN s2.id as id, s2.name as full_name, toFloat(options)/(88-options)*100 as similarity \
      ORDER BY similarity DESC \
      SKIP $skip \
      LIMIT $limit`,
      {
        id: req.userId,
        skip: neo4j.int(skip),
        limit: neo4j.int(6),
      },
      { database: "neo4j" }
    );
    
    const recordsObj = records.map(record=>record.toObject()).filter(record=>record.similarity>=40);

    
    if(recordsObj.length===0) return res.status(200).json({students: [], currentPage:page, hasMore: false});

    const objectIds = recordsObj.map(record => new ObjectId(record.id));
    

    const students = await Student.find({ _id: { $in: objectIds } })
    .select("_id uni_name")  // only fetch desired fields
    .lean(); // convert Mongoose documents to plain JS objects

    // Create a map from ID to student
    const studentMap = new Map();
    students.forEach(s => studentMap.set(s._id.toString(), s));

    // Reorder to match objectIds array
    const sortedStudents = objectIds.map(id => studentMap.get(id.toString()));
    
    
    for(const i in recordsObj)
    {
      sortedStudents[i].similarity = Math.round(recordsObj[i].similarity);
      sortedStudents[i].full_name = recordsObj[i].full_name;
    }
    
    return res.status(200).json({students: sortedStudents, currentPage:page, hasMore: sortedStudents.length===6});

  }catch (err){
    console.error('Cant check similarity',err);
    return res.status(500).send({message: 'Error checking similarity'});
  }

}

exports.getGroupsOfAStudent = async (req, res) => {
  try {
    const groups = await Group.find({ students: req.params.id }).select("-created_at -students");
    res.status(200).send(groups);
  } catch(err){
    console.error('Cant fetch groups',err);
    return res.status(500).send({message: 'Error fetching groups'});
  }
}

exports.getOneGroup = async (req, res) => {
  try {
    
    const group = await Group.findById(req.params.id).select("students").lean();
    const objectIds = group.students.map(id => 
    {
      if(id!== req.userId)
      return new ObjectId(id)
    }
    );
    
    const students = await Student.find({ _id: { $in: objectIds } }).select("_id first_name last_name gender picture");
    
    return res.status(200).send(students);

  } catch (error) {
    console.error('Error fetching group:', error);
    return res.status(500).json({ message: 'Unknown Error while fetching group' });
  }
}


