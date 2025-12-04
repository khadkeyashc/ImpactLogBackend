const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require("path")

dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(express.json());  
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

// Logger
app.use(morgan('dev'));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

app.set('trust proxy', 1);


const routes = require("./routes/v1/index");
app.use("/",routes) 
app.use("/ping",(req,res)=>{
  res.send("PONG")
})

const errorMiddleware = require('./middleware/error.middleware');
app.use(errorMiddleware)

module.exports = app;
