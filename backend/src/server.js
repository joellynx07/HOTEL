import express from 'express';
import cors from 'cors';

const app = express();

// Update this part to allow your Netlify front-end
app.use(cors({
  origin: [
    'https://espotel.netlify.app'      // Your live Netlify production URL
  ],
  credentials: true
}));

// ... rest of your existing app.js code
