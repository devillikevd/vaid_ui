const express = require('express');
const router = express.Router();
const { getRoutePolyline } = require('../utils/osrm');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/maps/route
 * Fetch a polyline route between two points
 */
router.get('/route', authenticate, asyncHandler(async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query;
  
  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({
      success: false,
      message: 'originLat, originLng, destLat, and destLng are required'
    });
  }

  const routeResult = await getRoutePolyline(
    parseFloat(originLat),
    parseFloat(originLng),
    parseFloat(destLat),
    parseFloat(destLng)
  );

  if (routeResult.success) {
    res.json({
      success: true,
      data: {
        coordinates: routeResult.coordinates,
        distanceMeters: routeResult.distance,
        durationSeconds: routeResult.duration
      }
    });
  } else {
    res.status(500).json({
      success: false,
      message: routeResult.error
    });
  }
}));

module.exports = router;
