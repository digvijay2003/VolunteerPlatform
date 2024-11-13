const express = require('express');
const router = express.Router();
const Volunteer = require('../models/volunteer');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });


router.get('/volunteer-profile/:id', async (req, res) => {
    if (!req.session.volunteerId || req.session.volunteerId != req.params.id) {
        return res.render('errorHandling/error', { error: 'Unauthorized' });
    }
    try {
        const volunteer = await Volunteer.findById(req.params.id);
        if (!volunteer) {
            return res.status(404).send('Volunteer not found');
        }
        res.render('volunteerProfile/profile', { volunteer, mapboxToken: process.env.MAPBOX_TOKEN });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/volunteer-profile/:id/edit', async (req, res) => {
    try {
        const volunteer = await Volunteer.findById(req.params.id);
        if (!volunteer) {
            return res.status(404).send('Volunteer not found');
        }
        res.render('volunteerProfile/edit', { volunteer });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.put('/volunteer-profile/:id', async (req, res) => {
    try {
        const { username, email, location } = req.body.volunteer;
        const updateData = { username, email, location };

        if (req.body.volunteer.password) {
            updateData.password = req.body.volunteer.password;
        }

        if (!location) {
            return res.status(400).send('Location is required');
        }

        const geoData = await geoCoder.forwardGeocode({
            query: location,
            limit: 1
        }).send();

        updateData.geometry = geoData.body.features[0].geometry;

        const updatedVolunteer = await Volunteer.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.redirect(`/volunteer-profile/${updatedVolunteer._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router;