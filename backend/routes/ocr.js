const express = require('express');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');

const router = express.Router();

// Store uploaded image in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// POST /api/ocr/medicine
router.post(
  '/medicine',
  auth,
  pharmacyStaff,
  upload.single('image'),
  async (req, res) => {
  let worker = null;

  try {
    // Check image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded',
      });
    }

    console.log('================================');
    console.log('🧠 MEDICINE OCR STARTED');
    console.log('Image:', req.file.originalname);
    console.log('Size:', req.file.size, 'bytes');
    console.log('Type:', req.file.mimetype);
    console.log('================================');

    // Create OCR worker
    worker = await createWorker('eng', 1, {
      logger: (message) => {
        if (message.status) {
          console.log(
            `OCR: ${message.status} ${
              message.progress
                ? Math.round(message.progress * 100) + '%'
                : ''
            }`
          );
        }
      },
    });

    // Recognize text from uploaded image buffer
    const result = await worker.recognize(req.file.buffer);

    const text = result?.data?.text || '';

    console.log('================================');
    console.log('📝 OCR TEXT');
    console.log(text);
    console.log('================================');

    // Clean up worker
    await worker.terminate();
    worker = null;

    if (!text.trim()) {
      return res.json({
        success: false,
        message: 'No text found in image',
        rawText: '',
      });
    }

    return res.json({
      success: true,
      message: 'Medicine text extracted successfully',
      rawText: text,
    });

  } catch (error) {
    console.log('================================');
    console.log('❌ OCR ERROR');
    console.log(error);
    console.log('Message:', error?.message);
    console.log('================================');

    // Make sure worker is terminated if an error occurs
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.log(
          'Worker termination error:',
          terminateError?.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: 'OCR processing failed',
      error: error?.message || 'Unknown OCR error',
    });
  }
});

module.exports = router;