const express = require('express');

const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

const router = express.Router();
const {
  adminOnly
} = require('../middleware/rolePermissions');


// =====================================================
// HELPER — CREATE AUDIT LOG
// =====================================================

const createAuditLog = async ({
  req,
  action,
  module = 'system',
  medicine = null,
  medicineName = '',
  batchNumber = '',
  quantity = null,
  description = '',
  details = {},
}) => {
  try {
    const user = req.user || {};

    let ipAddress =
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      '';

    if (Array.isArray(ipAddress)) {
      ipAddress = ipAddress[0];
    }

    if (typeof ipAddress === 'string') {
      ipAddress = ipAddress.split(',')[0].trim();
    }

    await AuditLog.create({
      user: user._id || user.id || null,

      userName:
        user.name ||
        user.username ||
        user.email ||
        'Unknown User',

      userRole:
        user.role ||
        'unknown',

      action,

      module,

      medicine,

      medicineName,

      batchNumber,

      quantity,

      description,

      details,

      ipAddress,

      userAgent:
        req.headers['user-agent'] ||
        '',
    });

    return true;

  } catch (error) {

    console.error(
      'Audit log creation error:',
      error.message
    );

    return false;
  }
};


// =====================================================
// CREATE AUDIT LOG
// POST /api/audit-logs
// =====================================================

router.post(
  '/',
  auth,
  adminOnly,
  async (req, res) => {
  try {

    const {
      action,
      module = 'system',
      medicine = null,
      medicineName = '',
      batchNumber = '',
      quantity = null,
      description = '',
      details = {},
    } = req.body;


    if (!action) {

      return res.status(400).json({
        success: false,
        message: 'Action is required',
      });

    }


    await createAuditLog({
      req,
      action,
      module,
      medicine,
      medicineName,
      batchNumber,
      quantity,
      description,
      details,
    });


    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
    });

  } catch (error) {

    console.error(
      'Create audit log error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});


// =====================================================
// GET ALL AUDIT LOGS
// GET /api/audit-logs
// =====================================================

router.get(
  '/',
  auth,
  adminOnly,
  async (req, res) => {
  try {

    const {
      action,
      module,
      medicine,
      limit = 100,
      page = 1,
    } = req.query;


    const filter = {};


    if (action) {
      filter.action = action;
    }


    if (module) {
      filter.module = module;
    }


    if (medicine) {
      filter.medicine = medicine;
    }


    const parsedLimit = Math.min(
      Math.max(Number(limit) || 100, 1),
      500
    );

    const parsedPage = Math.max(
      Number(page) || 1,
      1
    );


    const skip =
      (parsedPage - 1) *
      parsedLimit;


    const [logs, total] =
      await Promise.all([

        AuditLog.find(filter)

          .populate(
            'user',
            'name email role'
          )

          .populate(
            'medicine',
            'name brand batchNumber'
          )

          .sort({
            createdAt: -1,
          })

          .skip(skip)

          .limit(parsedLimit)

          .lean(),

        AuditLog.countDocuments(filter),

      ]);


    res.json({
      success: true,

      logs,

      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages:
          Math.ceil(
            total / parsedLimit
          ),
      },
    });

  } catch (error) {

    console.error(
      'Get audit logs error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});


// =====================================================
// GET AUDIT LOG SUMMARY
// GET /api/audit-logs/summary
// =====================================================

router.get(
  '/summary',
  auth,
  adminOnly,
  async (req, res) => {

    try {

      const total =
        await AuditLog.countDocuments();


      const actionSummary =
        await AuditLog.aggregate([

          {
            $group: {
              _id: '$action',
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },

        ]);


      const moduleSummary =
        await AuditLog.aggregate([

          {
            $group: {
              _id: '$module',
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },

        ]);


      res.json({

        success: true,

        total,

        actions:
          actionSummary.map(
            (item) => ({
              action: item._id,
              count: item.count,
            })
          ),

        modules:
          moduleSummary.map(
            (item) => ({
              module: item._id,
              count: item.count,
            })
          ),

      });

    } catch (error) {

      console.error(
        'Audit summary error:',
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  }
);


// =====================================================
// GET MEDICINE AUDIT HISTORY
// GET /api/audit-logs/medicine/:medicineId
// =====================================================

router.get(
  '/medicine/:medicineId',
  auth,
  adminOnly,
  async (req, res) => {

    try {

      const logs =
        await AuditLog.find({
          medicine:
            req.params.medicineId,
        })

        .populate(
          'user',
          'name email role'
        )

        .sort({
          createdAt: -1,
        })

        .limit(200)

        .lean();


      res.json({

        success: true,

        logs,

      });

    } catch (error) {

      console.error(
        'Medicine audit history error:',
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = {
  router,
  createAuditLog,
};