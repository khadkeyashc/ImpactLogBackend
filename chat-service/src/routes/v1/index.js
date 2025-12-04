const express = require('express');
const router = express.Router();

const chatRoutes = require('./chatRoutes');

// Base paths
router.use('/chat', chatRoutes);

module.exports = router;
    