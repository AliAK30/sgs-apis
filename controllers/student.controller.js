const Student = require("../models/student");
const jwt = require("jsonwebtoken");
const driver = require("../neo4j");
const OTP = require('../models/otp');
const { sendOTPEmail } = require('../utils/mailer');
const crypto = require('crypto');

exports.register = async (req, res) => {

 try {
  const password =  req.body.password;
  delete req.body.password;
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
    const { email, password } = req.body;


    const authenticate = Student.authenticate()
    
    const response = await authenticate(email, password)
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
      //temp_user.password = password;
      res.status(200).send({ message: "Login Successful", user: temp_user, token: token });
    
  } catch (err) {
    console.log(err)
    return res.status(500).send({message: err.message, code: 'UNKNOWN_ERROR'})
  }
  
};

exports.verifyOTP = async (req, res) => {

  try {
      const { email, otp } = req.body;
      // Find the most recent OTP for the email
      const otpRecord = await OTP.findOne({email:email});
      

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP!', code: 'OTP_INVALID' });
      }

      if(otpRecord.expiresAt < Date.now()) {
        return res.status(400).json({ message: 'OTP has expired, please generate another OTP', code: 'OTP_EXPIRED' });
      }
      
      if(!req.body.onlyVerify) return res.status(200).json({message: 'OTP verified!', code: 'OTP_VERIFIED'});
      else return {statusCode: 200};
      
  }
  catch (err) {
    console.log(err)
    return res.status(500).send({message: err.message, code: 'UNKNOWN_ERROR'})
  }

}

exports.resetPassword = async (req, res) => {
  try {
    req.body.onlyVerify = true;
    const result = await this.verifyOTP(req, res);
    
    if(result.statusCode === 400) return;

    const {new_password, email} = req.body;

    const student = await Student.findByUsername(email);
    await student.setPassword(new_password);
    await student.save();
    return res.status(200).send({message: "Password Reset Successfull!"});
    
    
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: err.message, code: 'UNKNOWN_ERROR' });
  }
 
}


exports.generateOTP = async (req, res) => {

  try {
    // Generate OTP
    const { email } = req.body;
    //crypto.random
    //generate six digit otp
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 1 minutes from now
    await OTP.findOneAndUpdate(
      { email },
      { otp: otp, expiresAt: expiresAt },
      { new: true, upsert: true } //upsert creates the document if it does not exist
    );
    // Send OTP to email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      return res.status(200).json({ message: 'OTP sent to your email'});
    } else {
      return res.status(500).json({ message: 'Failed to send OTP, Please try again later', code: 'OTP_SEND_FAILED' });
    }
    

  }catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message, code: 'UNKNOWN_ERROR' });
  }
}

/* $push: {
  questions: {
    $each: req.body, // Push multiple objects into the array
  },
  
}, */

exports.updateQuestions = async (req, res) => {
  //console.log(req.body);

  try {
    const student = await Student.findById(req.userId);
    if(student.isSurveyCompleted) return res.status(400).json({ message: `Dear ${student.first_name}, you have already submitted the answers.`, code: 'RESUBMISSION' })
    const result = await Student.updateOne(
      { _id: req.userId },
      {
        questions: req.body.answers, // Push multiple objects into the array
        isSurveyCompleted: req.body.isSurveyCompleted,
      }
    );

    if (result.modifiedCount >= 0) {
      console.log("Questions updated successfully.");
      res.status(200).send({ message: "Questions updated successfully." });
      return;
    } /* else {
      console.log("No user found to update questions.");
      res.status(404).send({ message: "No user found to update questions." });
    } */
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
