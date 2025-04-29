const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // email provider
  auth: {
    user: "aliahmed.k30062@gmail.com",
    pass: "cbmxkgceitbpapqy",
  }
});

exports.sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: "arrowfastasflash@gmail.com",
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. This OTP is valid for 15 minutes.`,
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. This OTP is valid for 15 minutes.</p>`
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

//module.exports = { sendOTPEmail };