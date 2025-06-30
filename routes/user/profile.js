const express = require('express');
const router = express.Router();
const User = require('../../models/user');
const Volunteer = require('../../models/volunteer');
const FoodDonation = require('../../models/food_donation');
const FoodRequest = require('../../models/food_request');
const FoodMatch = require('../../models/food_match');
const requireUserAuth = require('../../middleware/user_auth');


router.get('/feedhope-user-dashboard', requireUserAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('food_donations')
            .populate('food_requests');

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/feedhope-user-login');
        }

        const volunteer = await Volunteer.findOne({ user_id: req.user.id });

        if (volunteer && volunteer.currentAssignments) {
            const activeAssignment = await FoodMatch.findById(volunteer.currentAssignments)
                .populate({
                    path: 'food_donation', 
                    model: 'FoodDonation'
                })
                .populate({
                    path: 'food_request', 
                    model: 'FoodRequest'
                });
            volunteer.currentAssignments = activeAssignment;
        }
        user.volunteer = volunteer;

        res.render('user/profile', {
            user,
            mapboxAccessToken: process.env.MAPBOX_TOKEN,
            title: 'User Dashboard',
            showNavbar: false,
            showFooter: false,
            stylesheet: '',
            getStatusBadge: function(status) {
                switch (status) {
                    case 'approved': return 'bg-success';
                    case 'pending': return 'bg-warning text-dark';
                    case 'rejected': return 'bg-danger';
                    case 'matched': return 'bg-primary';
                    default: return 'bg-secondary';
                }
            }
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        req.flash('error', 'Could not load dashboard data.');
        res.redirect('/');
    }
});


module.exports = router;