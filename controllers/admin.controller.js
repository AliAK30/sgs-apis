const Admin = require("../models/admin");
const Student = require("../models/student");
const Group = require("../models/group");
const Notification = require("../models/notification");
const jwt = require("jsonwebtoken");
const passwordGenerator = require("password-generator");
const {formatName, csvParser, emitToUser} = require("../utils/helpers")
const {ObjectId} = require('mongoose').Types


exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;  
      const authenticate = Admin.authenticate()
      const response = await authenticate(email.trim().toLowerCase(), password)
      const user = response.user;
      
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
        
        res.status(200).send({ message: "Login Successful", user: temp_user, token: token });
      
    } catch (err) {
      console.log(err)
      return res.status(500).send({message: err.message, code: 'UNKNOWN_ERROR'})
    }
    
};

exports.registerAdmin = async (req, res) => {
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
  
  await Admin.register(req.body, password);
  return res.status(200).json({ message: "Admin registered successfully" });

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

exports.getStudentsCount = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ uni_id: req.user.uni_id });
    
    return res.status(200).json(totalStudents);
  } catch (error) {
    console.error('Error getting total number of students:', error);
    return res.status(500).json({ message: 'Error getting total number of students' });
  }
}

exports.getGroupsCount = async (req, res) => {
  try {
    const totalGroups = await Group.countDocuments({ uni_id: req.user.uni_id });
    
    return res.status(200).json(totalGroups);
  } catch (error) {
    console.error('Error getting total number of groups:', error);
    return res.status(500).json({ message: 'Error getting total number of groups' });
  }
}

exports.getAdminsCount = async (req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments({ uni_id: req.user.uni_id });
    
    return res.status(200).json(totalAdmins);
  } catch (error) {
    console.error('Error getting total number of admins:', error);
    return res.status(500).json({ message: 'Error getting total number of Admins' });
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
    
    return res.status(200).json(student)
    

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error getting details' });
  }
  
}

exports.getGroups = async (req, res) => {
  try {
    
    const groups = await Group.find({}).select("-created_at -students");
    
    return res.status(200).send(groups);

  } catch (error) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ message: 'Unknown Error while fetching groups' });
  }
}

exports.getOneGroup = async (req, res) => {
  try {
    
    const group = await Group.findById(req.params.id).select("students").lean();
    const objectIds = group.students.map(id => new ObjectId(id));
    
    const students = await Student.find({ _id: { $in: objectIds } }).select("_id first_name last_name gender picture");
    
    return res.status(200).send(students);


  } catch (error) {
    console.error('Error fetching group:', error);
    return res.status(500).json({ message: 'Unknown Error while fetching group' });
  }
}



exports.generateGroup = async (req, res) => {
  try {
    
    let query = {uni_id: new ObjectId(req.body.uni_id), isSurveyCompleted: true}
    //add gender
    if(req.body.gender !== 'any') query.gender = req.body.gender

    //add dim1
    if(req.body.dim1 !== 'any') {
      query["learning_style.dim1.name"] = req.body.dim1
      switch(req.body.value1){
        case 'weak':
        query["learning_style.dim1.score"] = { $gte: 1, $lte: 3 };
        break;

        case 'moderate':
        query["learning_style.dim1.score"] = { $gte: 4, $lte: 7 };
        break;

        case 'strong':
        query["learning_style.dim1.score"] = { $gte: 8, $lte: 11 };
        break;
      }
      
    }
    //else query["learning_style.dim1.score"] = { $eq : 0}

    //add dim2
    if(req.body.dim2 !== 'any') {
      query["learning_style.dim2.name"] = req.body.dim2
      switch(req.body.value2){
        case 'weak':
        query["learning_style.dim2.score"] = { $gte: 1, $lte: 3 };
        break;

        case 'moderate':
        query["learning_style.dim2.score"] = { $gte: 4, $lte: 7 };
        break;

        case 'strong':
        query["learning_style.dim2.score"] = { $gte: 8, $lte: 11 };
        break;
      }
    }
    //else query["learning_style.dim2.score"] = { $eq : 0}

    //add dim3
    if(req.body.dim3 !== 'any') {
      query["learning_style.dim3.name"] = req.body.dim3
      switch(req.body.value3){
        case 'weak':
        query["learning_style.dim3.score"] = { $gte: 1, $lte: 3 };
        break;

        case 'moderate':
        query["learning_style.dim3.score"] = { $gte: 4, $lte: 7 };
        break;

        case 'strong':
        query["learning_style.dim3.score"] = { $gte: 8, $lte: 11 };
        break;
      }
    }
    //else query["learning_style.dim3.score"] = { $eq : 0}

    //add dim4
    if(req.body.dim4 !== 'any') {
      query["learning_style.dim4.name"] = req.body.dim4
      switch(req.body.value4){
        case 'weak':
        query["learning_style.dim4.score"] = { $gte: 1, $lte: 3 };
        break;

        case 'moderate':
        query["learning_style.dim4.score"] = { $gte: 4, $lte: 7 };
        break;

        case 'strong':
        query["learning_style.dim4.score"] = { $gte: 8, $lte: 11 };
        break;
      }
    }
    //else query["learning_style.dim4.score"] = { $eq : 0}
    //console.log(query);
    const students = await Student.find(query).select("_id first_name last_name gender").lean();
    //console.log(students)
    return res.status(200).send(students);
    

  } catch (error) {
    console.error('Error generating group:', error);
    return res.status(500).json({ message: 'Unknown Error while generating group' });
  }
}

exports.createGroup = async (req, res) => {
  try {
    req.body.uni_id = req.user.uni_id
    req.body.uni_name = req.user.uni_name
    //console.log(req.body)

    // Step 1: Create the group
    const newGroup = await Group.create(req.body);
    // Step 2: Update each student by pushing the new group ID to their `groups` array
    await Student.updateMany(
      { _id: { $in: req.body.students } },
      { $addToSet: { groups: newGroup._id } } // $addToSet avoids duplicates
    );

    const payload = {
      fullname: `${req.user.first_name} ${req.user.last_name}`,
      group_name: newGroup.name
    }
    // REAL-TIME: Notify requester about acceptance
    const io = req.app.get('io');
    

    req.body.students.forEach(async (student)=>  {
      //Create friend request notification
    await Notification.create({
      recipient: student,
      payload: payload,
      type: 'group_added'
    });

    emitToUser(io, student, 'added_in_group', newGroup);

    })

    console.log("Group created and students updated.");
    return res.status(200).send(newGroup);

  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ message: 'Unknown Error while creating group' });
  }
}


exports.deleteGroup = async (req, res) => {
  try {
    // Step 1: Delete the group
    const deletedGroup = await Group.findByIdAndDelete(req.params.id);


    // Step 2: Remove group reference from students
    await Student.updateMany(
      { groups: req.params.id },
      { $pull: { groups: req.params.id } }
    );

    console.log("Group deleted and student documents updated.");
    
    return res.status(200).send(deletedGroup);

  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ message: 'Unknown Error while deleting group' });
  }
}

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({});
    res.status(200).json(admins);
  } catch (err) {
    console.error('Error fetching Admins:', error);
    return res.status(500).json({ message: 'Unknown Error while fetching admins' });
  }
}

exports.deleteAdmin = async (req, res) => {
  await Admin.findByIdAndDelete(req.params.id).then(
    (admin) => {
      if (admin) {
        console.log("Admin Deleted", admin);
        res.send(admin);
        return;
      }
      console.log("Not found");
      res.send("Not found");
    },
    (err) => {
      res.status(500).send({ message: err });
    }
  );
};

exports.registerStudents = async (req, res) => {
  let data = await csvParser(req.body);

  for (index in data) {
    let student = data[index];
    if (!student.student_id) {
      student.student_id = student.email.split("@")[0].toUpperCase();
    }
    student.role = "student";
    const admin = await Admin.findById(req.userId);
    student.uni_id = admin.uni_id;
    student.uni_name = admin.uni_name;
    password = passwordGenerator(8, true);
    let result = await Student.register(student, password).catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.message });
    });
    data[index].password = password
    
  }
  console.log(data);
res.status(200).send({ message: "All students registered successfully" });
};

exports.deleteStudent = async (req, res) => {
    Student.deleteOne({student_id: req.params.studentid}).then(
        (result) => {
          if (result.deletedCount>0) {
            console.log("Student deleted Successfully");
            res.send("Student deleted successfully");
            return;
          }
          console.log("Not found, Can't be deleted sorry");
          res.send("Not found, Can't be deleted sorry");
        },
        (err) => {
          res.status(500).send({ message: err });
        }
      );
}