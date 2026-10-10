const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  sendWelcomeEmail
} = require('../services/emailService');
const {
  adminOnly
} = require('../middleware/rolePermissions');

// =====================================================
// REGISTER
// =====================================================
// Public registration always creates a CUSTOMER.
// Admin / Pharmacist accounts must be created through
// protected admin functionality.
// =====================================================

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    // -----------------------------------------------
    // Basic validation
    // -----------------------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // -----------------------------------------------
    // Check existing user
    // -----------------------------------------------

    const exists = await User.findOne({
      email: normalizedEmail
    });

    if (exists) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    // -----------------------------------------------
    // Hash password
    // -----------------------------------------------

    const hashed = await bcrypt.hash(
      password,
      10
    );

    // -----------------------------------------------
    // IMPORTANT:
    // Public registration = CUSTOMER only
    // -----------------------------------------------

    const role = 'customer';

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role
    });

    await user.save();

    // -----------------------------------------------
    // Welcome email
    // -----------------------------------------------

    sendWelcomeEmail(
      normalizedEmail,
      name.trim(),
      role
    );

    res.status(201).json({
      message: '✅ Registered successfully!',
      role: 'customer'
    });

  } catch (err) {

    console.error(
      'Registration error:',
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
});


// =====================================================
// LOGIN
// =====================================================

router.post('/login', async (req, res) => {
  try {

    const {
      email,
      password
    } = req.body;

    // -----------------------------------------------
    // Validation
    // -----------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // -----------------------------------------------
    // Find user
    // -----------------------------------------------

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(400).json({
        message: 'User not found'
      });
    }

    // -----------------------------------------------
    // Verify password
    // -----------------------------------------------

    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(400).json({
        message: 'Wrong password'
      });
    }

    // -----------------------------------------------
    // Create JWT
    // -----------------------------------------------

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // -----------------------------------------------
    // Login response
    // -----------------------------------------------

    res.json({
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {

    console.error(
      'Login error:',
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
});


// =====================================================
// ADMIN USER MANAGEMENT
// =====================================================

// -----------------------------------------------------
// GET ALL USERS
// GET /api/auth/users
// Admin only
// -----------------------------------------------------

router.get(
  '/users',
  auth,
  adminOnly,
  async (req, res) => {
    try {

      const users = await User.find()
        .select('-password')
        .sort({
          createdAt: -1
        });

      res.json({
        success: true,
        users
      });

    } catch (err) {

      console.error(
        'Get users error:',
        err
      );

      res.status(500).json({
        message: 'Failed to fetch users'
      });
    }
  }
);


// -----------------------------------------------------
// CREATE STAFF USER
// POST /api/auth/users
// Admin only
// -----------------------------------------------------

router.post(
  '/users',
  auth,
  adminOnly,
  async (req, res) => {
    try {

      const {
        name,
        email,
        password,
        role
      } = req.body;

      // -----------------------------------------------
      // Validation
      // -----------------------------------------------

      if (
        !name ||
        !email ||
        !password ||
        !role
      ) {
        return res.status(400).json({
          message:
            'Name, email, password and role are required'
        });
      }

      // -----------------------------------------------
      // Only admin/pharmacist can be created here
      // -----------------------------------------------

      if (
        !['admin', 'pharmacist']
          .includes(role)
      ) {
        return res.status(400).json({
          message:
            'Only admin or pharmacist roles can be created here'
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      // -----------------------------------------------
      // Check existing email
      // -----------------------------------------------

      const exists = await User.findOne({
        email: normalizedEmail
      });

      if (exists) {
        return res.status(400).json({
          message: 'Email already exists'
        });
      }

      // -----------------------------------------------
      // Hash password
      // -----------------------------------------------

      const hashed =
        await bcrypt.hash(
          password,
          10
        );

      // -----------------------------------------------
      // Create user
      // -----------------------------------------------

      const user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        role
      });

      await user.save();

      // -----------------------------------------------
      // Welcome email
      // -----------------------------------------------

      sendWelcomeEmail(
        normalizedEmail,
        name.trim(),
        role
      );

      res.status(201).json({
        success: true,
        message:
          'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (err) {

      console.error(
        'Create user error:',
        err
      );

      res.status(500).json({
        message: 'Failed to create user'
      });
    }
  }
);


// -----------------------------------------------------
// UPDATE USER ROLE
// PUT /api/auth/users/:id/role
// Admin only
// -----------------------------------------------------

router.put(
  '/users/:id/role',
  auth,
  adminOnly,
  async (req, res) => {
    try {

      const {
        role
      } = req.body;

      if (
        !['admin', 'pharmacist', 'customer']
          .includes(role)
      ) {
        return res.status(400).json({
          message: 'Invalid role'
        });
      }

      // Prevent admin from changing own role
      if (
        String(req.user.id) ===
        String(req.params.id)
      ) {
        return res.status(400).json({
          message:
            'You cannot change your own role'
        });
      }

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      user.role = role;

      await user.save();

      res.json({
        success: true,
        message:
          'User role updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (err) {

      console.error(
        'Update role error:',
        err
      );

      res.status(500).json({
        message:
          'Failed to update user role'
      });
    }
  }
);


// -----------------------------------------------------
// DELETE USER
// DELETE /api/auth/users/:id
// Admin only
// -----------------------------------------------------

router.delete(
  '/users/:id',
  auth,
  adminOnly,
  async (req, res) => {
    try {

      // -----------------------------------------------
      // Prevent self deletion
      // -----------------------------------------------

      if (
        String(req.user.id) ===
        String(req.params.id)
      ) {
        return res.status(400).json({
          message:
            'You cannot delete your own account'
        });
      }

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      await User.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
        message:
          'User deleted successfully'
      });

    } catch (err) {

      console.error(
        'Delete user error:',
        err
      );

      res.status(500).json({
        message:
          'Failed to delete user'
      });
    }
  }
);


module.exports = router;