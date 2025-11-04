const authService = require('../services/authService');
const UserSignupDTO = require('../dto/UserSignupDTO');
const UserResponseDTO = require('../dto/UserResponseDTO');
const AppError = require('../utils/error.utils');
const UserLoginDTO = require('../dto/UserLoginDto');


async function signup(req, res, next) {
  try {
    console.log("REQUEST FOR SIGNUP:", req.body);  // ✅ fixed

    const dto = new UserSignupDTO(req.body);
    console.log(dto);
    const errors = dto.validate();

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    const user = await authService.signup(dto, req.file);
    const userResponse = new UserResponseDTO(user);

    return res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
    });
  } catch (err) {
    console.log('authController.signup', err);
    return next(new AppError(err.message || 'Internal error', err.status || 500));
  }
}


async function login(req, res, next) {
  try {
    const loginDTO = new UserLoginDTO(req.body);
    const errors = loginDTO.validate();

    if (errors.length) {
      return next(new AppError(errors.join(', '), 400));
    }

    // Decide what to pass to the auth service
    const identifier = loginDTO.email || loginDTO.username;
    const { token, user } = await authService.login(identifier, loginDTO.password);

    const userResponse = new UserResponseDTO(user);

    // Set token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,      // Cannot be accessed by JS
      secure: process.env.NODE_ENV === 'production', // Only over HTTPS in production
      sameSite: 'strict',  // CSRF protection
      maxAge: 60 * 60 * 120 *  1000 
    });

    return res.json({ message: 'Login successful', user: userResponse });
  } catch (err) {
    console.error('authController.login', err);
    return next(new AppError(err.message || 'Invalid credentials', 401));
  }
}



async function logout(req, res, next) {
  try {
    // Try to get token from cookie, Authorization header, or body
    // const tokenFromCookie = req.cookies?.token;
    // const authHeader = req.headers.authorization || '';
    // const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    // const token = tokenFromCookie || tokenFromHeader || req.body?.token;

    // // Revoke/blacklist token if service supports it (optional)
    // if (token && typeof authService.logout === 'function') {
    //   await authService.logout(token);
    // }

    // Clear the auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      // path can be set if you used a custom path when setting the cookie
    });

    return res.status(200).json({success:true, message: 'Logged out' });
  } catch (err) {
    console.error('authController.logout', err);
    return next(new AppError(err.message || 'Logout failed', err.status || 500));
  }
}


    async function verifyToken(req, res, next) {
      try {
        const { token } = req.body;

        if (!token) {
          return next(new AppError('Token is required', 400));
        }

        const {isValid,decoded} = await authService.verifyToken(token);
        console.log(isValid,decoded)
        return res.json({ isValid :isValid,decoded:decoded});
      } catch (err) {
        console.error('authController.verifyToken', err);
        return next(new AppError(err.message || 'Token verification failed', 500));
      }
      
    }


    // Forget Password Controller
   async function forgetPassword(req, res, next) {
    try {
      await authService.forgetPassword(req.body.email,req);
      res.status(200).json({ success: true , message :"Reset link is set to the email .Check your email ." });
    } catch (err) {
      next(err);
    }
  }

  // Reset Password Controller
   async function resetPassword(req, res, next) {
    try {
      const message = await authService.resetPassword(req.params.resetToken, req.body.password);
      res.status(200).json({ success: true, message });
    } catch (err) {
      next(err);
    }
  }

  // Send OTP Controller
   async function sendOtp(req, res, next) {
    try {
      const message = await authService.sendOtp(req.body.phoneNumber, req.body.email);
      res.status(200).json({ success: true, message });
    } catch (err) {
      next(err);
    }
  }

  // Verify OTP Controller
   async function verifyOtp(req, res, next) {
    try {
      console.log(req.body.phoneNumber, req.body.email, req.body.otp, req.body.password)
      const message = await authService.verifyOtp(req.body.phoneNumber, req.body.email, req.body.otp, req.body.password);
      res.status(200).json({ success: true, message });
    } catch (err) {
      next(err);
    }
  }

  // Google OAuth Callback Controller
  async function googleOAuthCallback(req, res, next) {
    try {
      // req.user is set by Passport with { token, user } from googleOAuthLogin
      const { token, user } = req.user;
      const userResponse = new UserResponseDTO(user);

      // Set token in HTTP-only cookie (same as login)
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 120 * 1000
      });

      return res.json({ message: 'Google login successful', user: userResponse });
    } catch (err) {
      console.error('authController.googleOAuthCallback', err);
      return next(new AppError('OAuth callback failed', 500));
    }
  }

module.exports = {
  signup,
  login,
  verifyToken,
  logout,
  verifyOtp,
  sendOtp,
  resetPassword,
  forgetPassword,
  googleOAuthCallback
};
