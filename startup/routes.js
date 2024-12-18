const homeRoutes = require('../routes/home/home');
const volunteerRoutes = require('../routes/volunteer/volunteer');
const donateRoutes = require('../routes/donation/donate');
const requestRoutes = require('../routes/request/request');
const adminRoutes = require('../routes/admin/main');
const donorApiRoutes = require('../api/donor');

module.exports = (app) => {
    app.use('/', homeRoutes);
    app.use('/', volunteerRoutes);
    app.use('/', donateRoutes);
    app.use('/', requestRoutes);
    app.use('/admin', adminRoutes);
    app.use('/api', donorApiRoutes);
};
