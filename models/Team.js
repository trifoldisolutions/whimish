const mongoose = require('mongoose');

// A team is one leader plus up to MAX_ASSOCIATES_PER_TEAM associates (see utils/devRoles.js for
// the caps). Leaders self-assemble their own team roster; supervisors/founder can also manage any
// team (see routes/tasks.js). Each team has its own tasks (models/Task.js, via teamId) and its
// own journal (models/JournalEntry.js).
const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dev', required: true },
    associateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dev' }],
  },
  { timestamps: true, collection: 'dev.teams' }
);

module.exports = mongoose.model('Team', teamSchema);
