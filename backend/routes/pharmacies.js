const express = require('express');

const router = express.Router();

const Pharmacy = require('../models/Pharmacy');

const auth = require('../middleware/auth');
const { pharmacyStaff } = require('../middleware/rolePermissions');


// =====================================================
// HELPER
// =====================================================

const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};


// =====================================================
// CREATE PHARMACY
// POST /api/pharmacies
// =====================================================

router.post(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message: 'User authentication required',
        });
      }

      const {
        name,
        licenseNumber,
        phone,
        email,
        address,
        area,
        city,
        district,
        pincode,
        deliveryAvailable,
        deliveryRadiusKm,
      } = req.body;


      // ---------------------------------------------
      // Validate name
      // ---------------------------------------------

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: 'Pharmacy name is required',
        });
      }


      // ---------------------------------------------
      // Check duplicate pharmacy
      // ---------------------------------------------

      const existingPharmacy =
        await Pharmacy.findOne({
          owner: userId,
          name: name.trim(),
        });

      if (existingPharmacy) {
        return res.status(409).json({
          message:
            'You already have a pharmacy with this name',
        });
      }


      // ---------------------------------------------
      // Create pharmacy
      // ---------------------------------------------

      const pharmacy =
        await Pharmacy.create({
          owner: userId,

          name: name.trim(),

          licenseNumber:
            licenseNumber || '',

          phone:
            phone || '',

          email:
            email || '',

          address:
            address || '',

          area:
            area || '',

          city:
            city || '',

          district:
            district || '',

          pincode:
            pincode || '',

          deliveryAvailable:
            deliveryAvailable !== undefined
              ? Boolean(deliveryAvailable)
              : true,

          deliveryRadiusKm:
            deliveryRadiusKm !== undefined
              ? Number(deliveryRadiusKm)
              : 10,

          isActive: true,

          acceptsOnlineOrders: true,
        });


      return res.status(201).json({
        message:
          'Pharmacy created successfully',

        pharmacy,
      });

    } catch (error) {
      console.error(
        'Create pharmacy error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to create pharmacy',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// GET MY PHARMACY
// GET /api/pharmacies/my
//
// IMPORTANT:
// This route MUST come before /:id
// =====================================================

router.get(
  '/my',
  auth,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'User authentication required',
        });
      }


      const pharmacy =
        await Pharmacy.findOne({
          owner: userId,
          isActive: true,
        }).populate(
          'owner',
          'name email role'
        );


      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }


      return res.json({
        pharmacy,
      });

    } catch (error) {
      console.error(
        'Get my pharmacy error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch pharmacy',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// GET MY PHARMACIES
// GET /api/pharmacies/all-my
//
// This returns ALL pharmacies owned by current user.
// =====================================================

router.get(
  '/all-my',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'User authentication required',
        });
      }


      const pharmacies =
        await Pharmacy.find({
          owner: userId,
        })
          .populate(
            'owner',
            'name email role'
          )
          .sort({
            createdAt: -1,
          });


      return res.json({
        count:
          pharmacies.length,

        pharmacies,
      });

    } catch (error) {
      console.error(
        'Get all my pharmacies error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch pharmacies',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// GET ALL ACTIVE PHARMACIES
// GET /api/pharmacies
//
// Customer marketplace uses this.
// =====================================================

router.get(
  '/',
  async (req, res) => {
    try {
      const pharmacies =
        await Pharmacy.find({
          isActive: true,

          acceptsOnlineOrders: true,
        })
          .select(
            'name phone email address area city district pincode deliveryAvailable deliveryRadiusKm acceptsOnlineOrders'
          )
          .sort({
            name: 1,
          });


      return res.json({
        count:
          pharmacies.length,

        pharmacies,
      });

    } catch (error) {
      console.error(
        'Get pharmacies error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch pharmacies',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// GET SINGLE PHARMACY
// GET /api/pharmacies/:id
//
// IMPORTANT:
// This MUST come AFTER /my and /all-my.
// =====================================================

router.get(
  '/:id',
  async (req, res) => {
    try {
      const pharmacyId =
        req.params.id;


      // ---------------------------------------------
      // Prevent "my" from being treated as ObjectId
      // ---------------------------------------------

      if (
        !pharmacyId ||
        pharmacyId === 'my' ||
        pharmacyId === 'all-my'
      ) {
        return res.status(400).json({
          message:
            'Valid pharmacy ID is required',
        });
      }


      const pharmacy =
        await Pharmacy.findOne({
          _id: pharmacyId,

          isActive: true,
        }).populate(
          'owner',
          'name email role'
        );


      if (!pharmacy) {
        return res.status(404).json({
          message:
            'Pharmacy not found',
        });
      }


      return res.json({
        pharmacy,
      });

    } catch (error) {
      console.error(
        'Get pharmacy error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch pharmacy',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// UPDATE MY PHARMACY
// PUT /api/pharmacies/:id
// =====================================================

router.put(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'User authentication required',
        });
      }


      const pharmacy =
        await Pharmacy.findOne({
          _id: req.params.id,

          owner: userId,
        });


      if (!pharmacy) {
        return res.status(404).json({
          message:
            'Pharmacy not found or access denied',
        });
      }


      // ---------------------------------------------
      // Allowed fields
      // ---------------------------------------------

      const allowedFields = [
        'name',
        'licenseNumber',
        'phone',
        'email',
        'address',
        'area',
        'city',
        'district',
        'pincode',
        'isActive',
        'acceptsOnlineOrders',
        'deliveryAvailable',
        'deliveryRadiusKm',
      ];


      allowedFields.forEach(
        (field) => {
          if (
            req.body[field] !==
            undefined
          ) {
            pharmacy[field] =
              req.body[field];
          }
        }
      );


      // ---------------------------------------------
      // Basic validation
      // ---------------------------------------------

      if (
        pharmacy.name !== undefined
      ) {
        pharmacy.name =
          String(
            pharmacy.name
          ).trim();

        if (
          !pharmacy.name
        ) {
          return res.status(400).json({
            message:
              'Pharmacy name cannot be empty',
          });
        }
      }


      if (
        pharmacy.deliveryRadiusKm !==
        undefined
      ) {
        pharmacy.deliveryRadiusKm =
          Number(
            pharmacy.deliveryRadiusKm
          );

        if (
          Number.isNaN(
            pharmacy.deliveryRadiusKm
          ) ||
          pharmacy.deliveryRadiusKm < 0
        ) {
          return res.status(400).json({
            message:
              'Invalid delivery radius',
          });
        }
      }


      await pharmacy.save();


      return res.json({
        message:
          'Pharmacy updated successfully',

        pharmacy,
      });

    } catch (error) {
      console.error(
        'Update pharmacy error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to update pharmacy',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// DELETE / DEACTIVATE MY PHARMACY
// DELETE /api/pharmacies/:id
//
// We deactivate instead of physically deleting.
// This keeps existing orders/inventory safe.
// =====================================================

router.delete(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'User authentication required',
        });
      }


      const pharmacy =
        await Pharmacy.findOne({
          _id: req.params.id,

          owner: userId,
        });


      if (!pharmacy) {
        return res.status(404).json({
          message:
            'Pharmacy not found or access denied',
        });
      }


      pharmacy.isActive = false;

      pharmacy.acceptsOnlineOrders = false;

      await pharmacy.save();


      return res.json({
        message:
          'Pharmacy deactivated successfully',

        pharmacy,
      });

    } catch (error) {
      console.error(
        'Deactivate pharmacy error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to deactivate pharmacy',

        error:
          error.message,
      });
    }
  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;