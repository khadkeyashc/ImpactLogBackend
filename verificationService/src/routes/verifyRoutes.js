const express = require('express');
const { generateQR, checkin, checkStatus ,getQr} = require('../controllers/verifyController');

const router = express.Router();

router.post('/qr-generate', generateQR);
router.post('/checkin', checkin);
router.post('/getQr',getQr)
router.get('/status/:eventId/:userId', checkStatus);

module.exports = router;