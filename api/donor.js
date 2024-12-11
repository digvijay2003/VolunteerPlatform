const express = require('express');
const { Donor, MoneyDonation } = require('../models/donor'); 
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;

function ensureAuthenticated(req, res, next) {
    const token = req.session.token;

    if (!token) {
        return res.redirect('/admin/login');
    }

    // Verify token
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.redirect('/admin/login');
        }
        req.user = decoded;
        next();
    });
}
function isAuthenticatedAdmin(req, res, next) {
    const token = req.session.token || req.cookies.token;

    if (!token) {
        req.flash('error', 'You must be logged in as admin to access this resource.');
        return res.redirect('/admin/login');
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err || !decoded.isAdmin) {
            req.flash('error', 'You are not authorized to view this page.');
            return res.redirect('/admin/login');
        }
        next();
    });
}

router.post('/donate', async (req, res) => {
    const { name, email, phone, amount, message } = req.body;
  
    try {
      let donor = await Donor.findOne({ email });
      if (!donor) {
        donor = await Donor.create({ name, email, phone });
      }
  
      const donation = await MoneyDonation.create({
        donorId: donor._id,
        amount,
        message,
      });
  
      req.flash('success','Donation made successfully.');
      res.redirect('/feedhope');

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: error.message,
      });
    }
});
  
router.get('/donations/list', ensureAuthenticated ,async (req, res) => {
    try {
      const donations = await MoneyDonation.find().populate('donorId', 'name email phone');
      res.status(200).json(donations);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: error.message,
      });
    }
});
  
  module.exports = router;
  