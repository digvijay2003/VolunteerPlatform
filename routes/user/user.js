const express = require('express');
const router = express.Router();
const User = require('../../models/user');
const generateToken = require('../../utils/generateToken');
const requireUserAuth = require('../../middleware/user_auth');

router.get('/feedhope-user-profile', 
  requireUserAuth, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

router.get('/feedhope-user-login', (req, res) => {
  res.render('user/form', {
    title: 'User Login',
    subtitle: 'Please log in to continue',
    action: '/feedhope-user-login',
    submitLabel: 'Login',
    fields: [
        { id: 'emailOrPhone', name: 'emailOrPhone', type: 'text', label: 'Email or Phone', icon: 'person', required: true },
        { id: 'password', name: 'password', type: 'password', label: 'Password', icon: 'lock', required: false }
    ],
    showRegisterButton: true,
    showNavbar: false,
    showFooter: false,
    stylesheet: '',
    registerLink: '/feedhope-user-register',
    isRegisterForm: false,
    });
});

router.get('/feedhope-user-register', (req, res) => {
  res.render('user/form', {
    title: 'User Registration',
    subtitle: 'Create your account',
    action: '/feedhope-user-register',
    submitLabel: 'Register',
    fields: [
        { id: 'name', name: 'name', type: 'text', label: 'Name', icon: 'person', required: true },
        { id: 'email', name: 'email', type: 'email', label: 'Email', icon: 'mail', required: true },
        { id: 'phone', name: 'phone', type: 'text', label: 'Phone', icon: 'call', required: true },
        { id: 'password', name: 'password', type: 'password', label: 'Password', icon: 'lock', required: true },
        { id: 'city', name: 'address[city]', type: 'text', label: 'City', icon: 'location_city', required: true },
        { id: 'state', name: 'address[state]', type: 'text', label: 'State', icon: 'public', required: true },
        { id: 'country', name: 'address[country]', type: 'text', label: 'Country', icon: 'flag', required: true },
        { id: 'zip', name: 'address[zip]', type: 'text', label: 'ZIP', icon: 'markunread_mailbox', required: false }
    ],
    stylesheet: '',
    showNavbar: false,
    showFooter: false,
    showRegisterButton: false,
    isRegisterForm: true,
    });
});


router.post('/feedhope-user-login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if(!user) {
      req.flash('error', 'Invalid email/phone');
      return res.redirect('/feedhope-user-login');
    }

    // if (!user || !(await user.comparePassword(password))) {
    //   req.flash('error', 'Invalid email/phone or password');
    //   return res.redirect('/feedhope-user-login');
    // }

    const token = generateToken(user._id);
    req.session.token = token;

    // Redirect to original path if it exists
    const redirectTo = req.session.redirectTo || '/feedhope-user-profile';
    delete req.session.redirectTo;

    req.flash('success', 'Login successful');
    res.redirect(redirectTo);
  } catch (err) {
    req.flash('error', 'Server error');
    res.redirect('/feedhope-user-login');
  }
});

router.post('/feedhope-user-register', async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
        req.flash('error', 'Email or phone already in use');
        return res.redirect('/feedhope-user-register');
    //   return res.status(409).json({ message: 'Email or phone already in use' });
    }

    const user = new User({ name, email, phone, password, address });
    await user.save();

    const token = generateToken(user._id);
    req.flash('success', 'Registration successful. Please log in.');
    res.redirect('/feedhope-user-login');
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;