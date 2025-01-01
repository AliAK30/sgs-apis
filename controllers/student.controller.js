const Student = require("../models/student");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;
  //console.log(email, password)
  Student.authenticate()(email, password, (err, user) => {
    if (err || !user) {
      //console.log(err)
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

exports.updateQuestions = async (req, res) => {
  console.log(req.body);

  try {
    const result = await Student.updateOne(
      { _id: req.userId },
      {
        $push: {
          questions: {
            $each: req.body, // Push multiple objects into the array
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("Questions updated successfully.");
      res.status(200).send({ message: "Questions updated successfully." });
      return;
    } else {
      console.log("No user found to update questions.");
      res.status(404).send({ message: "No user found to update questions." });
    }
  } catch (error) {
    console.error("Error updating questions:", error);
    res.status(500).send({ message: error });
    return;
  }
};

exports.calculateLearningStyle = async (req, res) => {
  try {
    let student = await Student.findById(req.userId);
    let active = 0,
      reflective = 0,
      sensitive = 0,
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
          sensitive++;
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
    //console.log(active,reflective, sensitive, intuitive, visual, verbal, global, sequential)
    let learning_style = {};
    if (active > reflective) {
      learning_style.dim1 = { name: "active", score: active - reflective };
    } else {
      learning_style.dim1 = { name: "reflective", score: reflective - active };
    }
    if (sensitive > intuitive) {
      learning_style.dim2 = { name: "sensitive", score: sensitive - intuitive };
    } else {
      learning_style.dim2 = { name: "intuitive", score: intuitive - sensitive };
    }
    if (visual > verbal) {
      learning_style.dim3 = { name: "visual", score: visual - verbal };
    } else {
      learning_style.dim3 = { name: "verbal", score: verbal - visual };
    }
    if (global > sequential) {
      learning_style.dim4 = { name: "global", score: global - sequential };
    } else {
      learning_style.dim4 = { name: "sequential", score: sequential - global };
    }
    //console.log(learning_style)
    const result = await Student.updateOne(
      { _id: req.userId },
      {
        learning_style: learning_style,
      }
    );

    if (result.modifiedCount > 0) {
      console.log("Learning style updated successfully.");
      res.status(200).send({ message: "Learning style updated successfully." });
      return;
    } else {
      console.log("No user found to update learning style.");
      res
        .status(404)
        .send({ message: "No user found to update learning style." });
    }
  } catch (error) {
    console.error("Error identifing learning style:", error);
    res.status(500).send({ message: error });
    return;
  }
};
