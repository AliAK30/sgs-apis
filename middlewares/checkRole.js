const Admin = require("../models/admin");

exports.checkRoleSysAdmin = async (req, res, next) => {
  await Admin.findById(req.userId).then(
    (user) => {
      if (user.role == "system_admin") {
        next();
        return;
      }
      return res.status(403).send({
        message: "Forbidden! You don't have permission for this action",
      });
    },
    (err) => {
      res.status(500).send({ message: err });
    }
  );
};

exports.checkRoleSuperuser = async (req, res, next) => {
  await Admin.findById(req.userId).then(
    (user) => {
      if (user.role == "superuser") {
        next();
        return;
      }
      return res.status(403).send({
        message: "Forbidden! You don't have permission for this action",
      });
    },
    (err) => {
      res.status(500).send({ message: err });
    }
  );
};

exports.checkRoleAdmin = async (req, res, next) => {
  await Admin.findById(req.userId).then(
    (user) => {
      if (user.role == "admin" || user.role == "system_admin") {
        next();
        return;
      }
      return res.status(403).send({
        message: "Forbidden! You don't have permission for this action",
      });
    },
    (err) => {
      res.status(500).send({ message: err });
    }
  );
};
