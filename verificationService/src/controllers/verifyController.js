const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const VerificationToken = require('../models/VerificationToken');
const axios = require('axios');

// Generate QR Code
const generateQR = async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }
  const verificationToken = await VerificationToken.find({ eventId });
    if(verificationToken){
      res.json({
        message:"Qr already generated"
      })
    }
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const newToken = new VerificationToken({ eventId, token, expiresAt });
    await newToken.save();
    const qrData = JSON.stringify({ eventId, token });
    const qrImage = await QRCode.toDataURL(qrData);
    res.json({ token, qrImage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getQr = async (req, res) => {
  try {
    console.log(req.body)
    // const { eventId } = req.body;
    const eventId ="123456"
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }
    
    

    const verificationToken = await VerificationToken.findOne({ eventId });
        console.log(verificationToken)

    if (!verificationToken) {
      return res.status(404).json({ error: "No verification token found for this event" });
    }

    const qrData = JSON.stringify({ eventId, token: verificationToken.token });
    const qrImage = await QRCode.toDataURL(qrData);

    res.json({ qrImage });
  } catch (error) {
    console.error("Error generating QR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Check-in
const checkin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const eventId = "123456"; // temporary hardcoded

    if (!userId || !eventId || !token)
      return res.status(400).json({ error: "Missing fields" });

    const tokenDoc = await VerificationToken.findOne({ token, eventId });
    if (!tokenDoc)
      return res.status(404).json({ error: "Invalid token or eventId" });

    if (tokenDoc.expiresAt < new Date())
      return res.status(400).json({ error: "Token expired" });

    const verifiedAt = new Date();

    // Notify attendance microservice
    await axios.post(`${process.env.ATTENDANCE_SERVICE_URL}/mark`, {
      userId,
      eventId,
      verifiedAt,
      checkinMethod: "QR",
    });

    res.json({ message: "Verification successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Check status
const checkStatus = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    // Assuming attendance service has GET /status/:eventId/:userId to check verification
    const response = await axios.get(`${process.env.ATTENDANCE_SERVICE_URL}/status/${eventId}/${userId}`);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { generateQR, checkin, checkStatus,getQr };