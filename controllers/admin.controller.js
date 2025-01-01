const Admin = require("../models/admin");
const Student = require("../models/student");
const jwt = require("jsonwebtoken");
const csvParser = require("../helpers/csvParser");
const passwordGenerator = require("password-generator");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  Admin.authenticate()(email, password, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
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
    res
      .status(200)
      .json({ message: "Login Successful", user: temp_user, token: token });
  });
};

exports.registerAdmin = async (req, res) => {
  const admin = new Admin({
    email: req.body.email,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    uni_name: req.body.uni_name,
    uni_id: req.body.uni_id,
    role: req.body.role,
  });

  Admin.register(admin, req.body.password, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Admin registered successfully" });
  });
};

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