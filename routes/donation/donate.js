const express = require('express');
const router = express.Router();
const Request = require('../../models/request');
const Donation = require('../../models/donation');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });

// render the form for the donation
router.get('/feedhope-donation-food', (req, res) => {
    res.render('donation/donateFood', {error:'',title: '',
        stylesheet: ''});
});

// Handle the donation post request
router.post('/feedhope-donation-food', async (req, res) => {
    const { foodtype, donor, quantity, location, description } = req.body;

    if (!donor || !foodtype || !quantity.amount || !quantity.unit || !quantity.description || !location || !description) {
        return res.status(400).render('donation/donateFood', { error: 'Please fill in all fields including location' });
    }

    try {
        const existingDonor = await Donation.findOne({ donor });
        if (existingDonor) {
            return res.status(200).render('donation/donateFood', { error: 'Donor already exists' });
        }

        const response = await geoCoder.forwardGeocode({ query: location, limit: 1 }).send();
        if (!response.body.features.length) {
            return res.status(400).render('donation/donateFood', { error: 'Location not found' });
        }

        const [longitude, latitude] = response.body.features[0].geometry.coordinates;

        const newDonor = new Donation({
            foodtype,
            donor,
            quantity: {
                amount: quantity.amount,
                unit: quantity.unit,
                description: quantity.description
            },
            location,
            description,
            geometry: { type: 'Point', coordinates: [longitude, latitude] }
        });

        await newDonor.save();
        res.redirect(`/nearby-requests?lat=${latitude}&lng=${longitude}`)
    } catch (err) {
        return res.render('error/error', { err,title: '',
            stylesheet: '' });
    }
});

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

        // Redirect to the existing GET route with lat and lng as query parameters
        res.redirect(`/nearby-requests?lat=${latitude}&lng=${longitude}`);
    } catch (err) {
        return res.render('error/error', { err,title: '',
            stylesheet: '' });
    }
});

// Handle the connection between a donor and a requester
router.post('/connect-with-requester', async (req, res) => {
    
    const { donationId, requestId } = req.body;

    try {
        const donation = await Donation.findById(donationId);
        const request = await Request.findById(requestId);

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

        // Redirect or send a success response
        res.redirect(`/feedhope-request-donation-list/${requestId}`);
    } catch (err) {
        console.error('Error connecting donor with requester:', err);
        res.status(500).send('Internal server error');
    }
});

// help to display all the nearby requested donations within a specified area
router.get('/nearby-requests', async (req, res) => {
    const { lat, lng } = req.query;
    const radius = 20; // kilometers

    try {
        // Get nearby requests
        const nearbyRequests = await Request.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: 'distance',
                    maxDistance: radius * 1000, // convert km to meters
                    spherical: true
                }
            }
        ]);

        // Get all requests
        const allRequests = await Request.find({});
        // console.log(nearbyRequests);

        res.render('request/nearbyRequests', { nearbyRequests, allRequests, title: '',
            stylesheet: '', donorCoordinates: [parseFloat(lng), parseFloat(lat)] });
    } catch (err) {
        res.status(500).send('Error finding requests');
    }
});


// router.get('/feedhope-nearby-requests-best-fit', async (req, res) => {
//     const { lat, lng, foodtype, quantityAmount, quantityUnit } = req.query;
//     const radius = 20; // kilometers

//     try {
//         // Aggregate query to find nearby requests
//         const bestFitRequests = await Request.aggregate([
//             {
//                 $geoNear: {
//                     near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
//                     distanceField: 'distance',
//                     maxDistance: radius * 1000, // convert km to meters
//                     spherical: true
//                 }
//             },
//             {
//                 $match: {
//                     foodtype: foodtype,
//                 }
//             },
//             {
//                 $sort: { distance: 1 } // Sort by distance
//             }
//         ]);

//         res.render('request/bestFitRequests', { requests: bestFitRequests });
//     } catch (err) {
//         res.status(500).send('Error finding best-fit requests');
//     }
// });

module.exports = router;