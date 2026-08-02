package com.example.swastik.ui.screens.patient.community

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.viewmodel.CommunityViewModel
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest
import android.net.Uri
import com.example.swastik.R


data class TopicCategory(val name: String, val icon: ImageVector?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AskQuestionScreen(
    navController: NavController,
    viewModel: CommunityViewModel = hiltViewModel()
) {
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var customTopic by remember { mutableStateOf("") }
    var isAnonymous by remember { mutableStateOf(false) }
    var showGuidelines by remember { mutableStateOf(false) }
    
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var attachments by remember { mutableStateOf<List<String>>(emptyList()) }
    
    val photoPickerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            imageUri = uri
            attachments = listOf(uri.toString())
        }
    }
    
    val isLoading by viewModel.isLoading.collectAsState()

    val topics = listOf(
        TopicCategory("General Health", Icons.Default.Favorite),
        TopicCategory("Child Care", Icons.Default.ChildCare),
        TopicCategory("Women's Health", Icons.Default.Female),
        TopicCategory("Skin", Icons.Default.WaterDrop),
        TopicCategory("More", Icons.Default.KeyboardArrowDown)
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ask a Question", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Surface(
                        color = Color.Transparent,
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        modifier = Modifier.padding(end = 16.dp).clickable { showGuidelines = true }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.Lightbulb, contentDescription = "Guidelines", tint = SwastikPrimary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Guidelines", color = SwastikPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Select a Topic",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(topics) { topic ->
                    val isSelected = selectedCategory == topic.name
                    Surface(
                        color = if (isSelected) SwastikPrimary else MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(24.dp),
                        border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant) else null,
                        modifier = Modifier
                            .clip(RoundedCornerShape(24.dp))
                            .clickable { 
                                if (selectedCategory == topic.name) {
                                    selectedCategory = null
                                } else {
                                    selectedCategory = topic.name 
                                }
                            }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            if (topic.icon != null) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .background(if (isSelected) Color.White else SwastikPrimaryLight.copy(alpha = 0.2f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = topic.icon, 
                                        contentDescription = null, 
                                        tint = if (isSelected) SwastikPrimary else SwastikPrimary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text(
                                text = topic.name,
                                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                fontSize = 14.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }
            
            if (selectedCategory == "More") {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = customTopic,
                    onValueChange = { customTopic = it },
                    placeholder = { Text("Enter your custom topic", color = MaterialTheme.colorScheme.outline) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SwastikPrimary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                    )
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            Text(
                "Question Title",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { if (it.length <= 80) title = it },
                placeholder = { Text("e.g. How to reduce knee pain while walking?", color = MaterialTheme.colorScheme.outline, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SwastikPrimary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                ),
                supportingText = {
                    Text(
                        text = "${title.length}/80",
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.End,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                "Describe your problem in detail",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = content,
                onValueChange = { if (it.length <= 1000) content = it },
                placeholder = { Text("Please provide more details about the symptoms,\nduration, medicines taken, age, gender, lifestyle, etc.\nThis will help doctors give better answers.", color = MaterialTheme.colorScheme.outline) },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 150.dp),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SwastikPrimary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                ),
                supportingText = {
                    Text(
                        text = "${content.length}/1000",
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.End,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                "Add attachments (optional)",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // Attach Image Button
                Surface(
                    color = SwastikPrimaryLight.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f).height(64.dp).clickable { 
                        photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(12.dp)) {
                        Box(
                            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(8.dp)).background(SwastikPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(if (imageUri != null) Icons.Default.CheckCircle else Icons.Default.Image, contentDescription = null, tint = SwastikPrimary)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(if (imageUri != null) "Image Attached" else "Attach Image", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text("JPG, PNG (Max 5 MB)", fontSize = 10.sp, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            
            // Ask anonymously
            Surface(
                color = SwastikPrimaryLight.copy(alpha = 0.15f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier.size(40.dp).clip(CircleShape).background(SwastikPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Ask anonymously", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Your name will not be shown publicly", fontSize = 12.sp, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                    Switch(
                        checked = isAnonymous,
                        onCheckedChange = { isAnonymous = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = SwastikPrimary)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = {
                    if (title.isNotBlank() && content.isNotBlank()) {
                        val finalTopic = if (selectedCategory == "More") customTopic.takeIf { it.isNotBlank() } ?: "General" else selectedCategory
                        viewModel.askQuestion(
                            title = title, 
                            content = content, 
                            topic = finalTopic,
                            isAnonymous = isAnonymous,
                            attachments = attachments
                        ) {
                            navController.popBackStack()
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                enabled = !isLoading && title.isNotBlank() && content.isNotBlank() && (selectedCategory != "More" || customTopic.isNotBlank())
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp))
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Post Question", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            // Community Tips
            Surface(
                color = SwastikPrimaryLight.copy(alpha = 0.15f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Lightbulb, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Community Tips", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        TipItem("Don't share\nphone numbers")
                        TipItem("Mention age\n& gender")
                        TipItem("Include symptoms\nduration")
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Your question is safe and secure", fontSize = 12.sp, color = MaterialTheme.colorScheme.outline)
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
    
    if (showGuidelines) {
        ModalBottomSheet(
            onDismissRequest = { showGuidelines = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                Text(
                    text = "Community Guidelines",
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                Text("1. Be respectful to others. No abusive language.", fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text("2. Do not share personal contact details like phone numbers.", fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text("3. Provide clear details (age, gender, duration of symptoms).", fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text("4. This community is for general advice, not for emergencies.", fontSize = 14.sp)
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = { showGuidelines = false },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) {
                    Text("I Understand", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun TipItem(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(text, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 14.sp)
    }
}
