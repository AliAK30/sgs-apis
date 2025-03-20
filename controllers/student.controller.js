const Student = require("../models/student");
const passwordGenerator = require("password-generator");
const jwt = require("jsonwebtoken");
const driver = require("../neo4j");

exports.register = async (req, res) => {
  req.body.uni_name = "Muhammad Ali Jinnah University";
  req.body.uni_id = "677534463f4abf3b23f8b6d1";
  //req.body.student_id = req.body.email.split("@")[0].toUpperCase();

  const password = passwordGenerator(8, false);

  Student.register(req.body, password, (err) => {
    if (err) {
      switch (err.name) {
        case "ValidationError":
          res
            .status(400)
            .send({
              message: "Please make sure all fields are valid",
              code: "VALIDATION_ERROR",
            });

        default:
          console.error(err);
          res.status(500).send({ message: err.message });
      }

      return;
    }
    req.body.password = password;
    this.login(req, res);
    //res.status(200).json({ message: "Student registered successfully", student: student });
  });
  //student.password = password;
  //res.status(200).json({ message: "Student registered successfully", student: student });
};

exports.login = async (req, res) => {
  //console.log("Im here")
  const { email, password } = req.body;

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
    temp_user.password = password;
    res
      .status(200)
      .send({ message: "Login Successful", user: temp_user, token: token });
  });
};

/* $push: {
  questions: {
    $each: req.body, // Push multiple objects into the array
  },
  
}, */

exports.updateQuestions = async (req, res) => {
  //console.log(req.body);

  try {
    const result = await Student.updateOne(
      { _id: req.userId },
      {
        questions: req.body, // Push multiple objects into the array
        isSurveyCompleted: true,
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
      addToGraph(student);
      res
        .status(200)
        .json({
          student: student,
          message: "Learning style updated successfully.",
        });
      return;
    }
  } catch (error) {
    console.error("Error identifing learning style:", error);
    res.status(500).send({ message: error });
    return;
  }
};


const addToGraph = async (student) => {
  
  try {
    let { records } = await driver.executeQuery(
      "CREATE (p:Student{id: $id, name: $name }) RETURN p",
      { id: student.id, name: `${student.first_name} ${student.last_name}` },
      { database: "neo4j" }
    );
    

    for(let i = 0; i < 44; i++)
    {
        const name = `${student.questions[i].answer}${student.questions[i].q}`
        let {records} = await driver.executeQuery(
            'MATCH (s:Student {id: $id}) MATCH (o:Option {name: $name}) CREATE (s)-[:SELECTED]->(o)',
              { id: student.id, name: name },
              { database: 'neo4j' }
        )
        
          
    }

  }catch (err) {
    console.error('Cant add to Graph',err);
  } finally {
    console.log('DONE ADDING TO GRAPH')
  }
  
}
