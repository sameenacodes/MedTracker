const express = require('express');

// =====================================================
// SUPPLIER MODEL
// Supports:
// module.exports = Supplier
// module.exports = { Supplier }
// module.exports.default = Supplier
// =====================================================

const SupplierModule = require('../models/Supplier');

const Supplier =
  SupplierModule &&
  typeof SupplierModule.find === 'function'
    ? SupplierModule
    : SupplierModule?.Supplier ||
      SupplierModule?.default;

const auth = require('../middleware/auth');

const router = express.Router();

// =====================================================
// MODEL CHECK
// =====================================================

if (!Supplier) {
  console.error(
    '❌ Supplier model could not be loaded.'
  );
}

if (
  Supplier &&
  typeof Supplier.find !== 'function'
) {
  console.error(
    '❌ Supplier is not a valid Mongoose model.'
  );
}

// =====================================================
// GET ALL SUPPLIERS
// GET /api/suppliers
// =====================================================

router.get('/', auth, async (req, res) => {
  try {
    if (!Supplier) {
      return res.status(500).json({
        message: 'Supplier model not loaded',
      });
    }

    const suppliers =
      await Supplier.find()
        .sort({ createdAt: -1 });

    console.log(
      `✅ Suppliers fetched: ${suppliers.length}`
    );

    res.json(suppliers);

  } catch (err) {
    console.error(
      '❌ Get suppliers error:',
      err
    );

    res.status(500).json({
      message: 'Failed to fetch suppliers',
      error: err.message,
    });
  }
});

// =====================================================
// GET SINGLE SUPPLIER
// GET /api/suppliers/:id
// =====================================================

router.get('/:id', auth, async (req, res) => {
  try {
    const supplier =
      await Supplier.findById(
        req.params.id
      );

    if (!supplier) {
      return res.status(404).json({
        message: 'Supplier not found',
      });
    }

    res.json(supplier);

  } catch (err) {
    console.error(
      '❌ Get supplier error:',
      err
    );

    res.status(500).json({
      message: 'Failed to fetch supplier',
      error: err.message,
    });
  }
});

// =====================================================
// ADD SUPPLIER
// POST /api/suppliers
// =====================================================

router.post('/', auth, async (req, res) => {
  try {

    const {
      name,
      contact,
      email,
      address,
      status,
      medicines,
      lastOrder,
    } = req.body;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!name || !contact) {
      return res.status(400).json({
        message:
          'Supplier name and contact are required',
      });
    }

    // -------------------------------------------------
    // CHECK DUPLICATE CONTACT
    // -------------------------------------------------

    const existingSupplier =
      await Supplier.findOne({
        contact: contact.trim(),
      });

    if (existingSupplier) {
      return res.status(400).json({
        message:
          'A supplier with this contact number already exists',
      });
    }

    // -------------------------------------------------
    // CREATE SUPPLIER
    // -------------------------------------------------

    const supplier =
      new Supplier({
        name: name.trim(),

        contact: contact.trim(),

        email:
          email
            ? email.trim()
            : '',

        address:
          address
            ? address.trim()
            : '',

        status:
          status === 'inactive'
            ? 'inactive'
            : 'active',

        medicines:
          Number.isFinite(
            Number(medicines)
          )
            ? Number(medicines)
            : 0,

        lastOrder:
          lastOrder
            ? new Date(lastOrder)
            : null,
      });

    // -------------------------------------------------
    // SAVE
    // -------------------------------------------------

    await supplier.save();

    console.log(
      '✅ Supplier added:',
      supplier.name
    );

    res.status(201).json({
      message:
        'Supplier added successfully',
      supplier,
    });

  } catch (err) {
    console.error(
      '❌ Add supplier error:',
      err
    );

    res.status(500).json({
      message: 'Failed to add supplier',
      error: err.message,
    });
  }
});

// =====================================================
// UPDATE SUPPLIER
// PUT /api/suppliers/:id
// =====================================================

router.put('/:id', auth, async (req, res) => {
  try {

    const {
      name,
      contact,
      email,
      address,
      status,
      medicines,
      lastOrder,
    } = req.body;

    const supplier =
      await Supplier.findById(
        req.params.id
      );

    if (!supplier) {
      return res.status(404).json({
        message: 'Supplier not found',
      });
    }

    // -------------------------------------------------
    // UPDATE ONLY PROVIDED VALUES
    // -------------------------------------------------

    if (name !== undefined) {
      supplier.name =
        String(name).trim();
    }

    if (contact !== undefined) {
      supplier.contact =
        String(contact).trim();
    }

    if (email !== undefined) {
      supplier.email =
        String(email).trim();
    }

    if (address !== undefined) {
      supplier.address =
        String(address).trim();
    }

    if (status !== undefined) {
      supplier.status =
        status === 'inactive'
          ? 'inactive'
          : 'active';
    }

    if (medicines !== undefined) {
      supplier.medicines =
        Math.max(
          0,
          Number(medicines) || 0
        );
    }

    if (lastOrder !== undefined) {
      supplier.lastOrder =
        lastOrder
          ? new Date(lastOrder)
          : null;
    }

    await supplier.save();

    console.log(
      '✅ Supplier updated:',
      supplier.name
    );

    res.json({
      message:
        'Supplier updated successfully',
      supplier,
    });

  } catch (err) {
    console.error(
      '❌ Update supplier error:',
      err
    );

    res.status(500).json({
      message:
        'Failed to update supplier',
      error: err.message,
    });
  }
});

// =====================================================
// DELETE SUPPLIER
// DELETE /api/suppliers/:id
// =====================================================

router.delete('/:id', auth, async (req, res) => {
  try {

    const supplier =
      await Supplier.findByIdAndDelete(
        req.params.id
      );

    if (!supplier) {
      return res.status(404).json({
        message: 'Supplier not found',
      });
    }

    console.log(
      '✅ Supplier deleted:',
      supplier.name
    );

    res.json({
      message:
        'Supplier deleted successfully',
      supplier,
    });

  } catch (err) {
    console.error(
      '❌ Delete supplier error:',
      err
    );

    res.status(500).json({
      message:
        'Failed to delete supplier',
      error: err.message,
    });
  }
});

// =====================================================
// SUPPLIER STATS
// GET /api/suppliers/stats/summary
// =====================================================

router.get(
  '/stats/summary',
  auth,
  async (req, res) => {
    try {

      const total =
        await Supplier.countDocuments();

      const active =
        await Supplier.countDocuments({
          status: 'active',
        });

      const inactive =
        await Supplier.countDocuments({
          status: 'inactive',
        });

      res.json({
        total,
        active,
        inactive,
      });

    } catch (err) {
      console.error(
        '❌ Supplier stats error:',
        err
      );

      res.status(500).json({
        message:
          'Failed to fetch supplier statistics',
        error: err.message,
      });
    }
  }
);

module.exports = router;