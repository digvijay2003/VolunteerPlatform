const Subscription = require('../models/subscription');

const checkPremiumAccess = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const subscription = await Subscription.findOne({ user: userId });

    if (!subscription || subscription.status !== 'Active' || subscription.plan !== 'Premium') {
      req.flash('error', 'Premium access required for accessing dashboard.');
      return res.redirect('/feedhope-user-subscribe');
    }

    const now = new Date();
    if (subscription.endDate && now > subscription.endDate) {
      subscription.status = 'Expired';
      await subscription.save();
      req.flash('error', 'Subscription expired. Please renew.');
      return res.redirect('/feedhope-user-subscribe');
    }

    next();
  } catch (error) {
    console.error('Premium check error:', error);
    req.flash('error', 'Error checking subscription.');
    return res.redirect('/feedhope-user-dashboard');
  }
};

module.exports = checkPremiumAccess;