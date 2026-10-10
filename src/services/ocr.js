import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { getData } from './storage';

const BACKEND_URL = 'http://192.168.89.124:5000';

// =====================================================
// PICK MEDICINE IMAGE FROM GALLERY
// =====================================================

export const pickMedicineImage = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      alert('Permission needed to access photos!');
      return null;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

    if (
      !result.canceled &&
      result.assets &&
      result.assets.length > 0
    ) {
      return result.assets[0].uri;
    }

    return null;
  } catch (err) {
    console.log('Image picker error:', err);
    return null;
  }
};

// =====================================================
// TAKE MEDICINE PHOTO
// =====================================================

export const takePhoto = async () => {
  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      alert('Camera permission needed!');
      return null;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

    if (
      !result.canceled &&
      result.assets &&
      result.assets.length > 0
    ) {
      return result.assets[0].uri;
    }

    return null;
  } catch (err) {
    console.log('Camera error:', err);
    return null;
  }
};

// =====================================================
// MAIN OCR FUNCTION
// =====================================================

export const extractMedicineDetails = async (imageUri) => {
  try {
    console.log('================================');
    console.log('🧠 STARTING BACKEND MEDICINE OCR');
    console.log('Image:', imageUri);
    console.log('================================');

    // ==========================================
    // GET LOGIN TOKEN
    // ==========================================

    const token = await getData('token');

    console.log(
      '🔐 OCR TOKEN:',
      token ? 'FOUND' : 'NOT FOUND'
    );

    if (!token) {
      throw new Error(
        'Login token not found. Please login again.'
      );
    }

    // ==========================================
    // CREATE IMAGE FILE
    // ==========================================

    const file = new File(imageUri);

    console.log(
      '📁 File exists:',
      file.exists
    );

    console.log(
      '📁 File type:',
      file.type
    );

    console.log(
      '📁 File size:',
      file.size
    );

    // ==========================================
    // CREATE FORM DATA
    // ==========================================

    const formData = new FormData();

    formData.append('image', file);

    // ==========================================
    // SEND IMAGE + JWT TOKEN TO BACKEND
    // ==========================================

    const response = await fetch(
      `${BACKEND_URL}/api/ocr/medicine`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

    console.log(
      'OCR backend status:',
      response.status
    );

    // ==========================================
    // READ BACKEND RESPONSE
    // ==========================================

    const result = await response.json();

    console.log('================================');
    console.log('📝 BACKEND OCR RESPONSE');
    console.log(result);
    console.log('================================');

    if (!response.ok) {
      throw new Error(
        result?.message ||
        'OCR request failed'
      );
    }

    const rawText =
      result?.rawText || '';

    console.log('================================');
    console.log('🔤 RAW OCR TEXT');
    console.log(rawText);
    console.log('================================');

    if (!rawText.trim()) {
      return {
        rawText: '',
        medicineName: null,
        brandName: null,
        category: null,
        batchNumber: null,
        mfgDate: null,
        expiryDate: null,
        mrp: null,
        success: false,
      };
    }

    // ==========================================
    // PARSE MEDICINE DETAILS
    // ==========================================

    const details =
      parseMedicineDetails(rawText);

    console.log('================================');
    console.log('💊 FINAL OCR DETAILS');
    console.log(details);
    console.log('================================');

    return {
      rawText,

      medicineName:
        details.medicineName,

      brandName:
        details.brandName,

      category:
        details.category,

      batchNumber:
        details.batchNumber,

      mfgDate:
        details.mfgDate,

      expiryDate:
        details.expiryDate,

      mrp:
        details.mrp,

      success:
        !!(
          details.medicineName ||
          details.brandName ||
          details.batchNumber ||
          details.mfgDate ||
          details.expiryDate
        ),
    };

  } catch (err) {

    console.log('================================');
    console.log('❌ BACKEND OCR ERROR');
    console.log(err);
    console.log(
      'Message:',
      err?.message
    );
    console.log('================================');

    return {
      rawText: '',
      medicineName: null,
      brandName: null,
      category: null,
      batchNumber: null,
      mfgDate: null,
      expiryDate: null,
      mrp: null,
      success: false,
    };
  }
};

// =====================================================
// PARSE MEDICINE DETAILS
// =====================================================

export const parseMedicineDetails = (text) => {

  if (!text) {
    return {
      medicineName: null,
      brandName: null,
      category: null,
      batchNumber: null,
      mfgDate: null,
      expiryDate: null,
      mrp: null,
    };
  }

  // ===================================================
  // CLEAN TEXT
  // ===================================================

  const cleanText = String(text)
    .replace(/\r/g, '\n')
    .replace(/[®™©]/g, '')
    .replace(/\|/g, 'I')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const upperText =
    cleanText.toUpperCase();

  const lines = cleanText
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]+/g, ' ')
        .trim()
    )
    .filter(Boolean);

  const upperLines = lines.map((line) =>
    line.toUpperCase()
  );

  const oneLineText =
    upperText
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  console.log(
    '🧹 CLEAN OCR TEXT:',
    oneLineText
  );

  // ===================================================
  // DATE HELPER
  // ===================================================

  const normalizeDate = (month, year) => {

    const monthNumber =
      parseInt(month, 10);

    const yearNumber =
      parseInt(year, 10);

    if (
      isNaN(monthNumber) ||
      isNaN(yearNumber)
    ) {
      return null;
    }

    if (
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return null;
    }

    if (
      yearNumber < 2000 ||
      yearNumber > 2100
    ) {
      return null;
    }

    return (
      `${String(monthNumber).padStart(2, '0')}/${yearNumber}`
    );
  };

  // ===================================================
  // EXPIRY DATE
  // IMPORTANT:
  // Search expiry label FIRST.
  // Never use MFG date as expiry if expiry exists.
  // ===================================================

  let expiryDate = null;

  const expiryPatterns = [

    /EXPIRY\s*DATE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /EXPIRY\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /EXP\s*DATE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /EXP\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /USE\s*BEFORE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /BEST\s*BEFORE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

  ];

  for (const pattern of expiryPatterns) {

    const match =
      oneLineText.match(pattern);

    if (match) {

      expiryDate =
        normalizeDate(
          match[1],
          match[2]
        );

      if (expiryDate) {
        break;
      }
    }
  }

  // ===================================================
  // LINE BASED EXPIRY
  // ===================================================

  if (!expiryDate) {

    for (const line of upperLines) {

      if (
        line.includes('EXPIRY') ||
        line.includes('EXP DATE') ||
        line.includes('EXP:')
      ) {

        const match =
          line.match(
            /(\d{1,2})\s*[\/\-.]\s*(20\d{2})/
          );

        if (match) {

          expiryDate =
            normalizeDate(
              match[1],
              match[2]
            );

          if (expiryDate) {
            break;
          }
        }
      }
    }
  }

  console.log(
    '📅 EXPIRY DATE:',
    expiryDate
  );

  // ===================================================
  // MFG DATE
  // ===================================================

  let mfgDate = null;

  const mfgPatterns = [

    /MFG\s*DATE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /MFG\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /MFD\s*DATE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /MFD\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /MANUFACTURED\s*DATE\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

    /MANUFACTURED\s*[:.\-]?\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})/i,

  ];

  for (const pattern of mfgPatterns) {

    const match =
      oneLineText.match(pattern);

    if (match) {

      mfgDate =
        normalizeDate(
          match[1],
          match[2]
        );

      if (mfgDate) {
        break;
      }
    }
  }

  // ===================================================
  // LINE BASED MFG
  // ===================================================

  if (!mfgDate) {

    for (const line of upperLines) {

      if (
        line.includes('MFG') ||
        line.includes('MFD') ||
        line.includes('MANUFACTURED')
      ) {

        const match =
          line.match(
            /(\d{1,2})\s*[\/\-.]\s*(20\d{2})/
          );

        if (match) {

          const candidate =
            normalizeDate(
              match[1],
              match[2]
            );

          // Don't accidentally take expiry
          if (
            candidate &&
            candidate !== expiryDate
          ) {
            mfgDate = candidate;
            break;
          }
        }
      }
    }
  }

  console.log(
    '📅 MFG DATE:',
    mfgDate
  );

  // ===================================================
  // FALLBACK DATE DETECTION
  //
  // Only use dates if labels are unavailable.
  // ===================================================

  if (!mfgDate || !expiryDate) {

    const allDates = [];

    const dateRegex =
      /\b(0?[1-9]|1[0-2])\s*[\/\-.]\s*(20\d{2})\b/g;

    let match;

    while (
      (match =
        dateRegex.exec(oneLineText)) !== null
    ) {

      const value =
        normalizeDate(
          match[1],
          match[2]
        );

      if (value) {
        allDates.push(value);
      }
    }

    console.log(
      '📅 ALL DETECTED DATES:',
      allDates
    );

    const uniqueDates =
      [...new Set(allDates)];

    if (
      !mfgDate &&
      uniqueDates.length >= 2
    ) {
      mfgDate =
        uniqueDates[0];
    }

    if (
      !expiryDate &&
      uniqueDates.length >= 2
    ) {
      expiryDate =
        uniqueDates[uniqueDates.length - 1];
    }

    if (
      !expiryDate &&
      uniqueDates.length === 1
    ) {
      expiryDate =
        uniqueDates[0];
    }
  }

  // ===================================================
  // BATCH NUMBER
  // ===================================================

  let batchNumber = null;

  // ---------------------------------------------------
  // Explicit batch patterns
  // ---------------------------------------------------

  const batchPatterns = [

    /BATCH\s*(?:NO|NUMBER)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i,

    /B\s*\.?\s*NO\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i,

    /BATCH\s*[:.\-]\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i,

    /LOT\s*(?:NO|NUMBER)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i,

    /LOT\s*[:.\-]\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i,

  ];

  for (const pattern of batchPatterns) {

    const match =
      oneLineText.match(pattern);

    if (match) {

      const candidate =
        cleanBatchCandidate(
          match[1]
        );

      if (
        isValidBatchCandidate(candidate)
      ) {

        batchNumber =
          candidate;

        break;
      }
    }
  }

  // ---------------------------------------------------
  // Line based batch
  // ---------------------------------------------------

  if (!batchNumber) {

    for (let i = 0; i < upperLines.length; i++) {

      const line =
        upperLines[i];

      if (
        line.includes('BATCH') ||
        line.includes('B NO') ||
        line.includes('B.NO') ||
        line.includes('LOT')
      ) {

        const sameLine =
          line.match(
            /(?:BATCH|B\s*\.?\s*NO|LOT)(?:\s*(?:NO|NUMBER))?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i
          );

        if (sameLine) {

          const candidate =
            cleanBatchCandidate(
              sameLine[1]
            );

          if (
            isValidBatchCandidate(candidate)
          ) {

            batchNumber =
              candidate;

            break;
          }
        }

        // Try next line
        if (
          i + 1 < upperLines.length
        ) {

          const nextLine =
            upperLines[i + 1];

          const candidate =
            cleanBatchCandidate(
              nextLine
            );

          if (
            isValidBatchCandidate(candidate)
          ) {

            batchNumber =
              candidate;

            break;
          }
        }
      }
    }
  }

  // ---------------------------------------------------
  // Generic batch-code fallback
  // ---------------------------------------------------

  if (!batchNumber) {

    const candidates =
      oneLineText.match(
        /\b[A-Z]{1,8}\d{2,12}(?:[-\/][A-Z0-9]{1,12})?\b/g
      ) || [];

    for (const value of candidates) {

      const candidate =
        cleanBatchCandidate(value);

      if (
        candidate.includes('M757') ||
        candidate === 'MG' ||
        candidate === 'ML'
      ) {
        continue;
      }

      if (
        isValidBatchCandidate(candidate)
      ) {

        batchNumber =
          candidate;

        break;
      }
    }
  }

  console.log(
    '🏷️ BATCH NUMBER:',
    batchNumber
  );

  // ===================================================
  // MEDICINE NAME
  // ===================================================

  let medicineName = null;

  // ---------------------------------------------------
  // Known medicines
  // ---------------------------------------------------

  const knownMedicinePatterns = [

    {
      pattern:
        /\bMOXIKLAV\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (match) =>
        `Moxiklav ${match[1]}`,
    },

    {
      pattern:
        /\bDOLO\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (match) =>
        `Dolo ${match[1]}`,
    },

    {
      pattern:
        /\bPARACURE\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (match) =>
        `Paracure ${match[1]}`,
    },

    {
      pattern:
        /\bCEFPODOXIME\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (match) =>
        `Cefpodoxime ${match[1]}`,
    },

    {
      pattern:
        /\bCEFOPOD\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (match) =>
        `Cefopod ${match[1]}`,
    },

    {
      pattern:
        /\bCEFIXIME\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (match) =>
        `Cefixime ${match[1]}`,
    },

    {
      pattern:
        /\bCROCIN\s*[-]?\s*(\d{2,4})?(?:\s*MG)?\b/i,
      name: (match) =>
        match[1]
          ? `Crocin ${match[1]}`
          : 'Crocin',
    },

    {
      pattern:
        /\bAZITHROMYCIN\s*[-]?\s*(\d{2,4})?(?:\s*MG)?\b/i,
      name: (match) =>
        match[1]
          ? `Azithromycin ${match[1]}`
          : 'Azithromycin',
    },

    {
      pattern:
        /\bAMOXICILLIN\s*[-]?\s*(\d{2,4})?(?:\s*MG)?\b/i,
      name: (match) =>
        match[1]
          ? `Amoxicillin ${match[1]}`
          : 'Amoxicillin',
    },

    {
      pattern:
        /\bPANTOPRAZOLE\s*[-]?\s*(\d{2,4})?(?:\s*MG)?\b/i,
      name: (match) =>
        match[1]
          ? `Pantoprazole ${match[1]}`
          : 'Pantoprazole',
    },

  ];

  for (
    const item of knownMedicinePatterns
  ) {

    const match =
      oneLineText.match(
        item.pattern
      );

    if (match) {

      medicineName =
        item.name(match);

      break;
    }
  }

  // ===================================================
  // GENERIC MEDICINE NAME
  // ===================================================

  if (!medicineName) {

    const ignoredWords = [

      'TABLET',
      'TABLETS',
      'CAPSULE',
      'CAPSULES',
      'INJECTION',
      'SYRUP',
      'SUSPENSION',
      'EACH',
      'FILM',
      'COATED',
      'UNCOATED',
      'MEDICINE',
      'PRESCRIPTION',
      'MANUFACTURED',
      'MARKETED',
      'BATCH',
      'MFG',
      'MFD',
      'EXP',
      'EXPIRY',
      'DATE',
      'MRP',
      'STORE',
      'BELOW',
      'PROTECT',
      'MOISTURE',
      'KEEP',
      'CHILDREN',
      'SCHEDULE',
      'CAUTION',
      'DOSAGE',
      'PHYSICIAN',
      'INGREDIENT',
      'INGREDIENTS',
      'POTASSIUM',
      'CLAVULANATE',
      'EQUIVALENT',
      'EXCIPIENTS',
    ];

    for (const line of lines) {

      let candidate =
        line
          .replace(/[®™©]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const upper =
        candidate.toUpperCase();

      if (
        candidate.length < 3
      ) {
        continue;
      }

      if (
        ignoredWords.some(
          (word) =>
            upper === word
        )
      ) {
        continue;
      }

      if (
        upper.includes('MANUFACTURED') ||
        upper.includes('MARKETED') ||
        upper.includes('BATCH') ||
        upper.includes('EXPIRY') ||
        upper.includes('MFG DATE') ||
        upper.includes('MFD DATE') ||
        upper.includes('MRP') ||
        upper.includes('DOSAGE') ||
        upper.includes('STORE BELOW') ||
        upper.includes('KEEP OUT')
      ) {
        continue;
      }

      // Avoid sentences
      if (
        candidate.split(' ').length > 6
      ) {
        continue;
      }

      // Remove common medicine description words
      candidate =
        candidate
          .replace(
            /\b(TABLETS?|CAPSULES?|SYRUP|INJECTION)\b/gi,
            ''
          )
          .replace(
            /\b\d+\s*MG\b/gi,
            ''
          )
          .replace(
            /\b\d+\s*ML\b/gi,
            ''
          )
          .replace(/\s+/g, ' ')
          .trim();

      if (
        candidate.length < 3
      ) {
        continue;
      }

      // Must contain letters
      if (
        !/[A-Za-z]{3,}/.test(candidate)
      ) {
        continue;
      }

      // Avoid random OCR fragments
      if (
        /^[A-Z]\s+[A-Z]$/i.test(candidate)
      ) {
        continue;
      }

      medicineName =
        candidate;

      break;
    }
  }

  console.log(
    '💊 MEDICINE NAME:',
    medicineName
  );

  // ===================================================
  // BRAND / MANUFACTURER
  // ===================================================

  let brandName = null;

  // ---------------------------------------------------
  // Explicit manufacturer patterns
  // ---------------------------------------------------

  const brandPatterns = [

    /MANUFACTURED\s+BY\s*[:.\-]?\s*([A-Z][A-Z &.]{2,80})/i,

    /MANUFACTURED\s+BY\s*[:.\-]?\s*([A-Z][A-Z &.]+?)(?:\s+UNIT|\s+PVT|\s+LTD|$)/i,

    /MARKETED\s+BY\s*[:.\-]?\s*([A-Z][A-Z &.]{2,80})/i,

    /MFG\s*BY\s*[:.\-]?\s*([A-Z][A-Z &.]{2,80})/i,

  ];

  for (const pattern of brandPatterns) {

    const match =
      oneLineText.match(pattern);

    if (match) {

      let candidate =
        match[1]
          .trim()
          .replace(/\s+/g, ' ');

      candidate =
        candidate.replace(
          /\s+(UNIT|VILLAGE|DIST|DISTRICT|REGD|REGISTERED|MRP|BATCH|MFG|EXP).*$/i,
          ''
        );

      if (
        candidate.length >= 3
      ) {

        brandName =
          toTitleCase(candidate);

        break;
      }
    }
  }

  // ===================================================
  // KNOWN BRAND / MANUFACTURER
  // ===================================================

  if (!brandName) {

    const knownBrands = [

      {
        search: 'ALKEM',
        name: 'Alkem',
      },

      {
        search: 'MICRO LABS',
        name: 'Micro Labs',
      },

      {
        search: 'SUN PHARMA',
        name: 'Sun Pharma',
      },

      {
        search: 'CIPLA',
        name: 'Cipla',
      },

      {
        search: 'DR REDDY',
        name: 'Dr Reddy',
      },

      {
        search: 'NOVACARE',
        name: 'NovaCare Laboratories',
      },

      {
        search: 'NOVA CARE',
        name: 'NovaCare Laboratories',
      },

    ];

    for (const brand of knownBrands) {

      if (
        oneLineText.includes(
          brand.search
        )
      ) {

        brandName =
          brand.name;

        break;
      }
    }
  }

  console.log(
    '🏭 BRAND:',
    brandName
  );

  // ===================================================
  // CATEGORY
  // ===================================================

  const category =
    detectCategory(
      medicineName,
      oneLineText
    );

  console.log(
    '📂 CATEGORY:',
    category
  );

  // ===================================================
  // MRP
  // ===================================================

  let mrp = null;

  const mrpPatterns = [

    /MRP\s*₹?\s*[:.\-]?\s*(\d+(?:\.\d{1,2})?)/i,

    /MRP\s*[:.\-]?\s*₹?\s*(\d+(?:\.\d{1,2})?)/i,

  ];

  for (const pattern of mrpPatterns) {

    const match =
      oneLineText.match(pattern);

    if (match) {

      mrp =
        parseFloat(match[1]);

      break;
    }
  }

  console.log(
    '💰 MRP:',
    mrp
  );

  // ===================================================
  // FINAL RESULT
  // ===================================================

  const details = {

    medicineName:
      medicineName || null,

    brandName:
      brandName || null,

    category:
      category || 'Other',

    batchNumber:
      batchNumber || null,

    mfgDate:
      mfgDate || null,

    expiryDate:
      expiryDate || null,

    mrp:
      mrp,

  };

  console.log(
    '================================'
  );

  console.log(
    '✅ FINAL PARSED DETAILS:',
    details
  );

  console.log(
    '================================'
  );

  return details;
};

// =====================================================
// CLEAN BATCH
// =====================================================

const cleanBatchCandidate = (value) => {

  if (!value) {
    return null;
  }

  return String(value)
    .replace(/[^A-Z0-9\/-]/gi, '')
    .trim()
    .toUpperCase();
};

// =====================================================
// VALID BATCH
// =====================================================

const isValidBatchCandidate = (value) => {

  if (!value) {
    return false;
  }

  const candidate =
    String(value)
      .trim()
      .toUpperCase();

  if (
    candidate.length < 4 ||
    candidate.length > 30
  ) {
    return false;
  }

  // Must contain letter
  if (
    !/[A-Z]/.test(candidate)
  ) {
    return false;
  }

  // Must contain number
  if (
    !/\d/.test(candidate)
  ) {
    return false;
  }

  const invalid = [

    'MFG',
    'MFD',
    'EXP',
    'DATE',
    'MRP',
    'TABLET',
    'TABLETS',
    'CAPSULE',
    'ALKEM',
    'AMOXICILLIN',
    'MOXIKLAV',
    'PARACURE',
    'CEFIXIME',
    'CEFPODOXIME',
    'NOVACARE',

  ];

  if (
    invalid.includes(candidate)
  ) {
    return false;
  }

  return true;
};

// =====================================================
// TITLE CASE
// =====================================================

const toTitleCase = (value) => {

  if (!value) {
    return value;
  }

  return String(value)
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

// =====================================================
// CATEGORY DETECTION
// =====================================================

const detectCategory = (
  medicineName,
  text
) => {

  const value =
    `${medicineName || ''} ${text || ''}`
      .toUpperCase();

  // ===================================================
  // PAINKILLER
  // ===================================================

  if (

    value.includes('PARACETAMOL') ||
    value.includes('PARACURE') ||
    value.includes('IBUPROFEN') ||
    value.includes('DICLOFENAC') ||
    value.includes('DOLO') ||
    value.includes('CROCIN') ||
    value.includes('PAIN RELIEVER') ||
    value.includes('FEVER REDUCER')

  ) {

    return 'Painkiller';
  }

  // ===================================================
  // ANTIBIOTIC
  // ===================================================

  if (

    value.includes('AMOXICILLIN') ||
    value.includes('AZITHROMYCIN') ||
    value.includes('DOXYCYCLINE') ||
    value.includes('CIPROFLOXACIN') ||
    value.includes('CEF') ||
    value.includes('CEFIXIME') ||
    value.includes('CEFPODOXIME') ||
    value.includes('CEFPOD') ||
    value.includes('MOXIKLAV') ||
    value.includes('CLAVULANATE')

  ) {

    return 'Antibiotic';
  }

  // ===================================================
  // VITAMIN
  // ===================================================

  if (

    value.includes('VITAMIN') ||
    value.includes('B12') ||
    value.includes('B-COMPLEX') ||
    value.includes('CALCIUM') ||
    value.includes('FOLIC ACID')

  ) {

    return 'Vitamin';
  }

  // ===================================================
  // ANTACID
  // ===================================================

  if (

    value.includes('PANTOPRAZOLE') ||
    value.includes('OMEPRAZOLE') ||
    value.includes('RABEPRAZOLE') ||
    value.includes('ANTACID')

  ) {

    return 'Antacid';
  }

  // ===================================================
  // COUGH SYRUP
  // ===================================================

  if (

    value.includes('COUGH') ||
    value.includes('DEXTROMETHORPHAN') ||
    value.includes('GUAIFENESIN') ||
    value.includes('AMBROXOL') ||
    value.includes('SYRUP')

  ) {

    return 'Cough Syrup';
  }

  return 'Other';
};

// =====================================================
// EXPIRY ONLY
// =====================================================

export const extractExpiryDate = async (
  imageUri
) => {

  const result =
    await extractMedicineDetails(
      imageUri
    );

  return {

    rawText:
      result.rawText,

    expiryDate:
      result.expiryDate,

    success:
      !!result.expiryDate,

  };
};

// =====================================================
// PARSE EXPIRY DATE
// =====================================================

export const parseExpiryDate = (
  text
) => {

  const details =
    parseMedicineDetails(text);

  return details.expiryDate;
};