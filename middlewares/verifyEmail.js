

verifyEmail = async (req, res, next) => {
  //return res.status(200).send({isEmailValid: true, message: "Email address exists", code: 'VALID_EMAIL'});

    const url = `https://api.quickemailverification.com/v1/verify?email=${req.body.email}&apikey=${process.env.API_KEY}`
    try {
      
      const response = await fetch(url)
      
      if (response.status === 200) {
        const resJson = await response.json()
        
        //if invalid send invalid status
        if(resJson.result === "invalid")
        {
            res.status(400).send({isEmailValid: false, message: "Email address does not exist, Pleae enter a valid Email", code: 'INVALID_EMAIL'})
            return;
        } else {
          //if valid and user is a system admin, that means he is creating an admin account, so call the next
          //middleware in the chain
          if(req.user) {
            if(req.user.role === 'system_admin') next();
          } 
          //if valid and user is not set, that means student is creating an account
          else return res.status(200).send({isEmailValid: true, message: "Email address exists", code: 'VALID_EMAIL'});
        }
        

        }
      }

      catch (err) {
      console.log(err.message)
      res.status(500).send(err.message)
    }
}

module.exports = verifyEmail;
