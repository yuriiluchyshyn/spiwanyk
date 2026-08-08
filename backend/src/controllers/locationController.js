const asyncHandler = require('../utils/asyncHandler');
const locationService = require('../services/locationService');

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  console.log('📍 updateLocation called:', {
    userId: req.user._id,
    userEmail: req.user.email,
    lat,
    lng
  });
  
  const location = await locationService.updateLocation(req.user, lat, lng);
  
  console.log('✅ Location updated:', {
    userId: req.user._id,
    userEmail: req.user.email,
    location
  });
  
  res.json({ message: 'Місцезнаходження оновлено', location });
});

const getLocation = asyncHandler(async (req, res) => {
  const location = locationService.getLocation(req.user);
  res.json({ location });
});

const clearLocation = asyncHandler(async (req, res) => {
  await locationService.clearLocation(req.user);
  res.json({ message: 'Місцезнаходження очищено' });
});

module.exports = { updateLocation, getLocation, clearLocation };
