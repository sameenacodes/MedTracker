// =====================================================
// MEDTRACKER - ROLE PERMISSIONS MIDDLEWARE
// =====================================================

// -----------------------------------------------------
// ROLE CONSTANTS
// -----------------------------------------------------

const ROLES = {
  ADMIN: 'admin',
  PHARMACIST: 'pharmacist',
  CUSTOMER: 'customer',
};


// =====================================================
// GENERIC ROLE CHECKER
// =====================================================

const allowRoles = (...allowedRoles) => {

  return (req, res, next) => {

    // Authentication middleware must run first.
    // req.user comes from JWT.

    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!userRole) {
      return res.status(403).json({
        message: 'User role not found'
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message:
          'You do not have permission to perform this action'
      });
    }

    next();
  };
};


// =====================================================
// ADMIN ONLY
// =====================================================

const adminOnly = allowRoles(
  ROLES.ADMIN
);


// =====================================================
// ADMIN + PHARMACIST
// =====================================================

const pharmacyStaff = allowRoles(
  ROLES.ADMIN,
  ROLES.PHARMACIST
);


// =====================================================
// ALL AUTHENTICATED ROLES
// =====================================================

const authenticatedUser = allowRoles(
  ROLES.ADMIN,
  ROLES.PHARMACIST,
  ROLES.CUSTOMER
);


// =====================================================
// EXPORT
// =====================================================

module.exports = {
  ROLES,
  allowRoles,
  adminOnly,
  pharmacyStaff,
  authenticatedUser,
};