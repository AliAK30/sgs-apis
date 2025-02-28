

verifyEmail = async (req, res, next) => {
    const url = `https://api.quickemailverification.com/v1/verify?email=${req.body.email}&apikey=${process.env.API_KEY}`
    try {
      const response = await fetch(url)
      if (response.status === 200) {
        const resJson = await response.json()
        if(resJson.result === "invalid")
        {
            res.status(400).send({isEmailValid: false, message: "Email address does not exist, Pleae enter a valid Email", code: 'INVALID_EMAIL'})
            return;
        }
        next();
      }
      
    } catch (err) {
      console.log(err.message)
      res.status(500).send(err.message)
    }
}

module.exports = verifyEmail;