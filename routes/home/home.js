const express = require('express');
const router = express.Router();
const ContactUs = require('../../models/contactUs');
const Event = require('../../models/event');

router.get('/', (req, res) => {
    res.render('development', {title: '', stylesheet:'', layout:false});
});

router.get('/feedhope', (req, res) => {  
    res.render(
        'home/homepage', 
        {
            title: 'Home',
            stylesheet: '/stylesheet/home/homepage.css',
            showSpinner: true, 
            spinnerMessage: 'Loading, please wait...' 
        }
    );
});

router.get('/feedhope-contact-us', (req, res) => {
    res.render(
        'home/contact-us', 
        {
            title: 'Contact Us',
            stylesheet: '/stylesheet/home/contact-us.css'
        }
    );
});

router.get('/feedhope-how-it-works', (req, res) => {
    res.render(
        'home/how-it-works',
        {
            title: 'how-it-works',
            stylesheet: '/stylesheet/home/how-it-works.css'
        }
    );
});

router.get('/feedhope-about-us', (req, res) => {
    res.render(
        'home/about-us', 
        { 
            title: 'About Us',
            stylesheet: '/stylesheet/home/about-us.css' 
        }
    );
});


router.get('/feedhope-events', async (req, res) => {
    try {
        const events = await Event.find(); 
        res.render(
            'home/events', 
            { 
                title: 'Events',
                stylesheet: '/stylesheet/home/events.css',
                events,
                showFooter: false
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post('/feedhope-contact_Us', async (req, res) => {
    const { username, email, contact, message } = req.body;

    if (!email || !contact || !username) {
        req.flash('error', 'All fields are required');
        return res.redirect('/feedhope-contact-us');
    }

    // if (username.split(' ').filter(Boolean).length < 2) {
    //     req.flash('error', 'Username must contain at least two words');
    //     return res.redirect('/feedhope-contact-us');
    // }

    if (contact.length !== 10) {
        req.flash('error', 'Please enter a valid Indian contact number');
        return res.redirect('/feedhope-contact-us');
    }

    try {
        const existingEmail = await ContactUs.findOne({ email });
        const checkContact = await ContactUs.findOne({ contact });

        if (existingEmail) {
            req.flash('error', 'Person with same Email already exists');
            return res.redirect('/feedhope-contact-us');
        }
        if (checkContact) {
            req.flash('error', 'Person with same Contact already exists');
            return res.redirect('/feedhope-contact-us');
        }

        const newContact = new ContactUs({
            username,
            email,
            contact,
            message: message || 'No message'
        });

        await newContact.save();
        req.flash('success', 'We will get in touch soon!');
        return res.redirect('/feedhope-contact-us');

    } catch (err) {
        return res.render('error/error', { err });
    }
});


module.exports = router;