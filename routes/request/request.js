const express = require('express');
const router = express.Router();
const RequestDonation = require('../../models/request');
const Donation = require('../../models/donation');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });
const {cloudinary} = require('../../cloudinary');
const {storage} = require('../../cloudinary');
const multer = require('multer');
const upload = multer({storage});

// Render the form to request a donation, anyone can do donations
router.get('/feedhope-request-donation', (req, res) => {
    res.render('request/requestDonation', 
        {
            title: '',
            stylesheet: ''
        }
    ); 
});

// Handle POST request to submit a donation request
router.post('/feedhope-request-donation', upload.array('images', 10), async (req, res) => {
    try {
        // Extract form fields
        const { requester_name, requester_phone, foodtype, quantity, location, need_description, assign_volunteer, volunteer_id, urgency, number_of_people, expiration_date } = req.body;
        
        // Validate phone number
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(requester_phone)) {
            req.flash('error', 'Please enter a valid 10-digit phone number');
            return res.redirect('/feedhope-request-donation');
        }

        // Upload images to Cloudinary and collect URLs
        const images = req.files.map(f => ({url: f.path, filename: f.filename}));

        console.log(images);

        // Geocode the location
        const geoData = await geoCoder.forwardGeocode({
            query: location,
            limit: 1
        }).send();

        const geometry = {
            type: 'Point',
            coordinates: geoData.body.features[0].geometry.coordinates
        };

        // Create new request donation instance
        const newRequestDonation = new RequestDonation({
            requester_name,
            requester_phone,
            foodtype,
            quantity,
            status: 'pending',
            location,
            need_description,
            geometry,
            volunteer: assign_volunteer ? volunteer_id : null,
            urgency,
            number_of_people,
            expiration_date,
            images // Save the Cloudinary URLs
        });

        console.log(images);

        // Save to database
        const savedRequest = await newRequestDonation.save();
        if (savedRequest) console.log("Saved to database");

        req.session.requesterId = savedRequest._id;

        const donor = await RequestDonation.findById(savedRequest._id);
        if (!donor) {
            req.flash('error', 'Sorry, there was a problem while saving the donation request. Please try again!');
            return res.redirect('/feedhope-request-donation');
        } else {
            req.flash('success', 'Successfully received your request, we will get back to you within the next 48 hours.');
            res.redirect('/feedhope');
        }
    } catch (err) {
        console.error('Error submitting donation request:', err);
        res.status(500).send('Error submitting donation request. Please try again later.');
    }
});


// render list of all the requested donation
router.get('/feedhope-request-donation-list', async (req, res) =>{
    const allRequests = await RequestDonation.find({});
    res.render('request/requestedList',
        {
            allRequests,
            title: '',
            stylesheet: ''
        }
    );
});

router.get('/feedhope-request-donation-list/:id', async (req, res) => {
    try {
        const requester = await RequestDonation.findById(req.params.id)
            .populate('connectedDonors');

        if (!requester) {
            throw new Error("Not found any request with this username for donation.");
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
        const requester = await RequestDonation.findById(requesterId).populate('connectedDonors');
        const donationGiver = await Donation.findOne({ donor: donoor }).populate('connectedRequesters');

        if (!requester) {
            req.flash('error', 'Requester not found');
            return res.redirect(`/feedhope-request-donation-list/${requesterId}`);
        }

        if (!donationGiver) {
            req.flash('error', 'Donor not found');
            return res.redirect(`/feedhope-request-donation-list/${requesterId}`);
        }

        // Check if donor is already connected
        const isDonorConnected = requester.connectedDonors.some(d => d.donor === donoor);
        if (isDonorConnected) {
            req.flash('error', 'Donor with the same name is already connected.');
            return res.redirect(`/feedhope-request-donation-list/${requesterId}`);
        }

        // Find the donor's full details
        const donorDetails = await Donation.findOne({ donor: donoor });
        const requestDetails = await RequestDonation.findOne({ _id: requesterId });

        if (!donorDetails) {
            req.flash('error', 'Donor not found in our records');
            return res.redirect(`/feedhope-request-donation-list/${requesterId}`);
        }

        if (!requestDetails) {
            req.flash('error', 'Requester not found in our records');
            return res.redirect(`/feedhope-request-donation-list/${requesterId}`);
        }

        // Add donor's ObjectId to the connectedDonors array
        requester.connectedDonors.push(donorDetails._id);
        donationGiver.connectedRequesters.push(requestDetails._id);
        await requester.save();
        await donationGiver.save();

        req.flash('success', 'Successfully connected with the requester');
        res.redirect(`/feedhope-request-donation-list/${requesterId}`);
    } catch (error) {
        console.error('Error connecting donor with requester:', error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;