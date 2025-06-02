const Student = require("../models/student");
const Admin = require("../models/admin")

checkEmailExists = async (req, res, next) => {

    let User;
    

    if(req.body.role === "student")
    {
        User = Student
    }
    else{
        User = Admin
    }

    try {
        const result = await User.findByUsername(req.body.email)
        //console.log(result);
        if(result === null)
        {
            res.status(404).send({message: "No account is associated with this email!", code: 'ACCOUNT_NOT_EXISTS'})
            return;
        }
        req.user = result;
        next();
        

    } catch (e) {
        res.status(500).send({message: e.message, code: 'UNKNOWN_ERROR'})
    }
    
} 

module.exports = checkEmailExists

