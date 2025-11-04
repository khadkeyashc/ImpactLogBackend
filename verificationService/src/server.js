require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const verifyRoutes = require('./routes/verifyRoutes');

const app = express();

connectDB();

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// Routes
app.use('/verify', verifyRoutes);

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`✅ Verification Service running on port ${PORT}`);
});
