package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.Medicine
import com.example.swastik.ui.theme.SwastikPrimary
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.painterResource
import com.example.swastik.R
import coil.compose.AsyncImage

/**
 * Reusable components for Medicine screens
 */

// ==================== MEDICINE CARD ====================
/**
 * Card component for displaying medicine in a grid/list
 */
@Composable
fun MedicineCard(
    medicine: Medicine,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Medicine Icon/Image and Name
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Medicine Image or Emoji fallback
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    if (!medicine.imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = medicine.imageUrl,
                            contentDescription = "Medicine image",
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(12.dp))
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(SwastikPrimary.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(getMedicineEmoji(medicine.safeCategoryName), fontSize = 24.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            medicine.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (medicine.requiresPrescription) {
                            Spacer(modifier = Modifier.width(6.dp))
                            PrescriptionBadge()
                        }
                    }
                    Text(
                        medicine.manufacturer ?: "",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Stock Status
                StockStatusBadge(inStock = medicine.inStock)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Price and Pharmacy
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "₹${medicine.effectivePrice}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = SwastikPrimary
                    )
                    val strikePrice = when {
                        medicine.hasActiveCampaign -> medicine.price
                        else -> medicine.mrp
                    }
                    if (strikePrice != null && strikePrice > medicine.effectivePrice) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "₹$strikePrice",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textDecoration = TextDecoration.LineThrough
                        )
                    }
                    if (medicine.discountPercentage > 0) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            color = MaterialTheme.colorScheme.secondary,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                "${medicine.discountPercentage.toInt()}% OFF",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.surface,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        medicine.nearbyPharmacy ?: "",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

// ==================== COMPACT MEDICINE ITEM ====================
/**
 * Compact medicine item for list view
 */
@Composable
fun CompactMedicineItem(
    medicine: Medicine,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Medicine Image or Icon
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (!medicine.imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = medicine.imageUrl,
                    contentDescription = "Medicine image",
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(10.dp))
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(SwastikPrimary.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(getMedicineEmoji(medicine.safeCategoryName), fontSize = 20.sp)
                }
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Medicine Info
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    medicine.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (medicine.requiresPrescription) {
                    Spacer(modifier = Modifier.width(6.dp))
                    PrescriptionBadge(small = true)
                }
            }
            Text(
                "₹${medicine.effectivePrice} • ${medicine.manufacturer ?: ""}",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Stock and Pharmacy
        Column(horizontalAlignment = Alignment.End) {
            StockStatusBadge(inStock = medicine.inStock, small = true)
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    medicine.nearbyPharmacy ?: "",
                    fontSize = 11.sp,
                    color = SwastikPrimary,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

// ==================== BADGES ====================
/**
 * Prescription required badge
 */
@Composable
fun PrescriptionBadge(
    small: Boolean = false
) {
    Box(
        modifier = Modifier
            .background(
                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f),
                RoundedCornerShape(if (small) 4.dp else 6.dp)
            )
            .padding(
                horizontal = if (small) 4.dp else 6.dp,
                vertical = if (small) 1.dp else 2.dp
            )
    ) {
        Text(
            stringResource(R.string.rx),
            fontSize = if (small) 8.sp else 10.sp,
            color = MaterialTheme.colorScheme.tertiary,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * Stock status badge
 */
@Composable
fun StockStatusBadge(
    inStock: Boolean,
    small: Boolean = false
) {
    Box(
        modifier = Modifier
            .background(
                if (inStock) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.errorContainer,
                RoundedCornerShape(if (small) 4.dp else 6.dp)
            )
            .padding(
                horizontal = if (small) 6.dp else 8.dp,
                vertical = if (small) 2.dp else 4.dp
            )
    ) {
        Text(
            text = if (inStock) "In Stock" else "Out of Stock",
            fontSize = if (small) 10.sp else 11.sp,
            color = if (inStock) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
            fontWeight = FontWeight.Medium
        )
    }
}

// ==================== PHARMACY CHIP ====================
/**
 * Pharmacy location chip
 */
@Composable
fun PharmacyChip(
    pharmacyName: String,
    distance: String? = null,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .background(SwastikPrimary.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Default.LocationOn,
            contentDescription = null,
            tint = SwastikPrimary,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            pharmacyName,
            fontSize = 13.sp,
            color = SwastikPrimary,
            fontWeight = FontWeight.Medium
        )
        if (distance != null) {
            Text(
                " • $distance",
                fontSize = 12.sp,
                color = SwastikPrimary.copy(alpha = 0.7f)
            )
        }
    }
}

// ==================== CATEGORY CHIP ====================
/**
 * Medicine category filter chip
 */
@Composable
fun CategoryFilterChip(
    category: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = onClick,
        label = {
            Text(
                category,
                fontSize = 13.sp
            )
        },
        leadingIcon = if (isSelected) {
            {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
            }
        } else null,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = SwastikPrimary,
            selectedLabelColor = MaterialTheme.colorScheme.surface,
            selectedLeadingIconColor = MaterialTheme.colorScheme.surface
        )
    )
}

// ==================== QUANTITY SELECTOR ====================
/**
 * Quantity selector component
 */
@Composable
fun QuantitySelector(
    quantity: Int,
    onQuantityChange: (Int) -> Unit,
    minQuantity: Int = 1,
    maxQuantity: Int = 10
) {
    val haptic = LocalHapticFeedback.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
            .padding(4.dp)
    ) {
        IconButton(
            onClick = { 
                if (quantity > minQuantity) {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onQuantityChange(quantity - 1) 
                }
            },
            enabled = quantity > minQuantity,
            modifier = Modifier.size(32.dp)
        ) {
            Icon(
                Icons.Default.Remove,
                contentDescription = "Decrease",
                tint = if (quantity > minQuantity) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Text(
            text = quantity.toString(),
            modifier = Modifier.width(40.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp
        )

        IconButton(
            onClick = { 
                if (quantity < maxQuantity) {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onQuantityChange(quantity + 1) 
                }
            },
            enabled = quantity < maxQuantity,
            modifier = Modifier.size(32.dp)
        ) {
            Icon(
                Icons.Default.Add,
                contentDescription = "Increase",
                tint = if (quantity < maxQuantity) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ==================== PRICE DISPLAY ====================
/**
 * Price display with optional original price for discounts
 */
@Composable
fun PriceDisplay(
    price: Int,
    modifier: Modifier = Modifier,
    originalPrice: Int? = null
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            "₹$price",
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp,
            color = SwastikPrimary
        )
        if (originalPrice != null && originalPrice > price) {
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "₹$originalPrice",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = androidx.compose.ui.text.TextStyle(
                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                )
            )
            Spacer(modifier = Modifier.width(8.dp))
            val discount = ((originalPrice - price) * 100 / originalPrice)
            Box(
                modifier = Modifier
                    .background(MaterialTheme.colorScheme.secondary, RoundedCornerShape(4.dp))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    "$discount% OFF",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.surface,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// ==================== HELPER FUNCTIONS ====================
/**
 * Get emoji based on medicine category
 */
fun getMedicineEmoji(category: String?): String {
    val cat = category?.uppercase() ?: return "💊"
    return when {
        cat.contains("TABLET") || cat.contains("CAPSULE") -> "💊"
        cat.contains("SYRUP") -> "🧴"
        cat.contains("INJECTION") -> "💉"
        cat.contains("OINTMENT") || cat.contains("CREAM") || cat.contains("GEL") -> "🧴"
        cat.contains("DROP") -> "💧"
        cat.contains("POWDER") -> "🥄"
        cat.contains("INHALER") || cat.contains("RESPIRATORY") -> "🫁"
        cat.contains("AYURVED") -> "🌿"
        cat.contains("VITAMIN") -> "✨"
        cat.contains("DIABET") -> "🩸"
        cat.contains("CARDIAC") || cat.contains("HEART") -> "❤️"
        cat.contains("PAIN") -> "🩹"
        cat.contains("DEVICE") -> "🩺"
        cat.contains("BABY") -> "👶"
        cat.contains("EYE") -> "👁️"
        cat.contains("DENTAL") -> "🦷"
        else -> "💊"
    }
}

/**
 * Get color based on medicine category
 */
@Composable
fun getMedicineCategoryColor(category: String?): Color {
    val cat = category?.uppercase() ?: return Color(0xFF6C63FF)
    return when {
        cat.contains("TABLET") -> Color(0xFF6C63FF)
        cat.contains("CAPSULE") -> MaterialTheme.colorScheme.secondary
        cat.contains("SYRUP") -> MaterialTheme.colorScheme.tertiary
        cat.contains("INJECTION") -> MaterialTheme.colorScheme.error
        cat.contains("OINTMENT") || cat.contains("CREAM") -> Color(0xFF2196F3)
        cat.contains("DROP") -> Color(0xFF00BCD4)
        cat.contains("POWDER") -> Color(0xFF9C27B0)
        else -> Color(0xFF6C63FF)
    }
}
