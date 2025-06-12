const jwt = require("jsonwebtoken");
const Student = require("../models/student");

verifyToken = async (req, res, next) => {
  
  try {
    let token;
  try {
    token = req.headers.authorization.split(" ")[1]
  } catch(err) {
    console.log(`IP: ${req.ip}`);
    console.log(`Origin: ${req.get('origin')}`)
    console.log(`Referer: ${req.get('referer')}`)
    console.log(`User Agent: ${req.get('user-agent')}`);
    console.log(err)
    console.log(err)
    return res.status(400).json({ message: 'Please set authorization headers', code: 'BAD_REQUEST' });
  }

  let userId = req.headers.userid;

  //handle both socket.io and express app verification cases
  if (!token || !userId){
    if(res.edumatch_socket) return next(new Error('Authentication required'));
    else return res.status(400).json({ message: 'Please provide a token and userId', code: 'BAD_REQUEST' });
  } 

  // Verify JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
  // Verify user exists and token belongs to the user
  const user = await Student.findById(userId).select('_id first_name last_name email');
    
  if (!user || decoded.id !== userId) {
    if(res.edumatch_socket) return next(new Error('Invalid authentication'));
    else return res.status(401).send({message: "Your are not authorized to make this request!"});
  }

  if(res.edumatch_socket){

    res.edumatch_socket.userId = decoded.id;
    res.edumatch_socket.user = user;
  } else {

    req.userId = decoded.id;
    req.user = user;
  }
  
  return next();

  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: err.message, code: 'UNKNOWN_ERROR' });
  }
}



module.exports = verifyToken;
