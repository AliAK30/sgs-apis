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

//generate route requires, role, and email
router.post("/otp/generate", checkEmailExists, otpLimiter, controller.generateOTP);
router.post("/otp/verify", controller.verifyOTP);
router.post("/password/reset", controller.resetPassword)
router.patch("/update/questions", verifyJwt, controller.updateQuestions);
router.get("/identify/learningstyle", verifyJwt, controller.calculateLearningStyle);
router.get("/search", verifyJwt, controller.searchStudents);
router.post("/upload/picture", verifyJwt, upload.single('image'), controller.uploadPicture);
router.get("/:id", verifyJwt, controller.getStudent)

module.exports = router