var router = require("express").Router();
var controller = require("../controllers/student.controller")
const verifyJwt = require("../middlewares/verifyJwt")
const verifyEmail = require("../middlewares/verifyEmail")
const checkDuplicateEmail = require("../middlewares/checkDuplicateEmail")

router.post("/login", controller.login)

//this will change
//verifyEmail,
router.post("/register", checkDuplicateEmail,   controller.register)
//router.use(verifyJwt);

router.patch("/update/questions", verifyJwt, controller.updateQuestions)
router.patch("/identify/learningstyle", verifyJwt, controller.calculateLearningStyle)

module.exports = router