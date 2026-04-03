const asyncHander = require('express-async-handler')
const Faculty = require('../models/facultyModel')

const createFaculty = asyncHander(async (req, res) => {
     if (!req.user || req.user.role !== 'admin') {
        res.status(403)
        throw new Error("Access denied, Admin Only");
        
     }
     const {facultyName, department} = req.body

     if(!facultyName || !department){
        res.status(400)
        throw new Error("please fill all fields"); 
     }

     //check if faculty already exist
     const existingFaculty = await  Faculty.findOne({
        facultyName,
        department
     })
     if (existingFaculty) {
        res.status(400)
        throw new Error("Faculty already existed");
     }

     const faculty = await Faculty.create({
        facultyName,
        department,
         user: req.user.id
     })
     res.status(201).json(faculty)
})

const getFacultyByAdmin = asyncHander(async (req, res) => {
   if (!req.user || req.user.role !== 'admin') {
      res.status(403)
      throw new Error("Access denied, Admin only");
   }
   const faculty = await Faculty.find()
   res.status(200).json(faculty)
})
module.exports={
   createFaculty,
   getFacultyByAdmin
}