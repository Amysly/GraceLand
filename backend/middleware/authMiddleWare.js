const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const { JWT_SECRET } = require('../utils/getJwtSecret');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const { jwtVerify } = await import('jose');
      const { payload } = await jwtVerify(token, JWT_SECRET);

      req.user = await User.findById(payload.userId)
        .select('-password')
        .populate('department', '_id departmentName');

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

module.exports = { protect };
