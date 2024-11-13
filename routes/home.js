const express = require('express');
const router = express.Router();
const ContactUs = require('../models/contactUs');

router.get('/feedhope', (req, res) => {  
    res.render('home/homepage', {successRequestMessage: ''});
});

router.get('/feedhope-contact_Us', (req, res) => {
    res.render('home/contactUs', { error: '', success: '' });
});

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