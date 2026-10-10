const express = require('express');
const router = express.Router();

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');

const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');


// =====================================================
// HELPERS
// =====================================================

function startOfDay(date = new Date()) {
  const d = new Date(date);

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;
}


function endOfDay(date = new Date()) {
  const d = new Date(date);

  d.setHours(
    23,
    59,
    59,
    999
  );

  return d;
}


function calculateDaysLeft(expiryDate) {
  if (!expiryDate) {
    return null;
  }

  const today = startOfDay();
  const expiry = startOfDay(expiryDate);

  const difference =
    expiry.getTime() -
    today.getTime();

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
}


function getBatchStatus(
  expiryDate,
  quantity
) {
  const stock =
    Number(quantity) || 0;

  if (stock <= 0) {
    return 'OUT_OF_STOCK';
  }

  const daysLeft =
    calculateDaysLeft(expiryDate);

  if (daysLeft === null) {
    return 'UNKNOWN';
  }

  if (daysLeft < 0) {
    return 'EXPIRED';
  }

  if (daysLeft <= 7) {
    return 'CRITICAL';
  }

  if (daysLeft <= 30) {
    return 'WARNING';
  }

  if (daysLeft <= 90) {
    return 'CAUTION';
  }

  return 'SAFE';
}


function getPriority(
  expiryDate,
  quantity
) {
  const status =
    getBatchStatus(
      expiryDate,
      quantity
    );

  if (
    status === 'EXPIRED' ||
    status === 'CRITICAL'
  ) {
    return 'HIGH';
  }

  if (
    status === 'WARNING' ||
    status === 'CAUTION'
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
}


// =====================================================
// GET ALL BATCHES
//
// GET /api/batches
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const medicines =
        await Medicine.find({
          status: {
            $ne: 'removed'
          }
        }).sort({
          name: 1,
          expiryDate: 1
        });


      // Get all sales
      const sales =
        await Sale.find({});


      const soldByMedicine =
        {};


      // ---------------------------------------------
      // Calculate sold quantity for every medicine
      // ---------------------------------------------

      for (const sale of sales) {
        if (!sale.items) {
          continue;
        }

        for (const item of sale.items) {
          if (!item.medicine) {
            continue;
          }

          const medicineId =
            item.medicine.toString();

          if (
            !soldByMedicine[
              medicineId
            ]
          ) {
            soldByMedicine[
              medicineId
            ] = 0;
          }

          soldByMedicine[
            medicineId
          ] +=
            Number(item.quantity) || 0;
        }
      }


      const batches =
        medicines.map(
          (medicine) => {
            const medicineId =
              medicine._id.toString();

            const currentStock =
              Number(
                medicine.quantity
              ) || 0;

            const totalSold =
              soldByMedicine[
                medicineId
              ] || 0;

            const daysLeft =
              calculateDaysLeft(
                medicine.expiryDate
              );

            const status =
              getBatchStatus(
                medicine.expiryDate,
                currentStock
              );

            const priority =
              getPriority(
                medicine.expiryDate,
                currentStock
              );

            return {
              _id:
                medicine._id,

              medicineId:
                medicine._id,

              name:
                medicine.name,

              brand:
                medicine.brand,

              category:
                medicine.category,

              batchNumber:
                medicine.batchNumber,

              mfgDate:
                medicine.mfgDate,

              expiryDate:
                medicine.expiryDate,

              quantity:
                currentStock,

              currentStock,

              soldQuantity:
                totalSold,

              purchasePrice:
                Number(
                  medicine.purchasePrice
                ) || 0,

              sellingPrice:
                Number(
                  medicine.sellingPrice
                ) || 0,

              supplier:
                medicine.supplier,

              rackNumber:
                medicine.rackNumber,

              shelfNumber:
                medicine.shelfNumber,

              boxNumber:
                medicine.boxNumber,

              qrCode:
                medicine.qrCode,

              status,

              priority,

              daysLeft,

              isExpired:
                daysLeft !== null &&
                daysLeft < 0,

              isExpiringSoon:
                daysLeft !== null &&
                daysLeft >= 0 &&
                daysLeft <= 30
            };
          }
        );


      // FEFO:
      // First Expiry, First Out
      batches.sort(
        (a, b) => {
          const aTime =
            a.expiryDate
              ? new Date(
                  a.expiryDate
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          const bTime =
            b.expiryDate
              ? new Date(
                  b.expiryDate
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          return aTime - bTime;
        }
      );


      // Summary
      const summary = {
        totalBatches:
          batches.length,

        totalStock:
          batches.reduce(
            (sum, batch) =>
              sum +
              batch.currentStock,
            0
          ),

        expired:
          batches.filter(
            batch =>
              batch.status ===
              'EXPIRED'
          ).length,

        critical:
          batches.filter(
            batch =>
              batch.status ===
              'CRITICAL'
          ).length,

        warning:
          batches.filter(
            batch =>
              batch.status ===
              'WARNING'
          ).length,

        caution:
          batches.filter(
            batch =>
              batch.status ===
              'CAUTION'
          ).length,

        safe:
          batches.filter(
            batch =>
              batch.status ===
              'SAFE'
          ).length,

        outOfStock:
          batches.filter(
            batch =>
              batch.status ===
              'OUT_OF_STOCK'
          ).length
      };


      res.json({
        success: true,

        summary,

        batches
      });

    } catch (err) {
      console.log(
        'Batch tracking error:',
        err
      );

      res.status(500).json({
        success: false,

        message:
          err.message ||
          'Failed to load batches'
      });
    }
  }
);


// =====================================================
// GET BATCHES FOR ONE MEDICINE
//
// GET /api/batches/medicine/:medicineName
// =====================================================

router.get(
  '/medicine/:medicineName',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const medicineName =
        req.params.medicineName;


      const medicines =
        await Medicine.find({
          name: {
            $regex:
              medicineName,
            $options: 'i'
          },

          status: {
            $ne: 'removed'
          }
        }).sort({
          expiryDate: 1
        });


      const sales =
        await Sale.find({});


      const batches =
        medicines.map(
          medicine => {
            let soldQuantity = 0;


            for (
              const sale of sales
            ) {
              if (!sale.items) {
                continue;
              }


              for (
                const item of sale.items
              ) {
                if (
                  item.medicine &&
                  item.medicine.toString() ===
                    medicine._id.toString()
                ) {
                  soldQuantity +=
                    Number(
                      item.quantity
                    ) || 0;
                }
              }
            }


            const currentStock =
              Number(
                medicine.quantity
              ) || 0;


            return {
              _id:
                medicine._id,

              medicineId:
                medicine._id,

              name:
                medicine.name,

              brand:
                medicine.brand,

              category:
                medicine.category,

              batchNumber:
                medicine.batchNumber,

              mfgDate:
                medicine.mfgDate,

              expiryDate:
                medicine.expiryDate,

              currentStock,

              soldQuantity,

              purchasePrice:
                Number(
                  medicine.purchasePrice
                ) || 0,

              sellingPrice:
                Number(
                  medicine.sellingPrice
                ) || 0,

              supplier:
                medicine.supplier,

              rackNumber:
                medicine.rackNumber,

              shelfNumber:
                medicine.shelfNumber,

              boxNumber:
                medicine.boxNumber,

              qrCode:
                medicine.qrCode,

              status:
                getBatchStatus(
                  medicine.expiryDate,
                  currentStock
                ),

              priority:
                getPriority(
                  medicine.expiryDate,
                  currentStock
                ),

              daysLeft:
                calculateDaysLeft(
                  medicine.expiryDate
                )
            };
          }
        );


      res.json({
        success: true,

        medicineName,

        totalBatches:
          batches.length,

        batches
      });

    } catch (err) {
      console.log(
        'Medicine batch error:',
        err
      );

      res.status(500).json({
        success: false,

        message:
          err.message ||
          'Failed to load medicine batches'
      });
    }
  }
);


// =====================================================
// GET FEFO BATCH
//
// GET /api/batches/fefo/:medicineName
//
// Returns the batch that should be used first.
// =====================================================

router.get(
  '/fefo/:medicineName',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const medicineName =
        req.params.medicineName;


      const batch =
        await Medicine.findOne({
          name: {
            $regex:
              medicineName,
            $options: 'i'
          },

          quantity: {
            $gt: 0
          },

          status: {
            $nin: [
              'removed',
              'expired'
            ]
          }
        }).sort({
          expiryDate: 1
        });


      if (!batch) {
        return res.status(404).json({
          success: false,

          message:
            'No available batch found'
        });
      }


      res.json({
        success: true,

        message:
          'Use the earliest-expiring available batch first',

        batch: {
          _id:
            batch._id,

          medicineId:
            batch._id,

          name:
            batch.name,

          brand:
            batch.brand,

          batchNumber:
            batch.batchNumber,

          expiryDate:
            batch.expiryDate,

          quantity:
            batch.quantity,

          supplier:
            batch.supplier,

          rackNumber:
            batch.rackNumber,

          shelfNumber:
            batch.shelfNumber,

          boxNumber:
            batch.boxNumber,

          daysLeft:
            calculateDaysLeft(
              batch.expiryDate
            ),

          status:
            getBatchStatus(
              batch.expiryDate,
              batch.quantity
            )
        }
      });

    } catch (err) {
      console.log(
        'FEFO error:',
        err
      );

      res.status(500).json({
        success: false,

        message:
          err.message ||
          'Failed to find FEFO batch'
      });
    }
  }
);


module.exports = router;