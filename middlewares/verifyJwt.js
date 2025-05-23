const jwt = require("jsonwebtoken");

verifyToken = (req, res, next) => {
  let token;
  try {
    token = req.headers.authorization.split(" ")[1]
  } catch (err) {
    console.log(`IP: ${req.ip}`);
    console.log(`Origin: ${req.get('origin')}`)
    console.log(`Referer: ${req.get('referer')}`)
    console.log(`User Agent: ${req.get('user-agent')}`);
    console.log(err)
    return res.status(400).json({ message: 'Please set authentication headers', code: 'BAD_REQUEST' });
  }

  try {
  
  if (!token) {
    console.log(`IP: ${req.ip}`);
    console.log(`Origin: ${req.get('origin')}`)
    console.log(`Referer: ${req.get('referer')}`)
    console.log(`User Agent: ${req.get('user-agent')}`);
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Unauthorized!",
      });
    }

    req.userId = decoded.id;
    next();
  });
} catch (err) {
  console.log(err)
  return res.status(500).json({ message: err.message, code: 'UNKNOWN_ERROR' });
}
  
  
};


module.exports = verifyToken;
