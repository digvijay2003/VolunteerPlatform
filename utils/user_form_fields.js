module.exports = {
  loginFields: [
    { id: 'emailOrPhone', name: 'emailOrPhone', type: 'text', label: 'Email or Phone', icon: 'person', required: true },
    { id: 'password', name: 'password', type: 'password', label: 'Password', icon: 'lock', required: false }
  ],

  registerFields: [
    { id: 'name', name: 'name', type: 'text', label: 'Name', icon: 'person', required: true },
    { id: 'email', name: 'email', type: 'email', label: 'Email', icon: 'mail', required: true },
    { id: 'phone', name: 'phone', type: 'text', label: 'Phone', icon: 'call', required: true },
    { id: 'password', name: 'password', type: 'password', label: 'Password', icon: 'lock', required: true },
    { id: 'city', name: 'address[city]', type: 'text', label: 'City', icon: 'location_city', required: true },
    { id: 'state', name: 'address[state]', type: 'text', label: 'State', icon: 'public', required: true },
    { id: 'country', name: 'address[country]', type: 'text', label: 'Country', icon: 'flag', required: true },
    { id: 'zip', name: 'address[zip]', type: 'text', label: 'ZIP', icon: 'markunread_mailbox', required: false }
  ]
};