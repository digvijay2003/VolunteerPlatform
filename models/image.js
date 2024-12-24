const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url:
  {
    type: String,
    required: true
  },
  filename:
  {
    type: String,
    required: true
  },
  description:
  {
    type: String,
    required: true
  }
});

module.exports = imageSchema;