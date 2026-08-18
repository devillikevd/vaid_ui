package com.example.swastik.ui.screens.patient.community

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.swastik.data.model.CommunityAnswer
import com.example.swastik.data.model.CommunityQuestion
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.viewmodel.CommunityViewModel
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityQADetailsScreen(
    navController: NavController,
    questionId: String,
    viewModel: CommunityViewModel = hiltViewModel()
) {
    val question by viewModel.selectedQuestion.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var reportTarget by remember { mutableStateOf<Pair<String, String>?>(null) } // pair of (targetType, id)

    LaunchedEffect(questionId) {
        viewModel.fetchQuestionDetails(questionId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.question), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    question?.let {
                        IconButton(onClick = { viewModel.toggleBookmark(it.id) }) {
                            Icon(
                                imageVector = if (it.isBookmarked == true) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                contentDescription = "Bookmark",
                                tint = if (it.isBookmarked == true) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        val context = androidx.compose.ui.platform.LocalContext.current
                        IconButton(onClick = {
                            val sendIntent = android.content.Intent().apply {
                                action = android.content.Intent.ACTION_SEND
                                putExtra(android.content.Intent.EXTRA_TEXT, "Check out this question on Vaididea:\n\n${it.title}\n\nJoin the discussion on our app!")
                                type = "text/plain"
                            }
                            val shareIntent = android.content.Intent.createChooser(sendIntent, "Share Question")
                            context.startActivity(shareIntent)
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Share")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        }
    ) { paddingValues ->
        if (isLoading && question == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SwastikPrimary)
            }
        } else {
            question?.let { q ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .background(MaterialTheme.colorScheme.background),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    item {
                        val isOwner = q.patient?.userId == viewModel.currentUserId
                        QuestionDetailsCard(
                            question = q,
                            isOwner = isOwner,
                            onDelete = {
                                viewModel.deleteQuestion(q.id) {
                                    navController.popBackStack()
                                }
                            },
                            onReport = if (!isOwner) { { reportTarget = "question" to q.id } } else null
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Answers (${q.answers?.size ?: 0})",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    items(q.answers ?: emptyList()) { answer ->
                        val isQuestionOwner = q.patient?.userId == viewModel.currentUserId
                        AnswerCard(
                            answer = answer,
                            isQuestionOwner = isQuestionOwner,
                            hasUpvoted = viewModel.hasUpvoted(answer.id),
                            onUpvote = { viewModel.upvoteAnswer(answer.id) },
                            onDelete = { viewModel.deleteAnswer(answer.id, q.id) },
                            onReport = { reportTarget = "answer" to answer.id }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
            }
        }
        reportTarget?.let { target ->
            ReportBottomSheet(
                targetType = target.first,
                onDismiss = { reportTarget = null },
                onSubmit = { reason, details ->
                    reportTarget = null
                    if (target.first == "question") {
                        viewModel.reportQuestion(target.second, reason, details) {
                            viewModel.fetchQuestionDetails(questionId)
                        }
                    } else {
                        viewModel.reportAnswer(target.second, reason, details) {}
                    }
                }
            )
        }
    }
}

@Composable
fun QuestionDetailsCard(question: CommunityQuestion, isOwner: Boolean = false, onDelete: () -> Unit = {}, onReport: (() -> Unit)? = null) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showOptionsMenu by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    
    if (showEditDialog) {
        var editTitle by remember { mutableStateOf(question.title) }
        var editContent by remember { mutableStateOf(question.content) }
        val context = androidx.compose.ui.platform.LocalContext.current
        
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text("Edit Question", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    OutlinedTextField(
                        value = editTitle,
                        onValueChange = { editTitle = it },
                        label = { Text("Title") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = editContent,
                        onValueChange = { editContent = it },
                        label = { Text("Content") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showEditDialog = false
                        android.widget.Toast.makeText(context, "Question updated successfully (local)", android.widget.Toast.LENGTH_SHORT).show()
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(stringResource(R.string.delete_question), fontWeight = FontWeight.Bold) },
            text = { Text(stringResource(R.string.this_will_permanently_delete_your)) },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteDialog = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text(stringResource(R.string.delete))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
            Text(
                text = question.title.uppercase(),
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f)
            )
            if (isOwner) {
                Box {
                    IconButton(onClick = { showOptionsMenu = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Options", tint = MaterialTheme.colorScheme.outline)
                    }
                    DropdownMenu(
                        expanded = showOptionsMenu,
                        onDismissRequest = { showOptionsMenu = false },
                        modifier = Modifier.background(Color.White)
                    ) {
                        val context = androidx.compose.ui.platform.LocalContext.current
                        DropdownMenuItem(
                            text = { Text("Edit") },
                            onClick = {
                                showOptionsMenu = false
                                try {
                                    val created = java.time.Instant.parse(question.createdAt)
                                    val now = java.time.Instant.now()
                                    if (java.time.Duration.between(created, now).toHours() >= 2) {
                                        android.widget.Toast.makeText(context, "No edit allow after 2hrs after post", android.widget.Toast.LENGTH_SHORT).show()
                                    } else {
                                        showEditDialog = true
                                    }
                                } catch (e: Exception) {
                                    android.widget.Toast.makeText(context, "No edit allow after 2hrs after post", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(20.dp)) }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                            onClick = {
                                showOptionsMenu = false
                                showDeleteDialog = true
                            },
                            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp)) }
                        )
                    }
                }
            }
        }
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            if (!question.topic.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                SuggestionChip(
                    onClick = {},
                    label = { Text("#${question.topic}", color = SwastikPrimary, fontSize = 12.sp) },
                    colors = SuggestionChipDefaults.suggestionChipColors(
                        containerColor = SwastikPrimaryLight.copy(alpha = 0.5f)
                    ),
                    border = null,
                    modifier = Modifier.height(28.dp)
                )
            }
            
            if (!question.attachments.isNullOrEmpty()) {
                if (!question.topic.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 8.dp)) {
                        Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${question.attachments.size} Attached", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            val displayName = if (question.isAnonymous) {
                if (isOwner) "Anonymous (You)" else "Anonymous"
            } else {
                val firstName = question.patient?.name?.substringBefore(" ") ?: "User"
                if (isOwner) "$firstName (You)" else firstName
            }

            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(if (question.isAnonymous) MaterialTheme.colorScheme.surfaceVariant else SwastikPrimaryLight),
                contentAlignment = Alignment.Center
            ) {
                if (question.isAnonymous) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                } else {
                    Text(
                        text = displayName.take(1).uppercase(),
                        color = SwastikPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = displayName,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = " • ${formatCommunityDate(question.createdAt)}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.weight(1f))
            Icon(
                Icons.Default.Visibility,
                contentDescription = "Views",
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text("${question.views}", fontSize = 12.sp, color = MaterialTheme.colorScheme.outline)

            if (onReport != null) {
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(onClick = { onReport.invoke() }, modifier = Modifier.size(24.dp)) {
                    Icon(
                        Icons.Default.Flag,
                        contentDescription = "Report",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = question.content,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun AnswerCard(
    answer: CommunityAnswer, 
    isQuestionOwner: Boolean = false, 
    hasUpvoted: Boolean = false,
    onUpvote: () -> Unit = {}, 
    onDelete: () -> Unit = {},
    onReport: (() -> Unit)? = null
) {
        val isOrgVerified = answer.responderVerified == true || answer.isDoctorVerified
        val displayName = answer.responderName ?: answer.doctor?.name?.let { "Dr. $it" } ?: answer.patient?.name ?: "Anonymous"
        val displayInitials = displayName.take(1).uppercase()
        
        val badgeLabel = when (answer.responderType) {
            "hospital" -> "Verified Hospital"
            "clinic" -> "Verified Clinic"
            "pharmacy" -> "Verified Pharmacy"
            "diagnostic_center" -> "Verified Diagnostic Center"
            else -> "Verified Doctor"
        }

        val primaryColor = SwastikPrimary
        val primaryLightColor = SwastikPrimaryLight

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = if (isOrgVerified) primaryLightColor.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, if (isOrgVerified) primaryColor.copy(alpha = 0.2f) else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        val imageUrl = answer.doctor?.profileImageUrl ?: answer.patient?.profileImageUrl
                        if (!imageUrl.isNullOrEmpty() && answer.responderType == null) {
                            coil.compose.AsyncImage(
                                model = imageUrl,
                                contentDescription = "Profile Picture",
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (isOrgVerified) primaryLightColor else MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = displayInitials,
                                    color = if (isOrgVerified) primaryColor else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = displayName,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                if (isOrgVerified) {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = badgeLabel,
                                        tint = primaryColor,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                            if (isOrgVerified) {
                                val details = mutableListOf<String>()
                                details.add(badgeLabel)
                                if (answer.responderType == null || answer.responderType == "doctor") {
                                    answer.doctor?.specialization?.let { details.add(it) }
                                }
                                
                                Text(
                                    text = details.joinToString(" • "),
                                    fontSize = 12.sp,
                                    color = primaryColor
                                )
                            } else {
                                Text(
                                    text = "Answered ${formatCommunityDate(answer.createdAt)}",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                
                if (onReport != null) {
                    IconButton(onClick = { onReport.invoke() }, modifier = Modifier.size(24.dp)) {
                        Icon(
                            Icons.Default.Flag,
                            contentDescription = "Report",
                            tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = answer.content,
                fontSize = 15.sp,
                lineHeight = 22.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = onUpvote,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    modifier = Modifier.height(32.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (hasUpvoted) SwastikPrimary else MaterialTheme.colorScheme.surfaceVariant,
                        contentColor = if (hasUpvoted) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                ) {
                    Icon(
                        Icons.Default.ThumbUp, 
                        contentDescription = "Upvote", 
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = if (hasUpvoted) "Helpful (${answer.upvotes})" else "Helpful (${answer.upvotes})")
                }
            }
        }
    }
}
