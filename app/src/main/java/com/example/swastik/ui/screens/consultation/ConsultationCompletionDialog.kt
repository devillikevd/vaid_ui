package com.example.swastik.ui.screens.consultation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Message
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
    onDismiss: () -> Unit,
    onSubmitReview: (Int, String) -> Unit = { _, _ -> }
) {
    val surfaceColor = Color(0xFF101A30)
    val accentBlue = Color(0xFF4C8DFF)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(30.dp),
            colors = CardDefaults.cardColors(containerColor = surfaceColor),
            elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CompletionStatusIcon()

                Spacer(modifier = Modifier.height(22.dp))

                Text(
                    text = "Consultation Complete",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(16.dp))

                var rating by remember { mutableStateOf(0) }
                var comment by remember { mutableStateOf("") }
                var isSubmitting by remember { mutableStateOf(false) }
                
                Text(
                    text = "How was your experience?",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                RatingBar(
                    rating = rating,
                    onRatingChanged = { rating = it }
                )
                
                if (rating > 0) {
                    Spacer(modifier = Modifier.height(16.dp))
                    androidx.compose.material3.OutlinedTextField(
                        value = comment,
                        onValueChange = { comment = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Leave a review (optional)", color = Color.White.copy(alpha = 0.5f)) },
                        colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            cursorColor = accentBlue,
                            focusedBorderColor = accentBlue,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.2f)
                        ),
                        maxLines = 3
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Thanks, $userName. Your session has been closed safely and the consultation context stays linked to your health history.",
                    fontSize = 14.sp,
                    lineHeight = 22.sp,
                    textAlign = TextAlign.Center,
                    color = Color.White.copy(alpha = 0.7f)
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
                        androidx.compose.material3.CircularProgressIndicator(
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
            .background(Color(0xFF2DD4BF).copy(alpha = 0.16f)),
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
        color = Color.White.copy(alpha = 0.06f),
        shape = RoundedCornerShape(18.dp)
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
                    .background(Color(0xFF4C8DFF).copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = Color(0xFF9FC0FF),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.size(12.dp))

            Column {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    fontSize = 12.sp,
                    lineHeight = 18.sp,
                    color = Color.White.copy(alpha = 0.62f)
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
                tint = if (i <= rating) Color(0xFFFFB800) else Color.White.copy(alpha = 0.3f),
                modifier = Modifier
                    .size(40.dp)
                    .padding(4.dp)
                    .clickable { onRatingChanged(i) }
            )
        }
    }
}
