const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);