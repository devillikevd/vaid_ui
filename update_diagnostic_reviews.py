import sys

file_path = "/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/java/com/example/swastik/ui/screens/patient/diagnostic/DiagnosticDetailScreen.kt"

with open(file_path, "r") as f:
    lines = f.readlines()

# find where `@Composable\nfun DiagnosticReviewSection(` starts
start_index = -1
for i, line in enumerate(lines):
    if line.startswith("fun DiagnosticReviewSection("):
        start_index = i - 1 # Include @Composable
        break

if start_index == -1:
    print("Could not find DiagnosticReviewSection")
    sys.exit(1)

new_content = """@Composable
fun DiagnosticReviewSection(
    facilityId: String,
    uiState: DiagnosticDetailUiState,
    onClearState: () -> Unit,
    onSubmitReview: (Int, String?) -> Unit
) {
    var showReviewForm by remember { androidx.compose.runtime.mutableStateOf(false) }
    var userRating by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    var userComment by remember { androidx.compose.runtime.mutableStateOf("") }
    val colorScheme = MaterialTheme.colorScheme
    val isDarkSurface = colorScheme.surface.luminance() < 0.5f
    val titleColor = if (isDarkSurface) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val isLoggedIn = true // Assume true for now

    val rating = uiState.facility?.rating ?: 0f
    val reviewCount = uiState.facility?.reviewCount ?: 0

    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(stringResource(R.string.reviews), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        Text(
                            "$reviewCount reviews • ${String.format(java.util.Locale.US, "%.1f", rating)} avg",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (!showReviewForm) {
                        if (isLoggedIn) {
                            OutlinedButton(
                                onClick = { showReviewForm = true },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.RateReview, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(stringResource(R.string.write_review), fontSize = 13.sp)
                            }
                        } else {
                            Text(
                                "Login to write a review",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                if (showReviewForm) {
                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(stringResource(R.string.your_rating), fontWeight = FontWeight.Medium, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Star rating
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        for (i in 1..5) {
                            IconButton(
                                onClick = { userRating = i },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(
                                    if (i <= userRating) Icons.Default.Star else Icons.Outlined.StarOutline,
                                    contentDescription = "Rate $i stars",
                                    tint = if (i <= userRating) SwastikOrange else colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = userComment,
                        onValueChange = { userComment = it },
                        label = { Text(stringResource(R.string.your_review_optional_1)) },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (uiState.reviewError != null) {
                        Text(
                            uiState.reviewError,
                            color = colorScheme.error,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    if (uiState.reviewSuccess) {
                        Text(
                            "✅ Review submitted successfully!",
                            color = SwastikGreen,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp
                        )
                        LaunchedEffect(Unit) {
                            kotlinx.coroutines.delay(2000)
                            showReviewForm = false
                            onClearState()
                        }
                    } else {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    showReviewForm = false
                                    userRating = 0
                                    userComment = ""
                                    onClearState()
                                },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text(stringResource(R.string.cancel))
                            }
                            Button(
                                onClick = {
                                    if (userRating > 0) {
                                        onSubmitReview(userRating, userComment.ifBlank { null })
                                    }
                                },
                                enabled = userRating > 0 && !uiState.reviewSubmitting,
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (uiState.reviewSubmitting) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                } else {
                                    Text(stringResource(R.string.submit))
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // ==================== Existing Reviews List ====================
        if (uiState.reviews.isNotEmpty() || uiState.reviewsLoading) {
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            Text("Patient Reviews", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))

            if (uiState.reviewsLoading) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                }
            } else {
                uiState.reviews.forEach { review ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        // Avatar
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(SwastikPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                (review.patient?.name?.firstOrNull() ?: 'A').uppercase(),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = SwastikPrimary
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = review.patient?.name ?: "Anonymous Patient",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                // Star rating
                                Row {
                                    repeat(5) { i ->
                                        Icon(
                                            if (i < review.rating) Icons.Default.Star else Icons.Outlined.StarOutline,
                                            contentDescription = null,
                                            tint = SwastikOrange,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                            }
                            if (!review.comment.isNullOrBlank()) {
                                Text(
                                    review.comment,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        } else if (!uiState.reviewsLoading && uiState.reviews.isEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "No reviews yet. Be the first to review!",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
"""

lines = lines[:start_index]
lines.append(new_content)

with open(file_path, "w") as f:
    f.writelines(lines)
    
print("Updated DiagnosticReviewSection.")
