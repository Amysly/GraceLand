const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const { JWT_SECRET } = require("../utils/getJwtSecret");
const { generateToken } = require("../utils/generateToken");

// @desc    Register a new user
// @route   POST /api/user
const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    level,
    matriNumber,
    department,
    staffId,
  } = req.body || {};

  // COMMON FIELDS FOR ALL USERS
  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error("Name, email, password and role are required");
  }

  // ROLE-BASED VALIDATION
  if (role === "student") {
    if (!level || !matriNumber || !department) {
      res.status(400);
      throw new Error("Students must have level, matric number and department");
    }
  }

  if (role === "lecturer") {
    if (!staffId) {
      res.status(400);
      throw new Error("Lecturers must have staff ID");
    }
  }

  if (role === "admin") {
    // Admin only needs name, email, password, role
    // (department, level, etc. are NOT required)
  }

  // check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    level,
    matriNumber,
    staffId,
    department,
    role,
  });

  //create Tokens
  const payload = { userId: user._id.toString() };
  const accessToken = await generateToken(payload, "15m");
  const refreshToken = await generateToken(payload, "30d");

  //Set refresh token in HTTP-Only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
  });

  if (user) {
    res.status(201).json({
      accessToken,
      _id: user._id,
      name: user.name,
      email: user.email,
      level: user.level,
      matriNumber: user.matriNumber,
      staffId: user.staffId,
      department: user.department,
      role: user.role, // send role back in response too
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file uploaded");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Build full URL
  const imagePath = `/uploads/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get("host")}${imagePath}`;

  user.profileImage = fullUrl;
  await user.save();

  res.status(200).json({
    message: "Profile image updated",
    profileImage: user.profileImage,
  });
});

// Login
const login = asyncHandler(async (req, res) => {
  const { matriNumber, staffId, password } = req.body || {};

  if (!password || (!matriNumber && !staffId)) {
    res.status(400);
    throw new Error("Provide password and either matric number or staff ID");
  }

  let user;

  if (staffId) {
    user = await User.findOne({ staffId: staffId.toUpperCase() });
  } else if (matriNumber) {
    user = await User.findOne({ matriNumber: matriNumber.toUpperCase() });
  }

  //create Tokens
  const payload = { userId: user._id.toString() };
  const accessToken = await generateToken(payload, "15m");
  const refreshToken = await generateToken(payload, "30d");

  //Set refresh token in HTTP-Only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
  });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.status(200).json({
      accessToken,
      _id: user.id,
      name: user.name,
      email: user.email,
      level: user.level,
      matriNumber: user.matriNumber,
      staffId: user.staffId,
      department: user.department,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error("Invalid credentials");
  }
});

// Get logged-in user (placeholder)
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate(
    "department",
    "departmentName",
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json(user);
});

const logOut = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "logged out successfully" });
});

//Generate new access token from refresh token
//public(Needs valid refresh token in cookie)

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error("No refresh token");
  }
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const user = await User.findById(payload.userId);

  if (!user) {
    res.status(401);
    throw new Error("No user");
  }
  const newAccessToken = await generateToken(
    { userId: user._id.toString() },
    "15m",
  );
  res.json({
    accessToken: newAccessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

module.exports = {
  registerUser,
  login,
  getMe,
  logOut,
  updateProfileImage,
  refresh,
};
