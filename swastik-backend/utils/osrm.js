const axios = require('axios');

/**
 * Fetch a driving route from OSRM's public API.
 * Returns the encoded polyline string for the route.
 */
const getRoutePolyline = async (originLat, originLng, destLat, destLng) => {
  try {
    // OSRM expects coordinates in lon,lat order
    const url = `http://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      // GeoJSON returns coordinates as [lon, lat]
      // Let's convert them to [lat, lon] for the clients
      const coordinates = response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      return {
        success: true,
        coordinates: coordinates,
        distance: response.data.routes[0].distance, // in meters
        duration: response.data.routes[0].duration  // in seconds
      };
    }
    return { success: false, error: 'No routes found' };
  } catch (error) {
    console.error('OSRM Route Error:', error.message);
    return { success: false, error: 'Failed to fetch route from OSRM' };
  }
};

module.exports = {
  getRoutePolyline
};
