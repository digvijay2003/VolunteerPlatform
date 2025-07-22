const homeRoutes = require('../routes/home/home');
const volunteerRoutes = require('../routes/volunteer/volunteer');
const donateRoutes = require('../routes/donation/donate');
const requestRoutes = require('../routes/request/request');
const userRoutes = require('../routes/user/user');
const userProfileRoutes = require('../routes/user/profile');
const subscriptionRoutes = require('../routes/user/subscription');

module.exports = (app) => {
    app.use('/', homeRoutes);
    app.use('/', volunteerRoutes);
    app.use('/', donateRoutes);
    app.use('/', requestRoutes);
    app.use('/', userRoutes);
    app.use('/', userProfileRoutes);
    app.use('/', subscriptionRoutes);
};
