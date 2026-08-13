const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        return next(new Error('User account not found. Please log out and log in again.'));
      }

      return next();
    } catch (error) {
      console.error(error);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`User role ${req.user?.role} is not authorized to access this route`)
      );
    }
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized'));
    }

    // Super Admin & Admin bypass
    if (req.user.email === 'admin@mobilehub.com' || req.user.role === 'admin' || req.user.isSuperAdmin) {
      return next();
    }

    // Check if user has the specific permission in their permissions object
    if (req.user.permissions && req.user.permissions[permission] === true) {
      return next();
    }

    res.status(403);
    return next(new Error(`Access denied. You do not have permission to access the ${permission} module.`));
  };
};

module.exports = { protect, authorize, requirePermission };
