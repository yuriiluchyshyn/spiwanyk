const express = require('express');
const { auth } = require('../middleware/auth');
const handleValidation = require('../utils/handleValidation');
const authController = require('../controllers/authController');
const { loginRules, updateProfileRules } = require('../validators/authValidators');

const router = express.Router();

router.post('/login', loginRules, handleValidation, authController.login);
router.get('/verify', auth, authController.verify);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, updateProfileRules, handleValidation, authController.updateProfile);
router.post('/logout', auth, authController.logout);

module.exports = router;
