const express = require('express');
const router = express.Router();
const multer = require('multer');

const Volunteer = require('../../models/volunteer');

const sendEmail = require('../../utils/sendEmail');
const { getCoordinates } = require('../../utils/geocoding');
const { upload } = require('../../utils/cloudinary');


const {
    validateVolunteerRegistration,
    validateVolunteerLogin,
    validateVolunteerEdit,
} = require('../../validation/volunteerValidation');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/volunteer-registration',
    (req, res) => 
        {
            res.render('volunteer/register', {
            title: 'VOLUNTEER REGISTRATION',
            action: '/volunteer-registration', 
            submitLabel: 'Register',
            stylesheet: '/stylesheet/volunteer/register.css',
            showNavbar: false,
            showFooter: false,
            fields: [
                { id: 'username', label: 'Username', type: 'text', name: 'username', required: true },
                { id: 'email', label: 'Email', type: 'email', name: 'email', required: true },
                { id: 'password', label: 'Password', type: 'password', name: 'password', required: true },
                { id: 'phone', label: 'Phone Number', type: 'tel', name: 'phone', pattern: "^\+?\d{10,15}$", required: true },
                { id: 'location', label: 'Location', type: 'text', name: 'location', required: true },
                { id: 'availability', label: 'Availability', type: 'text', name: 'availability', required: true },
                { id: 'skills', label: 'Skills', type: 'select',  name: 'skills[]', multiple: true, options: [ { value: 'delivery', label: 'Delivery' }, { value: 'cooking', label: 'Cooking' }, { value: 'communication', label: 'Communication' },{ value: 'logistics', label: 'Logistics' } ]},
                { id: 'role', label: 'Role', type: 'select', name: 'role', options: [ { value: 'driver', label: 'Driver' }, { value: 'coordinator', label: 'Coordinator' }, { value: 'general', label: 'General' }], required: true},
                { id: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', name: 'emergencyContact[name]', required: true },
                { id: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'tel', name: 'emergencyContact[phone]',  pattern: "^\+?\d{10,15}$", required: true },
                { id: 'governmentIdProofs', label: 'Government ID Proofs', type: 'file', name: 'governmentIdProofs', multiple: true, required: true}
            ]
        });
});


router.post(
  '/volunteer-registration',
  upload.array('governmentIdProofs', 3),
  validateVolunteerRegistration,

  asyncHandler(async (req, res) => {

      const { username, email, password, phone, location, role, availability, skills, emergencyContact } = req.body;
      const existingVolunteer = await Volunteer.findOne({ email });

      if (existingVolunteer) {
          req.flash('error', 'A volunteer with this email already exists.');
          return res.redirect('/volunteer-registration');
      }

      console.log('Cloudinary upload response:', req.files);

      try {
          const [longitude, latitude] = await getCoordinates(location);

          const files = req.files.map((file) => ({
              url: file.path,
              filename: file.filename,
              description: `ID Proof for ${username}`,
          }));


          const newVolunteer = new Volunteer({
              username,
              email,
              password,
              phone,
              location,
              geometry: { type: 'Point', coordinates: [longitude, latitude] },
              role,
              availability,
              skills,
              emergencyContact,
              governmentIdProofs: files,
          });

          const resp = await newVolunteer.save();
          req.session.volunteerId = newVolunteer._id;

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
              } else {
                  console.log('Email sending is disabled in development environment.');
              }
          }

          req.flash('success', 'Volunteer successfully registered!');
          res.redirect('/volunteer-login');

      } catch (error) {
          console.error(error);
          req.flash('error', 'Error during registration.');
          res.redirect('/volunteer-registration');
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
    });
  }
);


router.post(
    '/volunteer-login',
    validateVolunteerLogin,
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const volunteer = await Volunteer.findOne({ email });
        console.log('Volunteer found:', volunteer);

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
        res.redirect('/volunteer-profile'); 
    })
);

router.get('/logout', (req, res) => {
    req.flash('success', 'Logout successful!');
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Server error');
        }
        res.clearCookie('connect.sid');
        res.redirect('/volunteer-login');
    });
});

router.get(
  '/volunteer-profile',
  asyncHandler(async (req, res) => {
    if (!req.session.volunteerId) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/volunteer-login');
    }

    const volunteer = await Volunteer.findById(req.session.volunteerId).lean();

    if (!volunteer) {
      return res.status(404).send('Volunteer not found');
    }

    if (volunteer.status !== 'active') {
      req.flash('error', 'Your profile is inactive. You cannot access it.');
      return res.redirect('/volunteer-login'); 
    }

    res.render('volunteer/profile', {
      volunteer,
      mapboxToken: process.env.MAPBOX_TOKEN,
      title: 'Volunteer Profile',
      stylesheet: '/stylesheet/volunteer/profile.css',
      showNavbar: false,
      showFooter: false,
    });
  })
);  

router.get(
    '/volunteer-profile/edit',
    asyncHandler(async (req, res) => {
      if (!req.session.volunteerId) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/volunteer-login');
      }
  
      const volunteer = await Volunteer.findById(req.session.volunteerId);
      if (!volunteer) {
        return res.status(404).send('Volunteer not found');
      }
  
      res.render('volunteer/register', {
        volunteer,
        title: 'Edit Profile',
        stylesheet: '/stylesheet/edit.css',
        action: '/volunteer-profile/edit',
        submitLabel: 'Save Changes',
        showNavbar: false,
        showFooter: false,
        fields: [
          { id: 'username', label: 'Username', type: 'text', name: 'username', value: volunteer.username, required: true },
          { id: 'email', label: 'Email', type: 'email', name: 'email', value: volunteer.email, required: true },
          { id: 'password', label: 'Password', type: 'password', name: 'password', helpText: 'Leave empty to keep the current password' },
          { id: 'phone', label: 'Phone Number', type: 'tel', name: 'phone', value: volunteer.phone,pattern: "^\+?\d{10,15}$", required: true},
          { id: 'location', label: 'Location', type: 'text', name: 'location', value: volunteer.location, required: true },
          { id: 'role', label: 'Role', type: 'select', name: 'role', options: [{ value: 'driver', label: 'Driver', selected: volunteer.role === 'driver' }, { value: 'coordinator', label: 'Coordinator', selected: volunteer.role === 'coordinator' }, { value: 'general', label: 'General', selected: volunteer.role === 'general' }] },
          { id: 'availability', label: 'Availability', type: 'text', name: 'availability', value: volunteer.availability, required: true },
          { id: 'skills', label: 'Skills', type: 'select', name: 'skills[]', multiple: true, options: [{ value: 'delivery', label: 'Delivery', selected: volunteer.skills.includes('delivery') }, { value: 'cooking', label: 'Cooking', selected: volunteer.skills.includes('cooking') }, { value: 'communication', label: 'Communication', selected: volunteer.skills.includes('communication') },{ value: 'logistics', label: 'Logistics', selected: volunteer.skills.includes('logistics') }] },
          { id: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', name: 'emergencyContact[name]', value: volunteer.emergencyContact.name, required: true },
          { id: 'emergencyContactPhone',  label: 'Emergency Contact Phone', type: 'tel', name: 'emergencyContact[phone]', value: volunteer.emergencyContact.phone,  pattern: "^\+?\d{10,15}$", required: true},
          { id: 'governmentIdProofs', label: 'Update Government ID Proofs',  type: 'file',name: 'governmentIdProofs', multiple: true }
        ]
      });
    })
);  

router.post(
  '/volunteer-profile/edit',
  upload.any(), 
  asyncHandler(async (req, res) => {
    const { username, email, phone, location, role, availability, skills, emergencyContact, password, governmentIdProofs } = req.body;
    
    const volunteer = await Volunteer.findById(req.session.volunteerId);
    if (!volunteer) {
        req.flash('error', 'Volunteer not found');
        return res.redirect('/volunteer-login');
    }

    volunteer.username = username;
    volunteer.email = email;
    volunteer.phone = phone;
    volunteer.location = location;
    volunteer.role = role;
    volunteer.availability = availability;
    volunteer.skills = skills;
    volunteer.emergencyContact = emergencyContact;

    if (password) {
        volunteer.password = password;
    }

    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(async (file) => {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'volunteers',
            });
            return {
                url: result.secure_url,
                filename: result.public_id,
                description: file.originalname, 
            };
        });

        const uploadedIdProofs = await Promise.all(uploadPromises);
        volunteer.governmentIdProofs = uploadedIdProofs;
    }

    await volunteer.save();

    req.flash('success', 'Profile updated successfully!');
    res.redirect('/volunteer-profile');
  })
);

module.exports = router;