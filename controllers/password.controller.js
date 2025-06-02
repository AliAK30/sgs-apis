const OTP = require('../models/otp');
const Student = require("../models/student");
const Admin = require("../models/admin");
const { sendOTPEmail } = require('../utils/mailer');
const crypto = require('crypto');

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

    let User;
    if(req.body.user.role === "student")
    {
        User = Student
    }
    else{
        User = Admin
    }

    const user = await User.findByUsername(email);
    await user.setPassword(new_password);
    await user.save();
    return res.status(200).send({message: "Password Reset Successfull!"});
    
    
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: err.message, code: 'UNKNOWN_ERROR' });
  }
 
}