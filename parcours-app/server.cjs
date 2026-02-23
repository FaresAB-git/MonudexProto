const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.post('/api/directions', async (req, res) => {
  try {
    const { origin, destination, waypoints } = req.body;

    const params = {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'walking',
      key: GOOGLE_API_KEY
    };

    if (waypoints && waypoints.length > 0) {
      params.waypoints = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      { params }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error calling Directions API:', error.response?.data || error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
