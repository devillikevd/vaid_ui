package com.example.swastik.ui.screens.patient.finder.components

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.ui.components.MapMarkerData
import com.example.swastik.ui.components.OsmMapView
import org.osmdroid.util.GeoPoint

fun hasValidMapCoordinates(facility: MedicalFacility): Boolean {
    // Avoid missing coords or generic 0.0 lat/lng (Equator) unless explicitly that
    return facility.latitude != 0.0 && facility.longitude != 0.0 && !facility.latitude.isNaN() && !facility.longitude.isNaN()
}

@Composable
fun EnhancedMapView(
    facilities: List<MedicalFacility>,
    userLat: Double = 0.0,
    userLng: Double = 0.0,
    focusedFacilityId: String? = null,
    onFacilityClick: (MedicalFacility) -> Unit
) {
    // Use actual user GPS location as map center (if available), fallback to facility centroid
    val positionedFacilities = facilities.filter(::hasValidMapCoordinates)
    val focusedFacility = focusedFacilityId?.let { targetId ->
        positionedFacilities.firstOrNull { it.id == targetId }
    }
    val centerLat = focusedFacility?.latitude ?: if (userLat != 0.0) userLat
        else positionedFacilities
            .map { it.latitude }.average().takeIf { !it.isNaN() } ?: 20.5937
    val centerLng = focusedFacility?.longitude ?: if (userLng != 0.0) userLng
        else positionedFacilities
            .map { it.longitude }.average().takeIf { !it.isNaN() } ?: 78.9629

    val mapMarkers = positionedFacilities.map { facility ->
        val color = when (facility.type) {
            FacilityType.HOSPITAL -> android.graphics.Color.parseColor("#D32F2F")       // Red
            FacilityType.CLINIC -> android.graphics.Color.parseColor("#4CAF50")         // Green (matches model)
            FacilityType.MEDICAL_STORE -> android.graphics.Color.parseColor("#2196F3")  // Blue (matches model)
            FacilityType.DIAGNOSTIC_CENTER -> android.graphics.Color.parseColor("#7C3AED") // Purple
            FacilityType.NURSING_HOME -> android.graphics.Color.parseColor("#FF9800")
        }
        MapMarkerData(
            id = facility.id,
            latitude = facility.latitude,
            longitude = facility.longitude,
            title = facility.name,
            snippet = "${facility.type.getDisplayName()} • ${if (facility.isOpen) "Open" else "Closed"}",
            markerColor = color,
            onClick = { onFacilityClick(facility) }
        )
    }

    OsmMapView(
        modifier = Modifier.fillMaxSize(),
        center = GeoPoint(centerLat, centerLng),
        zoom = when {
            focusedFacility != null -> 15.5
            positionedFacilities.isNotEmpty() -> 13.0
            userLat != 0.0 && userLng != 0.0 -> 14.0
            else -> 5.0
        },
        markers = mapMarkers,
        showUserLocation = userLat != 0.0 && userLng != 0.0,
        userLatitude = userLat,
        userLongitude = userLng
    )
}
