const express = require('express')
const router = express.Router()
const {
    createAdmission,
    getAllAdmissionByAdmin,
    admissionStatus
} = require('../../controller/AdmissionController/admissionController')
const {protect} = require('../../middleware/authMiddleWare')

router.route ('/')
.get(protect, getAllAdmissionByAdmin)
.post(createAdmission)

router.route('/:id')
.put(protect, admissionStatus)
 
module.exports = router