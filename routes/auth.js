const express = require('express');
const router = express.Router();
const Volunteer = require('../models/volunteer');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });

router.get('/volunteer-registration', (req, res) => {
    res.render('auth/register', { error: '' });
});

router.post('/volunteer-registration', async (req, res) => {
    const { username, email, password, location } = req.body;
    if (!username || !password || !email || !location) {
        return res.status(400).render('auth/register', { error: 'Please fill in all fields including location' });
    }
    try {
        const existingVolunteer = await Volunteer.findOne({ email });
        if (existingVolunteer) {
            return res.status(400).render('auth/register', { error: 'Username already exists with same email!' });
        }

        const response = await geoCoder.forwardGeocode({ query: location, limit: 1 }).send();
        if (!response.body.features.length) {
            return res.status(400).render('auth/register', { error: 'Location not found' });
        }

        const [longitude, latitude] = response.body.features[0].center;
        const newVolunteer = new Volunteer({
            username,
            email,
            password,
            location,
            geometry: { type: 'Point', coordinates: [longitude, latitude] }
        });

        const resp = await newVolunteer.save();
        req.session.volunteerId = newVolunteer._id;
        res.redirect('/volunteer-login');
    } catch (error) {
        console.error(error);
        res.status(500).render('auth/register', { error: 'Server error' });
    }
});

router.get('/volunteer-login', (req, res) => {
    const showRegisterButton = !req.session.volunteerId;
    res.render('auth/login', { error: '', showRegisterButton, success:''});
});

router.post('/volunteer-login', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const volunteer = await Volunteer.findOne({ email });
        const user = await Volunteer.findOne({ username });
        if (!volunteer || !user) {
            return res.render('auth/login', { error: 'UserNotFound', showRegisterButton: true });
        }

        const isPasswordValid = await volunteer.comparePassword(password);
        if (!isPasswordValid) {
            return res.render('auth/login', { error: 'Incorrect Password', showRegisterButton: false });
        }

        req.session.volunteerId = volunteer._id;
        res.redirect(`/volunteer-profile/${volunteer._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Server error');
        }
        res.redirect('/login');
    });
});

module.exports = router;