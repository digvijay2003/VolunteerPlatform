const express = require('express');
const router = express.Router();
const FoodMatch = require('../../models/food_match')

router.get('/feedhope-food-match', async (req, res, next) => {
  try {
    const matches = await FoodMatch.find({ status: 'matched' })
      .populate('food_request')
      .populate('food_donation')
      .sort({ matchedAt: -1 })
      .exec();

    res.render('food_match/food_match', {
      title: 'FeedHope Food Matches',
      stylesheet: '',
      showNavbar: false,
      showFooter: false, 
      matches: matches.map(m => ({
        id: m._id,
        request: m.food_request,
        donation: m.food_donation,
        matchScore: m.matchScore,
        status: m.status,
        matchedAt: m.matchedAt,
      }))
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR: Error fetching food matches:`, err.message);
    console.error(`[${new Date().toISOString()}] ERROR: Stack trace:`, err.stack);
    next(err); // Pass error to Express error handler
  }
});

module.exports = router;