// Sample medicine database
// Real app-la backend API call pannuvom
const medicineDatabase = {
  '8901234567890': {
    name: 'Dolo 650mg',
    brand: 'Micro Labs',
    category: 'Painkiller',
  },
  '8901234567891': {
    name: 'Cough Syrup',
    brand: 'Benadryl',
    category: 'Cough Syrup',
  },
  '8901234567892': {
    name: 'Vitamin C',
    brand: 'Limcee',
    category: 'Vitamin',
  },
  '8901234567893': {
    name: 'Amoxicillin',
    brand: 'Cipla',
    category: 'Antibiotic',
  },
  '8901234567894': {
    name: 'Metformin 500',
    brand: 'Sun Pharma',
    category: 'Other',
  },
};

export const getMedicineByBarcode = (barcode) => {
  const medicine = medicineDatabase[barcode];
  if (medicine) {
    return { success: true, medicine };
  }
  return {
    success: false,
    message: 'Medicine not found in database'
  };
};