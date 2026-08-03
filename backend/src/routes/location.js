const express = require('express');
const { auth } = require('../middleware/auth');
const handleValidation = require('../utils/handleValidation');
const locationController = require('../controllers/locationController');
const { updateLocationRules } = require('../validators/locationValidators');

const router = express.Router();

router.post('/', auth, updateLocationRules, handleValidation, locationController.updateLocation);
router.get('/', auth, locationController.getLocation);
router.delete('/', auth, locationController.clearLocation);

module.exports = router;
