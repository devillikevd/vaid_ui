package com.example.swastik.ui.screens.consultation

import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Message
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

@Composable
fun ConsultationCompletionDialog(
    userName: String = "Patient",
    doctorName: String? = null,
    onDismiss: () -> Unit,
    onSubmitReview: (Int, String) -> Unit = { _, _ -> }
) {
    val surfaceColor = Color.White
    val accentBlue = Color(0xFF4C8DFF)
    val onSurfaceColor = Color(0xFF1E293B)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false // Enable full screen width
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = surfaceColor
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(20.dp))
                
                // Close button at top right
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopEnd) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = onSurfaceColor)
                    }
                }

                CompletionStatusIcon()

                Spacer(modifier = Modifier.height(22.dp))

                Text(
                    text = "Consultation Complete",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = onSurfaceColor
                )

                Spacer(modifier = Modifier.height(16.dp))

                var rating by remember { mutableIntStateOf(0) }
                var comment by remember { mutableStateOf("") }
                var isSubmitting by remember { mutableStateOf(false) }
                
                Text(
                    text = if (doctorName != null) "Rate your experience with $doctorName" else "How was your experience?",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = onSurfaceColor,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                RatingBar(
                    rating = rating,
                    onRatingChanged = { 
                        // If same star clicked again, reset to 0
                        rating = if (rating == it) 0 else it 
                    }
                )
                
                if (rating > 0) {
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = comment,
                        onValueChange = { comment = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Leave a review (optional)", color = onSurfaceColor.copy(alpha = 0.5f)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = onSurfaceColor,
                            unfocusedTextColor = onSurfaceColor,
                            cursorColor = accentBlue,
                            focusedBorderColor = accentBlue,
                            unfocusedBorderColor = Color(0xFFE2E8F0)
                        ),
                        maxLines = 3
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Thanks, $userName. Your session has been closed safely and the consultation context stays linked to your health history.",
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                    textAlign = TextAlign.Center,
                    color = onSurfaceColor.copy(alpha = 0.7f)
                )

                Spacer(modifier = Modifier.height(22.dp))

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CompletionInfoRow(
                        icon = Icons.Outlined.Description,
                        title = "Consultation records stay together",
                        description = "Notes, prescriptions, and follow-up context can appear here after the doctor finishes them."
                    )
                    CompletionInfoRow(
                        icon = Icons.AutoMirrored.Outlined.Message,
                        title = "Chat history remains attached",
                        description = "Messages from this consultation stay tied to the same session record."
                    )
                    CompletionInfoRow(
                        icon = Icons.Outlined.Lock,
                        title = "Session closed securely",
                        description = "The room is ended and your media connection is no longer active."
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { 
                        if (rating > 0 && !isSubmitting) {
                            isSubmitting = true
                            onSubmitReview(rating, comment)
                        } else {
                            onDismiss() 
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentBlue)
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = if (rating > 0) "Submit Review & Done" else "Done",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun CompletionStatusIcon() {
    Box(
        modifier = Modifier
            .size(104.dp)
            .clip(CircleShape)
            .background(Color(0xFF2DD4BF).copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(76.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        listOf(
                            Color(0xFF2DD4BF),
                            Color(0xFF4C8DFF)
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.CheckCircle,
                contentDescription = "Complete",
                tint = Color.White,
                modifier = Modifier.size(34.dp)
            )
        }
    }
}

@Composable
private fun CompletionInfoRow(
    icon: ImageVector,
    title: String,
    description: String
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFF8FAFC),
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF4C8DFF).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = Color(0xFF4C8DFF),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.size(12.dp))

            Column {
                Text(
                    text = title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    color = Color(0xFF64748B)
                )
            }
        }
    }
}

@Composable
fun RatingBar(
    rating: Int,
    onRatingChanged: (Int) -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 1..5) {
            Icon(
                imageVector = if (i <= rating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                contentDescription = "Star $i",
                tint = if (i <= rating) Color(0xFFFFB800) else Color(0xFF94A3B8).copy(alpha = 0.5f),
                modifier = Modifier
                    .size(44.dp)
                    .padding(4.dp)
                    .clickable { onRatingChanged(i) }
            )
        }
    }
}