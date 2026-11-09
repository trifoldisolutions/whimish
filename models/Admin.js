const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: '' },
    // Hierarchy, highest to lowest: founder > superadmin > content_moderator / support_admin
    // (the latter two are peers, not ranked against each other).
    role: {
      type: String,
      enum: ['content_moderator', 'support_admin', 'superadmin', 'founder'],
      required: true,
    },
  },
  { timestamps: true, collection: 'admin.admins' }
);

module.exports = mongoose.model('Admin', adminSchema);
