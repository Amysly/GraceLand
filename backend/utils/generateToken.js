const { JWT_SECRET } = require('./getJwtSecret');
/**
 * Generate JWT token
 * @param {Object} payload
 * @param {String} expiresIn
 */

const generateToken = async (payload, expiresIn = "15m") => {
  const { SignJWT } = await import('jose');

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
};

module.exports = { generateToken };
