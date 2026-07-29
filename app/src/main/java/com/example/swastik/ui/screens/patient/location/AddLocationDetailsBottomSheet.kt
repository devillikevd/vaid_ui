package com.example.swastik.ui.screens.patient.location

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.theme.SwastikPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddLocationDetailsBottomSheet(
    initialLabel: String = "",
    initialAddress: String = "",
    onDismiss: () -> Unit,
    onSaveAddress: (label: String, address: String) -> Unit,
    onFetchLocation: (onLocationFetched: (String) -> Unit) -> Unit = {}
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    
    // Parse initial address if it exists
    val addressParts = initialAddress.split(", ").map { it.trim() }
    val initialBuilding = addressParts.getOrNull(0) ?: ""
    val initialStreet = addressParts.getOrNull(1) ?: ""
    val initialLocality = addressParts.drop(2).joinToString(", ").takeIf { it.isNotBlank() } 
        ?: addressParts.getOrNull(2) ?: ""

    // Form fields
    var selectedTab by remember { mutableStateOf(
        if (initialLabel.equals("House", ignoreCase = true) || initialLabel.equals("Office", ignoreCase = true)) 
            initialLabel.replaceFirstChar { it.uppercase() } 
        else if (initialLabel.isNotBlank()) "Other" 
        else "House"
    ) } // "House", "Office", "Other"
    var building by remember { mutableStateOf(initialBuilding) }
    var street by remember { mutableStateOf(initialStreet) }
    var locality by remember { mutableStateOf(initialLocality) }
    var customLabel by remember { mutableStateOf(if (selectedTab == "Other") initialLabel else "") }

    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
    val bgColor = MaterialTheme.colorScheme.surface
    val textColor = MaterialTheme.colorScheme.onSurface
    val inputContainerColor = Color.Transparent
    val borderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = bgColor,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Location Details",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = textColor,
                modifier = Modifier.padding(bottom = 4.dp)
            )

            // Segmented Tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(if (isDark) Color(0xFF2C2C2C) else Color(0xFFF0F0F0))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                SegmentedTab(
                    text = "House",
                    icon = Icons.Default.Home,
                    isSelected = selectedTab == "House",
                    onClick = { selectedTab = "House" },
                    modifier = Modifier.weight(1f)
                )
                SegmentedTab(
                    text = "Office",
                    icon = Icons.Default.Work,
                    isSelected = selectedTab == "Office",
                    onClick = { selectedTab = "Office" },
                    modifier = Modifier.weight(1f)
                )
                SegmentedTab(
                    text = "Other",
                    icon = Icons.Default.Navigation,
                    isSelected = selectedTab == "Other",
                    onClick = { selectedTab = "Other" },
                    modifier = Modifier.weight(1f)
                )
            }

            // Building / Floor
            CustomTextField(
                value = building,
                onValueChange = { building = it },
                placeholder = "Building / Floor *",
                containerColor = inputContainerColor,
                borderColor = borderColor
            )

            // Street
            CustomTextField(
                value = street,
                onValueChange = { street = it },
                placeholder = "Street (Recommended)",
                containerColor = inputContainerColor,
                borderColor = borderColor
            )

            // Area / Locality + Map Thumbnail
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Locality input
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(80.dp) // taller to match the map thumbnail
                ) {
                    CustomTextField(
                        value = locality,
                        onValueChange = { locality = it },
                        placeholder = "Area / Locality",
                        containerColor = inputContainerColor,
                        borderColor = borderColor,
                        modifier = Modifier.fillMaxSize(),
                        singleLine = false
                    )
                }

                // Map Thumbnail Placeholder
                Box(
                    modifier = Modifier
                        .size(90.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                        .clickable {
                            onFetchLocation { fetched ->
                                if (locality.isBlank()) locality = fetched
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Map",
                            tint = SwastikPrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Current",
                            color = SwastikPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Location",
                            color = SwastikPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Custom Label if "Other" is selected
            if (selectedTab == "Other") {
                CustomTextField(
                    value = customLabel,
                    onValueChange = { customLabel = it },
                    placeholder = "Save address as *",
                    containerColor = inputContainerColor,
                    borderColor = borderColor
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Save Button
            val isFormValid = building.isNotBlank() && (selectedTab != "Other" || customLabel.isNotBlank())
            Button(
                onClick = {
                    val finalLabel = if (selectedTab == "Other") customLabel else selectedTab
                    val parts = listOfNotNull(
                        building.takeIf { it.isNotBlank() },
                        street.takeIf { it.isNotBlank() },
                        locality.takeIf { it.isNotBlank() }
                    )
                    val fullAddress = parts.joinToString(", ")
                    onSaveAddress(finalLabel, fullAddress)
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(25.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = SwastikPrimary,
                    disabledContainerColor = SwastikPrimary.copy(alpha = 0.5f)
                ),
                enabled = isFormValid
            ) {
                Text("Save Address", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun SegmentedTab(
    text: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bgColor = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent
    val textColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
    val iconColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(bgColor)
            .clickable { onClick() }
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = text,
            tint = iconColor,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = text,
            color = textColor,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun CustomTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    containerColor: Color,
    borderColor: Color,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f), fontSize = 14.sp) },
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = containerColor,
            unfocusedContainerColor = containerColor,
            focusedBorderColor = SwastikPrimary,
            unfocusedBorderColor = borderColor,
            focusedTextColor = MaterialTheme.colorScheme.onSurface,
            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
        ),
        singleLine = singleLine
    )
}
