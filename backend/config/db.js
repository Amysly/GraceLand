const mongoose = require('mongoose')

const connectDB = async () =>{
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL)
        console.log(`MongoDB connected : ${conn.connection.host}`.yellow.underline)
        
    } catch (error) {
        console.error(`Error:${error.message}`.red)
        process.exit(1)
        
    }
}

module.exports = connectDB