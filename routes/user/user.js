const express = require('express');
const router = express.Router();
const User = require('../../models/user');
const generateToken = require('../../utils/generateToken');
const requireUserAuth = require('../../middleware/user_auth');
const { loginFields, registerFields } = require('../../utils/user_form_fields');

// Profile (auth protected)
router.get('/feedhope-user-profile', requireUserAuth, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

// Login Page
router.get('/feedhope-user-login', (req, res) => {
  renderForm(res, {
    title: 'USER LOGIN',
    subtitle: 'Please log in to continue',
    action: '/feedhope-user-login',
    submitLabel: 'Login',
    fields: loginFields,
    registerLink: '/feedhope-user-register',
    showRegisterButton: true,
    isRegisterForm: false
  });
});

// Register Page
router.get('/feedhope-user-register', (req, res) => {
  renderForm(res, {
    title: 'USER REGISTRATION',
    subtitle: 'Create your account',
    action: '/feedhope-user-register',
    submitLabel: 'Register',
    fields: registerFields,
    showRegisterButton: false,
    isRegisterForm: true
  });
});

// Login Handler
router.post('/feedhope-user-login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/feedhope-user-login');
    }

    req.session.token = generateToken(user._id);
    const redirectTo = req.session.redirectTo || '/feedhope-user-dashboard';
    delete req.session.redirectTo;

    req.flash('success', 'Login successful');
    res.redirect(redirectTo);
  } catch (err) {
    console.error('Login Error:', err.message);
    req.flash('error', 'Server error');
    res.redirect('/feedhope-user-login');
  }
});

// Register Handler
router.post('/feedhope-user-register', async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      req.flash('error', 'Email or phone already in use');
      return res.redirect('/feedhope-user-register');
    }

    const newUser = new User({ name, email, phone, password, address });
    await newUser.save();

    req.flash('success', 'Registration successful. Please log in.');
    res.redirect('/feedhope-user-login');
  } catch (err) {
    console.error('Registration Error:', err.message);
    req.flash('error', 'Server error during registration');
    res.redirect('/feedhope-user-register');
  }
});

function renderForm(res, {
  title,
  subtitle,
  action,
  submitLabel,
  fields,
  registerLink = '',
  showRegisterButton = false,
  isRegisterForm = false,
  stylesheet = '',
  showNavbar = false,
  showFooter = false
}) {
  res.render('user/form', {
    title,
    subtitle,
    action,
    submitLabel,
    fields,
    registerLink,
    showRegisterButton,
    isRegisterForm,
    stylesheet,
    showNavbar,
    showFooter
  });
}

router.post('/feedhope-user-logout', (req, res) => {
  
    req.flash('success', 'You have been successfully logged out!');

    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/feedhope');
    });
});

module.exports = router;