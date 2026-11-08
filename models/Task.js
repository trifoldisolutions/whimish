const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
    },
  },
  { timestamps: true, collection: 'dev.tasks' }
);

module.exports = mongoose.model('Task', taskSchema);
