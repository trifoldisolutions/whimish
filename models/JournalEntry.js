const mongoose = require('mongoose');

// A team's journal: daily reports from its associates on what they worked on. Associate-only —
// leaders/supervisors direct work through Tasks instead (see routes/tasks.js).
const journalEntrySchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dev', required: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: 'dev.journalEntries' }
);

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
