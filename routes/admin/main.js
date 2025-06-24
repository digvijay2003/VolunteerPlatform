const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const flash = require('connect-flash');
const FoodRequest = require('../../models/food_request');
const ContactUs = require('../../models/contact_us');
const Volunteer = require('../../models/volunteer');
const FoodDonation = require('../../models/food_donation');
const { sendSMS } = require('../../utils/twilio');

// Environment variables
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;

// Mocked hash password (use bcrypt.hashSync(adminPassword, 10) during setup)
const hashedPassword = bcrypt.hashSync(adminPassword, 10);

// Middleware to verify JWT token for protected routes
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


router.get('/login', (req, res) => {
    if (req.session.token) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/dashboard/ADMIN_login', 
        {
            title: 'Login',
            stylesheet: '', 
            layout:false
        }
    );
});

// Admin login route (POST - handles login)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (username !== adminUsername || !bcrypt.compareSync(password, hashedPassword)) {

        return res.redirect('/admin/login')
    }

    // Create JWT token
    const token = jwt.sign({ username: adminUsername, isAdmin: true }, jwtSecret, { expiresIn: '1h' });

    // Store the token in the session
    req.session.token = token;

    res.redirect('/admin/dashboard');
});

// Admin dashboard route
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Request Donations Stats
        const totalRequests = await FoodRequest.countDocuments({});
        const pendingRequests = await FoodRequest.countDocuments({ status: 'pending' });
        const completedRequests = await FoodRequest.countDocuments({ status: 'success' });
        const rejectedRequests = await FoodRequest.countDocuments({ status: 'rejected' });

        // Contact Us Queries Stats
        const totalQueries = await ContactUs.countDocuments({});

        // Volunteers Stats
        const totalVolunteers = await Volunteer.countDocuments({});

        // Donations Stats
        const totalDonations = await FoodDonation.countDocuments({});
        const pendingDonations = await FoodDonation.countDocuments({ status: 'pending' });
        const successfulDonations = await FoodDonation.countDocuments({ status: 'success' });

        res.render('admin/dashboard/ADMIN_panel', {
            title: 'Admin Dashboard',
            totalRequests,
            pendingRequests,
            completedRequests,
            rejectedRequests,
            totalQueries,
            totalVolunteers,
            totalDonations,
            pendingDonations,
            successfulDonations,
            messages: req.flash(),
            layout: false
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Server Error');
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});



router.get('/request-donations', isAuthenticatedAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Get search query and filter status from request
        const query = req.query.query || '';
        const statusFilter = req.query.status || '';

        // Build the query object based on filters
        let filter = {};
        if (query) {
            filter = {
                $or: [
                    { requester_name: new RegExp(query, 'i') },
                    { foodtype: new RegExp(query, 'i') }
                ]
            };
        }
        if (statusFilter) {
            filter.status = statusFilter;
        }

        const totalRequests = await FoodRequest.countDocuments(filter);
        const totalPages = Math.ceil(totalRequests / limit);

        const donations = await FoodRequest.find(filter)
            .skip(skip)
            .limit(limit);

        res.render('admin/request/ADMIN_request', {
            title: '',
            stylesheet: '',
            donationRequests: donations,
            currentPage: page,
            totalPages: totalPages,
            query: query,            // Pass query to EJS
            statusFilter: statusFilter,
            layout:false // Pass status filter to EJS
        });
    } catch (error) {
        console.error('Error paginating donation requests:', error);
        res.status(500).send('Error paginating donation requests');
    }
});

router.get('/request-donations/:id', isAuthenticatedAdmin, async (req, res) => {
    try {
        const requester = await FoodRequest.findById(req.params.id)
            .populate('connectedDonors');

        if (!requester) {
            throw new Error("Not found any request with this username for donation.");
        }

        // Store requester ID in the session
        req.session.requesterId = requester._id;

        res.render('admin/request/single_request', { requester ,title: '',
            stylesheet: '', layout:false });
    } catch (error) {
        console.error('Error fetching requester details:', error);
        return res.status(404).send("Requester not found.");
    }
});

// Get a specific request for editing (Admin View)
router.get('/request-donations/:id/edit', isAuthenticatedAdmin, async (req, res) => {
    try {
        const donationRequest = await FoodRequest.findById(req.params.id);
        if (!donationRequest) {
            req.flash('error', 'Donation request not found');
            return res.redirect('/admin/request-donations');
        }
        res.render('admin/request/ADMIN_edit_request', { donationRequest , title: '',
            stylesheet: '', layout:false });
    } catch (error) {
        console.error('Error fetching donation request:', error);
        res.status(500).send('Error fetching donation request');
    }
});

// Update donation request (Admin Action)
router.put('/request-donations/:id', isAuthenticatedAdmin, async (req, res) => {
    try {
        // Extract data from request body
        const {
            requester_name,
            requester_phone,
            foodtype,
            quantity_amount,
            quantity_unit,
            quantity_description,
            status,
            location,
            need_description,
            urgency,
            number_of_people,
            expiration_date,
            images
        } = req.body;

        // Construct the quantity object
        const quantity = {
            amount: parseFloat(quantity_amount),
            unit: quantity_unit,
            description: quantity_description
        };

        // Parse images (URLs)
        const imagesArray = images ? images.split(',').map(url => ({ url: url.trim() })) : [];

        // Construct the updated data object
        const updatedData = {
            requester_name,
            requester_phone: parseFloat(requester_phone),
            foodtype,
            quantity,
            status,
            location,
            need_description,
            urgency,
            number_of_people: parseInt(number_of_people, 10),
            expiration_date: expiration_date ? new Date(expiration_date) : null,
            images: imagesArray
        };

        // Update the request
        const updatedRequest = await FoodRequest.findByIdAndUpdate(req.params.id, updatedData, { new: true });

        // Handle the result
        if (!updatedRequest) {
            req.flash('error', 'Error updating donation request');
            return res.redirect('/admin/request-donations');
        }

        req.flash('success', 'Donation request updated successfully');
        res.redirect('/admin/request-donations');
    } catch (error) {
        console.error('Error updating donation request:', error);
        res.status(500).send('Error updating donation request');
    }
});

// Delete donation request (Admin Action)
router.delete('/request-donations/:id', isAuthenticatedAdmin, async (req, res) => {
    try {
        await FoodRequest.findByIdAndDelete(req.params.id);
        req.flash('success', 'Donation request deleted successfully');
        res.redirect('/admin/request-donations');
    } catch (error) {
        console.error('Error deleting donation request:', error);
        res.status(500).send('Error deleting donation request');
    }
});


router.get('/check-queries', isAuthenticatedAdmin, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';

        let filter = {};
        if (searchQuery) {
            filter = {
                $or: [
                    { username: new RegExp(searchQuery, 'i') }, 
                    { email: new RegExp(searchQuery, 'i') }
                ]
            };
        }

        const queries = await ContactUs.find(filter);

        res.render('admin/queries/ADMIN_queries', {
            title: 'Check Queries',
            stylesheet: '',
            queries,
            searchQuery, 
            messages: req.flash(),
            layout: false
        });

    } catch (error) {
        console.error('Error fetching queries:', error);
        req.flash('error', 'Failed to load queries.');
        res.redirect('/admin');
    }
});

router.post('/send-message/:id', isAuthenticatedAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { messageBody } = req.body;

        const query = await ContactUs.findById(id);
        if (!query) {
            req.flash('error', 'Query not found.');
            return res.redirect('/admin/check-queries');
        }

        const checkmessage = await sendSMS(`+917807242269`, messageBody);

        if (checkmessage){
            req.flash('success', `Message sent successfully to ${query.username}`);
        } else{
            req.flash('error', `Message not sent successfully to ${query.username}`);
        }

        res.redirect('/admin/check-queries');

    } catch (error) {
        console.error('Error sending message:', error.message);
        req.flash('error', 'Failed to send the message.');
        res.redirect('/admin/check-queries');
    }
});


module.exports = router;