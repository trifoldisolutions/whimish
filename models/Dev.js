const mongoose = require('mongoose');
const { DEV_ROLES } = require('../utils/devRoles');

// Dev Resources accounts: supervisor > leader > associate (see utils/devRoles.js). Separate
// collection from models/Admin.js — dev-hierarchy roles have nothing to do with admin-panel
// authority (founder/superadmin/content_moderator/support_admin), so they don't share a table.
// A founder can still access Dev Resources (see routes/tasks.js login), but that's a founder
// acting via their own Admin account, not a row in this collection.
const devSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: '' },
    role: { type: String, enum: DEV_ROLES, required: true },
    // Lineage: who created this account. Not used to gate permissions (team management is
    // role-based — see routes/tasks.js) — it's audit trail for "supervisor X's leaders" style
    // questions. `createdByRole` can be 'founder' (an Admin account) or any DEV_ROLES value.
    createdById: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByRole: { type: String, default: null },
  },
  { timestamps: true, collection: 'dev.devs' }
);

module.exports = mongoose.model('Dev', devSchema);
