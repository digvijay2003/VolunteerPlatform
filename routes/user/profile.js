const express = require('express');
const router = express.Router();
const User = require('../../models/user');
const Volunteer = require('../../models/volunteer');
const FoodDonation = require('../../models/food_donation');
const FoodRequest = require('../../models/food_request');
const FoodMatch = require('../../models/food_match');
const requireUserAuth = require('../../middleware/user_auth');
const agenda = require('../../jobs/agendaInstance');
const checkPremiumAccess = require('../../middleware/check_subscription');
const Subscription = require('../../models/subscription');


router.get('/feedhope-user-dashboard', requireUserAuth, checkPremiumAccess, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/feedhope-user-login');
        }

        const volunteer = await Volunteer.findOne({ user_id: req.user.id })
            .populate({
                path: 'completedAssignments',
                options: { sort: { deliveryactualDeliveryTime: -1 }, limit: 1 },
                populate: ['food_donation', 'food_request']
            });

        const lastDeliveredAssignment = volunteer?.completedAssignments?.[0];

        if (volunteer && volunteer.currentAssignments) {
            const activeAssignment = await FoodMatch.findById(volunteer.currentAssignments)
                .populate({
                path: 'food_donation',
                populate: {
                    path: 'match',
                    populate: {
                    path: 'assignedVolunteer',
                    model: 'Volunteer'
                    }
                }
                })
                .populate({
                path: 'food_request',
                populate: {
                    path: 'match',
                    populate: {
                    path: 'assignedVolunteer',
                    model: 'Volunteer'
                    }
                }
                })
            volunteer.currentAssignments = activeAssignment;
        }

        user.volunteer = volunteer;

        const foodDonations = await FoodDonation.find({ user_id: req.user.id })
            .populate({
                path: 'match',
                populate: {
                    path: 'assignedVolunteer',
                    model: 'Volunteer'
                }
            })
            .sort({ createdAt: -1 });

        const foodRequests = await FoodRequest.find({ user_id: req.user.id })
            .populate({
                path: 'match',
                populate: {
                    path: 'assignedVolunteer',
                    model: 'Volunteer'
                }
            })
            .sort({ createdAt: -1 });

        const activeFoodRequest = foodRequests.find(fr => fr.status === 'matched' && !fr.fulfilled_at);
        const previousFoodRequests = foodRequests.filter(fr => 
            !activeFoodRequest || fr._id.toString() !== activeFoodRequest._id.toString()
        );


        const activeFoodDonation = foodDonations.find(fd => fd.status === 'matched' && !fd.fulfilled_at);
        const previousFoodDonations = foodDonations.filter(fd => 
            !activeFoodDonation || fd._id.toString() !== activeFoodDonation._id.toString()
        );

        let lastFailedAssignment = null;

        if (volunteer && !volunteer.currentAssignments) {
            lastFailedAssignment = await FoodMatch.findOne({
                deliveryStatus: 'failed',
                assignedVolunteer: null,
                previousAssignedVolunteer: volunteer._id,
                deliveryfailureReason: { $exists: true },
                food_request: { $exists: true },
                food_donation: { $exists: true },
            })
            .populate('food_request')
            .populate('food_donation')
            .sort({ updatedAt: -1 });
        }

        console.log('lastFailedAssignment:', lastFailedAssignment);

        const subscription = await Subscription.findOne({ user: req.user.id });

        let hasPremiumAccess = false;
        if (subscription?.plan === 'Premium' && subscription?.status === 'Active' && new Date() <= subscription?.endDate) {
        hasPremiumAccess = true;
        }

        res.render('user/profile', {
            user,
            lastDeliveredAssignment,
            activeFoodDonation,
            previousFoodDonations,
            activeFoodRequest,
            previousFoodRequests,
            lastFailedAssignment,
            mapboxAccessToken: process.env.MAPBOX_TOKEN,
            title: 'User Dashboard',
            showNavbar: false,
            showFooter: false,
            stylesheet: '',
            hasPremiumAccess,
            getStatusBadge: function (status) {
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
        res.redirect('/feedhope-user-profile');
    }
});

// Confirm Food Pickup from Donor
router.post('/delivery/:id/pickup', requireUserAuth, async (req, res) => {
    const { otp } = req.body;
    const assignmentId = req.params.id;

    try {
        const assignment = await FoodMatch.findById(assignmentId);

        if (!assignment || assignment.deliveryStatus !== 'assigned') {
            req.flash('error', 'Invalid assignment or already picked up.');
            return res.redirect('/feedhope-user-dashboard');
        }

        if (otp !== assignment.donorOtp) {
            req.flash('error', 'Incorrect OTP. Please verify with the donor.');
            return res.redirect('/feedhope-user-dashboard');
        }

        assignment.deliveryStatus = 'in_transit';
        assignment.verifyOtpWithDonor = true;
        await assignment.save();

        req.flash('success', 'Pickup confirmed. Start delivery to the requester.');
        res.redirect('/feedhope-user-dashboard');

    } catch (err) {
        console.error('Pickup Error:', err);
        req.flash('error', 'Something went wrong during pickup confirmation.');
        res.redirect('/feedhope-user-dashboard');
    }
});

// Confirm Food Delivery to Requester
router.post('/delivery/:id/deliver', requireUserAuth, async (req, res) => {
    const { otp } = req.body;
    const assignmentId = req.params.id;

    try {
        const match = await FoodMatch.findById(assignmentId)
            .populate('assignedVolunteer')
            .populate('food_donation')
            .populate('food_request');

        if (!match || match.deliveryStatus !== 'in_transit') {
            req.flash('error', 'Invalid operation or already delivered.');
            return res.redirect('/feedhope-user-dashboard');
        }

        if (otp !== match.requesterOtp) {
            req.flash('error', 'Incorrect OTP. Please verify with the requester.');
            return res.redirect('/feedhope-user-dashboard');
        }

        const deliveryTime = new Date();

        match.deliveryStatus = 'delivered';
        match.deliveryactualDeliveryTime = deliveryTime;
        match.verifyOtpWithRequester = true;
        match.deliverynotifications = {
            donorNotified: true,
            requesterNotified: true,
            volunteerNotified: true
        };
        await match.save();

        const donation = match.food_donation;
        if (donation && !donation.fulfilled_at) {
            donation.fulfilled_at = deliveryTime;
            await donation.save();
        }
        
        const request = match.food_request;
        if (request && !request.fulfilled_at) {
            request.fulfilled_at = deliveryTime;
            await request.save();
        }
        
        const volunteer = match.assignedVolunteer;
        if (volunteer) {
            volunteer.availability = true;
            volunteer.currentAssignments = null;
            volunteer.rating = parseFloat((volunteer.rating + 0.1).toFixed(2));
            volunteer.completedAssignments.push(match._id);
            await volunteer.save();
        }

        req.flash('success', 'Delivery successfully completed!');
        res.redirect('/feedhope-user-dashboard');

    } catch (err) {
        console.error('Delivery Error:', err);
        req.flash('error', 'Something went wrong during delivery confirmation.');
        res.redirect('/feedhope-user-dashboard');
    }
});

router.post('/delivery/:id/fail', requireUserAuth, async (req, res) => {
    const matchId = req.params.id;
    const { reason, reasonType } = req.body;

    try {
        const match = await FoodMatch.findById(matchId)
            .populate('assignedVolunteer')
            .populate('food_donation')
            .populate('food_request');

        if (!match || (match.deliveryStatus !== 'assigned' && match.deliveryStatus !== 'in_transit')) {
            req.flash('error', 'Invalid delivery status for failure report.');
            return res.redirect('/feedhope-user-dashboard');
        }

        match.deliveryStatus = 'failed';
        match.deliveryfailureReason = `[${reasonType}] ${reason}`;
        match.previousAssignedVolunteer = match.assignedVolunteer;
        match.assignedVolunteer = null;
        match.deliveryMode = null;
        match.deliveryRetryCount = (match.deliveryRetryCount || 0) + 1;

        // Remove volunteer assignment (for single ObjectId field)
        const volunteer = match.previousAssignedVolunteer;
        if (volunteer) {
            volunteer.availability = true;
            volunteer.currentAssignments = null; 
            await volunteer.save();
        }

        // Clean from food_donation and food_request
        const donation = match.food_donation;
        if (donation && donation.delivered_by_volunteer?.toString() === volunteer?._id?.toString()) {
            donation.delivered_by_volunteer = null;
            await donation.save();
        }

        const request = match.food_request;
        if (request && request.delivered_by_volunteer?.toString() === volunteer?._id?.toString()) {
            request.delivered_by_volunteer = null;
            await request.save();
        }

        await match.save();

        // Optional: Retry delivery after 10 minutes
        await agenda.schedule('in 10 minutes', 'assign-delivery-agent', { matchId });

        req.flash('success', 'Delivery marked as failed. We’ll reassign it shortly.');
        res.redirect('/feedhope-user-dashboard');

    } catch (err) {
        console.error('Delivery Failure Error:', err);
        req.flash('error', 'An error occurred while marking delivery as failed.');
        res.redirect('/feedhope-user-dashboard');
    }
});

module.exports = router;