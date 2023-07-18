const crypto = require('crypto');

/**
 * Generates a random Base64-encoded secret.
 * Used to sign the JWT for the API via jsonwebtoken.
 * @module generateJWTSecret
 * @function
 * @returns {string} The generated secret.
 */
function generateBase64Secret() {
  const byteLength = 32; // Adjust the byte length for the desired secret length (256 bits)
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString('base64');
}

const secretKey = generateBase64Secret();
console.log('Base64-encoded Secret:', secretKey);
