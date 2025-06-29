const express = require('express');
const router = express.Router();
const FoodRequest = require('../../models/food_request');
const FoodDonation = require('../../models/food_donation');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });
const {cloudinary} = require('../../utils/cloudinary');
const {storage} = require('../../utils/cloudinary');
const multer = require('multer');
const upload = multer({storage});
const mongoose = require('mongoose');
const requireUserAuth = require('../../middleware/user_auth');
const logger = require('../../config/logger');
const {matchFoodRequest} = require('../../utils/match_service');

// Handle GET request to render the food request form
router.get('/feedhope-request-food', (req, res) => {
    res.render('request/request', 
        {
            title: 'Food Request',
            stylesheet: ''
        }
    ); 
});

// Handle POST request to submit a food request 
router.post(
  '/feedhope-request-food',
  requireUserAuth,
  upload.fields([
    { name: 'proof_images', maxCount: 3 },
    { name: 'government_id_images', maxCount: 3 }
  ]),
  async (req, res) => {
    try {
      const {
        requester_name,
        requester_phone,
        foodtype,
        location,
        description,
        urgency,
        number_of_people,
        expiration_date,
        government_id_number
      } = req.body;

      const can_pickup = req.body.can_pickup === 'on'; 

      // if (!can_pickup) {
      //   req.flash('error', 'You must confirm that you can pick up the food yourself.');
      //   return res.redirect('/feedhope-request-food');
      // }

      const quantity = {
        amount: Number(req.body.quantity?.amount),
        unit: req.body.quantity?.unit,
        description: req.body.quantity?.description,
      };

      // Validate phone number
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(requester_phone)) {
        req.flash('error', 'Invalid phone number');
        return res.redirect('/feedhope-request-food');
      }

      // Validate proof images
      if (!req.files || !req.files.proof_images || req.files.proof_images.length === 0) {
        req.flash('error', 'Upload at least one proof image.');
        return res.redirect('/feedhope-request-food');
      }

      // Validate government ID images
      if (!req.files.government_id_images || req.files.government_id_images.length === 0) {
        req.flash('error', 'Upload at least one government ID image.');
        return res.redirect('/feedhope-request-food');
      }

      // Server-side file size check (100KB)
      const maxSize = 100 * 1024;
      const allFiles = [...req.files.proof_images, ...req.files.government_id_images];
      for (let file of allFiles) {
        if (file.size > maxSize) {
          req.flash('error', 'Each uploaded image must be less than 100KB.');
          return res.redirect('/feedhope-request-food');
        }
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

      // Geocode location
      const geoRes = await geoCoder.forwardGeocode({ query: location, limit: 1 }).send();
      const geoFeature = geoRes.body.features[0];
      if (!geoFeature) {
        req.flash('error', 'Location not found. Please provide a valid location.');
        return res.redirect('/feedhope-request-food');
      }

      const [longitude, latitude] = geoFeature.geometry.coordinates;

      const proof_images = req.files.proof_images.map(f => ({
        url: f.path,
        filename: f.filename,
        description: `Proof image for request by ${requester_name}`
      }));

      const government_id_images = req.files.government_id_images.map(f => ({
        url: f.path,
        filename: f.filename,
        description: `Govt ID image for ${requester_name}`
      }));

      // Optional: total request limit (across all time)
      const requestCount = await FoodRequest.countDocuments({ user_id: req.user._id });
      if (requestCount >= 10) {
        logger.info(`❌ Total request limit reached for ${req.user.email}`);
        req.flash('error', 'You have reached the maximum donation request limit (10).');
        return res.redirect('/feedhope-donation-food');
      }

      const foodRequest = await FoodRequest.create({
        user_id: req.user._id,
        requester_name,
        requester_phone,
        food_type: foodtype,
        quantity,
        location_text: location,
        location_geo: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        description,
        urgency_level: urgency,
        number_of_people: Number(number_of_people),
        expiration_date: expiration_date || null,
        proof_images,
        government_id_number,
        government_id_images,
        can_pickup,
      });

      req.user.food_requests.push(foodRequest._id);
      await req.user.save();

      logger.info(`✅ Request submitted by ${req.user.email} (Request ID: ${foodRequest._id})`);

      matchFoodRequest(foodRequest).catch(err => console.error('Match error:', err));

      req.flash('success', 'Food request submitted. We will contact you soon.');

      return res.redirect('/feedhope-user-profile');

    } catch (err) {
      logger.error(`❗ Error submitting request: ${err.message}`);
      req.flash('error', 'Something went wrong. Please try again.');
      return res.redirect('/feedhope-request-food');
    }
  }
);

// render list of all the requested donation
router.get('/feedhope-request-food-list', async (req, res) => {
  const { city } = req.query;
  const filter = {};

  if (city) {
    filter['location_text'] = { $regex: new RegExp(city, 'i') }; // Case-insensitive match
  }

  const filteredFoodRequests = await FoodRequest.find(filter).sort({ createdAt: -1 });

  res.render('request/request_list', {
    filteredFoodRequests,
    title: 'List - Food Requests',
    stylesheet: '',
    showNavbar: true,
    showFooter: false,
    filterCity: city || '',
  });
});

router.get('/feedhope-request-food-list/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('Invalid ObjectId:', id);
        return res.status(400).send('Invalid Request ID');
    }

    try {
        const requester = await FoodRequest.findById(req.params.id)
            .populate('connectedDonors');

        if (!requester) {
            res.status(404).send('Requester not found');
        }

        // Store requester ID in the session
        req.session.requesterId = requester._id;

        res.render('request/requestSingleList', { requester,title: '',
            stylesheet: '' });
    } catch (error) {
        console.error('Error fetching requester details:', error);
        return res.status(404).send("Requester not found.");
    }
});

router.post('/connect-donor-with-requester', async (req, res) => {
    const { donoor } = req.body;
    const requesterId = req.session.requesterId; // Retrieve from session

    try {
        const requester = await FoodRequest.findById(requesterId).populate('connectedDonors');
        const donationGiver = await FoodDonation.findOne({ donor: donoor }).populate('connectedRequesters');

        if (!requester) {
            req.flash('error', 'Requester not found');
            return res.redirect(`/feedhope-request-food',-list/${requesterId}`);
        }

        if (!donationGiver) {
            req.flash('error', 'Donor not found');
            return res.redirect(`/feedhope-request-food',-list/${requesterId}`);
        }

        // Check if donor is already connected
        const isDonorConnected = requester.connectedDonors.some(d => d.donor === donoor);
        if (isDonorConnected) {
            req.flash('error', 'Donor with the same name is already connected.');
            return res.redirect(`/feedhope-request-food',-list/${requesterId}`);
        }

        // Find the donor's full details
        const donorDetails = await FoodDonation.findOne({ donor: donoor });
        const requestDetails = await FoodRequest.findOne({ _id: requesterId });

        if (!donorDetails) {
            req.flash('error', 'Donor not found in our records');
            return res.redirect(`/feedhope-request-food',-list/${requesterId}`);
        }

        if (!requestDetails) {
            req.flash('error', 'Requester not found in our records');
            return res.redirect(`/feedhope-request-food',-list/${requesterId}`);
        }

        // Add donor's ObjectId to the connectedDonors array
        requester.connectedDonors.push(donorDetails._id);
        donationGiver.connectedRequesters.push(requestDetails._id);
        await requester.save();
        await donationGiver.save();

        req.flash('success', 'Successfully connected with the requester');
        res.redirect(`/feedhope-request-food',-list/${requesterId}`);
    } catch (error) {
        console.error('Error connecting donor with requester:', error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;