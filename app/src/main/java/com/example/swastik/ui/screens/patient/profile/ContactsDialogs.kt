package com.example.swastik.ui.screens.patient.profile

import android.Manifest
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.widget.Toast
import android.location.Geocoder
import com.google.android.gms.location.LocationServices
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.*
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

// ==================== EMERGENCY CONTACTS DIALOG ====================

@Composable
fun EmergencyContactsDialog(
    contacts: List<EmergencyContact>,
    onDismiss: () -> Unit,
    onAddContact: (String, String, String) -> Unit,
    onDeleteContact: (String) -> Unit
) {
    var showAddForm by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }
    var newRelation by remember { mutableStateOf("") }
    var contactToDelete by remember { mutableStateOf<EmergencyContact?>(null) }
    
    var showRelationDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val contactPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickContact()
    ) { uri ->
        uri?.let {
            val projection = arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            )
            try {
                context.contentResolver.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    projection,
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                    arrayOf(it.lastPathSegment),
                    null
                )?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                        val numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                        if (nameIndex != -1 && numberIndex != -1) {
                            newName = cursor.getString(nameIndex)
                            newPhone = cursor.getString(numberIndex).filter { c -> c.isDigit() || c == '+' }
                            showRelationDialog = true
                        }
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error reading contact details", Toast.LENGTH_SHORT).show()
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            contactPickerLauncher.launch(null)
        } else {
            Toast.makeText(context, "Permission to read contacts is required", Toast.LENGTH_SHORT).show()
        }
    }

    val colorScheme = MaterialTheme.colorScheme

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.ContactEmergency, null, tint = colorScheme.error)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.emergency_contacts), fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = {
                    val hasPermission = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.READ_CONTACTS
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    if (hasPermission) {
                        contactPickerLauncher.launch(null)
                    } else {
                        permissionLauncher.launch(Manifest.permission.READ_CONTACTS)
                    }
                }) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "Pick from contacts",
                        tint = SwastikPrimary
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { showAddForm = !showAddForm },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary.copy(alpha = 0.1f), contentColor = SwastikPrimary)
                ) {
                    Icon(if (showAddForm) Icons.Default.Close else Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (showAddForm) "Cancel" else "Add Manually")
                }

                if (showAddForm) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SwastikPrimary.copy(alpha = 0.05f)),
                        border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.2f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(stringResource(R.string.add_emergency_contact), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SwastikPrimary)
                            OutlinedTextField(
                                value = newName, onValueChange = { newName = it },
                                label = { Text(stringResource(R.string.name)) }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            OutlinedTextField(
                                value = newPhone, onValueChange = { newPhone = it.filter { c -> c.isDigit() || c == '+' } },
                                label = { Text(stringResource(R.string.phone_number)) }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                            )
                            OutlinedTextField(
                                value = newRelation, onValueChange = { newRelation = it },
                                label = { Text(stringResource(R.string.relation)) }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            Button(
                                onClick = {
                                    if (newName.isNotBlank() && newPhone.isNotBlank() && newRelation.isNotBlank()) {
                                        val isDuplicate = contacts.any { it.phone.replace(" ", "") == newPhone.replace(" ", "") }
                                        if (isDuplicate) {
                                            Toast.makeText(context, "This number is already added!", Toast.LENGTH_SHORT).show()
                                        } else {
                                            onAddContact(newName, newPhone, newRelation)
                                            newName = ""; newPhone = ""; newRelation = ""
                                            showAddForm = false
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                                enabled = newName.isNotBlank() && newPhone.isNotBlank() && newRelation.isNotBlank()
                            ) { Text(stringResource(R.string.add_contact)) }
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }

                if (contacts.isEmpty() && !showAddForm) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Outlined.ContactEmergency, null, tint = colorScheme.outline, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(stringResource(R.string.no_emergency_contacts_added), fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.tap_to_add_contacts_for_emergencies), fontSize = 12.sp, color = colorScheme.outline)
                    }
                } else {
                    contacts.forEach { contact ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.errorContainer.copy(alpha = 0.8f))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Person, null, tint = colorScheme.error)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(contact.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(contact.phone, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                                    Text(contact.relationship, fontSize = 11.sp, color = colorScheme.error)
                                }
                                IconButton(onClick = { contactToDelete = contact }) {
                                    Icon(Icons.Outlined.Delete, null, tint = colorScheme.error, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.done)) }
        },
        shape = RoundedCornerShape(20.dp)
    )

    // Relation Picker Dialog
    if (showRelationDialog) {
        val relationOptions = listOf("Father", "Mother", "Spouse", "Brother", "Sister", "Friend", "Other")
        AlertDialog(
            onDismissRequest = { showRelationDialog = false },
            title = { Text(stringResource(R.string.select_relationship), fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    relationOptions.forEach { relation ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { 
                                    val isDuplicate = contacts.any { it.phone.replace(" ", "") == newPhone.replace(" ", "") }
                                    if (isDuplicate) {
                                        Toast.makeText(context, "This number is already added!", Toast.LENGTH_SHORT).show()
                                        showRelationDialog = false
                                    } else {
                                        newRelation = relation
                                        onAddContact(newName, newPhone, newRelation)
                                        showRelationDialog = false
                                    }
                                }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(relation, fontSize = 16.sp)
                        }
                        if (relation != relationOptions.last()) {
                            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.2f))
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showRelationDialog = false }) { Text(stringResource(R.string.cancel)) }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // Delete confirmation dialog
    contactToDelete?.let { contact ->
        val dialogColorScheme = MaterialTheme.colorScheme
        AlertDialog(
            onDismissRequest = { contactToDelete = null },
            title = { Text(stringResource(R.string.delete_contact_1), fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "Are you sure you want to remove ${contact.name} from your emergency contacts? This action cannot be undone.",
                    fontSize = 14.sp,
                    color = dialogColorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteContact(contact.id)
                        contactToDelete = null
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = dialogColorScheme.error)
                ) { Text(stringResource(R.string.delete)) }
            },
            dismissButton = {
                TextButton(onClick = { contactToDelete = null }) { Text(stringResource(R.string.cancel)) }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }
}

// ==================== FAMILY MEMBERS DIALOG ====================

@Composable
fun FamilyMembersDialog(
    members: List<FamilyMember>,
    onDismiss: () -> Unit,
    onAddMember: (String, String, String?) -> Unit,
    onDeleteMember: (String) -> Unit
) {
    var showAddForm by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newRelation by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }
    var memberToDelete by remember { mutableStateOf<FamilyMember?>(null) }
    val colorScheme = MaterialTheme.colorScheme

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.FamilyRestroom, null, tint = SwastikPrimary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.family_members), fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { showAddForm = !showAddForm }) {
                    Icon(
                        if (showAddForm) Icons.Default.Close else Icons.Default.Add,
                        contentDescription = if (showAddForm) stringResource(R.string.cancel) else "Add Member",
                        tint = SwastikPrimary
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showAddForm) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SwastikPrimary.copy(alpha = 0.05f)),
                        border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.2f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(stringResource(R.string.add_family_member), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SwastikPrimary)
                            OutlinedTextField(
                                value = newName, onValueChange = { newName = it },
                                label = { Text(stringResource(R.string.name)) }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            OutlinedTextField(
                                value = newRelation, onValueChange = { newRelation = it },
                                label = { Text(stringResource(R.string.relation)) }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            OutlinedTextField(
                                value = newPhone, onValueChange = { newPhone = it.filter { c -> c.isDigit() || c == '+' } },
                                label = { Text(stringResource(R.string.phone_optional)) }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                            )
                            Button(
                                onClick = {
                                    if (newName.isNotBlank() && newRelation.isNotBlank()) {
                                        onAddMember(newName, newRelation, newPhone.ifBlank { null })
                                        newName = ""; newRelation = ""; newPhone = ""
                                        showAddForm = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                                enabled = newName.isNotBlank() && newRelation.isNotBlank()
                            ) { Text(stringResource(R.string.add_member)) }
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }

                if (members.isEmpty() && !showAddForm) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Outlined.FamilyRestroom, null, tint = colorScheme.outline, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(stringResource(R.string.no_family_members_linked), fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.tap_to_link_family_profiles), fontSize = 12.sp, color = colorScheme.outline)
                    }
                } else {
                    members.forEach { member ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = SwastikPrimary.copy(alpha = 0.06f))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier.size(40.dp).clip(CircleShape)
                                        .background(SwastikPrimary.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(member.name.take(1).uppercase(), color = SwastikPrimary, fontWeight = FontWeight.Bold)
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(member.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(member.relationship, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                                }
                                IconButton(onClick = { memberToDelete = member }) {
                                    Icon(Icons.Outlined.Delete, null, tint = colorScheme.error, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.done)) }
        },
        shape = RoundedCornerShape(20.dp)
    )

    // Delete confirmation dialog
    memberToDelete?.let { member ->
        val dialogColorScheme = MaterialTheme.colorScheme
        AlertDialog(
            onDismissRequest = { memberToDelete = null },
            title = { Text(stringResource(R.string.remove_member), fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "Are you sure you want to remove ${member.name} from your family members? This action cannot be undone.",
                    fontSize = 14.sp,
                    color = dialogColorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteMember(member.id)
                        memberToDelete = null
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = dialogColorScheme.error)
                ) { Text(stringResource(R.string.remove)) }
            },
            dismissButton = {
                TextButton(onClick = { memberToDelete = null }) { Text(stringResource(R.string.cancel)) }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }
}

// ==================== SAVED ADDRESSES DIALOG (with CRUD) ====================

@Composable
fun SavedAddressesDialog(
    addresses: List<SavedAddress>,
    onDismiss: () -> Unit,
    onAddAddress: (String, String) -> Unit,
    onDeleteAddress: (String) -> Unit
) {
    var showAddForm by remember { mutableStateOf(false) }
    var newLabel by remember { mutableStateOf("") }
    var houseNumber by remember { mutableStateOf("") }
    var areaLocality by remember { mutableStateOf("") }
    var isFetchingLocation by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        
        if (fineLocationGranted || coarseLocationGranted) {
            isFetchingLocation = true
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        try {
                            val geocoder = Geocoder(context, java.util.Locale.getDefault())
                            val addressesList = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                            if (!addressesList.isNullOrEmpty()) {
                                val fetchedAddress = addressesList[0]
                                val subLocality = fetchedAddress.subLocality
                                val locality = fetchedAddress.locality
                                val adminArea = fetchedAddress.adminArea
                                val postalCode = fetchedAddress.postalCode
                                val parts = listOfNotNull(subLocality, locality, adminArea, postalCode).filter { it.isNotBlank() }
                                if (parts.isNotEmpty()) {
                                    areaLocality = parts.joinToString(", ")
                                } else {
                                    areaLocality = fetchedAddress.getAddressLine(0) ?: ""
                                }
                            } else {
                                Toast.makeText(context, "Could not fetch address details", Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(context, "Geocoder failed: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(context, "Location not available. Ensure GPS is ON.", Toast.LENGTH_SHORT).show()
                    }
                    isFetchingLocation = false
                }.addOnFailureListener {
                    Toast.makeText(context, "Failed to get location", Toast.LENGTH_SHORT).show()
                    isFetchingLocation = false
                }
            } catch (e: SecurityException) {
                isFetchingLocation = false
            }
        } else {
            Toast.makeText(context, "Location permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    val fetchLocation: () -> Unit = {
        val fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        
        if (fineGranted || coarseGranted) {
            isFetchingLocation = true
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        try {
                            val geocoder = Geocoder(context, java.util.Locale.getDefault())
                            val addressesList = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                            if (!addressesList.isNullOrEmpty()) {
                                val fetchedAddress = addressesList[0]
                                val subLocality = fetchedAddress.subLocality
                                val locality = fetchedAddress.locality
                                val adminArea = fetchedAddress.adminArea
                                val postalCode = fetchedAddress.postalCode
                                val parts = listOfNotNull(subLocality, locality, adminArea, postalCode).filter { it.isNotBlank() }
                                if (parts.isNotEmpty()) {
                                    areaLocality = parts.joinToString(", ")
                                } else {
                                    areaLocality = fetchedAddress.getAddressLine(0) ?: ""
                                }
                            } else {
                                Toast.makeText(context, "Could not fetch address details", Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(context, "Geocoder failed: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(context, "Location not available. Ensure GPS is ON.", Toast.LENGTH_SHORT).show()
                    }
                    isFetchingLocation = false
                }.addOnFailureListener {
                    Toast.makeText(context, "Failed to get location", Toast.LENGTH_SHORT).show()
                    isFetchingLocation = false
                }
            } catch (e: SecurityException) {
                isFetchingLocation = false
            }
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.LocationOn, null, tint = SwastikPrimary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.saved_addresses), fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { showAddForm = !showAddForm }) {
                    Icon(
                        if (showAddForm) Icons.Default.Close else Icons.Default.Add,
                        contentDescription = if (showAddForm) stringResource(R.string.cancel) else "Add Address",
                        tint = SwastikPrimary
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showAddForm) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SwastikPrimary.copy(alpha = 0.05f)),
                        border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.2f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(stringResource(R.string.add_address), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SwastikPrimary)
                            
                            Button(
                                onClick = fetchLocation,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colorScheme.secondaryContainer,
                                    contentColor = colorScheme.onSecondaryContainer
                                ),
                                enabled = !isFetchingLocation
                            ) {
                                if (isFetchingLocation) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = colorScheme.onSecondaryContainer, strokeWidth = 2.dp)
                                    Spacer(Modifier.width(8.dp))
                                    Text(stringResource(R.string.fetching_location_1))
                                } else {
                                    Icon(Icons.Outlined.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(stringResource(R.string.autofetch_current_location))
                                }
                            }

                            OutlinedTextField(
                                value = newLabel, onValueChange = { newLabel = it },
                                label = { Text(stringResource(R.string.label_e_g_home_office)) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            
                            OutlinedTextField(
                                value = houseNumber, onValueChange = { houseNumber = it },
                                label = { Text(stringResource(R.string.house_flat_block_no)) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            
                            OutlinedTextField(
                                value = areaLocality, onValueChange = { areaLocality = it },
                                label = { Text(stringResource(R.string.area_street_locality)) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                maxLines = 3
                            )
                            
                            Button(
                                onClick = {
                                    val finalAddress = if (houseNumber.isNotBlank()) "$houseNumber, $areaLocality" else areaLocality
                                    onAddAddress(newLabel, finalAddress)
                                    newLabel = ""; houseNumber = ""; areaLocality = ""
                                    showAddForm = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                                enabled = newLabel.isNotBlank() && areaLocality.isNotBlank() && houseNumber.isNotBlank()
                            ) { Text(stringResource(R.string.save_address)) }
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }

                if (addresses.isEmpty() && !showAddForm) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Outlined.LocationOn, null, tint = colorScheme.outline, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(stringResource(R.string.no_addresses_saved), fontSize = 14.sp, color = colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.save_your_home_office_etc_for_quick_access), fontSize = 12.sp, color = colorScheme.outline)
                    }
                } else {
                    addresses.forEach { address ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surfaceVariant.copy(alpha = 0.55f))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    if (address.label.lowercase() == "home") Icons.Outlined.Home else Icons.Outlined.Business,
                                    null,
                                    tint = SwastikPrimary
                                )
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(address.label, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(address.address, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                                }
                                IconButton(onClick = { onDeleteAddress(address.id) }) {
                                    Icon(Icons.Outlined.Delete, contentDescription = "Delete Address", tint = colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.done)) }
        },
        shape = RoundedCornerShape(20.dp)
    )
}
