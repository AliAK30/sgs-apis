const Redis = require('ioredis');

const host = process.env.NODE_ENV === 'production'
    ? 'localhost' // Local connection string
    : 'edumatch.southeastasia.cloudapp.azure.com'; // Public connection string

const redisClient = new Redis({
  host: host,
  port: 6379,
  // password: 'password', // this is for password
  retryStrategy: (times) => Math.min(times * 50, 5000), // Auto-reconnect
});


exports.sendOTPEmail = async (email, otp) => {
  try {
    const body = {
      fromAddress: "edumatch@zohomail.com",
      toAddress: email,
      subject: "OTP",
      content: `<p>Your OTP for password reset is: <strong>${otp}</strong>. This OTP is valid for 10 minutes.</p>`,
    };

    const url = `https://mail.zoho.com/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`
    const token = await redisClient.get("access_token");
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${token}`
      },
      body: JSON.stringify(body)
    })
      if (response.status === 200) {
        return true;
      } else {
        const res = await response.json();
        if(res.data.errorCode === "INVALID_OAUTHTOKEN")
        {
          console.log("IM HERE")
          //GET ACCESS TOKEN FROM REFRESH TOKEN
          const refreshUrl = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESH_TOKEN}&grant_type=refresh_token&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}`
          const response2 = await fetch(refreshUrl, {
          method: 'POST',
        })
          const {access_token} = await response2.json();
          await redisClient.set("access_token", access_token)
          response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${access_token}`
      },
      body: JSON.stringify(body)
    })
      if (response.status === 200) {
        return true;
      }

        }
        return false;
      }


  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};

//const nodemailer = require("nodemailer");


/* try {
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
  } */
