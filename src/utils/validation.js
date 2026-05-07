export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

export const isStrongPassword = (s) => typeof s === 'string' && s.length >= 6;

export const isSamoaPhone = (s) => {
  const digits = String(s || '').replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

export const isPositiveNumber = (n) => {
  const x = Number(n);
  return Number.isFinite(x) && x > 0;
};

export const isLatLng = (loc) =>
  loc &&
  Number.isFinite(loc.lat) &&
  Number.isFinite(loc.lng) &&
  loc.lat >= -90 &&
  loc.lat <= 90 &&
  loc.lng >= -180 &&
  loc.lng <= 180;

export const validateRegister = ({ fullName, email, password, role }) => {
  const errors = {};
  if (!fullName || fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!isEmail(email)) errors.email = 'Enter a valid email.';
  if (!isStrongPassword(password)) errors.password = 'Password must be at least 6 characters.';
  if (!['farmer', 'exporter', 'buyer'].includes(role)) errors.role = 'Pick a role.';
  return errors;
};

export const validateFarm = ({ farmName, village, location }) => {
  const errors = {};
  if (!farmName || farmName.trim().length < 2) errors.farmName = 'Enter a farm name.';
  if (!village || village.trim().length < 2) errors.village = 'Enter a village.';
  if (!isLatLng(location)) errors.location = 'Drop a pin or use GPS.';
  return errors;
};

export const validateBatch = ({ harvestDate, weightKg, quality }) => {
  const errors = {};
  if (!harvestDate) errors.harvestDate = 'Pick a harvest date.';
  if (!isPositiveNumber(weightKg)) errors.weightKg = 'Enter a weight greater than 0.';
  if (!['A', 'B', 'C'].includes(quality)) errors.quality = 'Pick a quality grade.';
  return errors;
};

export const hasErrors = (errs) => Object.keys(errs || {}).length > 0;
