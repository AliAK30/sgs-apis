var router = require("express").Router();
var controller = require("../controllers/student.controller")
const verifyJwt = require("../middlewares/verifyJwt")
const verifyEmail = require("../middlewares/verifyEmail")
const checkDuplicateEmail = require("../middlewares/checkDuplicateEmail")
const checkEmailExists = require("../middlewares/checkEmailExists")
const {otpLimiter} = require("../middlewares/rateLimiter")
const upload = require("multer")();

router.post("/login", controller.login)


router.post("/preregister", checkDuplicateEmail, verifyEmail);
router.post("/register", controller.register);


router.patch("/update/questions", verifyJwt, controller.updateQuestions);
router.get("/identify/learningstyle", verifyJwt, controller.calculateLearningStyle);
router.get("/search", verifyJwt, controller.searchStudents);
router.post("/upload/picture", verifyJwt, upload.single('image'), controller.uploadPicture);
router.get("/similarity/:id",verifyJwt, controller.getSimilarity)
router.get("/similarities/:id", verifyJwt, controller.getSimilarities)
router.get("/:id", verifyJwt, controller.getStudent)
router.get("/:id/groups", verifyJwt, controller.getGroupsOfAStudent);

module.exports = router