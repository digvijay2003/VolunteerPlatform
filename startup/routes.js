const homeRoutes = require('../routes/home/home');
const volunteerRoutes = require('../routes/volunteer/volunteer');
const donateRoutes = require('../routes/donation/donate');
const requestRoutes = require('../routes/request/request');
const adminRoutes = require('../routes/admin/main');
const userRoutes = require('../routes/user/user');
const foodMatchRoutes = require('../routes/food_match/food_match');

module.exports = (app) => {
    app.use('/', homeRoutes);
    app.use('/', volunteerRoutes);
    app.use('/', donateRoutes);
    app.use('/', requestRoutes);
    app.use('/admin', adminRoutes);
    app.use('/', userRoutes);
    app.use('/', foodMatchRoutes);
};
