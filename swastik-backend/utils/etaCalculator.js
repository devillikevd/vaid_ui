/**
 * ETA Calculation Utilities
 * Used for delivery, ambulance, and pharmacy order ETAs
 */

// Default speeds (km/h) by vehicle type
const VEHICLE_SPEEDS = {
    bike: 30,
    scooter: 25,
    car: 40,
    ambulance: 50,
    walking: 5
};

// Base prep times (minutes) by order type
const PREP_TIMES = {
    pharmacy: 8,      // pharmacy packing time
    diagnostic: 15,   // sample collection prep
    food: 20,         // restaurant prep
    grocery: 10       // grocery picking
};

/**
 * Calculate straight-line distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Origin latitude
 * @param {number} lng1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lng2 - Destination longitude
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * Math.PI / 180;
}

/**
 * Estimate delivery ETA in minutes
 * @param {Object} params
 * @param {number} params.distanceKm - Straight-line distance
 * @param {string} [params.vehicleType='bike'] - Vehicle type
 * @param {string} [params.orderType='pharmacy'] - Order type for prep time
 * @param {number} [params.trafficFactor=1.3] - Traffic multiplier (1.0 = no traffic)
 * @param {number} [params.bufferMinutes=5] - Additional buffer
 * @returns {Object} { etaMinutes, distanceKm, breakdown }
 */
function estimateDeliveryETA({ distanceKm, vehicleType = 'bike', orderType = 'pharmacy', trafficFactor = 1.3, bufferMinutes = 5 }) {
    if (!distanceKm || distanceKm <= 0) {
        return { etaMinutes: null, distanceKm: 0, breakdown: { reason: 'Invalid distance' } };
    }

    const speed = VEHICLE_SPEEDS[vehicleType] || VEHICLE_SPEEDS.bike;
    const prepTime = PREP_TIMES[orderType] || PREP_TIMES.pharmacy;
    
    // Travel time = (distance / speed) * 60 * trafficFactor
    const travelMinutes = (distanceKm / speed) * 60 * trafficFactor;
    const totalMinutes = Math.ceil(prepTime + travelMinutes + bufferMinutes);
    
    // Cap at reasonable max (2 hours for delivery)
    const cappedMinutes = Math.min(totalMinutes, 120);
    
    return {
        etaMinutes: cappedMinutes,
        distanceKm: Math.round(distanceKm * 100) / 100,
        breakdown: {
            prepMinutes: prepTime,
            travelMinutes: Math.round(travelMinutes),
            bufferMinutes,
            trafficFactor,
            speedKmh: speed
        }
    };
}

/**
 * Estimate ETA for ambulance (emergency vs non-emergency)
 * @param {Object} params
 * @param {number} params.distanceKm
 * @param {boolean} [params.isEmergency=true]
 * @returns {Object}
 */
function estimateAmbulanceETA({ distanceKm, isEmergency = true }) {
    if (!distanceKm || distanceKm <= 0) return { etaMinutes: null };
    
    const speed = isEmergency ? VEHICLE_SPEEDS.ambulance : VEHICLE_SPEEDS.car;
    const trafficFactor = isEmergency ? 1.0 : 1.3; // Emergency gets priority
    const prepTime = isEmergency ? 2 : 5; // Dispatch time
    
    const travelMinutes = (distanceKm / speed) * 60 * trafficFactor;
    const totalMinutes = Math.ceil(prepTime + travelMinutes);
    
    return {
        etaMinutes: Math.min(totalMinutes, 60), // Max 1 hour for ambulance
        distanceKm: Math.round(distanceKm * 100) / 100,
        breakdown: { prepMinutes: prepTime, travelMinutes: Math.round(travelMinutes), isEmergency }
    };
}

/**
 * Batch calculate ETAs for multiple destinations
 * @param {Object} origin - { lat, lng }
 * @param {Array} destinations - [{ id, lat, lng, vehicleType?, orderType? }]
 * @returns {Array} destinations with etaMinutes added
 */
function calculateBatchETAs(origin, destinations) {
    return destinations.map(dest => {
        const distance = haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
        const eta = estimateDeliveryETA({
            distanceKm: distance,
            vehicleType: dest.vehicleType,
            orderType: dest.orderType
        });
        return { ...dest, distanceKm: eta.distanceKm, etaMinutes: eta.etaMinutes };
    });
}

module.exports = {
    haversineDistance,
    estimateDeliveryETA,
    estimateAmbulanceETA,
    calculateBatchETAs,
    VEHICLE_SPEEDS,
    PREP_TIMES
};
