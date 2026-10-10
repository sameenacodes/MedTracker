const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

  const authHeader = req.header('Authorization');

  console.log('================================');
  console.log('🔐 AUTH MIDDLEWARE');
  console.log('Authorization header exists:', !!authHeader);

  if (!authHeader) {
    console.log('❌ No Authorization header');

    return res.status(401).json({
      message: 'No token — access denied'
    });
  }

  const token = authHeader.replace('Bearer ', '');

  console.log(
    'Token received:',
    token ? 'YES' : 'NO'
  );

  if (!token) {
    console.log('❌ Empty token');

    return res.status(401).json({
      message: 'No token — access denied'
    });
  }

  try {

    console.log(
      'JWT_SECRET exists:',
      !!process.env.JWT_SECRET
    );

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log('✅ TOKEN VERIFIED');
    console.log('User ID:', decoded.id);
    console.log('Role:', decoded.role);

    req.user = decoded;

    next();

  } catch (err) {

    console.log('================================');
    console.log('❌ JWT VERIFY ERROR');
    console.log('Error name:', err.name);
    console.log('Error message:', err.message);
    console.log('================================');

    return res.status(401).json({
      message: 'Invalid token'
    });
  }
};