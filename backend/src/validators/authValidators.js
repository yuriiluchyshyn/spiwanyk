const { body } = require('express-validator');

const loginRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Невірний формат email')
];

const updateProfileRules = [
  body('preferences.language').optional().isIn(['uk', 'en']),
  body('preferences.theme').optional().isIn(['light', 'dark'])
];

module.exports = { loginRules, updateProfileRules };
