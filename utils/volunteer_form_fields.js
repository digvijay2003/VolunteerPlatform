// utils/formFields.js

const getVolunteerFormFields = (data = {}) => [
  {
    id: 'username',
    label: 'Username',
    type: 'text',
    name: 'username',
    required: true,
    value: data.username || '',
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    name: 'email',
    required: true,
    value: data.email || '',
  },
  {
    id: 'password',
    label: 'Password',
    type: 'password',
    name: 'password',
    required: true,
    value: data.password || '',
  },
  {
    id: 'phone',
    label: 'Phone Number',
    type: 'tel',
    name: 'phone',
    required: true,
    pattern: '^\\+?\\d{10,15}$',
    value: data.phone || '',
  },
  {
    id: 'location',
    label: 'Location',
    type: 'text',
    name: 'location',
    required: true,
    value: data.location || '',
  },
  {
    id: 'skills',
    label: 'Skills',
    type: 'select',
    name: 'skills[]',
    multiple: true,
    required: true,
    value: data.skills || [],
    options: [
      { value: 'delivery', label: 'Delivery' },
      { value: 'cooking', label: 'Cooking' },
      { value: 'communication', label: 'Communication' },
      { value: 'logistics', label: 'Logistics' },
    ],
  },
  {
    id: 'governmentIdProofs',
    label: 'Government ID Proofs',
    type: 'file',
    name: 'governmentIdProofs',
    required: true,
    multiple: true,
  },
  {
    id: 'availability',
    label: 'Availability',
    type: 'select',
    name: 'availability',
    required: true,
    value: data.availability || '',
    options: [
      {
        value: 'true',
        label: 'Yes',
        selected: data.availability === 'true',
      },
      {
        value: 'false',
        label: 'No',
        selected: data.availability === 'false',
      },
    ],
  },
];

module.exports = { getVolunteerFormFields };