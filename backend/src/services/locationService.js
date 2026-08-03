const ApiError = require('../utils/ApiError');

/**
 * User geolocation business logic. Coordinates are stored in MongoDB GeoJSON
 * order [longitude, latitude]; callers pass plain lat/lng.
 */

const updateLocation = async (user, lat, lng) => {
  await user.updateLocation(lng, lat); // MongoDB expects [longitude, latitude]
  return { latitude: lat, longitude: lng, updatedAt: new Date() };
};

const getLocation = (user) => {
  if (!user.location || !user.location.coordinates) {
    throw ApiError.notFound('Місцезнаходження не встановлено');
  }

  const [longitude, latitude] = user.location.coordinates;
  return { latitude, longitude, updatedAt: user.location.updatedAt };
};

const clearLocation = async (user) => {
  user.location = {
    type: 'Point',
    coordinates: [0, 0],
    updatedAt: new Date()
  };
  await user.save();
};

module.exports = { updateLocation, getLocation, clearLocation };
