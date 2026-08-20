const jwt = require('jsonwebtoken');
const { config } = require('../config');

const generateAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      department: user.department,
      academicYear: user.academicYear,
      childId: user.childId || null
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    {
      id: user._id || user.id,
      type: 'refresh'
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

const generateTokenPair = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user)
});

const verifyAccessToken = (token) => jwt.verify(token, config.jwt.secret);
const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken
};
