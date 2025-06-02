const Admin = require("../models/admin");
const Student = require("../models/student");
const Group = require("../models/group");
const jwt = require("jsonwebtoken");
const csvParser = require("../helpers/csvParser");
const passwordGenerator = require("password-generator");
const {formatName, getAgeInYears} = require("../utils/helpers")


exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;  
      const authenticate = Admin.authenticate()
      const response = await authenticate(email.toLowerCase(), password)
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
      req.body.email = req.body.email.toLowerCase();
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
    console.log(totalGroups);
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