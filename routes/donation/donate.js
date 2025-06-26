const express = require('express');
const router = express.Router();
const FoodRequest = require('../../models/food_request');
const FoodDonation = require('../../models/food_donation');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });
const logger = require('../../config/logger');
const {upload} = require('../../utils/cloudinary');
const requireUserAuth = require('../../middleware/user_auth');

// GET: render food donation
router.get(
    '/feedhope-donation-food',
    (req, res) => {
      res.render('donation/donate', {
            title: 'Food Donation',
            stylesheet: '',
            showNavbar: false,
            showFooter: true,
    })
  }
);

// POST: handle food donation
router.post(
  '/feedhope-donation-food',
  requireUserAuth,
  upload.array('proof_images', 3),
  async (req, res) => {
    console.log('FILES RECEIVED:', req.files);
    console.log('BODY RECEIVED:', req.body);
    logger.info('🧾 Raw body:', JSON.stringify(req.body));
    try {
      const {
        donor_name,
        donor_phone,
        food_type,
        location_text,
        description,
        expiration_date
      } = req.body;

      const quantity = {
        amount: Number(req.body.quantity?.amount),
        unit: req.body.quantity?.unit,
        description: req.body.quantity?.description,
      };

      if (!req.files || req.files.length === 0) {
        logger.info('❌ No proof images uploaded');
        return res.status(400).render('donation/donate', {
          error: 'Please upload at least one proof image.',
          title: 'Food Donation',
          stylesheet: '',
          showNavbar: false,
          showFooter: true
        });
      }

      if (
        !donor_name || !donor_phone || !food_type ||
        isNaN(quantity.amount) || quantity.amount <= 0 ||
        !quantity.unit || !quantity.description ||
        !location_text || !description
      ) {
        logger.info('❌ Validation failed for donation submission');
        return res.status(400).render('donation/donate', {
          error: 'Please fill in all fields',
          title: 'Food Donation',
          stylesheet: '',
          showNavbar: false,
          showFooter: true
        });
      }

      // Limit to 3 requests in last 24 hours
      const recentRequests = await FoodRequest.find({
        user_id: req.user._id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (recentRequests.length >= 3) {
        logger.info(`❌ 24-hour request limit reached for ${req.user.email}`);
        req.flash('error', 'You can only submit 3 requests per 24 hours.');
        return res.redirect('/feedhope-request-food');
      }

      const geoRes = await geoCoder.forwardGeocode({ query: location_text, limit: 1 }).send();
      const coords = geoRes.body.features?.[0]?.geometry?.coordinates;
      if (!coords) {
        logger.info('❌ Geocoding failed: location not found');
        return res.status(400).render('donation/donate', { error: 'Location not found', title: 'Food Donation', stylesheet: '', showNavbar: false, showFooter: true });
      }
      const [longitude, latitude] = coords;

      const proof_images = req.files.map((file) => ({
        url: file.path,
        filename: file.filename,
        description: `ID Proof for donation by ${donor_name}`
      }));

      const donationCount = await FoodDonation.countDocuments({ user_id: req.user._id });
      if (donationCount >= 10) {
        logger.info(`❌ Donation limit reached for ${req.user.email}`);
        req.flash('error', 'You have reached the maximum donation limit (10).');
        return res.redirect('/feedhope-donation-food');
      }

      const foodRequest = await FoodDonation.create({
        user_id: req.user._id,
        donor_name,
        donor_phone,
        food_type,
        quantity,
        location_text,
        location_geo: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        description,
        expiration_date: expiration_date || null,
        proof_images
      });

      req.user.food_donations.push(foodRequest._id);
      await req.user.save();

      logger.info(`✅ Donation submitted by ${req.user.email} (Donation ID: ${foodRequest._id})`);

      req.flash('success', 'Donation submitted successfully!');
      return res.redirect('/feedhope-donation-food');
    } catch (err) {
      logger.error(`❗ Donation error: ${err.message}`);
      req.flash('error', 'Something went wrong. Please try again.');
      return res.redirect('/feedhope-donation-food');
    }
  }
);

router.post('/nearby-requests', async (req, res) => {
    const { location_nearby } = req.body;

    if (!location_nearby) {
        return res.status(400).render('donation/donateFood', { error: 'Please provide a location to find nearby requests' });
    }

    try {
        // Geocode the location input
        const response = await geoCoder.forwardGeocode({
            query: location_nearby,
            limit: 1
        }).send();

        if (!response.body.features.length) {
            return res.status(400).render('donation/donateFood', { error: 'Location not found' });
        }

        const [longitude, latitude] = response.body.features[0].geometry.coordinates;

        res.redirect(`/nearby-requests?lat=${latitude}&lng=${longitude}`);

    } catch (err) {
        return res.render('error/error', { err,title: '',
            stylesheet: '' });
    }
});

router.post('/connect-with-requester', async (req, res) => {
    
    const { donationId, requestId } = req.body;

    try {
        const donation = await FoodDonation.findById(donationId);
        const request = await FoodRequest.findById(requestId);

        if (!donation || !request) {
            return res.status(404).send('Donation or Request not found');
        }

        if (!request.connectedDonors.includes(donationId)) {
            request.connectedDonors.push(donationId);
        }

        if (!donation.connectedRequesters.includes(requestId)) {
            donation.connectedRequesters.push(requestId);
        }

        await request.save();
        await donation.save();

        res.redirect(`/feedhope-request-food-list/${requestId}`);

    } catch (err) {
        console.error('Error connecting donor with requester:', err);
        res.status(500).send('Internal server error');
    }
});

router.get('/nearby-requests', async (req, res) => {
    const { lat, lng } = req.query;
    const radius = 20; 

    try {
        const nearbyRequests = await FoodRequest.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: 'distance',
                    maxDistance: radius * 1000, 
                    spherical: true
                }
            }
        ]);

        const allRequests = await FoodRequest.find({});

        res.render('request/nearbyRequests', { nearbyRequests, allRequests, title: '',
            stylesheet: '', donorCoordinates: [parseFloat(lng), parseFloat(lat)] });
    } catch (err) {
        res.status(500).send('Error finding requests');
    }
});

module.exports = router;