const express = require('express');

const router = express.Router();

const Cart = require('../models/Cart');

const PharmacyInventory = require('../models/PharmacyInventory');

const auth = require('../middleware/auth');



// =====================================================
// HELPER
// Prepare cart response with prescription information
// =====================================================

const prepareCartResponse = async (cart) => {
  if (!cart) {
    return {
      items: [],
      subtotal: 0,
      pharmacy: null,
      deliveryAddress: {},
    };
  }


  await cart.populate([
    {
      path: 'pharmacy',
      select: 'name phone address city district',
    },
    {
      path: 'items.medicine',
      select: 'name brand category',
    },
    {
      path: 'items.inventory',
    },
  ]);


  const cartData = cart.toObject();


  cartData.items = (cartData.items || []).map((item) => ({
    ...item,

    // Prescription requirement from PharmacyInventory
    requiresPrescription: Boolean(
      item.inventory?.requiresPrescription
    ),
  }));


  return cartData;
};



// =====================================================
// GET MY CART
// GET /api/cart
// =====================================================

router.get('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({
      customer: req.user.id,
    });


    if (!cart) {
      return res.json({
        cart: {
          items: [],
          subtotal: 0,
          pharmacy: null,
          deliveryAddress: {},
        },
      });
    }


    const cartData = await prepareCartResponse(cart);


    res.json({
      cart: cartData,
    });


  } catch (error) {
    console.error('Get cart error:', error);


    res.status(500).json({
      message: 'Failed to fetch cart',
      error: error.message,
    });
  }
});



// =====================================================
// UPDATE DELIVERY ADDRESS
// PUT /api/cart/delivery-address
// =====================================================

router.put(
  '/delivery-address',
  auth,
  async (req, res) => {
    try {
      const cart = await Cart.findOne({
        customer: req.user.id,
      });


      if (!cart) {
        return res.status(404).json({
          message: 'Cart not found',
        });
      }


      const incomingAddress =
        req.body?.deliveryAddress || {};


      cart.deliveryAddress = {
        name: String(
          incomingAddress.name || ''
        ).trim(),

        phone: String(
          incomingAddress.phone || ''
        ).trim(),

        address: String(
          incomingAddress.address || ''
        ).trim(),

        area: String(
          incomingAddress.area || ''
        ).trim(),

        city: String(
          incomingAddress.city || ''
        ).trim(),

        district: String(
          incomingAddress.district || ''
        ).trim(),

        pincode: String(
          incomingAddress.pincode || ''
        ).trim(),
      };


      await cart.save();


      const cartData =
        await prepareCartResponse(cart);


      return res.json({
        message:
          'Delivery address saved successfully',

        cart: cartData,
      });


    } catch (error) {
      console.error(
        'Update delivery address error:',
        error
      );


      return res.status(500).json({
        message:
          'Failed to save delivery address',

        error: error.message,
      });
    }
  }
);



// =====================================================
// ADD ITEM TO CART
// POST /api/cart/items
// =====================================================

router.post('/items', auth, async (req, res) => {
  try {
    const {
      inventoryId,
      quantity = 1,
    } = req.body;


    const requestedQuantity = Number(quantity);


    if (!inventoryId) {
      return res.status(400).json({
        message: 'inventoryId is required',
      });
    }


    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return res.status(400).json({
        message:
          'Quantity must be a positive whole number',
      });
    }



    // -----------------------------------------------
    // FIND MARKETPLACE INVENTORY
    // -----------------------------------------------

    const inventory =
      await PharmacyInventory.findOne({
        _id: inventoryId,
        availableForOnlineOrder: true,
        status: 'active',
      })
        .populate('medicine')
        .populate('pharmacy');


    if (!inventory) {
      return res.status(404).json({
        message:
          'Medicine is not available for online ordering',
      });
    }



    // -----------------------------------------------
    // CHECK STOCK
    // -----------------------------------------------

    if (
      inventory.onlineQuantity <
      requestedQuantity
    ) {
      return res.status(400).json({
        message:
          `Only ${inventory.onlineQuantity} units available`,
      });
    }



    // -----------------------------------------------
    // FIND EXISTING CART
    // -----------------------------------------------

    let cart = await Cart.findOne({
      customer: req.user.id,
    });


    if (!cart) {
      cart = new Cart({
        customer: req.user.id,
        pharmacy: inventory.pharmacy._id,
        items: [],
        subtotal: 0,
      });
    }



    // -----------------------------------------------
    // ONE CART = ONE PHARMACY
    // -----------------------------------------------

    if (
      cart.pharmacy &&
      cart.pharmacy.toString() !==
        inventory.pharmacy._id.toString()
    ) {
      return res.status(400).json({
        message:
          'You can order from only one pharmacy per cart',

        pharmacyId:
          inventory.pharmacy._id,
      });
    }


    cart.pharmacy =
      inventory.pharmacy._id;



    // -----------------------------------------------
    // CHECK EXISTING ITEM
    // -----------------------------------------------

    const existingItem =
      cart.items.find(
        (item) =>
          item.inventory.toString() ===
          inventory._id.toString()
      );


    if (existingItem) {
      const newQuantity =
        existingItem.quantity +
        requestedQuantity;


      if (
        newQuantity >
        inventory.onlineQuantity
      ) {
        return res.status(400).json({
          message:
            `Only ${inventory.onlineQuantity} units available`,
        });
      }


      if (
        newQuantity >
        inventory.maxOrderQuantity
      ) {
        return res.status(400).json({
          message:
            `Maximum ${inventory.maxOrderQuantity} units allowed`,
        });
      }


      existingItem.quantity =
        newQuantity;


      existingItem.totalPrice =
        newQuantity *
        inventory.sellingPrice;


    } else {


      if (
        requestedQuantity >
        inventory.maxOrderQuantity
      ) {
        return res.status(400).json({
          message:
            `Maximum ${inventory.maxOrderQuantity} units allowed`,
        });
      }


      cart.items.push({
        inventory:
          inventory._id,

        medicine:
          inventory.medicine._id,

        medicineName:
          inventory.medicine.name,

        brand:
          inventory.medicine.brand || '',

        quantity:
          requestedQuantity,

        unitPrice:
          inventory.sellingPrice,

        totalPrice:
          inventory.sellingPrice *
          requestedQuantity,
      });
    }



    // -----------------------------------------------
    // RECALCULATE SUBTOTAL
    // -----------------------------------------------

    cart.subtotal =
      cart.items.reduce(
        (sum, item) =>
          sum + item.totalPrice,
        0
      );


    await cart.save();



    // -----------------------------------------------
    // RETURN POPULATED CART
    // -----------------------------------------------

    const cartData =
      await prepareCartResponse(cart);


    res.status(201).json({
      message: 'Item added to cart',
      cart: cartData,
    });


  } catch (error) {
    console.error(
      'Add cart item error:',
      error
    );


    res.status(500).json({
      message:
        'Failed to add item to cart',

      error:
        error.message,
    });
  }
});



// =====================================================
// UPDATE CART ITEM
// PUT /api/cart/items/:itemId
// =====================================================

router.put(
  '/items/:itemId',
  auth,
  async (req, res) => {
    try {

      const quantity =
        Number(req.body.quantity);


      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message:
            'Quantity must be a positive whole number',
        });
      }


      const cart =
        await Cart.findOne({
          customer: req.user.id,
        });


      if (!cart) {
        return res.status(404).json({
          message:
            'Cart not found',
        });
      }


      const item =
        cart.items.id(
          req.params.itemId
        );


      if (!item) {
        return res.status(404).json({
          message:
            'Cart item not found',
        });
      }


      const inventory =
        await PharmacyInventory.findById(
          item.inventory
        );


      if (!inventory) {
        return res.status(404).json({
          message:
            'Medicine inventory no longer exists',
        });
      }


      if (
        quantity >
        inventory.onlineQuantity
      ) {
        return res.status(400).json({
          message:
            `Only ${inventory.onlineQuantity} units available`,
        });
      }


      if (
        quantity >
        inventory.maxOrderQuantity
      ) {
        return res.status(400).json({
          message:
            `Maximum ${inventory.maxOrderQuantity} units allowed`,
        });
      }


      item.quantity =
        quantity;


      item.unitPrice =
        inventory.sellingPrice;


      item.totalPrice =
        quantity *
        inventory.sellingPrice;


      cart.subtotal =
        cart.items.reduce(
          (sum, item) =>
            sum + item.totalPrice,
          0
        );


      await cart.save();


      const cartData =
        await prepareCartResponse(cart);


      res.json({
        message:
          'Cart item updated',

        cart:
          cartData,
      });


    } catch (error) {
      console.error(
        'Update cart item error:',
        error
      );


      res.status(500).json({
        message:
          'Failed to update cart item',

        error:
          error.message,
      });
    }
  }
);



// =====================================================
// REMOVE CART ITEM
// DELETE /api/cart/items/:itemId
// =====================================================

router.delete(
  '/items/:itemId',
  auth,
  async (req, res) => {
    try {


      const cart =
        await Cart.findOne({
          customer: req.user.id,
        });


      if (!cart) {
        return res.status(404).json({
          message:
            'Cart not found',
        });
      }


      const item =
        cart.items.id(
          req.params.itemId
        );


      if (!item) {
        return res.status(404).json({
          message:
            'Cart item not found',
        });
      }


      item.deleteOne();


      cart.subtotal =
        cart.items.reduce(
          (sum, item) =>
            sum + item.totalPrice,
          0
        );


      await cart.save();


      const cartData =
        await prepareCartResponse(cart);


      res.json({
        message:
          'Item removed from cart',

        cart:
          cartData,
      });


    } catch (error) {
      console.error(
        'Remove cart item error:',
        error
      );


      res.status(500).json({
        message:
          'Failed to remove item from cart',

        error:
          error.message,
      });
    }
  }
);



// =====================================================
// CLEAR CART
// DELETE /api/cart
// =====================================================

router.delete(
  '/',
  auth,
  async (req, res) => {
    try {


      await Cart.findOneAndDelete({
        customer: req.user.id,
      });


      res.json({
        message:
          'Cart cleared successfully',
      });


    } catch (error) {
      console.error(
        'Clear cart error:',
        error
      );


      res.status(500).json({
        message:
          'Failed to clear cart',

        error:
          error.message,
      });
    }
  }
);



module.exports = router;