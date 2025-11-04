const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require("path");

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// ✅ Fixed CORS (works for all origins + credentials)
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin || "*");
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Logger
app.use(morgan('dev'));

// Helmet (loosened only what's needed)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.set('trust proxy', 1);

// ✅ Keep your route as-is
const routes = require("./routes/v1/eventRoutes");
app.use("/events", routes);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Event service active" });
});

// Error middleware
const errorMiddleware = require('./middleware/error.middleware');
app.use(errorMiddleware);

module.exports = app;
