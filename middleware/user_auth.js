const jwt = require('jsonwebtoken');
const User = require('../models/user');
const logger = require('../config/logger');

const protect_user = async (req, res, next) => {
  const token = req.session?.token;

  if (!token) {
    // Store the originally requested URL
    req.session.redirectTo = req.originalUrl;
    req.flash('error', 'Please log in to access this page.');
    return res.redirect('/feedhope-user-login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      req.session.redirectTo = req.originalUrl;
      req.flash('error', 'User not found. Please log in again.');
      return res.redirect('/feedhope-user-login');
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    req.session.redirectTo = req.originalUrl;
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/feedhope-user-login');
  }
};

module.exports = protect_user;