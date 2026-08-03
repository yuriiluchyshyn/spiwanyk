const { validationResult } = require('express-validator');

/**
 * Express middleware that terminates the request with a 400 response when any
 * express-validator rule failed. Placed after the validation chain and before
 * the controller so controllers never repeat the same boilerplate.
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Помилка валідації',
      errors: errors.array()
    });
  }
  next();
};

module.exports = handleValidation;
