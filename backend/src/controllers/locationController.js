const asyncHandler = require('../utils/asyncHandler');
const locationService = require('../services/locationService');

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const location = await locationService.updateLocation(req.user, lat, lng);
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
