package com.example.swastik.ui.screens.patient.community

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemContentType
import androidx.paging.compose.itemKey
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.swastik.data.model.CommunityQuestion
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.viewmodel.CommunityViewModel
import androidx.compose.material3.MaterialTheme
import com.example.swastik.utils.navigateSafe
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityQAScreen(
    navController: NavController,
    viewModel: CommunityViewModel = hiltViewModel()
) {
    val pagedQuestions = viewModel.pagedQuestions.collectAsLazyPagingItems()
    val isLoading = pagedQuestions.loadState.refresh is LoadState.Loading
    val trendingTopics by viewModel.trendingTopics.collectAsState()
    val currentFilter by viewModel.currentFilter.collectAsState()
    val currentTopic by viewModel.currentTopic.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val currentSortBy by viewModel.currentSortBy.collectAsState()
    val focusManager = LocalFocusManager.current
    var showSortMenu by remember { mutableStateOf(false) }
    var reportTarget by remember { mutableStateOf<Pair<String, String>?>(null) } // pair of (targetType, id)

    LaunchedEffect(Unit) {
        viewModel.fetchTrendingTopics()
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text(stringResource(R.string.community_qa), fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        IconButton(onClick = { 
                            if (currentFilter == "Saved") {
                                viewModel.setFilter("All")
                            } else {
                                viewModel.setTopic(null)
                                viewModel.setFilter("Saved")
                            }
                        }) {
                            Icon(
                                imageVector = if (currentFilter == "Saved") Icons.Default.Bookmark else Icons.Default.BookmarkBorder, 
                                contentDescription = "Saved Questions",
                                tint = if (currentFilter == "Saved") SwastikPrimary else MaterialTheme.colorScheme.onBackground
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        titleContentColor = MaterialTheme.colorScheme.onBackground
                    )
                )
                // Search Bar and Sort Filter Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Search discussions...", maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear search", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        },
                        shape = RoundedCornerShape(24.dp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surface,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                            focusedBorderColor = SwastikPrimary,
                            unfocusedBorderColor = Color.Transparent
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box {
                        IconButton(
                            onClick = { showSortMenu = true },
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                        ) {
                            Icon(Icons.Default.FilterList, contentDescription = "Sort Filter", tint = if (currentSortBy != "recent") SwastikPrimary else MaterialTheme.colorScheme.onSurface)
                        }
                        DropdownMenu(
                            expanded = showSortMenu,
                            onDismissRequest = { showSortMenu = false },
                            modifier = Modifier.background(Color.White)
                        ) {
                            DropdownMenuItem(
                                modifier = Modifier.background(Color.White),
                                text = { Text("Most Recent", fontWeight = if (currentSortBy == "recent") FontWeight.Bold else FontWeight.Normal, color = Color.Black) },
                                onClick = { viewModel.setSortBy("recent"); showSortMenu = false }
                            )
                            DropdownMenuItem(
                                modifier = Modifier.background(Color.White),
                                text = { Text("Top Likes", fontWeight = if (currentSortBy == "upvotes") FontWeight.Bold else FontWeight.Normal, color = Color.Black) },
                                onClick = { viewModel.setSortBy("upvotes"); showSortMenu = false }
                            )
                            DropdownMenuItem(
                                modifier = Modifier.background(Color.White),
                                text = { Text("Most Views", fontWeight = if (currentSortBy == "views") FontWeight.Bold else FontWeight.Normal, color = Color.Black) },
                                onClick = { viewModel.setSortBy("views"); showSortMenu = false }
                            )
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigateSafe(com.example.swastik.navigation.Screen.AskQuestion.route) },
                containerColor = SwastikPrimary
            ) {
                Text(stringResource(R.string.ask), color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.padding(horizontal = 16.dp))
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
                .pointerInput(Unit) {
                    detectTapGestures(onTap = {
                        focusManager.clearFocus()
                    })
                }
        ) {
            // Filters and Trending Topics Row
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val filters = listOf("All", "Trending", "Answered", "Unanswered", "Verified")
                items(filters) { filter ->
                    FilterChip(
                        selected = currentFilter == filter && currentTopic == null,
                        onClick = {
                            viewModel.setTopic(null)
                            viewModel.setFilter(filter)
                        },
                        label = { Text(filter) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SwastikPrimaryLight,
                            selectedLabelColor = SwastikPrimary
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = currentFilter == filter && currentTopic == null,
                            borderColor = if (currentFilter == filter && currentTopic == null) SwastikPrimary else MaterialTheme.colorScheme.outline
                        )
                    )
                }
                if (trendingTopics.isNotEmpty()) {
                    item {
                        VerticalDivider(modifier = Modifier.height(32.dp).padding(horizontal = 4.dp))
                    }
                    items(trendingTopics) { topic ->
                        FilterChip(
                            selected = currentTopic == topic,
                            onClick = {
                                if (currentTopic == topic) viewModel.setTopic(null)
                                else viewModel.setTopic(topic)
                            },
                            label = { Text("#$topic") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SwastikPrimaryLight,
                                selectedLabelColor = SwastikPrimary
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = currentTopic == topic,
                                borderColor = if (currentTopic == topic) SwastikPrimary else MaterialTheme.colorScheme.outline
                            )
                        )
                    }
                }
            }

            val localBookmarks by viewModel.localBookmarkUpdates.collectAsState()
            val localUpvotes by viewModel.localUpvoteUpdates.collectAsState()
            
            if (isLoading) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(4) {
                        com.example.swastik.ui.components.CommunityQAShimmer()
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(
                        count = pagedQuestions.itemCount,
                        contentType = pagedQuestions.itemContentType { "Question" }
                    ) { index ->
                        val question = pagedQuestions[index]
                        if (question != null) {
                            val isOwner = question.patient?.userId == viewModel.currentUserId
                            val isBookmarked = localBookmarks[question.id] ?: question.isBookmarked ?: false
                            val baseUpvoted = question.isUpvoted ?: false
                            val hasUpvoted = localUpvotes[question.id] ?: baseUpvoted
                            
                            val displayQuestion = if (hasUpvoted && !baseUpvoted) {
                                question.copy(upvotes = question.upvotes + 1)
                            } else if (!hasUpvoted && baseUpvoted) {
                                question.copy(upvotes = maxOf(0, question.upvotes - 1))
                            } else {
                                question
                            }
                            
                            QuestionCard(
                                question = displayQuestion,
                                isOwner = isOwner,
                                hasUpvoted = hasUpvoted,
                                isBookmarked = isBookmarked, // Pass explicitly
                                onClick = { navController.navigateSafe(com.example.swastik.navigation.Screen.CommunityQADetails.createRoute(question.id)) },
                                onUpvote = { viewModel.upvoteQuestion(question.id, question.isUpvoted) },
                                onDelete = {
                                    viewModel.deleteQuestion(question.id) {
                                        pagedQuestions.refresh()
                                    }
                                },
                                onBookmark = { viewModel.toggleBookmark(question.id, isBookmarked) },
                                onTopicClick = {
                                    if (currentTopic == question.topic) viewModel.setTopic(null)
                                    else viewModel.setTopic(question.topic)
                                },
                                onReport = if (!isOwner) { { reportTarget = "question" to question.id } } else null
                            )
                        }
                    }
                    
                    if (pagedQuestions.itemCount == 0 && pagedQuestions.loadState.refresh !is LoadState.Loading) {
                        item {
                            Box(
                                modifier = Modifier.fillParentMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.Inbox, 
                                        contentDescription = null, 
                                        modifier = Modifier.size(64.dp), 
                                        tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        "No questions found", 
                                        fontSize = 18.sp, 
                                        fontWeight = FontWeight.Bold, 
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        "Try changing your filters or ask a new question", 
                                        fontSize = 14.sp, 
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }
                            }
                        }
                    }
                    
                    if (pagedQuestions.loadState.append is LoadState.Loading) {
                        item {
                            CircularProgressIndicator(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                                    .wrapContentWidth(Alignment.CenterHorizontally)
                            )
                        }
                    }
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
                        pagedQuestions.refresh()
                    }
                } else {
                    viewModel.reportAnswer(target.second, reason, details) {}
                }
            }
        )
    }
}

@Composable
fun QuestionCard(
    question: CommunityQuestion,
    isOwner: Boolean = false,
    hasUpvoted: Boolean = false,
    isBookmarked: Boolean = false,
    onClick: () -> Unit,
    onUpvote: () -> Unit,
    onDelete: () -> Unit = {},
    onBookmark: () -> Unit,
    onTopicClick: () -> Unit,
    onReport: (() -> Unit)? = null
) {
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
            text = { Text(stringResource(R.string.this_will_permanently_delete_your_1)) },
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
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val displayName = if (question.isAnonymous) {
                    if (isOwner) "Anonymous (You)" else "Anonymous"
                } else {
                    val firstName = question.patient?.name?.substringBefore(" ") ?: "User"
                    if (isOwner) "$firstName (You)" else firstName
                }
                
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(if (question.isAnonymous) MaterialTheme.colorScheme.surfaceVariant else SwastikPrimaryLight),
                    contentAlignment = Alignment.Center
                ) {
                    if (question.isAnonymous) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        Text(
                            text = displayName.take(1).uppercase(),
                            color = SwastikPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = displayName,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Asked ${formatCommunityDate(question.createdAt)}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(end = 12.dp)) {
                    Icon(
                        Icons.Default.Visibility,
                        contentDescription = "Views",
                        tint = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${question.views}", fontSize = 12.sp, color = MaterialTheme.colorScheme.outline)
                }
                
                IconButton(onClick = onBookmark, modifier = Modifier.size(24.dp)) {
                    Icon(
                        imageVector = if (isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                        contentDescription = "Bookmark",
                        tint = if (isBookmarked) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                if (!isOwner && onReport != null) {
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
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = question.title.uppercase(),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = question.content,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            
            
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                if (!question.category.isNullOrEmpty()) {
                    SuggestionChip(
                        onClick = onTopicClick, // Could rename this to onCategoryClick later
                        label = { Text(question.category.toString(), color = SwastikPrimary, fontSize = 12.sp) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = SwastikPrimaryLight.copy(alpha = 0.5f)
                        ),
                        border = SuggestionChipDefaults.suggestionChipBorder(
                            enabled = true,
                            borderColor = Color.Transparent
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                
                if (!question.specialtyTarget.isNullOrEmpty()) {
                    SuggestionChip(
                        onClick = onTopicClick,
                        label = { Text(question.specialtyTarget.toString(), color = SwastikPrimary, fontSize = 12.sp) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = SwastikPrimaryLight.copy(alpha = 0.5f)
                        ),
                        border = SuggestionChipDefaults.suggestionChipBorder(
                            enabled = true,
                            borderColor = Color.Transparent
                        )
                    )
                } else if (!question.topic.isNullOrEmpty() && question.category.isNullOrEmpty()) {
                    SuggestionChip(
                        onClick = onTopicClick,
                        label = { Text("#${question.topic}", color = SwastikPrimary, fontSize = 12.sp) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = SwastikPrimaryLight.copy(alpha = 0.5f)
                        ),
                        border = SuggestionChipDefaults.suggestionChipBorder(
                            enabled = true,
                            borderColor = Color.Transparent
                        )
                    )
                }
                
                if (!question.attachments.isNullOrEmpty()) {
                    if (!question.category.isNullOrEmpty() || !question.specialtyTarget.isNullOrEmpty() || !question.topic.isNullOrEmpty()) {
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
            
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onUpvote, 
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Default.ThumbUp,
                            contentDescription = "Upvote",
                            tint = if (hasUpvoted) SwastikPrimary else MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${question.upvotes}", fontSize = 14.sp, color = if (hasUpvoted) SwastikPrimary else MaterialTheme.colorScheme.outline)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.ChatBubbleOutline,
                        contentDescription = "Answers",
                        tint = SwastikPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${question.answerCount ?: 0} Answers", fontSize = 14.sp, color = SwastikPrimary)
                    if (isOwner) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box {
                            IconButton(
                                onClick = { showOptionsMenu = true },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Default.MoreVert,
                                    contentDescription = "Options",
                                    tint = MaterialTheme.colorScheme.outline,
                                    modifier = Modifier.size(18.dp)
                                )
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
                                            // Fallback if date parsing fails
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
            }
        }
    }
}

fun formatCommunityDate(isoString: String): String {
    try {
        if (isoString.length >= 10) {
            val year = isoString.substring(0, 4)
            val month = isoString.substring(5, 7)
            val day = isoString.substring(8, 10)
            
            val monthName = when (month) {
                "01" -> "Jan"
                "02" -> "Feb"
                "03" -> "Mar"
                "04" -> "Apr"
                "05" -> "May"
                "06" -> "June"
                "07" -> "July"
                "08" -> "Aug"
                "09" -> "Sept"
                "10" -> "Oct"
                "11" -> "Nov"
                "12" -> "Dec"
                else -> ""
            }
            return "$monthName $day, $year" // e.g. June 25, 2026
        }
    } catch (e: Exception) {}
    return isoString.take(10)
}
