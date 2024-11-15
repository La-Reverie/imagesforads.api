import jwt from 'jsonwebtoken';

// Middleware to authenticate requests
const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expected format: 'Bearer token'

  if (!token) {
    return res.status(401).json({ error: 'Access token is missing' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    // Add user info to request object for further use
    req.user = user;
    next(); // Proceed to the next middleware or route handler
  });
};

// Function to sign a token
function generateAuthToken(data) {
  const { name, picture, email, userId, accountId } = data;
  const payload = {
    name,
    picture,
    email,
    userId,
    accountId,
  };

  const secretKey = process.env.JWT_SECRET; // Store your secret in an environment variable

  // Sign the token
  const token = jwt.sign(payload, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
  return token;
}

export { authenticateToken, generateAuthToken };
