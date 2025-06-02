const Student = require("../models/student")
const Admin = require("../models/admin")

checkDuplicateEmail = async (req, res, next) => {

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
            next();
            return;
        }
        res.status(400).send({isRegistered: true, message: "There is already an account registered with this email!", code: 'DUPLICATE_EMAIL'})

    } catch (e) {
        res.status(500).send({message: e.message})
    }
    
} 

module.exports = checkDuplicateEmail

