const express = require('express');
const router = express.Router();
const Volunteer = require('../../models/volunteer');
const sendEmail = require('../../utils/sendEmail');
const { getCoordinates } = require('../../utils/geocoding');
const { upload } = require('../../utils/cloudinary');
const protect_user = require('../../middleware/user_auth');
const { getVolunteerFormFields } = require('../../utils/volunteer_form_fields');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const checkIfAlreadyVolunteer = asyncHandler(async (req, res, next) => {
    const existingVolunteer = await Volunteer.findOne({ user_id: req.user._id });
    if (existingVolunteer) {
        req.flash('error', 'You are already registered as a volunteer.');
        return res.status(400).redirect('/feedhope-user-dashboard');
    }
    const existingVolunteerEmail = await Volunteer.findOne({ email: req.body.email });

    if (existingVolunteerEmail) {
        req.flash('error', 'Email already Exists.');
        return res.status(400).redirect('/feedhope-user-dashboard'); 
    }
    next();
});

router.get('/volunteer-registration', 
    (req, res) => {
    res.render('volunteer/register', {
        title: 'VOLUNTEER REGISTRATION',
        action: '/volunteer-registration',
        stylesheet: '/stylesheet/volunteer/register.css',
        showNavbar: false,
        showFooter: false,
        fields: getVolunteerFormFields(),
    });
});

router.post(
  '/volunteer-registration',
  protect_user,
  checkIfAlreadyVolunteer,
  upload.array('governmentIdProofs', 3),
  asyncHandler(async (req, res) => {
    const {
      username,
      email,
      password,
      phone,
      location,
      skills,
      emergencyContact,
    } = req.body;

    const fields = getVolunteerFormFields(req.body); 

    try {
      const [longitude, latitude] = await getCoordinates(location);
      const availability = req.body.availability === 'true';
      const files = req.files.map((file) => ({
        url: file.path,
        filename: file.filename,
        description: `ID Proof for ${username}`,
      }));

      const newVolunteer = new Volunteer({
        user_id: req.user._id,
        username,
        email,
        password,
        phone,
        location,
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        availability,
        skills,
        emergencyContact,
        governmentIdProofs: files,
      });

      const resp = await newVolunteer.save();

      if (req.user) {
        req.user.volunteer = newVolunteer._id;
        await req.user.save();
      }

      if (resp) {
        const profileLink = `${process.env.PROD_URL}/volunteer-profile`;
        if (process.env.NODE_ENV === 'production') {
          try {
            await sendEmail(
              email,
              'Welcome to Work for FeedHope!',
              'welcomeTemplate.html',
              { username, profileLink }
            );
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }
        }
      }

      req.flash('success', 'Volunteer successfully registered!');
      res.redirect('/volunteer-login');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Error during registration.');

      return res.status(500).render('volunteer/register', {
        title: 'VOLUNTEER REGISTRATION',
        action: '/volunteer-registration',
        submitLabel: 'Register',
        stylesheet: '/stylesheet/volunteer/register.css',
        showNavbar: false,
        showFooter: false,
        fields,
        error: 'Something went wrong. Please try again.',
      });
    }
  })
);

router.get(
  '/volunteer-login',
  (req, res) => {
    res.render('volunteer/login', {
      title: 'Volunteer Login',
      subtitle: 'Please log in to access your profile.',
      action: '/volunteer-login',
      stylesheet: '/stylesheet/volunteer/login.css',
      fields: [
        { id: 'email', name: 'email', type: 'email', placeholder: 'Enter your email', required: true, icon: 'email',},
        { id: 'password', name: 'password', type: 'password', placeholder: 'Enter your password', required: true, icon: 'lock',},
      ],
      submitLabel: 'Login',
      showRegisterButton: true,
      registerLink: '/volunteer-registration',
      showNavbar: false,
      showFooter: false,
    });
  }
);


router.post(
    '/volunteer-login',
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const volunteer = await Volunteer.findOne({ email });    

        if (!volunteer) {
            req.flash('error', 'User not found');
            return res.redirect('/volunteer-login');
        }

        const isPasswordValid = await volunteer.comparePassword(password);
        if (!isPasswordValid) {
            req.flash('error', 'Incorrect password');
            return res.redirect('/volunteer-login');
        }

        req.session.volunteerId = volunteer._id;
        req.flash('success', 'Successfully Logged In!');
        res.redirect('/feedhope-user-dashboard'); 
    })
);

module.exports = router;