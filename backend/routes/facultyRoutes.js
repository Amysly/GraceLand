const express = require('express');
const router = express.Router()
const { createFaculty,
    getFacultyByAdmin,
    } = require('../controller/facultyController')

const {protect} = require('../middleware/authMiddleWare')

 router.route('/')
    .get(protect, getFacultyByAdmin)
  .post(protect, createFaculty);

module.exports = router;

