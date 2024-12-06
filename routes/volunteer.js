const express = require('express');
const router = express.Router();
const Volunteer = require('../models/volunteer');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const { request } = require('http');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });


router.get('/volunteer-registration', (req, res) => {
    res.render('auth/register', { error: '' ,title: 'Volunteer Registration',
        stylesheet: 'stylesheet/auth/register.css'});
});

router.post('/volunteer-registration', async (req, res) => {
    const { username, email, password, location } = req.body;
    if (!username || !password || !email || !location) {
        req.flash('error','All fields must be provided');
        return res.status(400).render('auth/register');
    }
    try {
        const existingVolunteer = await Volunteer.findOne({ email });
        if (existingVolunteer) {
            req.flash('error','Username already exists with same email!');
            return res.status(400).render('auth/register');
        }

        const response = await geoCoder.forwardGeocode({ query: location, limit: 1 }).send();
        if (!response.body.features.length) {
            req.flash('error','Location not found');
            return res.status(400).render('auth/register');
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
        req.flash('success','Work for hope, Successful registered');
        res.redirect('/volunteer-login');
    } catch (error) {
        console.error(error);
        req.flash('error','Server error');
        res.status(500).render('auth/register');
    }
});

router.get('/volunteer-login', (req, res) => {
    const showRegisterButton = !req.session.volunteerId;
    res.render('auth/login',
        {
            showRegisterButton,
            title: 'Volunteer Login',
            stylesheet: '/stylesheet/auth/login.css'
        }
    );
});

router.post('/volunteer-login', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const volunteer = await Volunteer.findOne({ email });
        const user = await Volunteer.findOne({ username });
        if (!volunteer || !user) {
            req.flash('error','user not found');
            return res.render('auth/login', { showRegisterButton: true });
        }

        const isPasswordValid = await volunteer.comparePassword(password);
        if (!isPasswordValid) {
            req.flash('error', 'incorrect password');
            return res.render('auth/login', { showRegisterButton: false });
        }

        req.session.volunteerId = volunteer._id;
        req.flash('success', 'Successfully Logged In!')
        res.redirect(`/volunteer-profile/${volunteer._id}`);
    } catch (error) {
        console.error(error)
        res.status(500).send('Server error');
    }
});

router.get('/logout', (req, res) => {
    req.flash('success', 'Logout successful!');  // Set flash message first

    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Server error');
        }

        res.clearCookie('connect.sid');  // Clear session cookie after destroying session
        res.redirect('/volunteer-login');
    });
});

router.get('/volunteer-profile/:id', async (req, res) => {
    if (!req.session.volunteerId || req.session.volunteerId != req.params.id) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/volunteer-login');
    }
    try {
        const volunteer = await Volunteer.findById(req.params.id);
        if (!volunteer) {
            return res.status(404).send('Volunteer not found');
        }
        res.render('volunteerProfile/profile', 
            {
                volunteer, 
                mapboxToken: process.env.MAPBOX_TOKEN,
                title: '',
                stylesheet: ''
            }
        );
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
        res.render('volunteerProfile/edit',
            { 
                volunteer,
                title: '',
                stylesheet: ''
            }
        );
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
        req.flash('success','Volunteer updated');
        res.redirect(`/volunteer-profile/${updatedVolunteer._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router;