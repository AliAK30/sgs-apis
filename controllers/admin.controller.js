const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");

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
