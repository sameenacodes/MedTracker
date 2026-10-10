const express = require('express');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/rolePermissions');

const router = express.Router();

const BACKUP_COLLECTIONS = [
  'medicines',
  'sales',
  'users',
  'invoices',
  'suppliers',
  'alerts',
  'removals',
  'auditlogs',
];

/* =========================================================
   GET BACKUP INFORMATION
   GET /api/backup/info
   ADMIN ONLY
========================================================= */

router.get('/info', auth, adminOnly, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection is not available');
    }

    const collections = {};
    let totalDocuments = 0;

    for (const collectionName of BACKUP_COLLECTIONS) {
      try {
        const count = await db
          .collection(collectionName)
          .countDocuments();

        collections[collectionName] = count;
        totalDocuments += count;
      } catch (error) {
        collections[collectionName] = 0;
      }
    }

    res.json({
      success: true,
      app: 'MedTracker',
      backupVersion: 1,
      totalDocuments,
      collections,
      generatedAt: new Date(),
    });

  } catch (error) {

    console.error(
      'Backup info error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Failed to get backup information',
      error: error.message,
    });
  }
});


/* =========================================================
   EXPORT BACKUP
   GET /api/backup/export
   ADMIN ONLY
========================================================= */

router.get('/export', auth, adminOnly, async (req, res) => {

  try {

    console.log('================================');
    console.log('📦 BACKUP EXPORT STARTED');
    console.log(
      '👤 User ID:',
      req.user?.id
    );
    console.log(
      '👤 User Role:',
      req.user?.role
    );
    console.log('================================');


    const db = mongoose.connection.db;

    if (!db) {
      throw new Error(
        'Database connection is not available'
      );
    }


    const backup = {

      app: 'MedTracker',

      backupVersion: 1,

      createdAt: new Date(),

      collections: {},

    };


    /* -----------------------------------------------------
       EXPORT ALL COLLECTIONS
    ----------------------------------------------------- */

    for (
      const collectionName
      of BACKUP_COLLECTIONS
    ) {

      const documents =
        await db
          .collection(collectionName)
          .find({})
          .toArray();


      backup.collections[
        collectionName
      ] = documents;


      console.log(
        `✅ ${collectionName}: ${documents.length} documents`
      );

    }


    /* -----------------------------------------------------
       CONVERT BACKUP TO JSON

       IMPORTANT:
       Use EJSON directly from bson.

       DO NOT USE:
       mongoose.mongo.EJSON.stringify()

       because in your current setup
       mongoose.mongo.EJSON is undefined.
    ----------------------------------------------------- */

    const jsonBackup =
      EJSON.stringify(
        backup,
        null,
        2
      );


    /* -----------------------------------------------------
       FILE NAME
    ----------------------------------------------------- */

    const fileName =
      `medtracker-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.json`;


    /* -----------------------------------------------------
       RESPONSE HEADERS
    ----------------------------------------------------- */

    res.setHeader(
      'Content-Type',
      'application/json; charset=utf-8'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );


    console.log(
      '✅ Backup JSON generated successfully'
    );

    console.log(
      '📄 Backup size:',
      Buffer.byteLength(
        jsonBackup,
        'utf8'
      ),
      'bytes'
    );

    console.log('================================');


    return res
      .status(200)
      .send(jsonBackup);


  } catch (error) {

    console.error(
      '================================'
    );

    console.error(
      '❌ Backup export error:',
      error
    );

    console.error(
      '❌ Error message:',
      error.message
    );

    console.error(
      '❌ Error stack:',
      error.stack
    );

    console.error(
      '================================'
    );


    return res.status(500).json({

      success: false,

      message:
        'Failed to create backup',

      error:
        error.message,

    });

  }

});


/* =========================================================
   RESTORE BACKUP
   POST /api/backup/restore
   ADMIN ONLY

   WARNING:
   This replaces existing data in the collections
   included in the backup.
========================================================= */

router.post(
  '/restore',
  auth,
  adminOnly,
  async (req, res) => {

    try {

      const backup =
        req.body;


      /* -----------------------------------------------------
         CHECK BACKUP DATA
      ----------------------------------------------------- */

      if (!backup) {

        return res.status(400).json({

          success: false,

          message:
            'Backup data is required',

        });

      }


      /* -----------------------------------------------------
         VALIDATE APPLICATION
      ----------------------------------------------------- */

      if (
        backup.app !==
        'MedTracker'
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid MedTracker backup file',

        });

      }


      /* -----------------------------------------------------
         VALIDATE VERSION
      ----------------------------------------------------- */

      if (
        backup.backupVersion !== 1
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Unsupported backup version',

        });

      }


      /* -----------------------------------------------------
         VALIDATE COLLECTIONS
      ----------------------------------------------------- */

      if (
        !backup.collections ||
        typeof backup.collections !==
        'object'
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid backup collections',

        });

      }


      const db =
        mongoose.connection.db;


      if (!db) {

        throw new Error(
          'Database connection is not available'
        );

      }


      const restored = {};


      /* -----------------------------------------------------
         RESTORE EACH COLLECTION
      ----------------------------------------------------- */

      for (
        const collectionName
        of BACKUP_COLLECTIONS
      ) {

        /* Skip collections that are not
           present in backup */

        if (
          !Object.prototype.hasOwnProperty.call(
            backup.collections,
            collectionName
          )
        ) {

          continue;

        }


        const documents =
          backup.collections[
            collectionName
          ];


        /* -------------------------------------------------
           VALIDATE ARRAY
        ------------------------------------------------- */

        if (
          !Array.isArray(
            documents
          )
        ) {

          return res.status(400).json({

            success: false,

            message:
              `Invalid data for collection: ${collectionName}`,

          });

        }


        const collection =
          db.collection(
            collectionName
          );


        /* -------------------------------------------------
           DELETE CURRENT DATA
        ------------------------------------------------- */

        await collection.deleteMany({});


        /* -------------------------------------------------
           INSERT BACKUP DATA
        ------------------------------------------------- */

        if (
          documents.length > 0
        ) {

          /*
            Convert JSON/BSON values back
            into MongoDB-compatible values.

            Example:

            {
              "$oid": "..."
            }

            becomes ObjectId.
          */

          const parsedDocuments =
            EJSON.parse(
              JSON.stringify(
                documents
              )
            );


          await collection.insertMany(
            parsedDocuments
          );

        }


        restored[
          collectionName
        ] =
          documents.length;

      }


      /* -----------------------------------------------------
         SUCCESS
      ----------------------------------------------------- */

      res.json({

        success: true,

        message:
          'Backup restored successfully',

        restored,

        restoredAt:
          new Date(),

        restoredBy:
          req.user?.id || null,

      });


    } catch (error) {

      console.error(
        'Backup restore error:',
        error
      );


      res.status(500).json({

        success: false,

        message:
          'Failed to restore backup',

        error:
          error.message,

      });

    }

  }
);


module.exports = router;