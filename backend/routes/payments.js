const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const auth = require('../middleware/auth');

const Pharmacy = require('../models/Pharmacy');
const PharmacyInventory = require('../models/PharmacyInventory');
const PaymentSession = require('../models/PaymentSession');
const Prescription = require('../models/Prescription');

const CustomerOrder = require('../models/CustomerOrder');
const OrderItem = require('../models/OrderItem');

// =====================================================
// PAYMENT MODE
// =====================================================

const PAYMENT_MODE =
  process.env.PAYMENT_MODE || 'demo';

// =====================================================
// RAZORPAY
// Only initialize when Razorpay mode is enabled
// =====================================================

let razorpay = null;

if (PAYMENT_MODE === 'razorpay') {
  const Razorpay = require('razorpay');

  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    throw new Error(
      'Razorpay mode enabled but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET is missing'
    );
  }

  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// =====================================================
// CREATE PAYMENT ORDER
// POST /api/payments/create-order
// =====================================================

router.post(
  '/create-order',
  auth,
  async (req, res) => {
    try {
      const customerId = req.user.id;

      const {
        pharmacyId,
        items,
        deliveryAddress,
        prescriptionId,
      } = req.body;

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (!pharmacyId) {
        return res.status(400).json({
          message: 'pharmacyId is required',
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message: 'At least one medicine is required',
        });
      }

      if (!deliveryAddress?.address) {
        return res.status(400).json({
          message: 'Delivery address is required',
        });
      }

      // -----------------------------------------------
      // PHARMACY
      // -----------------------------------------------

      const pharmacy = await Pharmacy.findOne({
        _id: pharmacyId,
        isActive: true,
        acceptsOnlineOrders: true,
      });

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'Pharmacy is not available for online orders',
        });
      }

      // -----------------------------------------------
      // PRESCRIPTION VALIDATION
      // -----------------------------------------------

      let selectedPrescription = null;

      if (prescriptionId) {
        selectedPrescription =
          await Prescription.findOne({
            _id: prescriptionId,
            customer: customerId,
            status: 'approved',
          });

        if (!selectedPrescription) {
          return res.status(400).json({
            message:
              'Selected prescription is not found or has not been approved',
          });
        }

        // If prescription belongs to a specific pharmacy,
        // it must match the selected pharmacy.
        if (
          selectedPrescription.pharmacy &&
          String(selectedPrescription.pharmacy) !==
            String(pharmacyId)
        ) {
          return res.status(400).json({
            message:
              'Selected prescription is not valid for this pharmacy',
          });
        }
      }

      // -----------------------------------------------
      // CALCULATE ITEMS
      // -----------------------------------------------

      const paymentItems = [];

      let subtotal = 0;

      for (const item of items) {
        if (!item.inventoryId) {
          return res.status(400).json({
            message: 'inventoryId is required',
          });
        }

        const quantity = Number(item.quantity);

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          return res.status(400).json({
            message: 'Invalid medicine quantity',
          });
        }

        const inventory =
          await PharmacyInventory.findOne({
            _id: item.inventoryId,
            pharmacy: pharmacyId,
            availableForOnlineOrder: true,
            status: 'active',
          }).populate('medicine');

        if (!inventory) {
          return res.status(404).json({
            message: 'Medicine is not available',
          });
        }

        // ---------------------------------------------
        // PRESCRIPTION REQUIRED CHECK
        // ---------------------------------------------

        if (
          inventory.requiresPrescription &&
          !selectedPrescription
        ) {
          return res.status(400).json({
            message:
              `${inventory.medicine.name} requires an approved prescription`,
          });
        }

        // ---------------------------------------------
        // STOCK CHECK
        // ---------------------------------------------

        if (
          Number(inventory.onlineQuantity) <
          quantity
        ) {
          return res.status(400).json({
            message:
              `${inventory.medicine.name} has only ${inventory.onlineQuantity} available`,
          });
        }

        // ---------------------------------------------
        // MAX ORDER QUANTITY
        // ---------------------------------------------

        if (
          quantity >
          Number(inventory.maxOrderQuantity)
        ) {
          return res.status(400).json({
            message:
              `Maximum ${inventory.maxOrderQuantity} units allowed for ${inventory.medicine.name}`,
          });
        }

        const unitPrice =
          Number(inventory.sellingPrice);

        subtotal += unitPrice * quantity;

        paymentItems.push({
          inventoryId: inventory._id,
          quantity,
        });
      }

      // -----------------------------------------------
      // DELIVERY FEE
      // -----------------------------------------------

      let deliveryFee = 0;

      if (pharmacy.deliveryAvailable) {
        deliveryFee =
          subtotal >= 500
            ? 0
            : 30;
      }

      const totalAmount =
        subtotal + deliveryFee;

      // =================================================
      // DEMO PAYMENT MODE
      // =================================================

      if (PAYMENT_MODE === 'demo') {
        const demoOrderId =
          `demo_order_${Date.now()}_${Math.floor(
            1000 + Math.random() * 9000
          )}`;

        const paymentSession =
          await PaymentSession.create({
            customer: customerId,

            pharmacy: pharmacyId,

            prescription:
              selectedPrescription?._id || null,

            items: paymentItems,

            deliveryAddress,

            subtotal,

            deliveryFee,

            totalAmount,

            razorpayOrderId: demoOrderId,

            status: 'pending',
          });

        return res.status(201).json({
          message:
            'Demo payment order created',

          paymentMode: 'demo',

          paymentSessionId:
            paymentSession._id,

          razorpayOrderId:
            demoOrderId,

          amount: Math.round(
            totalAmount * 100
          ),

          currency: 'INR',

          key: 'demo_key',

          totalAmount,
        });
      }

      // =================================================
      // REAL RAZORPAY MODE
      // =================================================

      const amountInPaise =
        Math.round(totalAmount * 100);

      const receipt =
        `MEDPAY-${Date.now()}`;

      const razorpayOrder =
        await razorpay.orders.create({
          amount: amountInPaise,

          currency: 'INR',

          receipt,

          notes: {
            customerId:
              String(customerId),

            pharmacyId:
              String(pharmacyId),
          },
        });

      const paymentSession =
        await PaymentSession.create({
          customer: customerId,

          pharmacy: pharmacyId,

          prescription:
            selectedPrescription?._id || null,

          items: paymentItems,

          deliveryAddress,

          subtotal,

          deliveryFee,

          totalAmount,

          razorpayOrderId:
            razorpayOrder.id,

          status: 'pending',
        });

      return res.status(201).json({
        message:
          'Razorpay payment order created',

        paymentMode: 'razorpay',

        paymentSessionId:
          paymentSession._id,

        razorpayOrderId:
          razorpayOrder.id,

        amount: amountInPaise,

        currency: 'INR',

        key:
          process.env.RAZORPAY_KEY_ID,

        totalAmount,
      });

    } catch (error) {
      console.error(
        'Create payment order error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to create payment order',

        error: error.message,
      });
    }
  }
);

// =====================================================
// DEMO PAYMENT
// POST /api/payments/demo-pay
// =====================================================

router.post(
  '/demo-pay',
  auth,
  async (req, res) => {
    try {
      const customerId = req.user.id;

      const {
        paymentSessionId,
        result = 'success',
      } = req.body;

      if (!paymentSessionId) {
        return res.status(400).json({
          message:
            'paymentSessionId is required',
        });
      }

      const session =
        await PaymentSession.findOne({
          _id: paymentSessionId,
          customer: customerId,
        });

      if (!session) {
        return res.status(404).json({
          message:
            'Payment session not found',
        });
      }

      // -----------------------------------------------
      // DEMO FAILURE
      // -----------------------------------------------

      if (result === 'failed') {
        session.status = 'failed';

        await session.save();

        return res.status(400).json({
          message:
            'Demo payment failed',

          paymentStatus: 'failed',
        });
      }

      // -----------------------------------------------
      // ALREADY PAID
      // -----------------------------------------------

      if (
        session.status === 'paid' &&
        session.customerOrder
      ) {
        const existingOrder =
          await CustomerOrder.findById(
            session.customerOrder
          );

        return res.json({
          message:
            'Payment already completed',

          order: existingOrder,

          paymentStatus: 'paid',
        });
      }

      // -----------------------------------------------
      // CHECK STOCK AGAIN
      // -----------------------------------------------

      const orderItems = [];

      let stockError = null;

      for (const item of session.items) {
        const inventory =
          await PharmacyInventory.findOne({
            _id: item.inventoryId,

            pharmacy:
              session.pharmacy,

            availableForOnlineOrder: true,

            status: 'active',
          }).populate('medicine');

        if (!inventory) {
          stockError =
            'One or more medicines are no longer available';

          break;
        }

        if (
          Number(
            inventory.onlineQuantity
          ) <
          Number(item.quantity)
        ) {
          stockError =
            `${inventory.medicine.name} is no longer available in the requested quantity`;

          break;
        }

        orderItems.push({
          inventory,

          quantity:
            Number(item.quantity),
        });
      }

      if (stockError) {
        return res.status(409).json({
          message: stockError,

          paymentCaptured: false,
        });
      }

      // -----------------------------------------------
      // CREATE CUSTOMER ORDER
      // -----------------------------------------------

      const orderNumber =
        `MED-${Date.now()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

      const order =
        await CustomerOrder.create({
          customer: customerId,

          pharmacy:
            session.pharmacy,

          prescription:
            session.prescription || null,

          orderNumber,

          subtotal:
            session.subtotal,

          deliveryFee:
            session.deliveryFee,

          totalAmount:
            session.totalAmount,

          deliveryAddress:
            session.deliveryAddress,

          paymentMethod: 'ONLINE',

          paymentStatus: 'paid',

          orderStatus: 'placed',
        });

      const createdItemIds = [];

      // -----------------------------------------------
      // CREATE ORDER ITEMS + REDUCE STOCK
      // -----------------------------------------------

      for (const item of orderItems) {
        const medicine =
          item.inventory.medicine;

        const totalPrice =
          Number(
            item.inventory.sellingPrice
          ) * item.quantity;

        const orderItem =
          await OrderItem.create({
            order: order._id,

            pharmacy:
              session.pharmacy,

            medicine:
              medicine._id,

            medicineName:
              medicine.name,

            brand:
              medicine.brand || '',

            quantity:
              item.quantity,

            unitPrice:
              Number(
                item.inventory.sellingPrice
              ),

            totalPrice,
          });

        createdItemIds.push(
          orderItem._id
        );

        item.inventory.onlineQuantity -=
          item.quantity;

        if (
          item.inventory.onlineQuantity <= 0
        ) {
          item.inventory.onlineQuantity = 0;

          item.inventory.status =
            'out_of_stock';
        }

        await item.inventory.save();
      }

      order.items =
        createdItemIds;

      await order.save();

      // -----------------------------------------------
      // UPDATE PAYMENT SESSION
      // -----------------------------------------------

      session.status = 'paid';

      session.razorpayPaymentId =
        `demo_payment_${Date.now()}`;

      session.customerOrder =
        order._id;

      await session.save();

      const populatedOrder =
        await CustomerOrder.findById(
          order._id
        )
          .populate(
            'pharmacy',
            'name phone address city district'
          )
          .populate('items');

      return res.json({
        message:
          'Demo payment successful and order created',

        order: populatedOrder,

        paymentStatus: 'paid',

        paymentMode: 'demo',
      });

    } catch (error) {
      console.error(
        'Demo payment error:',
        error
      );

      return res.status(500).json({
        message:
          'Demo payment failed',

        error: error.message,
      });
    }
  }
);

// =====================================================
// REAL RAZORPAY VERIFY
// =====================================================

router.post(
  '/verify',
  auth,
  async (req, res) => {
    try {
      // -----------------------------------------------
      // DEMO MODE
      // -----------------------------------------------

      if (PAYMENT_MODE === 'demo') {
        return res.status(400).json({
          message:
            'Demo mode is active. Use /demo-pay instead.',
        });
      }

      const customerId =
        req.user.id;

      const {
        paymentSessionId,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      } = req.body;

      if (
        !paymentSessionId ||
        !razorpay_payment_id ||
        !razorpay_order_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          message:
            'Payment verification data is incomplete',
        });
      }

      const session =
        await PaymentSession.findOne({
          _id: paymentSessionId,

          customer: customerId,
        });

      if (!session) {
        return res.status(404).json({
          message:
            'Payment session not found',
        });
      }

      // -----------------------------------------------
      // ALREADY PAID
      // -----------------------------------------------

      if (
        session.status === 'paid' &&
        session.customerOrder
      ) {
        const existingOrder =
          await CustomerOrder.findById(
            session.customerOrder
          );

        return res.json({
          message:
            'Payment already verified',

          order: existingOrder,
        });
      }

      // -----------------------------------------------
      // VERIFY RAZORPAY ORDER ID
      // -----------------------------------------------

      if (
        session.razorpayOrderId !==
        razorpay_order_id
      ) {
        return res.status(400).json({
          message:
            'Invalid Razorpay order ID',
        });
      }

      // -----------------------------------------------
      // VERIFY SIGNATURE
      // -----------------------------------------------

      const generatedSignature =
        crypto
          .createHmac(
            'sha256',
            process.env.RAZORPAY_KEY_SECRET
          )
          .update(
            `${session.razorpayOrderId}|${razorpay_payment_id}`
          )
          .digest('hex');

      if (
        generatedSignature !==
        razorpay_signature
      ) {
        session.status = 'failed';

        await session.save();

        return res.status(400).json({
          message:
            'Invalid payment signature',
        });
      }

      // -----------------------------------------------
      // FETCH RAZORPAY PAYMENT
      // -----------------------------------------------

      const payment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );

      if (
        payment.order_id !==
        session.razorpayOrderId
      ) {
        return res.status(400).json({
          message:
            'Payment does not belong to this order',
        });
      }

      if (
        payment.status !==
        'captured'
      ) {
        return res.status(400).json({
          message:
            `Payment is not captured. Current status: ${payment.status}`,
        });
      }

      // -----------------------------------------------
      // STOCK CHECK
      // -----------------------------------------------

      const orderItems = [];

      let stockError = null;

      for (const item of session.items) {
        const inventory =
          await PharmacyInventory.findOne({
            _id:
              item.inventoryId,

            pharmacy:
              session.pharmacy,

            availableForOnlineOrder:
              true,

            status:
              'active',
          }).populate('medicine');

        if (!inventory) {
          stockError =
            'One or more medicines are no longer available';

          break;
        }

        if (
          Number(
            inventory.onlineQuantity
          ) <
          Number(item.quantity)
        ) {
          stockError =
            `${inventory.medicine.name} is no longer available in the requested quantity`;

          break;
        }

        orderItems.push({
          inventory,

          quantity:
            Number(item.quantity),
        });
      }

      if (stockError) {
        return res.status(409).json({
          message:
            stockError,

          paymentCaptured:
            true,

          action:
            'Manual refund required',
        });
      }

      // -----------------------------------------------
      // CREATE ORDER
      // -----------------------------------------------

      const orderNumber =
        `MED-${Date.now()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

      const order =
        await CustomerOrder.create({
          customer:
            customerId,

          pharmacy:
            session.pharmacy,

          prescription:
            session.prescription || null,

          orderNumber,

          subtotal:
            session.subtotal,

          deliveryFee:
            session.deliveryFee,

          totalAmount:
            session.totalAmount,

          deliveryAddress:
            session.deliveryAddress,

          paymentMethod:
            'ONLINE',

          paymentStatus:
            'paid',

          orderStatus:
            'placed',
        });

      const createdItemIds = [];

      // -----------------------------------------------
      // CREATE ORDER ITEMS + REDUCE STOCK
      // -----------------------------------------------

      for (const item of orderItems) {
        const medicine =
          item.inventory.medicine;

        const totalPrice =
          Number(
            item.inventory.sellingPrice
          ) * item.quantity;

        const orderItem =
          await OrderItem.create({
            order:
              order._id,

            pharmacy:
              session.pharmacy,

            medicine:
              medicine._id,

            medicineName:
              medicine.name,

            brand:
              medicine.brand || '',

            quantity:
              item.quantity,

            unitPrice:
              Number(
                item.inventory.sellingPrice
              ),

            totalPrice,
          });

        createdItemIds.push(
          orderItem._id
        );

        item.inventory.onlineQuantity -=
          item.quantity;

        if (
          item.inventory.onlineQuantity <= 0
        ) {
          item.inventory.onlineQuantity =
            0;

          item.inventory.status =
            'out_of_stock';
        }

        await item.inventory.save();
      }

      order.items =
        createdItemIds;

      await order.save();

      // -----------------------------------------------
      // UPDATE PAYMENT SESSION
      // -----------------------------------------------

      session.status =
        'paid';

      session.razorpayPaymentId =
        razorpay_payment_id;

      session.customerOrder =
        order._id;

      await session.save();

      const populatedOrder =
        await CustomerOrder.findById(
          order._id
        )
          .populate(
            'pharmacy',
            'name phone address city district'
          )
          .populate('items');

      return res.json({
        message:
          'Payment verified and order created successfully',

        order:
          populatedOrder,

        paymentStatus:
          'paid',
      });

    } catch (error) {
      console.error(
        'Verify payment error:',
        error
      );

      return res.status(500).json({
        message:
          'Payment verification failed',

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// PAYMENT CONFIG
// =====================================================

router.get(
  '/config',
  auth,
  async (req, res) => {
    res.json({
      paymentMode:
        PAYMENT_MODE,

      key:
        PAYMENT_MODE === 'razorpay'
          ? process.env.RAZORPAY_KEY_ID
          : 'demo_key',

      currency:
        'INR',
    });
  }
);

module.exports = router;