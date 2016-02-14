var mongoose = require('mongoose');

var Schema = new mongoose.Schema({
  id: Number,
  name: String,
  created_at: { type: Date, default: Date.now},
  updated_at: Date,
  users: [{
    _id: false,
    id: Number,
    name: String,
    mention_name: String,
    email: String,
    links: [{
      _id: false,
      url: String,
      description: String,
    }]
  }]
});

module.exports = mongoose.model("HipPocket", Schema);
