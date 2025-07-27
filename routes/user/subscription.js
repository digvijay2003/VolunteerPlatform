const express = require('express');
const router = express.Router();
const requireUserAuth = require('../../middleware/user_auth');
const Subscription = require('../../models/subscription');
const User = require('../../models/user');

// GET: Subscription page
router.get('/feedhope-user-subscribe', requireUserAuth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });

    res.render('user/subscription', {
      user: req.user,
      subscription,
      title: 'Subscribe to Premium',
      showNavbar: false,
      showFooter: false,
      title: 'Subscription',
      stylesheet: '',
    });
  } catch (error) {
    console.error('Error loading subscription:', error);
    req.flash('error', 'Unable to load subscription page.');
    res.redirect('/feedhope-user-dashboard');
  }
});

router.post('/feedhope-user-subscribe', requireUserAuth, async (req, res) => {
  try {
    const existingSub = await Subscription.findOne({ user: req.user._id });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    if (existingSub) {
      existingSub.plan = 'Premium';
      existingSub.startDate = startDate;
      existingSub.endDate = endDate;
      existingSub.status = 'Active';
      existingSub.lastPaymentDate = new Date();
      existingSub.paymentId = `MOCK-${Date.now()}`; 
      await existingSub.save();
    } else {
      const newSubscription = new Subscription({
        user: req.user._id,
        plan: 'Premium',
        startDate,
        endDate,
        status: 'Active',
        lastPaymentDate: new Date(),
        paymentId: `MOCK-${Date.now()}`
      });

      await newSubscription.save();

      await User.findByIdAndUpdate(req.user._id, {
        subscription: newSubscription._id
      });
    }

    req.flash('success', 'You are now a Premium member!');
    res.redirect('/feedhope-user-dashboard');
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    req.flash('error', 'Subscription failed.');
    res.redirect('/feedhope-user-subscribe');
  }
});

module.exports = router;