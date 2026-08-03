const { body } = require('express-validator');

const updateLocationRules = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Невірна широта'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Невірна довгота')
];

module.exports = { updateLocationRules };
