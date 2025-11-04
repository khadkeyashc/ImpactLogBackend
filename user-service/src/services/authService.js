const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Sequelize model
const AppError = require('../utils/error.utils');
const { uploadUserAvatar } = require('../middleware/uploadUserAvatar');
require('dotenv').config();
const EventPublisher = require("../rabbitmq/publisher.js");
const FollowService = require('./followsService.js');
const generateOtp = require("../utils/generateOtp.js")
const sendSms= require("../utils/sendSms.js")
const sendEmail = require("../utils/sendEmail.js")
const crypto = require('crypto');
const { Op } = require('sequelize');

async function signup(dto,file) {
    console.log("SIGNUP LAYER")

  // Check if user already exists
  const existing = await User.findOne({ where: { email: dto.email } });
  if (existing) {
    throw new AppError('User already exists with this email', 400);
  }

    if(file && file.path)
    {
      const localFilePath = file.path ;
      const folderName = "ImpactL3ogProfile/Profile";
      var response = await uploadUserAvatar(localFilePath, folderName);
     }

  // Hash password
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  console.log(hashedPassword)
  // Create user
    const user = await User.create({
    email: dto.email,
    passwordHash: hashedPassword,
    name: dto.name,
    username: dto.username,
    role: dto.role,
    contactNumber: dto.contactNumber,
    bio: dto.bio,
    avatarUrl: response?.url || "https://res.cloudinary.com/dorfg8nqt/image/upload/v1756380305/ImpactLogProfile/Profile/default_profile_qptrer.jpg"
  });

    // --------------------------------//  Code to publish to rabbimq //---------------------------------
          await EventPublisher.publish("user.created", {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
          contactNumber: user.contactNumber,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          createdAt: user.createdAt,
        });
    // ---------------------------------------------------------------------------------------//
       return user;
}

async function login(identifier, password) {
  // Find user by email or username
  const user = await User.findOne({
    where: {
      ...(identifier.includes('@') ? { email: identifier } : { username: identifier })
    }
  });

  if (!user) {
    throw new AppError('Invalid email/username or password', 401);
  }

  // Compare password with hashed password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email/username or password', 401);
  }

  // Generate JWT
  const SECRET = process.env.JWT_SECRET;
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    SECRET,
    { expiresIn: '100h' }
  );

  // Fetch followers and following
  const followers = await FollowService.getFollowers(user.id);
  const following = await FollowService.getFollowing(user.id);

  // Merge into single user object (exclude sensitive fields)
  const userData = {
    ...user.toJSON(),
    password: undefined, // strip sensitive field
    passwordHash: undefined, // also strip hash
    followers,
    following
  };

  return { token, user: userData };
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { isValid: true, decoded };
  } catch (err) {
    throw new AppError('Invalid or expired token', 401);
  }
}


 async function forgetPassword(email, req) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new AppError("User not found", 404);

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/user/password/reset/${resetToken}`;
    const message = `You requested a password reset. Please make a PUT request to:\n\n${resetUrl}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: message,
      html: `<b>${message}</b>`
    });
  }

  // 🔹 Send OTP
  async function sendOtp(phoneNumber, email) {
    const user = await User.findOne({ where: { contactNumber: phoneNumber } });
    if (!user) throw new AppError("User not found", 404);
    
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const message = `Your OTP is ${otp}. It is valid for 10 minutes.`;

    // Send via SMS
    await sendSms(phoneNumber, message);

    // Send via Email (if available)
    const userEmail = email || user.email;
    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: "Your OTP Code",
          text: message,
          html: `<b>${message}</b>`
        });
      } catch (err) {
        console.error("Failed to send OTP email:", err.message);
      }
    }

    return "OTP sent successfully";
  }

  // 🔹 Verify OTP
  async function  verifyOtp(phoneNumber, email, otp, password) {
    const user =
      (await User.findOne({ where: { contactNumber: phoneNumber } })) ||
      (await User.findOne({ where: { email } }));

    if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    const hash = await bcrypt.hash(password, 10);
    // console.log(hash)
    user.passwordHash = hash 
    user.otp = null;
    user.otpExpires = null;

    await user.save();
    return "OTP verified successfully";
  }

  async function googleOAuthLogin(profile) {
    const { id: googleId, emails, displayName, photos } = profile;
    const email = emails[0].value;
    const avatarUrl = photos[0].value || "https://res.cloudinary.com/dorfg8nqt/image/upload/v1756380305/ImpactLogProfile/Profile/default_profile_qptrer.jpg";

    // Check if user exists by email or Google ID
    let user = await User.findOne({ where: { email } });
    if (!user) {
      // Create new user if not found
      user = await User.create({
        email,
        name: displayName,
        username: email.split('@')[0], // Generate username from email
        role: 'user', // Default role
        avatarUrl,
        googleId, // Add Google ID to User model if not present (ensure your model has this field)
        passwordHash: null // No password for OAuth users
      });

      // Publish user created event
      await EventPublisher.publish("user.created", {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      });
    } else if (!user.googleId) {
      // Link Google ID if user exists but not linked
      user.googleId = googleId;
      await user.save();
    }

    // Generate JWT (similar to login)
    const SECRET = process.env.JWT_SECRET;
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '100h' }
    );

    // Fetch followers/following
    const followers = await FollowService.getFollowers(user.id);
    const following = await FollowService.getFollowing(user.id);

    const userData = {
      ...user.toJSON(),
      followers,
      following
    };

    return { token, user: userData };
  }

  async function resetPassword(resetToken, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const user = await User.findOne({ where: { resetPasswordToken: hashedToken, resetPasswordExpires: { [Op.gt]: Date.now() } } });
    if (!user) throw new AppError("Invalid or expired token", 400);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    return "Password reset successful";
  }

module.exports = {
  signup,
  login,
  verifyToken,
  forgetPassword,
  sendOtp,
  verifyOtp,
  googleOAuthLogin,
  resetPassword
};
