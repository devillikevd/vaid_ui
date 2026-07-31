package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.WellnessChatMessageDto
import com.example.swastik.ui.viewmodel.WellnessChatViewModel
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val WellnessGreen = Color(0xFF2E7D32)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessChatScreen(
    sessionId: String,
    coachName: String,
    onBackClick: () -> Unit,
    viewModel: WellnessChatViewModel = hiltViewModel()
) {
    var messageText by remember { mutableStateOf("") }
    val uiState by viewModel.uiState.collectAsState()
    val messages = uiState.messages

    val listState = rememberLazyListState()

    LaunchedEffect(sessionId) {
        viewModel.selectSession(sessionId)
    }

    DisposableEffect(Unit) {
        onDispose {
            viewModel.clearSession()
        }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Color.White),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(coachName.take(1), fontWeight = FontWeight.Bold, color = WellnessGreen)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(coachName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(Color(0xFF4CAF50), CircleShape)
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("Online", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Video call */ }) {
                        Icon(Icons.Filled.Videocam, contentDescription = "Video Call")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WellnessGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF0F4F0))
        ) {
            when {
                uiState.error != null -> {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                            elevation = CardDefaults.cardElevation(2.dp),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(40.dp))
                                Spacer(Modifier.height(8.dp))
                                Text(uiState.error ?: "Something went wrong", color = Color.Gray)
                                Spacer(Modifier.height(12.dp))
                                TextButton(onClick = { viewModel.loadSessions() }) {
                                    Text("Retry", color = WellnessGreen)
                                }
                            }
                        }
                    }
                }
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                messages.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.Chat, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("No messages yet", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color.Gray)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(messages, key = { it.id ?: it.timestamp ?: it.message ?: it.hashCode().toString() }) { message ->
                            ChatBubble(message, coachName)
                        }
                    }
                }
            }

            if (uiState.isTyping) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Text("Coach is typing…", fontSize = 12.sp, color = Color.Gray)
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White,
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { /* Attach file */ }) {
                        Icon(Icons.Filled.AttachFile, contentDescription = "Attach", tint = Color.Gray)
                    }

                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { newText ->
                            messageText = newText
                            if (newText.isNotBlank()) {
                                viewModel.setTyping(true)
                            } else {
                                viewModel.setTyping(false)
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .onFocusChanged { if (!it.isFocused) viewModel.setTyping(false) },
                        placeholder = { Text("Type a message...", color = Color.Gray) },
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = WellnessGreen,
                            unfocusedBorderColor = Color(0xFFE0E0E0)
                        ),
                        maxLines = 3
                    )

                    Spacer(Modifier.width(8.dp))

                    IconButton(
                        onClick = {
                            if (messageText.isNotBlank()) {
                                viewModel.sendMessage(messageText)
                                messageText = ""
                                viewModel.setTyping(false)
                            }
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .background(WellnessGreen, CircleShape)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatBubble(message: WellnessChatMessageDto, coachName: String) {
    val isMine = message.role?.equals("patient", ignoreCase = true) == true || message.userId.isNullOrEmpty()
    val alignment = if (isMine) Arrangement.End else Arrangement.Start

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = alignment
    ) {
        if (!isMine) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(WellnessGreen),
                contentAlignment = Alignment.Center
            ) {
                Text(coachName.take(1), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
            Spacer(Modifier.width(8.dp))
        }

        Column(
            horizontalAlignment = if (isMine) Alignment.End else Alignment.Start
        ) {
            Surface(
                shape = RoundedCornerShape(
                    topStart = 16.dp,
                    topEnd = 16.dp,
                    bottomStart = if (isMine) 16.dp else 4.dp,
                    bottomEnd = if (isMine) 4.dp else 16.dp
                ),
                color = if (isMine) WellnessGreen else Color.White,
                shadowElevation = 1.dp
            ) {
                Text(
                    message.message ?: "",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    color = if (isMine) Color.White else Color.DarkGray,
                    fontSize = 15.sp
                )
            }
            Spacer(Modifier.height(2.dp))
            Text(
                formatTimestamp(message.timestamp),
                fontSize = 10.sp,
                color = Color.Gray
            )
        }

        if (isMine) {
            Spacer(Modifier.width(8.dp))
        }
    }
}

private fun formatTimestamp(timestamp: String?): String {
    if (timestamp.isNullOrBlank()) return ""
    return try {
        OffsetDateTime.parse(timestamp).format(DateTimeFormatter.ofPattern("hh:mm a"))
    } catch (e: Exception) {
        try {
            Instant.parse(timestamp)
                .atZone(ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("hh:mm a"))
        } catch (e2: Exception) {
            timestamp
        }
    }
}
