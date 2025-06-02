var router = require("express").Router();
var controller = require("../controllers/password.controller")
const checkEmailExists = require("../middlewares/checkEmailExists")
const {otpLimiter} = require("../middlewares/rateLimiter")

//generate route requires, role, and email
//generate route requires, role and email
router.post("/otp/generate", checkEmailExists, otpLimiter, controller.generateOTP);
router.post("/otp/verify", controller.verifyOTP);
router.post("/reset", checkEmailExists, controller.resetPassword)

module.exports = router