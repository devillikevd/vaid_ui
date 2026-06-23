package com.example.swastik.ui.components

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.drawable.Drawable
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Overlay
import org.osmdroid.views.overlay.Polyline
import com.example.swastik.R

/**
 * Data class for map markers.
 */
data class MapMarkerData(
    val id: String,
    val latitude: Double,
    val longitude: Double,
    val title: String,
    val snippet: String = "",
    val markerColor: Int = android.graphics.Color.RED,
    val iconRes: Int? = null,
    val onClick: (() -> Unit)? = null
)

/**
 * Reusable OpenStreetMap composable for Jetpack Compose.
 * Uses osmdroid — no API key required.
 *
 * @param center  Center point of the map
 * @param zoom    Zoom level (1–19, 15 is street level)
 * @param markers List of markers to display
 * @param showUserLocation Whether to show user location dot
 * @param userLatitude  User's latitude (if showUserLocation)
 * @param userLongitude User's longitude (if showUserLocation)
 * @param onMapReady Callback when map is ready
 */
@Composable
fun OsmMapView(
    modifier: Modifier = Modifier,
    center: GeoPoint = GeoPoint(20.5937, 78.9629), // Default: center of India
    zoom: Double = 14.0,
    markers: List<MapMarkerData> = emptyList(),
    route: List<GeoPoint> = emptyList(),
    showUserLocation: Boolean = false,
    userLatitude: Double = 0.0,
    userLongitude: Double = 0.0,
    onMapReady: ((MapView) -> Unit)? = null
) {
    val context = LocalContext.current

    // Configure osmdroid once
    LaunchedEffect(Unit) {
        Configuration.getInstance().apply {
            userAgentValue = context.packageName
            osmdroidBasePath = context.cacheDir
            osmdroidTileCache = java.io.File(context.cacheDir, "osmdroid/tiles")
        }
    }

    // Track the last center/zoom we programmatically set so we only re-center
    // when the *data* actually changes — not on every recomposition.
    var lastCenter by remember { mutableStateOf<GeoPoint?>(null) }
    var lastZoom by remember { mutableStateOf<Double?>(null) }
    // Track whether the user has manually interacted (pan / pinch-zoom)
    var userHasInteracted by remember { mutableStateOf(false) }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            MapView(ctx).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(true)
                controller.setZoom(zoom)
                controller.setCenter(center)
                lastCenter = center
                lastZoom = zoom
                // Prevent map from intercepting parent scroll
                setOnTouchListener { v, event ->
                    v.parent?.requestDisallowInterceptTouchEvent(true)
                    // Mark that user has manually interacted with the map
                    if (event.action == android.view.MotionEvent.ACTION_MOVE) {
                        userHasInteracted = true
                    }
                    if (event.action == android.view.MotionEvent.ACTION_UP) {
                        v.performClick()
                    }
                    false
                }
                onMapReady?.invoke(this)
            }
        },
        update = { mapView ->
            mapView.overlays.clear()

            // Add user location overlay
            if (showUserLocation && userLatitude != 0.0 && userLongitude != 0.0) {
                val userMarker = Marker(mapView).apply {
                    position = GeoPoint(userLatitude, userLongitude)
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    title = "Your Location"
                    icon = getTintedPinDrawable(context, android.graphics.Color.parseColor("#7C3AED"))
                }
                mapView.overlays.add(userMarker)
            }
            
            // Add route polyline if available
            if (route.isNotEmpty()) {
                val polyline = Polyline(mapView).apply {
                    setPoints(route)
                    outlinePaint.color = android.graphics.Color.parseColor("#4F46E5") // Indigo
                    outlinePaint.strokeWidth = 10f
                    outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                    outlinePaint.strokeJoin = android.graphics.Paint.Join.ROUND
                }
                mapView.overlays.add(polyline)
            }

            // Add facility markers
            markers.forEach { markerData ->
                val marker = Marker(mapView).apply {
                    position = GeoPoint(markerData.latitude, markerData.longitude)
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                    title = markerData.title
                    snippet = markerData.snippet
                    if (markerData.iconRes != null) {
                        icon = androidx.core.content.ContextCompat.getDrawable(context, markerData.iconRes)
                    } else {
                        icon = getTintedPinDrawable(context, markerData.markerColor)
                    }
                    if (markerData.onClick != null) {
                        setOnMarkerClickListener { _, _ ->
                            markerData.onClick.invoke()
                            true
                        }
                    }
                }
                mapView.overlays.add(marker)
            }

            // Only re-center if the data center actually changed (new location / new data load)
            // OR if the user hasn't manually panned/zoomed yet
            val centerChanged = lastCenter == null ||
                lastCenter!!.latitude != center.latitude ||
                lastCenter!!.longitude != center.longitude
            val zoomChanged = lastZoom == null || lastZoom != zoom

            if (centerChanged || (!userHasInteracted && zoomChanged)) {
                if (markers.isNotEmpty() && !userHasInteracted) {
                    try {
                        val points = markers.map { GeoPoint(it.latitude, it.longitude) }.toMutableList()
                        if (showUserLocation && userLatitude != 0.0 && userLongitude != 0.0) {
                            points.add(GeoPoint(userLatitude, userLongitude))
                        }
                        if (points.size > 1) {
                            val boundingBox = org.osmdroid.util.BoundingBox.fromGeoPoints(points)
                            mapView.post {
                                mapView.zoomToBoundingBox(boundingBox, true, 100, 15.0, null)
                            }
                        } else {
                            mapView.controller.setCenter(center)
                            mapView.controller.setZoom(zoom)
                        }
                    } catch (e: Exception) {
                        mapView.controller.setCenter(center)
                        mapView.controller.setZoom(zoom)
                    }
                } else {
                    mapView.controller.setCenter(center)
                    mapView.controller.setZoom(zoom)
                }
                
                lastCenter = center
                lastZoom = zoom
                // Reset interaction flag when new data arrives
                if (centerChanged) userHasInteracted = false
            }

            mapView.invalidate()
        }
    )
}

/**
 * Returns a reliably-bounded native map marker pin tinted to the specified color.
 * Using the native marker guarantees that map clicks register correctly and the
 * map pin targets the exact coordinate correctly.
 */
private fun getTintedPinDrawable(context: Context, color: Int): Drawable {
    val defaultMarker = androidx.core.content.ContextCompat.getDrawable(
        context, 
        org.osmdroid.library.R.drawable.marker_default
    ) ?: return android.graphics.drawable.ColorDrawable(color)
    
    val drawable = androidx.core.graphics.drawable.DrawableCompat.wrap(defaultMarker).mutate()
    androidx.core.graphics.drawable.DrawableCompat.setTint(drawable, color)
    return drawable
}
