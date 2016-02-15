var mongoose = require('mongoose');

var SchemaLink = new mongoose.Schema({
  "url": String,
  "description": String,
  "createdAt": { type: Date, default: Date.now},
  "updatedAt": Date
});

var SchemaUser = new mongoose.Schema({
  "id": Number,
  "name": String,
  "mentionName": String,
  "email": String,
  "links": [SchemaLink],
  "createdAt": { type: Date, default: Date.now},
  "updatedAt": Date
});

var SchemaRoom = new mongoose.Schema({
  "id": Number,
  "name": String,
  "createdAt": { type: Date, default: Date.now},
  "updatedAt": Date,
  "users": [SchemaUser]
});

module.exports = {
  room: mongoose.model("Room", SchemaRoom),
  user: mongoose.model("User", SchemaUser),
  link: mongoose.model("Link", SchemaLink)
}
