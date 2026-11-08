const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'public.users' }
);

module.exports = mongoose.model('User', userSchema);
