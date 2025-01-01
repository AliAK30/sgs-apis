const University = require("../models/university");
const Superuser = require("../models/superuser");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");

exports.registerSuperuser = async (req, res) => {
  const { username, password, role } = req.body;

  const superuser = new Superuser({ username: username, role: role });

  Superuser.register(superuser, password, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Superuser registered successfully" });
  });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  Superuser.authenticate()(username, password, (err, user) => {
    if (err || !user) {
      console.log(err);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create a new JSON web token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      allowInsecureKeySizes: true,
      expiresIn: "9999d",
    });

    res.status(200).json({ message: "Login Successful", token: token });
  });
};

exports.addUniversity = async (req, res) => {
  const university = new University(req.body);
  await university.save().then(
    (car) => {
      console.log("University was added successfully!", car);
      res.send({ message: "University was added successfully!" });
    },
    (err) => {
      res.status(500).send({ message: err });
      return;
    }
  );
};

exports.addUniversity = async (req, res) => {
  const university = new University(req.body);
  await university.save().then(
    (university) => {
      console.log("University was added successfully!", university);
      res.send({ message: "University was added successfully!" });
    },
    (err) => {
      res.status(500).send({ message: err });
      return;
    }
  );
};

exports.deleteUniversity = async (req, res) => {
  await University.findByIdAndDelete(req.params.id).then(
    (university) => {
      console.log("University Deleted", university);
      res.send(university);
    },
    (err) => {
      res.status(500).send({ message: err });
    }
  );
};

exports.addSysAdmin = async (req, res) => {
  const sysadmin = new Admin({
    email: req.body.email,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    uni_name: req.body.uni_name,
    uni_id: req.body.uni_id,
    role: req.body.role
  });

  Admin.register(sysadmin, req.body.password, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "System admin registered successfully" });
  });
};

exports.deleteSysAdmin = async (req, res) => {
    await Admin.findByIdAndDelete(req.params.id).then(
      (admin) => {
        if(admin){
            console.log("Admin Deleted", admin);
            res.send(admin);
            return;
        }
        console.log("Not found")
        res.send("Not found")
      },
      (err) => {
        res.status(500).send({ message: err });
      }
    );
  };
