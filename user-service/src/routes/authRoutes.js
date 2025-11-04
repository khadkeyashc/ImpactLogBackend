const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('../config/passport');

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// Verify Token
router.post('/verify-token', authController.verifyToken);

// Forget Password
router.post('/forget-password', authController.forgetPassword);

// Reset Password
router.put('/password/reset/:resetToken', authController.resetPassword);

// Send OTP
router.post('/send-otp', authController.sendOtp);

// Verify OTP
router.post('/verify-otp', authController.verifyOtp);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), authController.googleOAuthCallback);

module.exports = router;