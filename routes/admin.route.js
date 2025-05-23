var router = require("express").Router();
var controller = require("../controllers/admin.controller")
const verifyJwt = require("../middlewares/verifyJwt")
const {checkRoleSysAdmin, checkRoleAdmin} = require("../middlewares/checkRole")

router.post("/login", controller.login);

router.post("/register", verifyJwt, checkRoleSysAdmin, controller.registerAdmin);
router.delete("/delete/admin/:id", verifyJwt, checkRoleSysAdmin, controller.deleteAdmin)
router.delete("/delete/student/:studentid", verifyJwt, checkRoleAdmin, controller.deleteStudent)
router.post("/register/students", verifyJwt, checkRoleAdmin, controller.registerStudents)




/* router.post("/university/add", verifyJwt, controller.addUniversity);
router.delete("/university/delete/:id", verifyJwt, controller.deleteUniversity);
router.post("/sysadmin/add", verifyJwt, controller.addSysAdmin)
router.delete("/sysadmin/delete/:id",verifyJwt, controller.deleteSysAdmin) */
/* router.post("/add/university", controller.addUniversity);
router.delete("/delete/university/:id", controller.deleteUniversity);
router.post("/add/sysadmin", controller.addSysAdmin)
router.delete("/delete/sysadmin/:id",controller.deleteSysAdmin) */


module.exports = router