const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Pharmacy = require('../models/Pharmacy');
const PharmacyInventory = require('../models/PharmacyInventory');
const Medicine = require('../models/Medicine');

const auth = require('../middleware/auth');
const { pharmacyStaff } = require('../middleware/rolePermissions');

// =====================================================
// HELPER
// =====================================================

const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};

const getMyPharmacy = async (userId) => {
  return Pharmacy.findOne({
    owner: userId,
    isActive: true,
  });
};

// =====================================================
// GET MY ONLINE INVENTORY
// GET /api/pharmacy-inventory/my
// =====================================================

router.get(
  '/my',
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

      const pharmacy = await getMyPharmacy(userId);

if (!pharmacy) {
  const newPharmacy = await Pharmacy.create({
    owner: userId,
    name: 'Sameena Pharmacy',
    phone: '9385993021',
    address: 'Kovilpatti',
    area: 'Kovilpatti',
    city: 'Kovilpatti',
    district: 'Thoothukudi',
    pincode: '628501',
    isActive: true,
    acceptsOnlineOrders: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 10,
  });

  return res.json({
    pharmacy: newPharmacy,
    inventory: [],
  });
}

      const inventory = await PharmacyInventory.find({
        pharmacy: pharmacy._id,
      })
        .populate(
          'medicine',
          'name brand category quantity expiryDate sellingPrice'
        )
        .sort({
          createdAt: -1,
        });

      res.json({
        pharmacy,
        inventory,
      });
    } catch (error) {
      console.error(
        'Get online inventory error:',
        error
      );

      res.status(500).json({
        message: 'Failed to fetch online inventory',
        error: error.message,
      });
    }
  }
);

// =====================================================
// SETUP PHARMACY - TEMPORARY HELPER
// POST /api/pharmacy-inventory/setup-pharmacy
// =====================================================

router.post(
  '/setup-pharmacy',
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

      let pharmacy = await Pharmacy.findOne({
        owner: userId,
      });

      if (pharmacy) {
        pharmacy.isActive = true;
        pharmacy.acceptsOnlineOrders = true;
        pharmacy.deliveryAvailable = true;

        await pharmacy.save();

        return res.json({
          message: 'Pharmacy already exists',
          pharmacy,
        });
      }

      pharmacy = await Pharmacy.create({
        owner: userId,

        name:
          req.body.name ||
          'Test Pharmacy',

        licenseNumber:
          req.body.licenseNumber || '',

        phone:
          req.body.phone || '',

        email:
          req.body.email || '',

        address:
          req.body.address || '',

        area:
          req.body.area || '',

        city:
          req.body.city || '',

        district:
          req.body.district || '',

        pincode:
          req.body.pincode || '',

        isActive: true,

        acceptsOnlineOrders: true,

        deliveryAvailable: true,

        deliveryRadiusKm:
          Number(
            req.body.deliveryRadiusKm || 10
          ),
      });

      res.status(201).json({
        message: 'Pharmacy created successfully',
        pharmacy,
      });
    } catch (error) {
      console.error(
        'Setup pharmacy error:',
        error
      );

      res.status(500).json({
        message: 'Failed to setup pharmacy',
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADD ONLINE INVENTORY
// POST /api/pharmacy-inventory
// =====================================================

router.post(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const {
        medicineId,
        sellingPrice,
        onlineQuantity = 0,
        availableForOnlineOrder = false,
        requiresPrescription = false,
        maxOrderQuantity = 10,
      } = req.body;

      // ---------------------------------------------
      // MEDICINE ID
      // ---------------------------------------------

      if (!medicineId) {
        return res.status(400).json({
          message: 'Medicine ID is required',
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          medicineId
        )
      ) {
        return res.status(400).json({
          message: 'Invalid medicine ID',
        });
      }

      // ---------------------------------------------
      // PHARMACY
      // ---------------------------------------------

      const pharmacy =
        await getMyPharmacy(userId);

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // ---------------------------------------------
      // MEDICINE
      // ---------------------------------------------

      const medicine =
        await Medicine.findById(
          medicineId
        );

      if (!medicine) {
        return res.status(404).json({
          message: 'Medicine not found',
        });
      }

      // ---------------------------------------------
      // DUPLICATE CHECK
      // ---------------------------------------------

      const existing =
        await PharmacyInventory.findOne({
          pharmacy: pharmacy._id,
          medicine: medicineId,
        });

      if (existing) {
        return res.status(409).json({
          message:
            'This medicine is already in online inventory',
        });
      }

      // ---------------------------------------------
      // VALIDATE VALUES
      // ---------------------------------------------

      const parsedPrice =
        Number(sellingPrice);

      const parsedQuantity =
        Number(onlineQuantity);

      const parsedMax =
        Number(maxOrderQuantity);

      if (
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      ) {
        return res.status(400).json({
          message:
            'Valid selling price is required',
        });
      }

      if (
        !Number.isInteger(parsedQuantity) ||
        parsedQuantity < 0
      ) {
        return res.status(400).json({
          message:
            'Valid online quantity is required',
        });
      }

      if (
        !Number.isInteger(parsedMax) ||
        parsedMax < 1
      ) {
        return res.status(400).json({
          message:
            'Maximum order quantity must be at least 1',
        });
      }

      // ---------------------------------------------
      // CREATE INVENTORY
      // ---------------------------------------------

      const inventory =
        await PharmacyInventory.create({
          pharmacy: pharmacy._id,

          medicine: medicineId,

          sellingPrice: parsedPrice,

          onlineQuantity: parsedQuantity,

          availableForOnlineOrder:
            Boolean(
              availableForOnlineOrder
            ),

          requiresPrescription:
            Boolean(
              requiresPrescription
            ),

          maxOrderQuantity: parsedMax,

          status:
            parsedQuantity > 0 &&
            Boolean(
              availableForOnlineOrder
            )
              ? 'active'
              : parsedQuantity <= 0
                ? 'out_of_stock'
                : 'inactive',
        });

      // ---------------------------------------------
      // POPULATE RESPONSE
      // ---------------------------------------------

      const populated =
        await PharmacyInventory.findById(
          inventory._id
        ).populate(
          'medicine',
          'name brand category quantity expiryDate sellingPrice'
        );

      res.status(201).json({
        message:
          'Online inventory added successfully',

        inventory: populated,
      });
    } catch (error) {
      console.error(
        'Add online inventory error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to add online inventory',

        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE ONLINE INVENTORY
// PUT /api/pharmacy-inventory/:id
// =====================================================

router.put(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      // ---------------------------------------------
      // VALIDATE ID
      // ---------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message: 'Invalid inventory ID',
        });
      }

      const userId = getUserId(req);

      const pharmacy =
        await getMyPharmacy(userId);

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // ---------------------------------------------
      // FIND INVENTORY
      // ---------------------------------------------

      const inventory =
        await PharmacyInventory.findOne({
          _id: req.params.id,
          pharmacy: pharmacy._id,
        });

      if (!inventory) {
        return res.status(404).json({
          message:
            'Online inventory item not found',
        });
      }

      // ---------------------------------------------
      // REQUEST VALUES
      // ---------------------------------------------

      const {
        sellingPrice,
        onlineQuantity,
        availableForOnlineOrder,
        requiresPrescription,
        maxOrderQuantity,
      } = req.body;

      // ---------------------------------------------
      // SELLING PRICE
      // ---------------------------------------------

      if (
        sellingPrice !== undefined
      ) {
        const value =
          Number(sellingPrice);

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          return res.status(400).json({
            message:
              'Invalid selling price',
          });
        }

        inventory.sellingPrice = value;
      }

      // ---------------------------------------------
      // ONLINE QUANTITY
      // ---------------------------------------------

      if (
        onlineQuantity !== undefined
      ) {
        const value =
          Number(onlineQuantity);

        if (
          !Number.isInteger(value) ||
          value < 0
        ) {
          return res.status(400).json({
            message:
              'Invalid online quantity',
          });
        }

        inventory.onlineQuantity = value;
      }

      // ---------------------------------------------
      // ONLINE ORDER ENABLE
      // ---------------------------------------------

      if (
        availableForOnlineOrder !==
        undefined
      ) {
        inventory.availableForOnlineOrder =
          Boolean(
            availableForOnlineOrder
          );
      }

      // ---------------------------------------------
      // PRESCRIPTION REQUIRED
      // ---------------------------------------------

      if (
        requiresPrescription !==
        undefined
      ) {
        inventory.requiresPrescription =
          Boolean(
            requiresPrescription
          );
      }

      // ---------------------------------------------
      // MAX ORDER QUANTITY
      // ---------------------------------------------

      if (
        maxOrderQuantity !==
        undefined
      ) {
        const value =
          Number(maxOrderQuantity);

        if (
          !Number.isInteger(value) ||
          value < 1
        ) {
          return res.status(400).json({
            message:
              'Maximum order quantity must be at least 1',
          });
        }

        inventory.maxOrderQuantity =
          value;
      }

      // ---------------------------------------------
      // UPDATE STATUS
      // ---------------------------------------------

      if (
        inventory.onlineQuantity <= 0
      ) {
        inventory.onlineQuantity = 0;

        inventory.status =
          'out_of_stock';
      } else if (
        inventory.availableForOnlineOrder
      ) {
        inventory.status = 'active';
      } else {
        inventory.status = 'inactive';
      }

      // ---------------------------------------------
      // SAVE
      // ---------------------------------------------

      await inventory.save();

      // ---------------------------------------------
      // POPULATE
      // ---------------------------------------------

      const populated =
        await PharmacyInventory.findById(
          inventory._id
        ).populate(
          'medicine',
          'name brand category quantity expiryDate sellingPrice'
        );

      res.json({
        message:
          'Online inventory updated successfully',

        inventory: populated,
      });
    } catch (error) {
      console.error(
        'Update online inventory error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to update online inventory',

        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE ONLINE INVENTORY
// DELETE /api/pharmacy-inventory/:id
// =====================================================

router.delete(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      // ---------------------------------------------
      // VALIDATE ID
      // ---------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message:
            'Invalid inventory ID',
        });
      }

      const userId =
        getUserId(req);

      const pharmacy =
        await getMyPharmacy(userId);

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // ---------------------------------------------
      // DELETE
      // ---------------------------------------------

      const inventory =
        await PharmacyInventory.findOneAndDelete({
          _id: req.params.id,
          pharmacy: pharmacy._id,
        });

      if (!inventory) {
        return res.status(404).json({
          message:
            'Online inventory item not found',
        });
      }

      res.json({
        message:
          'Online inventory removed successfully',
      });
    } catch (error) {
      console.error(
        'Delete online inventory error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to delete online inventory',

        error: error.message,
      });
    }
  }
);

// =====================================================
// SEARCH MARKETPLACE MEDICINES
// GET /api/pharmacy-inventory/search?q=Dolo
// IMPORTANT: MUST COME BEFORE /:id
// =====================================================

router.get(
  '/search',
  auth,
  async (req, res) => {
    try {
      const query =
        String(
          req.query.q || ''
        ).trim();

      if (!query) {
        return res.json([]);
      }

      const escapedQuery =
        query.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const regex =
        new RegExp(
          escapedQuery,
          'i'
        );

      const inventory =
        await PharmacyInventory.find({
          availableForOnlineOrder: true,
          status: 'active',
          onlineQuantity: {
            $gt: 0,
          },
        })
          .populate({
            path: 'medicine',

            match: {
              $or: [
                { name: regex },
                { brand: regex },
                { category: regex },
                { batchNumber: regex },
              ],
            },

            select:
              'name brand category quantity expiryDate sellingPrice batchNumber',
          })
          .populate(
            'pharmacy',
            'name phone address area city district pincode deliveryAvailable deliveryRadiusKm'
          )
          .sort({
            createdAt: -1,
          });

      const results =
        inventory.filter(
          (item) =>
            item.medicine
        );

      return res.json(
        results
      );
    } catch (error) {
      console.error(
        'Marketplace medicine search error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to search marketplace medicines',

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GET MARKETPLACE MEDICINE
// GET /api/pharmacy-inventory/:id
// =====================================================

router.get(
  '/:id',
  auth,
  async (req, res) => {
    try {
      // ---------------------------------------------
      // VALIDATE ID
      // ---------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message:
            'Invalid inventory ID',
        });
      }

      // ---------------------------------------------
      // FIND INVENTORY
      // ---------------------------------------------

      const inventory =
        await PharmacyInventory.findOne({
          _id: req.params.id,

          availableForOnlineOrder:
            true,

          status: 'active',

          onlineQuantity: {
            $gt: 0,
          },
        })
          .populate(
            'medicine',
            'name brand category quantity expiryDate sellingPrice batchNumber'
          )
          .populate(
            'pharmacy',
            'name phone address area city district pincode deliveryAvailable deliveryRadiusKm'
          );

      if (!inventory) {
        return res.status(404).json({
          message:
            'Medicine is not available online',
        });
      }

      res.json({
        inventory,
      });
    } catch (error) {
      console.error(
        'Get marketplace medicine error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch medicine details',

        error:
          error.message,
      });
    }
  }
);

module.exports = router;