const Student = require("../models/student");
const jwt = require("jsonwebtoken");
const driver = require("../neo4j");
const OTP = require('../models/otp');
const { sendOTPEmail } = require('../utils/mailer');
const {formatName, getAgeInYears} = require("../utils/helpers")
const crypto = require('crypto');
const containerClient = require("../azure");
const sharp = require('sharp');
const {ObjectId} = require('mongoose').Types



async function compressImage(buffer) {
  const options = {
    width: 256,       // Max width in pixels
    height: 256,      // Max height in pixels
  };

  return sharp(buffer)
    .resize(options.width, options.height, {
      fit: 'inside',
      withoutEnlargement: true
    }).toBuffer();
}




exports.register = async (req, res) => {

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
    const { email, password } = req.body;


    const authenticate = Student.authenticate()
    
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
      //temp_user.password = password;
      res.status(200).send({ message: "Login Successful", user: temp_user, token: token });
    
  } catch (err) {
    console.log(err)
    return res.status(500).send({message: err.message, code: 'UNKNOWN_ERROR'})
  }
  
};

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

    // Conditionally remove private fields based on `privacy` settings
    const privacy = student.privacy ?? {};

    if (privacy.picture !== 2 && student.picture ) delete student.picture;
    if (privacy.email !== 2) delete student.email;
    if (privacy.dob !== 2) delete student.dob;
    else student.age = getAgeInYears(student.dob);
    if (privacy.phone_number !== 2 && student.phone_number) delete student.phone_number;
    if (privacy.gpa !== 2 && student.gpa) delete student.gpa;
    if (privacy.learning_style !== 2) delete student.learning_style;

    return res.status(200).json(student)
    

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error getting details' });
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

    // 🔹 Handle single-answer case first
    if (incomingAnswers.length === 1) {
      const { q, answer } = incomingAnswers[0];
      const existing = existingAnswers[q-1]
      

      if(answer !== existing.answer)
      await Student.updateOne(
        { _id: req.userId },
        { $set: { [`questions.${q - 1}`]: { q, answer } } }
      );

      
    } else {
      // 🔹 Handle multiple-answer case
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
      if(addToGraph(student))
      {
          return res.status(200).json({student: student,message: "Learning style updated successfully.",});
      } else {
        return res.status(500).send({ message: 'Our Server is down, please try again later, Sorry for the inconvenience!' });
      }

      
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
    if(records.length===0) return res.status(404).json({message: 'Either of you have not calculated their learning style.'});
    
    const similarity = Math.round(records[0].toObject().similarity);
    //console.log(similarity);
    return res.status(200).json({data1: similarity, data2: 100-similarity});
  }catch (err){
    console.error('Cant check similarity',err);
    return res.status(500).send({message: 'Error checking similarity'});
  }
}

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
        console.log('DONE ADDING TO GRAPH')
          return true;
    }

  }catch (err) {
    console.error('Cant add to Graph',err);
    return false;
  } 
  
  
}
