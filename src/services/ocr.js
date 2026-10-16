import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { getData } from './storage';

const BACKEND_URL = 'https://medtracker-1.onrender.com';

// =====================================================
// PICK IMAGE
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
  } catch (error) {
    console.log('Image picker error:', error);
    return null;
  }
};

// =====================================================
// TAKE PHOTO
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
  } catch (error) {
    console.log('Camera error:', error);
    return null;
  }
};

// =====================================================
// MAIN OCR
// =====================================================

export const extractMedicineDetails = async (imageUri) => {
  try {
    const token = await getData('token');

    if (!token) {
      throw new Error(
        'Login token not found. Please login again.'
      );
    }

    const file = new File(imageUri);

    const formData = new FormData();
    formData.append('image', file);

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

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message || 'OCR request failed'
      );
    }

    const rawText = result?.rawText || '';

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

    const details = parseMedicineDetails(rawText);

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

      success: !!(
        details.medicineName ||
        details.brandName ||
        details.batchNumber ||
        details.mfgDate ||
        details.expiryDate
      ),
    };

  } catch (error) {
    console.log('OCR ERROR:', error);

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
// MAIN PARSER
// =====================================================

export const parseMedicineDetails = (text) => {
  if (!text) {
    return emptyDetails();
  }

  // ---------------------------------------------------
  // CLEAN OCR
  // ---------------------------------------------------

  const cleanText = String(text)
    .replace(/\r/g, '\n')
    .replace(/[®™©]/g, '')
    .replace(/\|/g, 'I')
    .replace(/[ \t]+/g, ' ')
    .trim();

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

  const oneLineText = cleanText
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  console.log('================================');
  console.log('🧠 SMART MEDICINE OCR PARSER');
  console.log('================================');
  console.log(oneLineText);

  // ===================================================
  // DATE EXTRACTION
  // ===================================================

  let expiryDate = null;
  let mfgDate = null;

  // ---------------------------------------------------
  // EXPIRY
  // ---------------------------------------------------

  const expiryPatterns = [
    /(?:EXPIRY\s*DATE|EXPIRY|EXP\s*DATE|EXP|USE\s*BEFORE|BEST\s*BEFORE)\s*[:.\-]?\s*(\d{1,2})\s*[\/.\-]\s*(20\d{2})/i,

    /(?:EXPIRY\s*DATE|EXPIRY|EXP\s*DATE|EXP|USE\s*BEFORE|BEST\s*BEFORE)\s*[:.\-]?\s*(\d{1,2})\s*[\s\-\/]*(20\d{2})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = oneLineText.match(pattern);

    if (match) {
      expiryDate =
        normalizeDate(match[1], match[2]);

      if (expiryDate) break;
    }
  }

  // Line-based expiry
  if (!expiryDate) {
    for (const line of upperLines) {
      if (
        /EXPIRY|EXP\s*DATE|EXP:|USE\s*BEFORE|BEST\s*BEFORE/.test(
          line
        )
      ) {
        const match = line.match(
          /(\d{1,2})\s*[\/.\-]\s*(20\d{2})/
        );

        if (match) {
          expiryDate =
            normalizeDate(
              match[1],
              match[2]
            );

          if (expiryDate) break;
        }
      }
    }
  }

  // ---------------------------------------------------
  // MFG
  // ---------------------------------------------------

  const mfgPatterns = [
    /(?:MFG\s*DATE|MFG|MFD\s*DATE|MFD|MANUFACTURED\s*DATE)\s*[:.\-]?\s*(\d{1,2})\s*[\/.\-]\s*(20\d{2})/i,

    /(?:MFG\s*DATE|MFG|MFD\s*DATE|MFD|MANUFACTURED\s*DATE)\s*[:.\-]?\s*(\d{1,2})\s*[\s\-\/]*(20\d{2})/i,
  ];

  for (const pattern of mfgPatterns) {
    const match = oneLineText.match(pattern);

    if (match) {
      mfgDate =
        normalizeDate(
          match[1],
          match[2]
        );

      if (mfgDate) break;
    }
  }

  // Line-based MFG
  if (!mfgDate) {
    for (const line of upperLines) {
      if (
        /\bMFG\b|\bMFD\b|MANUFACTURED/.test(
          line
        )
      ) {
        const match = line.match(
          /(\d{1,2})\s*[\/.\-]\s*(20\d{2})/
        );

        if (match) {
          const candidate =
            normalizeDate(
              match[1],
              match[2]
            );

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

  // ===================================================
  // BATCH NUMBER
  // ===================================================

  let batchNumber = null;

  /*
   * IMPORTANT:
   * Batch must come from BATCH / BATCH NO / LOT label.
   * We do NOT blindly take any alphanumeric word.
   */

  const batchPatterns = [
    /(?:BATCH\s*(?:NO|NUMBER)?|B\.?\s*NO\.?|LOT\s*(?:NO|NUMBER)?)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,30})/i,
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
        batchNumber = candidate;
        break;
      }
    }
  }

  // Line-based batch
  if (!batchNumber) {
    for (let i = 0; i < upperLines.length; i++) {
      const line = upperLines[i];

      if (
        /\bBATCH\b|\bB\.?\s*NO\b|\bLOT\b/.test(
          line
        )
      ) {
        // Same line
        const sameLine =
          line.match(
            /(?:BATCH\s*(?:NO|NUMBER)?|B\.?\s*NO\.?|LOT\s*(?:NO|NUMBER)?)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,30})/i
          );

        if (sameLine) {
          const candidate =
            cleanBatchCandidate(
              sameLine[1]
            );

          if (
            isValidBatchCandidate(candidate)
          ) {
            batchNumber = candidate;
            break;
          }
        }

        // Next line
        if (i + 1 < upperLines.length) {
          const nextLine =
            upperLines[i + 1]
              .replace(/[:.\-]/g, '')
              .trim();

          const candidate =
            cleanBatchCandidate(
              nextLine
            );

          if (
            isValidBatchCandidate(candidate)
          ) {
            batchNumber = candidate;
            break;
          }
        }
      }
    }
  }

  // ===================================================
  // MEDICINE NAME
  // ===================================================

  let medicineName = null;

  /*
   * Known medicine / brand patterns.
   * These are checked FIRST because medicine packs
   * contain many unrelated text lines.
   */

  const medicinePatterns = [
    {
      pattern:
        /\bMOXIKLAV\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        `Moxiklav ${m[1]}`,
    },

    {
      pattern:
        /\bDOLO\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        `Dolo ${m[1]}`,
    },

    {
      pattern:
        /\bPARACURE\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        `Paracure ${m[1]}`,
    },

    {
      pattern:
        /\bCROCIN\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Crocin ${m[1]}`
          : 'Crocin',
    },

    {
      pattern:
        /\bAZITHROMYCIN\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Azithromycin ${m[1]}`
          : 'Azithromycin',
    },

    {
      pattern:
        /\bAMOXICILLIN\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Amoxicillin ${m[1]}`
          : 'Amoxicillin',
    },

    {
      pattern:
        /\bPANTOPRAZOLE\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Pantoprazole ${m[1]}`
          : 'Pantoprazole',
    },

    {
      pattern:
        /\bPARACETAMOL\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Paracetamol ${m[1]}`
          : 'Paracetamol',
    },

    {
      pattern:
        /\bIBUPROFEN\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Ibuprofen ${m[1]}`
          : 'Ibuprofen',
    },

    {
      pattern:
        /\bDICLOFENAC\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Diclofenac ${m[1]}`
          : 'Diclofenac',
    },

    {
      pattern:
        /\bOMEPRAZOLE\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Omeprazole ${m[1]}`
          : 'Omeprazole',
    },

    {
      pattern:
        /\bMETFORMIN\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Metformin ${m[1]}`
          : 'Metformin',
    },

    {
      pattern:
        /\bMONTELUKAST\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Montelukast ${m[1]}`
          : 'Montelukast',
    },

    {
      pattern:
        /\bCETIRIZINE\s*[-]?\s*(\d{1,3})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Cetirizine ${m[1]}`
          : 'Cetirizine',
    },

    {
      pattern:
        /\bCEFIXIME\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Cefixime ${m[1]}`
          : 'Cefixime',
    },

    {
      pattern:
        /\bCEFPODOXIME\s*[-]?\s*(\d{2,4})(?:\s*MG)?\b/i,
      name: (m) =>
        m[1]
          ? `Cefpodoxime ${m[1]}`
          : 'Cefpodoxime',
    },
  ];

  for (const item of medicinePatterns) {
    const match =
      oneLineText.match(item.pattern);

    if (match) {
      medicineName =
        item.name(match);
      break;
    }
  }

  // ===================================================
  // GENERIC MEDICINE NAME FALLBACK
  // ===================================================

  if (!medicineName) {
    const ignoredPatterns = [
      /SCHEDULE\s*H/,
      /PRESCRIPTION\s*DRUG/,
      /CAUTION/,
      /MANUFACTURED\s*BY/,
      /MARKETED\s*BY/,
      /MFG\s*BY/,
      /BATCH/,
      /B\.?\s*NO/,
      /LOT\s*(?:NO|NUMBER)?/,
      /MFG\s*DATE/,
      /MFD\s*DATE/,
      /EXPIRY/,
      /EXP\s*DATE/,
      /MRP/,
      /STORE\s*BELOW/,
      /KEEP\s*OUT/,
      /DOSAGE/,
      /PHYSICIAN/,
      /INGREDIENT/,
      /COMPOSITION/,
      /EACH\s*TABLET/,
      /TABLETS?\s*IP/,
      /CAPSULES?\s*IP/,
      /INJECTION/,
      /SYRUP/,
      /MANUFACTURED/,
      /MARKETED/,
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
        candidate.length < 3 ||
        candidate.length > 60
      ) {
        continue;
      }

      if (
        ignoredPatterns.some(
          (pattern) =>
            pattern.test(upper)
        )
      ) {
        continue;
      }

      // Ignore pure dates / numbers
      if (
        /^\d[\d\s./:-]*$/.test(
          candidate
        )
      ) {
        continue;
      }

      // Ignore manufacturer/company lines
      if (
        upper.includes('LABORATOR') ||
        upper.includes('PHARMA') ||
        upper.includes('PVT LTD') ||
        upper.includes('PRIVATE LIMITED')
      ) {
        continue;
      }

      // Prefer lines with medicine-like strength
      if (
        /\b\d{2,4}\s*(MG|MCG|G|ML)\b/i.test(
          candidate
        )
      ) {
        medicineName =
          candidate
            .replace(
              /\b(TABLETS?|CAPSULES?|SYRUP)\b/gi,
              ''
            )
            .replace(/\s+/g, ' ')
            .trim();

        break;
      }
    }
  }

  // ===================================================
  // BRAND NAME
  // ===================================================

  let brandName = null;

  /*
   * IMPORTANT:
   * Manufacturer is NOT Brand.
   *
   * Do not put:
   * Alkem
   * Micro Labs
   * Sun Pharma
   * Cipla
   *
   * into brandName just because they appear on pack.
   */

  // ---------------------------------------------------
  // Explicit brand/trade label
  // ---------------------------------------------------

  const brandLabelPatterns = [
    /(?:BRAND\s*NAME|BRAND|TRADE\s*NAME)\s*[:.\-]?\s*([A-Z][A-Z0-9 .\-]{2,60})/i,
  ];

  for (const pattern of brandLabelPatterns) {
    const match =
      oneLineText.match(pattern);

    if (match) {
      const candidate =
        cleanBrandCandidate(
          match[1]
        );

      if (
        isValidBrandCandidate(
          candidate
        )
      ) {
        brandName =
          toTitleCase(candidate);
        break;
      }
    }
  }

  // ---------------------------------------------------
  // Known commercial brands
  // ---------------------------------------------------

  if (!brandName) {
    const knownBrands = [
      {
        regex: /\bMOXIKLAV\s*625\b/i,
        name: 'Moxiklav 625',
      },
      {
        regex: /\bCROCIN(?:\s+\d{2,4})?\b/i,
        name: 'Crocin',
      },
      {
        regex: /\bDOLO\s*[-]?\s*650\b/i,
        name: 'Dolo 650',
      },
      {
        regex: /\bDOLO\s*[-]?\s*650\s*MG\b/i,
        name: 'Dolo 650',
      },
      {
        regex: /\bMONTair\b/i,
        name: 'Montair',
      },
      {
        regex: /\bPANTOCID\b/i,
        name: 'Pantocid',
      },
      {
        regex: /\bBRUFEN\b/i,
        name: 'Brufen',
      },
      {
        regex: /\bOMEZ\b/i,
        name: 'Omez',
      },
      {
        regex: /\bGLYCOMET\b/i,
        name: 'Glycomet',
      },
      {
        regex: /\bZYRTEC\b/i,
        name: 'Zyrtec',
      },
      {
        regex: /\bAZITHRAL\b/i,
        name: 'Azithral',
      },
      {
        regex: /\bMONTELUKAST\b/i,
        name: 'Montelukast',
      },
    ];

    for (const brand of knownBrands) {
      if (
        brand.regex.test(oneLineText)
      ) {
        brandName = brand.name;
        break;
      }
    }
  }

  // ---------------------------------------------------
  // If medicine itself is a commercial brand,
  // use medicine name as brand.
  // ---------------------------------------------------

  if (
    !brandName &&
    medicineName
  ) {
    const commercialBrandPatterns = [
      /^Moxiklav/i,
      /^Crocin/i,
      /^Dolo/i,
      /^Paracure/i,
      /^Montair/i,
      /^Pantocid/i,
      /^Brufen/i,
      /^Omez/i,
      /^Glycomet/i,
      /^Zyrtec/i,
      /^Azithral/i,
    ];

    if (
      commercialBrandPatterns.some(
        (pattern) =>
          pattern.test(medicineName)
      )
    ) {
      brandName = medicineName;
    }
  }

  // ===================================================
  // CATEGORY
  // ===================================================

  const category =
    detectCategory(
      medicineName,
      oneLineText
    );

  // ===================================================
  // MRP
  // ===================================================

  let mrp = null;

  const mrpPatterns = [
    /MRP\s*[:.\-]?\s*₹?\s*(\d+(?:\.\d{1,2})?)/i,
    /MAX(?:IMUM)?\s*RETAIL\s*PRICE\s*[:.\-]?\s*₹?\s*(\d+(?:\.\d{1,2})?)/i,
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

    mrp,
  };

  console.log(
    '================================'
  );
  console.log(
    '✅ FINAL OCR DETAILS'
  );
  console.log(details);
  console.log(
    '================================'
  );

  return details;
};

// =====================================================
// DATE NORMALIZER
// =====================================================

const normalizeDate = (
  month,
  year
) => {
  const m =
    parseInt(month, 10);

  const y =
    parseInt(year, 10);

  if (
    Number.isNaN(m) ||
    Number.isNaN(y)
  ) {
    return null;
  }

  if (
    m < 1 ||
    m > 12 ||
    y < 2000 ||
    y > 2100
  ) {
    return null;
  }

  return `${String(m).padStart(
    2,
    '0'
  )}/${y}`;
};

// =====================================================
// BATCH CLEAN
// =====================================================

const cleanBatchCandidate = (
  value
) => {
  if (!value) return null;

  return String(value)
    .replace(/[^A-Z0-9\/\-]/gi, '')
    .trim()
    .toUpperCase();
};

// =====================================================
// BATCH VALIDATION
// =====================================================

const isValidBatchCandidate = (
  value
) => {
  if (!value) return false;

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

  // Must contain both letter and number
  if (!/[A-Z]/.test(candidate)) {
    return false;
  }

  if (!/\d/.test(candidate)) {
    return false;
  }

  // Never accept obvious medicine/label text
  const invalidWords = [
    'MFG',
    'MFD',
    'EXP',
    'DATE',
    'MRP',
    'TABLET',
    'TABLETS',
    'CAPSULE',
    'CAPSULES',
    'ALKEM',
    'MOXIKLAV',
    'AMOXICILLIN',
    'PARACETAMOL',
    'IBUPROFEN',
    'PANTOPRAZOLE',
    'SCHEDULE',
    'PRESCRIPTION',
    'CAUTION',
  ];

  if (
    invalidWords.some(
      (word) =>
        candidate === word ||
        candidate.includes(word)
    )
  ) {
    return false;
  }

  return true;
};

// =====================================================
// BRAND CLEAN
// =====================================================

const cleanBrandCandidate = (
  value
) => {
  if (!value) return null;

  return String(value)
    .replace(
      /(?:SCHEDULE|PRESCRIPTION|CAUTION).*/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
};

// =====================================================
// BRAND VALIDATION
// =====================================================

const isValidBrandCandidate = (
  value
) => {
  if (!value) return false;

  const candidate =
    value.trim();

  if (
    candidate.length < 3 ||
    candidate.length > 60
  ) {
    return false;
  }

  const invalid = [
    'SCHEDULE',
    'PRESCRIPTION',
    'CAUTION',
    'MANUFACTURED',
    'MARKETED',
    'BATCH',
    'EXPIRY',
    'MFG',
    'MFD',
    'MRP',
    'TABLET',
    'TABLETS',
    'CAPSULE',
  ];

  const upper =
    candidate.toUpperCase();

  return !invalid.some(
    (word) =>
      upper.includes(word)
  );
};

// =====================================================
// TITLE CASE
// =====================================================

const toTitleCase = (
  value
) => {
  if (!value) return value;

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
    `${medicineName || ''} ${
      text || ''
    }`.toUpperCase();

  // Painkiller
  if (
    value.includes('PARACETAMOL') ||
    value.includes('PARACURE') ||
    value.includes('IBUPROFEN') ||
    value.includes('DICLOFENAC') ||
    value.includes('DOLO') ||
    value.includes('CROCIN') ||
    value.includes('PAIN RELIEVER')
  ) {
    return 'Painkiller';
  }

  // Antibiotic
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

  // Antihistamine / allergy
  if (
    value.includes('CETIRIZINE') ||
    value.includes('LEVOCETIRIZINE') ||
    value.includes('LORATADINE') ||
    value.includes('FEXOFENADINE') ||
    value.includes('MONTELUKAST') ||
    value.includes('MONTair'.toUpperCase())
  ) {
    return 'Antihistamine';
  }

  // Gastric / acid reducer
  if (
    value.includes('PANTOPRAZOLE') ||
    value.includes('OMEPRAZOLE') ||
    value.includes('RABEPRAZOLE') ||
    value.includes('ESOMEPRAZOLE') ||
    value.includes('ANTACID')
  ) {
    return 'Gastric / Acid Reducer';
  }

  // Diabetes
  if (
    value.includes('METFORMIN') ||
    value.includes('GLIMEPIRIDE') ||
    value.includes('GLIPIZIDE') ||
    value.includes('DIABETES')
  ) {
    return 'Diabetes';
  }

  // Vitamins
  if (
    value.includes('VITAMIN') ||
    value.includes('B12') ||
    value.includes('B-COMPLEX') ||
    value.includes('CALCIUM') ||
    value.includes('FOLIC ACID')
  ) {
    return 'Vitamins & Supplements';
  }

  // Cough
  if (
    value.includes('COUGH') ||
    value.includes('DEXTROMETHORPHAN') ||
    value.includes('GUAIFENESIN') ||
    value.includes('AMBROXOL') ||
    value.includes('SYRUP')
  ) {
    return 'Cold & Cough';
  }

  return 'Other';
};

// =====================================================
// EMPTY DETAILS
// =====================================================

const emptyDetails = () => ({
  medicineName: null,
  brandName: null,
  category: null,
  batchNumber: null,
  mfgDate: null,
  expiryDate: null,
  mrp: null,
});

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