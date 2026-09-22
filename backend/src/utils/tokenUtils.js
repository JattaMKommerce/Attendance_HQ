const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      organization_id: user.organization_id,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
};

const crypto = require('crypto');

const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      jti: crypto.randomBytes(16).toString('hex') 
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7 days refresh token
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
