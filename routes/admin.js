const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const flash = require('connect-flash');
const RequestDonation = require('../models/request');
const ContactUs = require('../models/contactUs');

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




// Admin login route (GET - renders login page)
router.get('/login', (req, res) => {
    if (req.session.token) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { error: '' });
});

// Admin login route (POST - handles login)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (username !== adminUsername || !bcrypt.compareSync(password, hashedPassword)) {
        return res.render('admin/login', { error: 'Invalid credentials' });
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
        // Example statistics; replace with actual logic
        const totalRequests = await RequestDonation.countDocuments({});
        const pendingRequests = await RequestDonation.countDocuments({ status: 'pending' });
        const completedRequests = await RequestDonation.countDocuments({ status: 'success' });
        const rejectedRequests = await RequestDonation.countDocuments({ status: 'rejected' });
        

        const totalQueries = await ContactUs.countDocuments({});
        
        // Pass statistics and flash messages to the view
        res.render('admin/dashboard', {
            totalRequests,
            pendingRequests,
            completedRequests,
            rejectedRequests,
            totalQueries,
            messages: req.flash() // Make sure to pass flash messages
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Error fetching dashboard data');
    }
});


// Admin logout route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});



// Request donations route
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

        const totalRequests = await RequestDonation.countDocuments(filter);
        const totalPages = Math.ceil(totalRequests / limit);

        const donations = await RequestDonation.find(filter)
            .skip(skip)
            .limit(limit);

        res.render('admin/requestDonationList', {
            donationRequests: donations,
            currentPage: page,
            totalPages: totalPages,
            query: query,            // Pass query to EJS
            statusFilter: statusFilter // Pass status filter to EJS
        });
    } catch (error) {
        console.error('Error paginating donation requests:', error);
        res.status(500).send('Error paginating donation requests');
    }
});

router.get('/request-donations/:id', isAuthenticatedAdmin, async (req, res) => {
    try {
        const requester = await RequestDonation.findById(req.params.id)
            .populate('connectedDonors');

        if (!requester) {
            throw new Error("Not found any request with this username for donation.");
        }

        // Store requester ID in the session
        req.session.requesterId = requester._id;

        res.render('admin/requestSingleList', { requester });
    } catch (error) {
        console.error('Error fetching requester details:', error);
        return res.status(404).send("Requester not found.");
    }
});

// Get a specific request for editing (Admin View)
router.get('/request-donations/:id/edit', isAuthenticatedAdmin, async (req, res) => {
    try {
        const donationRequest = await RequestDonation.findById(req.params.id);
        if (!donationRequest) {
            req.flash('error', 'Donation request not found');
            return res.redirect('/admin/request-donations');
        }
        res.render('admin/editRequestDonation', { donationRequest });
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
        const updatedRequest = await RequestDonation.findByIdAndUpdate(req.params.id, updatedData, { new: true });

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
        await RequestDonation.findByIdAndDelete(req.params.id);
        req.flash('success', 'Donation request deleted successfully');
        res.redirect('/admin/request-donations');
    } catch (error) {
        console.error('Error deleting donation request:', error);
        res.status(500).send('Error deleting donation request');
    }
});


router.get('/check-queries', isAuthenticatedAdmin, async (req, res) => {
    try {
        // Get the search query from the request (if any)
        const searchQuery = req.query.search || '';

        // Build the search filter based on username or email
        let filter = {};
        if (searchQuery) {
            filter = {
                $or: [
                    { username: new RegExp(searchQuery, 'i') }, // Case-insensitive search
                    { email: new RegExp(searchQuery, 'i') }
                ]
            };
        }

        // Fetch filtered queries from the ContactUs collection
        const queries = await ContactUs.find(filter);
        console.log(queries);

        // Render the check-queries view with the filtered list of queries and the search query
        res.render('admin/checkQueries', {
            queries,
            searchQuery, // Pass the search query to the view for input field retention
            messages: req.flash() // Pass flash messages to the view
        });
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.status(500).send('Error fetching queries');
    }
});


module.exports = router;