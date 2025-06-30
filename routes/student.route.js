var router = require("express").Router();
var controller = require("../controllers/student.controller")
const verifyJwt = require("../middlewares/verifyJwt")
const verifyEmail = require("../middlewares/verifyEmail")
const checkDuplicateEmail = require("../middlewares/checkDuplicateEmail")
const upload = require("multer")();

//Auth and registration
router.post("/login", controller.login)
router.post("/preregister", checkDuplicateEmail, verifyEmail);
router.post("/register", controller.register);

router.patch("/profile", verifyJwt, controller.updateStudent);
router.patch("/questions", verifyJwt, controller.updateQuestions);
router.post("/learning-style", verifyJwt, controller.calculateLearningStyle);
router.post("/friend-request", verifyJwt, controller.sendFriendRequest);
router.get("/notifications", verifyJwt, controller.getNotifications)
router.delete("/notifications", verifyJwt, controller.deleteAllNotifications)
router.get("/friends", verifyJwt, controller.getFriends);
router.post("/picture", verifyJwt, upload.single('image'), controller.uploadPicture);
router.get("/search", verifyJwt, controller.searchStudents);
router.get("/friend-request/:recipientId", verifyJwt, controller.checkFriendRequest);
router.put('/friend-request/:friendshipId/respond', verifyJwt, controller.respondToFriendRequest);
router.delete("/notifications/:notificationId", verifyJwt, controller.deleteNotification)
router.get("/similarity/:id",verifyJwt, controller.getSimilarity)
router.get("/similarities/:id", verifyJwt, controller.getSimilarities)
router.get("/group/:id", verifyJwt, controller.getOneGroup)
router.get("/:id", verifyJwt, controller.getStudent)
router.get("/:id/groups", verifyJwt, controller.getGroupsOfAStudent);

module.exports = router