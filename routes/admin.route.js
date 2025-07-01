var router = require("express").Router();
var controller = require("../controllers/admin.controller")
const verifyJwt = require("../middlewares/verifyJwt")
const verifyEmail = require("../middlewares/verifyEmail")
const checkDuplicateEmail = require("../middlewares/checkDuplicateEmail")
const {checkRoleSysAdmin, checkRoleAdmin} = require("../middlewares/checkRole")

router.post("/login", controller.login);
router.get("/", verifyJwt, checkRoleAdmin, controller.getAdmins)
router.post("/register", verifyJwt, checkRoleSysAdmin, checkDuplicateEmail, verifyEmail, controller.registerAdmin);
router.get("/students/count", verifyJwt, checkRoleAdmin, controller.getStudentsCount)
router.get("/students/search", verifyJwt,checkRoleAdmin, controller.searchStudents);
router.get("/groups/count", verifyJwt, checkRoleAdmin, controller.getGroupsCount)
router.post("/groups/generate", verifyJwt, checkRoleAdmin, controller.generateGroup)
router.post("/groups/create", verifyJwt, checkRoleAdmin, controller.createGroup)
router.get("/groups", verifyJwt, checkRoleAdmin, controller.getGroups);
router.get("/count", verifyJwt, checkRoleAdmin, controller.getAdminsCount)
router.post("/register/students", verifyJwt, checkRoleAdmin, controller.registerStudents)
router.get("/student/:id", verifyJwt, controller.getStudent)
router.get("/group/:id", verifyJwt, checkRoleAdmin, controller.getOneGroup);
router.delete("/groups/delete/:id", verifyJwt, checkRoleAdmin, controller.deleteGroup)
router.delete("/delete/admin/:id", verifyJwt, checkRoleSysAdmin, controller.deleteAdmin)
router.delete("/delete/student/:studentid", verifyJwt, checkRoleAdmin, controller.deleteStudent)




/* router.post("/university/add", verifyJwt, controller.addUniversity);
router.delete("/university/delete/:id", verifyJwt, controller.deleteUniversity);
router.post("/sysadmin/add", verifyJwt, controller.addSysAdmin)
router.delete("/sysadmin/delete/:id",verifyJwt, controller.deleteSysAdmin) */
/* router.post("/add/university", controller.addUniversity);
router.delete("/delete/university/:id", controller.deleteUniversity);
router.post("/add/sysadmin", controller.addSysAdmin)
router.delete("/delete/sysadmin/:id",controller.deleteSysAdmin) */


module.exports = router