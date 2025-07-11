var router = require("express").Router();
var controller = require("../controllers/super.controller")
const verifyJwt = require("../middlewares/verifyJwt")
const {checkRoleSuperuser} = require("../middlewares/checkRole")


//router.post("/register",controller.registerSuperuser);

router.post("/login", controller.login);


router.use(verifyJwt);
router.use(checkRoleSuperuser)
/* router.post("/university/add", verifyJwt, controller.addUniversity);
router.delete("/university/delete/:id", verifyJwt, controller.deleteUniversity);
router.post("/sysadmin/add", verifyJwt, controller.addSysAdmin)
router.delete("/sysadmin/delete/:id",verifyJwt, controller.deleteSysAdmin) */
router.post("/add/university", controller.addUniversity);
router.delete("/delete/university/:id", controller.deleteUniversity);
router.post("/add/sysadmin", controller.addSysAdmin)
router.delete("/delete/sysadmin/:id",controller.deleteSysAdmin)


module.exports = router