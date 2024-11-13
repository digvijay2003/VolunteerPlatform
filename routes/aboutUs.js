const express = require('express');
const router = express.Router();

router.get('/feedhope-about-us', (req, res) => {
    res.render('about/aboutUs');
});

module.exports = router;