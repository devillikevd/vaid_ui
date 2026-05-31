package com.example.swastik.ui.screens.patient.appointments

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

@Composable
fun MultiEntityReviewDialog(
    doctorName: String,
    facilityName: String?,
    facilityType: String?, // "hospital" or "clinic"
    onDismiss: () -> Unit,
    onSubmitReview: (targetType: String, rating: Int, comment: String) -> Unit
) {
    var selectedTarget by remember { mutableStateOf("doctor") } // "doctor", "hospital", "clinic"
    var rating by remember { mutableIntStateOf(0) }
    var comment by remember { mutableStateOf("") }
    
    val accentBlue = Color(0xFF4C8DFF)
    
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color.White
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Close Button
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopEnd) {
                    IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF1E293B))
                    }
                }
                
                Text(
                    text = "Write a Review",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // Target selection
                if (facilityName != null && facilityType != null) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                            .padding(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { 
                                    selectedTarget = "doctor"
                                    rating = 0
                                    comment = ""
                                }
                                .background(
                                    if (selectedTarget == "doctor") Color.White else Color.Transparent,
                                    RoundedCornerShape(8.dp)
                                )
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Doctor", fontWeight = if (selectedTarget == "doctor") FontWeight.Bold else FontWeight.Medium, color = if (selectedTarget == "doctor") accentBlue else Color(0xFF64748B))
                        }
                        
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { 
                                    selectedTarget = facilityType.lowercase()
                                    rating = 0
                                    comment = ""
                                }
                                .background(
                                    if (selectedTarget == facilityType.lowercase()) Color.White else Color.Transparent,
                                    RoundedCornerShape(8.dp)
                                )
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(facilityType.replaceFirstChar { it.uppercase() }, fontWeight = if (selectedTarget == facilityType.lowercase()) FontWeight.Bold else FontWeight.Medium, color = if (selectedTarget == facilityType.lowercase()) accentBlue else Color(0xFF64748B))
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(20.dp))
                }
                
                val targetName = if (selectedTarget == "doctor") doctorName else facilityName ?: ""
                
                Text(
                    text = "Rate your experience with $targetName",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF334155)
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Rating Bar
                Row(horizontalArrangement = Arrangement.Center) {
                    for (i in 1..5) {
                        Icon(
                            imageVector = if (i <= rating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                            contentDescription = "Star $i",
                            tint = if (i <= rating) Color(0xFFFFB800) else Color(0xFF94A3B8).copy(alpha = 0.5f),
                            modifier = Modifier
                                .size(40.dp)
                                .padding(4.dp)
                                .clickable { rating = i }
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    modifier = Modifier.fillMaxWidth().height(100.dp),
                    placeholder = { Text("Share details of your experience (optional)", fontSize = 14.sp) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = accentBlue,
                        unfocusedBorderColor = Color(0xFFE2E8F0)
                    )
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = { onSubmitReview(selectedTarget, rating, comment) },
                    enabled = rating > 0,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentBlue),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Submit Review", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
