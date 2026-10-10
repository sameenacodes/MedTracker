const express = require('express');
const mongoose = require('mongoose');

const Invoice = require('../models/Invoice');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');

const auth = require('../middleware/auth');

const {
  pharmacyStaff,
} = require('../middleware/rolePermissions');

const router = express.Router();


// =====================================================
// HELPERS
// =====================================================

const roundMoney = (value) => {

  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

};


// =====================================================
// GENERATE INVOICE NUMBER
// =====================================================

const generateInvoiceNumber = async () => {

  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0');

  const prefix =
    `INV-${year}${month}-`;


  const lastInvoice =
    await Invoice.findOne({

      invoiceNumber: {
        $regex: `^${prefix}`,
      },

    })
      .sort({
        createdAt: -1,
      })
      .lean();


  let sequence = 1;


  if (lastInvoice) {

    const lastNumber =
      Number(
        lastInvoice.invoiceNumber
          .replace(prefix, '')
      );


    if (!Number.isNaN(lastNumber)) {

      sequence =
        lastNumber + 1;

    }

  }


  return (
    `${prefix}` +
    `${String(sequence).padStart(4, '0')}`
  );

};


// =====================================================
// CREATE INVOICE
// POST /api/invoices
//
// ADMIN + PHARMACIST ONLY
//
// This endpoint:
// - validates medicine
// - validates stock
// - creates invoice
// - deducts stock
// - creates Sale
// =====================================================

router.post(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {

        customer = {},

        items = [],

        discount = 0,

        paymentMethod = 'cash',

        paymentStatus = 'paid',

        notes = '',

      } = req.body;


      // =================================================
      // VALIDATE ITEMS
      // =================================================

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invoice must contain at least one medicine',

        });

      }


      const requestedDiscount =
        Math.max(
          Number(discount) || 0,
          0
        );


      const invoiceItems = [];

      let subtotal = 0;

      let totalTax = 0;


      // =================================================
      // VALIDATE MEDICINES
      // =================================================

      for (
        const item of items
      ) {

        if (!item.medicine) {

          return res.status(400).json({

            success: false,

            message:
              'Medicine ID is required for every item',

          });

        }


        if (
          !mongoose.Types.ObjectId.isValid(
            item.medicine
          )
        ) {

          return res.status(400).json({

            success: false,

            message:
              `Invalid medicine ID: ${item.medicine}`,

          });

        }


        const medicine =
          await Medicine.findById(
            item.medicine
          );


        if (!medicine) {

          return res.status(404).json({

            success: false,

            message:
              `Medicine not found: ${item.medicine}`,

          });

        }


        // =================================================
        // EXPIRED / REMOVED MEDICINE
        // =================================================

        if (
          medicine.status === 'expired' ||
          medicine.status === 'removed'
        ) {

          return res.status(400).json({

            success: false,

            message:
              `${medicine.name} is not available for billing`,

          });

        }


        // =================================================
        // QUANTITY
        // =================================================

        const quantity =
          Number(item.quantity);


        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              `Invalid quantity for ${medicine.name}`,

          });

        }


        // =================================================
        // STOCK VALIDATION
        // =================================================

        if (
          quantity >
          medicine.quantity
        ) {

          return res.status(400).json({

            success: false,

            message:
              `Insufficient stock for ${medicine.name}. ` +
              `Available: ${medicine.quantity}, ` +
              `Requested: ${quantity}`,

          });

        }


        // =================================================
        // PRICE
        // =================================================

        const price =
          item.price !== undefined
            ? Number(item.price)
            : Number(
                medicine.sellingPrice || 0
              );


        if (
          price < 0 ||
          Number.isNaN(price)
        ) {

          return res.status(400).json({

            success: false,

            message:
              `Invalid price for ${medicine.name}`,

          });

        }


        // =================================================
        // TAX
        // =================================================

        const taxRate =
          Math.max(
            Number(item.taxRate) || 0,
            0
          );


        // =================================================
        // ITEM DISCOUNT
        // =================================================

        const itemDiscount =
          Math.max(
            Number(item.discount) || 0,
            0
          );


        // =================================================
        // CALCULATE ITEM TOTAL
        // =================================================

        const grossAmount =
          roundMoney(
            quantity * price
          );


        const itemSubtotal =
          roundMoney(
            Math.max(
              grossAmount -
                itemDiscount,
              0
            )
          );


        const taxAmount =
          roundMoney(
            (
              itemSubtotal *
              taxRate
            ) / 100
          );


        const itemTotal =
          roundMoney(
            itemSubtotal +
            taxAmount
          );


        subtotal +=
          itemSubtotal;


        totalTax +=
          taxAmount;


        // =================================================
        // ADD ITEM
        // =================================================

        invoiceItems.push({

          medicine:
            medicine._id,

          medicineName:
            medicine.name,

          batchNumber:
            item.batchNumber ||
            medicine.batchNumber ||
            '',

          quantity,

          price,

          discount:
            itemDiscount,

          taxRate,

          subtotal:
            itemSubtotal,

          taxAmount,

          total:
            itemTotal,

        });

      }


      // =================================================
      // FINAL TOTALS
      // =================================================

      subtotal =
        roundMoney(
          subtotal
        );


      totalTax =
        roundMoney(
          totalTax
        );


      const finalDiscount =
        roundMoney(

          Math.min(
            requestedDiscount,
            subtotal
          )

        );


      const grandTotal =
        roundMoney(

          Math.max(

            subtotal -
              finalDiscount +
              totalTax,

            0

          )

        );


      // =================================================
      // GENERATE INVOICE NUMBER
      // =================================================

      const invoiceNumber =
        await generateInvoiceNumber();


      // =================================================
      // CREATE INVOICE
      // =================================================

      const invoice =
        await Invoice.create({

          invoiceNumber,

          customer: {

            name:
              customer.name?.trim() ||
              'Walk-in Customer',

            phone:
              customer.phone?.trim() ||
              '',

            email:
              customer.email?.trim() ||
              '',

            address:
              customer.address?.trim() ||
              '',

          },

          items:
            invoiceItems,

          subtotal,

          discount:
            finalDiscount,

          taxAmount:
            totalTax,

          grandTotal,

          paymentMethod,

          paymentStatus,

          notes:
            notes?.trim() || '',

          createdBy:
            req.user?.id ||
            null,

        });


      // =================================================
      // UPDATE STOCK + CREATE SALE
      // =================================================

      const saleItems = [];


      for (
        const item of invoiceItems
      ) {

        const medicine =
          await Medicine.findById(
            item.medicine
          );


        if (!medicine) {
          continue;
        }


        // ---------------------------------------------
        // DEDUCT STOCK
        // ---------------------------------------------

        medicine.quantity =
          Math.max(

            medicine.quantity -
              item.quantity,

            0

          );


        await medicine.save();


        // ---------------------------------------------
        // SALE ITEM
        // ---------------------------------------------

        saleItems.push({

          medicine:
            medicine._id,

          medicineName:
            medicine.name,

          batchNumber:
            item.batchNumber,

          quantity:
            item.quantity,

          price:
            item.price,

          total:
            item.total,

        });

      }


      // =================================================
      // CREATE SALE
      // =================================================

      if (
        saleItems.length > 0
      ) {

        await Sale.create({

          items:
            saleItems,

          totalAmount:
            grandTotal,

          total:
            grandTotal,

          revenue:
            grandTotal,

          createdAt:
            new Date(),

        });

      }


      // =================================================
      // RESPONSE
      // =================================================

      return res.status(201).json({

        success: true,

        message:
          'Invoice created successfully',

        invoice,

      });

    } catch (error) {

      console.error(
        'Create invoice error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to create invoice',

        error:
          error.message,

      });

    }

  }
);

// =====================================================
// CREATE DIGITAL INVOICE FROM EXISTING SALE
// =====================================================
//
// IMPORTANT:
// Billing already:
// 1. Creates Sale
// 2. Deducts medicine stock
//
// This route ONLY creates the Digital Invoice.
// It does NOT:
// - deduct stock again
// - create another Sale
//
// POST /api/invoices/from-sale
// =====================================================

router.post('/from-sale', auth, async (req, res) => {
  try {
    const {
      customer = {},
      items = [],
      subtotal = 0,
      discount = 0,
      taxAmount = 0,
      grandTotal = 0,
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      notes = '',
    } = req.body;

    // -------------------------------------------------
    // VALIDATE ITEMS
    // -------------------------------------------------

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must contain at least one medicine',
      });
    }

    // -------------------------------------------------
    // VALIDATE MEDICINE IDs
    // -------------------------------------------------

    const invoiceItems = [];

    for (const item of items) {
      if (!item.medicine) {
        return res.status(400).json({
          success: false,
          message: 'Medicine ID is required for every item',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(item.medicine)) {
        return res.status(400).json({
          success: false,
          message: `Invalid medicine ID: ${item.medicine}`,
        });
      }

      const medicine = await Medicine.findById(item.medicine);

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found: ${item.medicine}`,
        });
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${medicine.name}`,
        });
      }

      const price = Number(
        item.price !== undefined
          ? item.price
          : medicine.sellingPrice || 0
      );

      if (Number.isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${medicine.name}`,
        });
      }

      const itemSubtotal = roundMoney(
        Number(
          item.subtotal !== undefined
            ? item.subtotal
            : quantity * price
        )
      );

      const itemTaxAmount = roundMoney(
        Number(item.taxAmount || 0)
      );

      const itemTotal = roundMoney(
        Number(
          item.total !== undefined
            ? item.total
            : itemSubtotal + itemTaxAmount
        )
      );

      invoiceItems.push({
        medicine: medicine._id,
        medicineName:
          item.medicineName || medicine.name,
        batchNumber:
          item.batchNumber ||
          medicine.batchNumber ||
          '',
        quantity,
        price,
        discount: Number(item.discount || 0),
        taxRate: Number(item.taxRate || 0),
        subtotal: itemSubtotal,
        taxAmount: itemTaxAmount,
        total: itemTotal,
      });
    }

    // -------------------------------------------------
    // GENERATE INVOICE NUMBER
    // -------------------------------------------------

    const invoiceNumber =
      await generateInvoiceNumber();

    // -------------------------------------------------
    // CREATE DIGITAL INVOICE ONLY
    // -------------------------------------------------

    const invoice = await Invoice.create({
      invoiceNumber,

      customer: {
        name:
          customer.name?.trim() ||
          'Walk-in Customer',

        phone:
          customer.phone?.trim() ||
          '',

        email:
          customer.email?.trim() ||
          '',

        address:
          customer.address?.trim() ||
          '',
      },

      items: invoiceItems,

      subtotal: roundMoney(subtotal),

      discount: roundMoney(discount),

      taxAmount: roundMoney(taxAmount),

      grandTotal: roundMoney(grandTotal),

      paymentMethod,

      paymentStatus,

      notes:
        notes?.trim() ||
        'Generated from pharmacy billing',

      createdBy: req.user?._id || null,
    });

    // -------------------------------------------------
    // IMPORTANT:
    // DO NOT UPDATE STOCK HERE
    // DO NOT CREATE SALE HERE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        'Digital invoice created successfully',

      invoice,
    });

  } catch (error) {
    console.error(
      'Create invoice from sale error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to create digital invoice',

      error:
        error?.message ||
        'Unknown error',
    });
  }
});


// =====================================================
// GET ALL INVOICES
// GET /api/invoices
//
// ADMIN + PHARMACIST ONLY
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const invoices =
        await Invoice.find()

          .sort({
            createdAt: -1,
          })

          .populate(
            'createdBy',
            'name email'
          );


      return res.json({

        success: true,

        count:
          invoices.length,

        invoices,

      });

    } catch (error) {

      console.error(
        'Get invoices error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to fetch invoices',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET SINGLE INVOICE
// GET /api/invoices/:id
//
// ADMIN + PHARMACIST ONLY
// =====================================================

router.get(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        id
      } = req.params;


      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid invoice ID',

        });

      }


      const invoice =
        await Invoice.findById(
          id
        )

          .populate(
            'createdBy',
            'name email'
          );


      if (!invoice) {

        return res.status(404).json({

          success: false,

          message:
            'Invoice not found',

        });

      }


      return res.json({

        success: true,

        invoice,

      });

    } catch (error) {

      console.error(
        'Get invoice error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to fetch invoice',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET INVOICE BY INVOICE NUMBER
// GET /api/invoices/number/:invoiceNumber
//
// ADMIN + PHARMACIST ONLY
// =====================================================

router.get(
  '/number/:invoiceNumber',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const invoice =
        await Invoice.findOne({

          invoiceNumber:
            req.params.invoiceNumber,

        })

          .populate(
            'createdBy',
            'name email'
          );


      if (!invoice) {

        return res.status(404).json({

          success: false,

          message:
            'Invoice not found',

        });

      }


      return res.json({

        success: true,

        invoice,

      });

    } catch (error) {

      console.error(
        'Invoice number search error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to find invoice',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// SEARCH INVOICES
// GET /api/invoices/search/:query
//
// ADMIN + PHARMACIST ONLY
// =====================================================

router.get(
  '/search/:query',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const query =
        req.params.query.trim();


      if (!query) {

        return res.json({

          success: true,

          invoices: [],

        });

      }


      const invoices =
        await Invoice.find({

          $or: [

            {

              invoiceNumber: {

                $regex:
                  query,

                $options:
                  'i',

              },

            },

            {

              'customer.name': {

                $regex:
                  query,

                $options:
                  'i',

              },

            },

            {

              'customer.phone': {

                $regex:
                  query,

                $options:
                  'i',

              },

            },

          ],

        })

          .sort({
            createdAt: -1,
          })

          .limit(50);


      return res.json({

        success: true,

        count:
          invoices.length,

        invoices,

      });

    } catch (error) {

      console.error(
        'Search invoices error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to search invoices',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// INVOICE SUMMARY
// GET /api/invoices/stats/summary
//
// ADMIN + PHARMACIST ONLY
// =====================================================

router.get(
  '/stats/summary',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const invoices =
        await Invoice.find({

          paymentStatus: {

            $ne:
              'cancelled',

          },

        }).lean();


      // =================================================
      // TOTAL INVOICES
      // =================================================

      const totalInvoices =
        invoices.length;


      // =================================================
      // TOTAL REVENUE
      // =================================================

      const totalRevenue =
        roundMoney(

          invoices.reduce(

            (
              sum,
              invoice
            ) =>

              sum +
              Number(
                invoice.grandTotal ||
                0
              ),

            0

          )

        );


      // =================================================
      // TOTAL DISCOUNT
      // =================================================

      const totalDiscount =
        roundMoney(

          invoices.reduce(

            (
              sum,
              invoice
            ) =>

              sum +
              Number(
                invoice.discount ||
                0
              ),

            0

          )

        );


      // =================================================
      // TOTAL TAX
      // =================================================

      const totalTax =
        roundMoney(

          invoices.reduce(

            (
              sum,
              invoice
            ) =>

              sum +
              Number(
                invoice.taxAmount ||
                0
              ),

            0

          )

        );


      // =================================================
      // TOTAL ITEMS
      // =================================================

      const totalItems =
        invoices.reduce(

          (
            sum,
            invoice
          ) => {

            const itemQuantity =
              (
                invoice.items ||
                []
              ).reduce(

                (
                  itemSum,
                  item
                ) =>

                  itemSum +
                  Number(
                    item.quantity ||
                    0
                  ),

                0

              );


            return (
              sum +
              itemQuantity
            );

          },

          0

        );


      // =================================================
      // RESPONSE
      // =================================================

      return res.json({

        success: true,

        summary: {

          totalInvoices,

          totalRevenue,

          totalDiscount,

          totalTax,

          totalItems,

        },

      });

    } catch (error) {

      console.error(
        'Invoice summary error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to generate invoice summary',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports =
  router;