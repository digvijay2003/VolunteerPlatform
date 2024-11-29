const express = require('express');
const router = express.Router();
const ContactUs = require('../models/contactUs');
const { lazy } = require('react');

router.get('/', (req, res) => {
    res.render('development', {title: '', stylesheet:'', layout:false});
});

router.get('/feedhope', (req, res) => {  
    res.render(
        'home/homepage', 
        {
            title: 'Home',
            stylesheet: '/stylesheet/home/homepage.css' 
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


router.get('/feedhope-events', (req, res) => {
    res.render(
        'home/events',{
            title: 'Events',
            stylesheet: '/stylesheet/home/events.css'
        }
    )
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post('/feedhope-contact_Us', async (req, res) => {
    const { username, email, contact, message } = req.body;

    if (!email || !contact || !username) {
        return res.render('home/contactUs', { error: 'All fields are required', success: '' });
    }

    if (username.split(' ').filter(Boolean).length < 2) {
        return res.render('home/contactUs', { error: 'Username must contain at least two words', success: '' });
    }

    if (contact.length !== 10) {
        return res.status(500).render('home/contactUs', { error: 'Please enter a valid Indian contact number', success: '' });
    }

    try {
        const existingEmail = await ContactUs.findOne({ email });
        const checkContact = await ContactUs.findOne({ contact });

        if (existingEmail) {
            return res.status(200).render('home/contactUs', { error: 'Person with same Email already exists', success: '' });
        }
        if (checkContact) {
            return res.status(200).render('home/contactUs', { error: 'Person with same Contact already exists', success: '' });
        }

        const newContact = new ContactUs({
            username,
            email,
            contact,
            message: message || 'No message'
        });

        await newContact.save();
        
        return res.render('home/contactUs', { error: '', success: 'We will get in touch soon!' });

    } catch (err) {
        return res.render('errorHandling/error', { err });
    }
});


module.exports = router;