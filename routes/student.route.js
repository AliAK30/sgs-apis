var router = require("express").Router();
var controller = require("../controllers/student.controller")
const verifyJwt = require("../middlewares/verifyJwt")

router.post("/login", controller.login)

router.use(verifyJwt);

router.patch("/update/questions", controller.updateQuestions)
router.patch("/identify/learningstyle", controller.calculateLearningStyle)

module.exports = router