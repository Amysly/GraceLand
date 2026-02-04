const asyncHandler = require('express-async-handler');
const Admission = require('../../models/Admission/AdmissionModel');


const createAdmission = asyncHandler(async (req, res) => {
  const { personalInfo, enrollmentInfo, religiousEducationInfo } = req.body;

  if (!personalInfo || !enrollmentInfo || !religiousEducationInfo) {
    res.status(400);
    throw new Error("Please fill all required fields");
  }

  // Check if admission already exists using email
  const existingAdmission = await Admission.findOne({ "personalInfo.email": personalInfo.email });
  if (existingAdmission) {
    res.status(409); 
    throw new Error("Admission already exists for this email");
  }

  const admission = await Admission.create({
    personalInfo,
    enrollmentInfo,
    religiousEducationInfo
  });

  res.status(201).json({
    message: 'Admission created successfully',
    admission
  });
});

//Get admission by admin
const getAllAdmissionByAdmin = asyncHandler(async (req,res) => {
    if(!req.user || req.user.role !== 'admin'){
        res.status(403);
        throw new Error("Access denied");
    }

    const admission = await Admission.find()
    res.status(200).json({
        totalAdmission:admission.length,
        admission
    })
})
// Admin get admission by id
const getAdmissionById = asyncHandler(async (req,res) => {
  if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Access denied, admin only");    
    }

   const admissionId = req.params.id;
   const  admission = await Admission.findById(admissionId)

   if (!admission) {
     res.status(403)
     throw new Error("Admission not found");
   }
   res.status(200).json(admission)

})
//Delete admission by Admin

const deleteAdmissionByAdmin = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Access denied, admin only");
        
    }

    const deleteAdmission = await Admission.findById(req.params.id)
    if (!deleteAdmission) {
      res.status(404)
      throw new Error("Admission not found");
    }

    await Admission.findById({_id: req.params.id})

    res.status(200).json({message: 'An Admission was deleted', id:req.params.id})

})

// admission status
const admissionStatus = asyncHandler(async (req, res)=>{
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Access denied");
        
    }

    const{status} = req.body;
    const admissionId = req.params.id;

   const  admission = await Admission.findById(admissionId)

   if (!admission) {
     res.status(403)
     throw new Error("Admission not found");
   }

  if ([!"approved", "rejected"].includes(status)) {
    res.status(400)
    throw new Error("Invalid status value. Must be 'approved' or 'rejected'");
  }
  // update and save
  admission.status = status
  await Admission.save()

    res.status(200).json({
    message: `Admission ${status} successfully`,
    admission
  });
})
module.exports = {
  createAdmission,
  getAllAdmissionByAdmin,
  deleteAdmissionByAdmin,
  admissionStatus,
  getAdmissionById
};
