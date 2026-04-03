const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
      facultyName: {
        type: String,
        required: [true, 'Please enter a faculty name']
    },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  department: [
  {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Department',
  },
],
  

  
}, { timestamps: true });


module.exports = mongoose.model('Faculty', facultySchema);
