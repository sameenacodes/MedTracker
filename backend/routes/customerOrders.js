const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const CustomerOrder = require('../models/CustomerOrder');
const OrderItem = require('../models/OrderItem');
const Pharmacy = require('../models/Pharmacy');
const PharmacyInventory = require('../models/PharmacyInventory');
const Prescription = require('../models/Prescription');

const auth = require('../middleware/auth');
const { pharmacyStaff } = require('../middleware/rolePermissions');

// =====================================================
// CREATE CUSTOMER ORDER
// POST /api/customer-orders
// =====================================================

router.post('/', auth, async (req, res) => {
  try {
    const customerId = req.user.id;

    const {
      pharmacyId,
      items,
      deliveryAddress,
      paymentMethod = 'COD',
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

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Order must contain at least one item',
      });
    }

    if (!deliveryAddress?.address) {
      return res.status(400).json({
        message: 'Delivery address is required',
      });
    }

    if (!['COD', 'ONLINE'].includes(paymentMethod)) {
      return res.status(400).json({
        message: 'Invalid payment method',
      });
    }

    // -----------------------------------------------
    // CHECK PHARMACY
    // -----------------------------------------------

    const pharmacy = await Pharmacy.findOne({
      _id: pharmacyId,
      isActive: true,
      acceptsOnlineOrders: true,
    });

    if (!pharmacy) {
      return res.status(404).json({
        message: 'Pharmacy is not available for online orders',
      });
    }

    // -----------------------------------------------
    // CHECK PRESCRIPTION
    // -----------------------------------------------

    let selectedPrescription = null;

    if (prescriptionId) {
      if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
        return res.status(400).json({
          message: 'Invalid prescription ID',
        });
      }

      selectedPrescription = await Prescription.findOne({
        _id: prescriptionId,
        customer: customerId,
        status: 'approved',
      });

      if (!selectedPrescription) {
        return res.status(400).json({
          message: 'Prescription not found or not approved',
        });
      }

      if (
        selectedPrescription.pharmacy &&
        String(selectedPrescription.pharmacy) !== String(pharmacyId)
      ) {
        return res.status(400).json({
          message: 'Selected prescription is not valid for this pharmacy',
        });
      }
    }

    // -----------------------------------------------
    // GENERATE ORDER NUMBER
    // -----------------------------------------------

    const orderNumber =
      `MED-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // -----------------------------------------------
    // CHECK ITEMS
    // -----------------------------------------------

    const orderItems = [];

    let subtotal = 0;

    for (const item of items) {
      if (!item.inventoryId) {
        return res.status(400).json({
          message: 'inventoryId is required for every item',
        });
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: 'Invalid quantity',
        });
      }

      const inventory =
        await PharmacyInventory
          .findOne({
            _id: item.inventoryId,
            pharmacy: pharmacyId,
            availableForOnlineOrder: true,
            status: 'active',
          })
          .populate('medicine');

      if (!inventory) {
        return res.status(404).json({
          message: 'Medicine is not available',
        });
      }

      // ---------------------------------------------
      // PRESCRIPTION CHECK
      // ---------------------------------------------

      if (inventory.requiresPrescription && !selectedPrescription) {
        return res.status(400).json({
          message:
            `${inventory.medicine.name} requires an approved prescription`,
        });
      }

      // ---------------------------------------------
      // STOCK CHECK
      // ---------------------------------------------

      if (inventory.onlineQuantity < quantity) {
        return res.status(400).json({
          message:
            `${inventory.medicine.name} has only ${inventory.onlineQuantity} available`,
        });
      }

      // ---------------------------------------------
      // MAX ORDER QUANTITY
      // ---------------------------------------------

      if (quantity > inventory.maxOrderQuantity) {
        return res.status(400).json({
          message:
            `Maximum ${inventory.maxOrderQuantity} units allowed for ${inventory.medicine.name}`,
        });
      }

      const unitPrice = Number(inventory.sellingPrice);

      const totalPrice = unitPrice * quantity;

      subtotal += totalPrice;

      orderItems.push({
        inventory,
        medicine: inventory.medicine,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    // -----------------------------------------------
    // DELIVERY FEE
    // -----------------------------------------------

    let deliveryFee = 0;

    if (pharmacy.deliveryAvailable) {
      deliveryFee = subtotal >= 500 ? 0 : 30;
    }

    const totalAmount = subtotal + deliveryFee;

    // -----------------------------------------------
    // CREATE ORDER
    // -----------------------------------------------

    const order = await CustomerOrder.create({
      customer: customerId,
      pharmacy: pharmacyId,

      prescription:
        selectedPrescription
          ? selectedPrescription._id
          : null,

      orderNumber,

      subtotal,
      deliveryFee,
      totalAmount,

      deliveryAddress,

      paymentMethod,

      paymentStatus:
        paymentMethod === 'COD'
          ? 'pending'
          : 'pending',

      orderStatus: 'placed',
    });

    // -----------------------------------------------
    // CREATE ORDER ITEMS
    // -----------------------------------------------

    const createdItems = [];

    for (const item of orderItems) {
      const orderItem =
        await OrderItem.create({
          order: order._id,

          pharmacy: pharmacyId,

          medicine: item.medicine._id,

          medicineName:
            item.medicine.name,

          brand:
            item.medicine.brand || '',

          quantity:
            item.quantity,

          unitPrice:
            item.unitPrice,

          totalPrice:
            item.totalPrice,
        });

      createdItems.push(orderItem._id);

      // ---------------------------------------------
      // REDUCE ONLINE STOCK
      // ---------------------------------------------

      item.inventory.onlineQuantity -=
        item.quantity;

      if (item.inventory.onlineQuantity <= 0) {
        item.inventory.onlineQuantity = 0;

        item.inventory.status =
          'out_of_stock';
      }

      await item.inventory.save();
    }

    // -----------------------------------------------
    // SAVE ITEM IDS TO ORDER
    // -----------------------------------------------

    order.items = createdItems;

    await order.save();

    // Link prescription to this order
    if (selectedPrescription) {
      selectedPrescription.order = order._id;
      await selectedPrescription.save();
    }

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    const populatedOrder =
      await CustomerOrder
        .findById(order._id)
        .populate(
          'pharmacy',
          'name phone address city'
        )
        .populate('prescription')
        .populate('items');

    res.status(201).json({
      message: 'Order placed successfully',
      order: populatedOrder,
    });

  } catch (error) {
    console.error(
      'Create customer order error:',
      error
    );

    res.status(500).json({
      message: 'Failed to place order',
      error: error.message,
    });
  }
});

// =====================================================
// GET MY ORDERS
// GET /api/customer-orders/my
// =====================================================

router.get('/my', auth, async (req, res) => {
  try {
    const orders =
      await CustomerOrder
        .find({
          customer: req.user.id,
        })
        .populate(
          'pharmacy',
          'name phone address city'
        )
        .populate('prescription')
        .populate('items')
        .sort({
          createdAt: -1,
        });

    res.json({
      count: orders.length,
      orders,
    });

  } catch (error) {
    console.error(
      'Get customer orders error:',
      error
    );

    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
});

// =====================================================
// GET SINGLE CUSTOMER ORDER
// GET /api/customer-orders/:id
// =====================================================

router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid order ID',
      });
    }

    const order =
      await CustomerOrder
        .findOne({
          _id: req.params.id,
          customer: req.user.id,
        })
        .populate(
          'pharmacy',
          'name phone address city district'
        )
        .populate('prescription')
        .populate('items');

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    res.json({
      order,
    });

  } catch (error) {
    console.error(
      'Get order error:',
      error
    );

    res.status(500).json({
      message: 'Failed to fetch order',
      error: error.message,
    });
  }
});

// =====================================================
// GET PHARMACY ORDERS
// GET /api/customer-orders/pharmacy/:pharmacyId
// =====================================================

router.get(
  '/pharmacy/:pharmacyId',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const pharmacy =
        await Pharmacy.findOne({
          _id: req.params.pharmacyId,
          owner: req.user.id,
        });

      if (!pharmacy) {
        return res.status(403).json({
          message:
            'You do not have access to this pharmacy',
        });
      }

      const orders =
        await CustomerOrder
          .find({
            pharmacy: req.params.pharmacyId,
          })
          .populate(
            'customer',
            'name email'
          )
          .populate('prescription')
          .populate('items')
          .sort({
            createdAt: -1,
          });

      res.json({
        count: orders.length,
        orders,
      });

    } catch (error) {
      console.error(
        'Get pharmacy orders error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch pharmacy orders',
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE ORDER STATUS
// PUT /api/customer-orders/:id/status
// =====================================================

router.put(
  '/:id/status',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const {
        status,
        cancellationReason,
      } = req.body;

      const allowedStatuses = [
        'accepted',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'rejected',
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Invalid order status',
        });
      }

      const order =
        await CustomerOrder.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          message: 'Order not found',
        });
      }

      // ---------------------------------------------
      // CHECK PHARMACY ACCESS
      // ---------------------------------------------

      const pharmacy =
        await Pharmacy.findOne({
          _id: order.pharmacy,
          owner: req.user.id,
        });

      if (!pharmacy) {
        return res.status(403).json({
          message:
            'You do not have access to this order',
        });
      }

      // ---------------------------------------------
      // PREVENT INVALID STATUS CHANGES
      // ---------------------------------------------

      const transitions = {
        placed: [
          'accepted',
          'rejected',
        ],

        accepted: [
          'preparing',
        ],

        preparing: [
          'ready_for_pickup',
        ],

        ready_for_pickup: [
          'out_for_delivery',
        ],

        out_for_delivery: [
          'delivered',
        ],
      };

      const currentStatus =
        order.orderStatus;

      if (
        !transitions[currentStatus] ||
        !transitions[currentStatus].includes(status)
      ) {
        return res.status(400).json({
          message:
            `Cannot change order from ${currentStatus} to ${status}`,
        });
      }

      order.orderStatus = status;

      if (status === 'rejected') {
        order.cancellationReason =
          cancellationReason ||
          'Order rejected by pharmacy';
      }

      if (status === 'delivered') {
        order.deliveredAt = new Date();
      }

      await order.save();

      res.json({
        message:
          `Order status updated to ${status}`,
        order,
      });

    } catch (error) {
      console.error(
        'Update order status error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to update order status',
        error: error.message,
      });
    }
  }
);

// =====================================================
// CUSTOMER CANCEL ORDER
// PUT /api/customer-orders/:id/cancel
// =====================================================

router.put(
  '/:id/cancel',
  auth,
  async (req, res) => {
    try {
      const order =
        await CustomerOrder.findOne({
          _id: req.params.id,
          customer: req.user.id,
        });

      if (!order) {
        return res.status(404).json({
          message: 'Order not found',
        });
      }

      // ---------------------------------------------
      // CHECK WHETHER ORDER CAN BE CANCELLED
      // ---------------------------------------------

      const cancellableStatuses = [
        'placed',
        'accepted',
      ];

      if (
        !cancellableStatuses.includes(
          order.orderStatus
        )
      ) {
        return res.status(400).json({
          message:
            'This order can no longer be cancelled',
        });
      }

      // ---------------------------------------------
      // RESTORE ONLINE STOCK
      // ---------------------------------------------

      const orderItems =
        await OrderItem.find({
          order: order._id,
        });

      for (const item of orderItems) {
        const inventory =
          await PharmacyInventory.findOne({
            pharmacy: order.pharmacy,
            medicine: item.medicine,
          });

        if (inventory) {
          inventory.onlineQuantity =
            Number(inventory.onlineQuantity || 0) +
            Number(item.quantity || 0);

          if (
            inventory.status === 'out_of_stock' &&
            inventory.onlineQuantity > 0
          ) {
            inventory.status = 'active';
          }

          await inventory.save();
        }
      }

      // ---------------------------------------------
      // UPDATE ORDER STATUS
      // ---------------------------------------------

      order.orderStatus = 'cancelled';

      order.cancellationReason =
        req.body.reason ||
        'Cancelled by customer';

      await order.save();

      // ---------------------------------------------
      // RESPONSE
      // ---------------------------------------------

      res.json({
        message:
          'Order cancelled successfully and stock restored',
        order,
      });

    } catch (error) {
      console.error(
        'Cancel order error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to cancel order',
        error:
          error.message,
      });
    }
  }
);

module.exports = router;