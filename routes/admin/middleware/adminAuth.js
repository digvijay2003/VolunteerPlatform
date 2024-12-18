const jwt = require('jsonwebtoken');

const ensureAuthenticated = (req, res, next) => {
    const token = req.session.token;

    if (!token) return res.redirect('/admin/login');

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.redirect('/admin/login');
        req.user = decoded;
        next();
    });
};

const isAuthenticatedAdmin = (req, res, next) => {
    const token = req.session.token;

    if (!token) {
        req.flash('error', 'You must be logged in as admin.');
        return res.redirect('/admin/login');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err || !decoded.isAdmin) {
            req.flash('error', 'Not authorized.');
            return res.redirect('/admin/login');
        }
        next();
    });
};

module.exports = { ensureAuthenticated, isAuthenticatedAdmin };