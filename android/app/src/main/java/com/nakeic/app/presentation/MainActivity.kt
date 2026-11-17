package com.nakeic.app.presentation

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.core.content.ContextCompat
import com.nakeic.app.core.designsystem.theme.NakeicTheme
import com.nakeic.app.data.repository.ChatRepository
import com.nakeic.app.domain.model.Conversation
import com.nakeic.app.domain.model.Message
import com.nakeic.app.domain.model.MessageType
import com.nakeic.app.domain.model.WalletAccount
import com.nakeic.app.live.NakeicLiveEngine
import com.nakeic.app.ui.screens.LiveScreen
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * MainActivity
 * Actividad principal de NAKEIC para Android 15.
 * Conectada al ChatRepository real (Room + Backend REST/WS) y NakeicLiveEngine (/ws/live).
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var chatRepository: ChatRepository

    @Inject
    lateinit var liveEngine: NakeicLiveEngine

    private val requiredPermissions = buildList {
        add(Manifest.permission.CAMERA)
        add(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }.toTypedArray()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        checkAndRequestPermissions()

        val initialLiveRoomId = intent?.getStringExtra("LIVE_ROOM_ID")

        setContent {
            NakeicTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NakeicAppNavigation(
                        chatRepository = chatRepository,
                        liveEngine = liveEngine,
                        initialLiveRoomId = initialLiveRoomId
                    )
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val missing = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }
}

enum class NavigationTab(val title: String) {
    CHATS("Chats"),
    LIVE("En Vivo"),
    STATUS("Estados"),
    CALLS("Llamadas"),
    SETTINGS("Ajustes")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NakeicAppNavigation(
    chatRepository: ChatRepository,
    liveEngine: NakeicLiveEngine,
    initialLiveRoomId: String? = null
) {
    var selectedTab by remember {
        mutableStateOf(if (!initialLiveRoomId.isNullOrBlank()) NavigationTab.LIVE else NavigationTab.CHATS)
    }
    var activeConversation by remember { mutableStateOf<Conversation?>(null) }
    var isInActiveCall by remember { mutableStateOf(false) }

    val currentUserId = chatRepository.getCurrentUserId() ?: ""
    val currentUserName = chatRepository.getCurrentUserDisplayName()
    val authToken = chatRepository.getAuthToken()

    if (isInActiveCall) {
        ActiveCallScreen(
            contactName = activeConversation?.title ?: "Contacto NAKEIC",
            isVideo = true,
            onEndCall = { isInActiveCall = false }
        )
    } else if (activeConversation != null) {
        ChatDetailScreen(
            conversation = activeConversation!!,
            chatRepository = chatRepository,
            currentUserId = currentUserId,
            currentUserName = currentUserName,
            onBack = { activeConversation = null },
            onStartCall = { isInActiveCall = true }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "NAKEIC",
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.primaryContainer
                            ) {
                                Text(
                                    "E2EE · LIVE",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    },
                    actions = {
                        IconButton(onClick = { selectedTab = NavigationTab.LIVE }) {
                            Icon(Icons.Default.LiveTv, contentDescription = "NAKEIC LIVE")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            },
            bottomBar = {
                NavigationBar {
                    NavigationTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = selectedTab == tab,
                            onClick = { selectedTab = tab },
                            icon = {
                                when (tab) {
                                    NavigationTab.CHATS -> Icon(Icons.Default.Chat, contentDescription = tab.title)
                                    NavigationTab.LIVE -> Icon(Icons.Default.LiveTv, contentDescription = tab.title)
                                    NavigationTab.STATUS -> Icon(Icons.Default.DonutLarge, contentDescription = tab.title)
                                    NavigationTab.CALLS -> Icon(Icons.Default.Phone, contentDescription = tab.title)
                                    NavigationTab.SETTINGS -> Icon(Icons.Default.Settings, contentDescription = tab.title)
                                }
                            },
                            label = { Text(tab.title, maxLines = 1, fontSize = 11.sp) }
                        )
                    }
                }
            }
        ) { paddingValues ->
            Box(Modifier.padding(paddingValues).fillMaxSize()) {
                when (selectedTab) {
                    NavigationTab.CHATS -> ChatsListScreen(
                        chatRepository = chatRepository,
                        onSelectConversation = { activeConversation = it }
                    )
                    NavigationTab.LIVE -> LiveScreen(
                        liveEngine = liveEngine,
                        currentUserId = currentUserId,
                        currentUserName = currentUserName,
                        authToken = authToken,
                        initialRoomId = initialLiveRoomId
                    )
                    NavigationTab.STATUS -> StatusListScreen()
                    NavigationTab.CALLS -> CallsHistoryScreen(onStartCall = { isInActiveCall = true })
                    NavigationTab.SETTINGS -> SettingsScreen(chatRepository = chatRepository)
                }
            }
        }
    }
}

@Composable
fun ChatsListScreen(
    chatRepository: ChatRepository,
    onSelectConversation: (Conversation) -> Unit
) {
    val conversations by chatRepository.getConversations().collectAsState(initial = emptyList())

    if (conversations.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.ChatBubbleOutline,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(Modifier.height(12.dp))
                Text("Sin conversaciones activas", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(
                    "Tus chats cifrados de extremo a extremo aparecerán aquí al iniciar sesión.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    } else {
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(conversations) { conv ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectConversation(conv) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(50.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (conv.isGroup) Icons.Default.Groups else Icons.Default.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }

                    Spacer(Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(conv.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(
                            conv.lastMessage?.text ?: conv.description,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    }

                    if (conv.unreadCount > 0) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(start = 8.dp)
                        ) {
                            Text(
                                conv.unreadCount.toString(),
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    conversation: Conversation,
    chatRepository: ChatRepository,
    currentUserId: String,
    currentUserName: String,
    onBack: () -> Unit,
    onStartCall: () -> Unit
) {
    var inputText by remember { mutableStateOf("") }
    var sendError by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    val messages by chatRepository.getMessages(conversation.id).collectAsState(initial = emptyList())

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(conversation.title, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text("Cifrado E2EE (ECDH + Double Ratchet) · NAKEIC", fontSize = 11.sp, color = Color(0xFF10B981))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás")
                    }
                },
                actions = {
                    IconButton(onClick = onStartCall) {
                        Icon(Icons.Default.Videocam, contentDescription = "Videollamada")
                    }
                    IconButton(onClick = onStartCall) {
                        Icon(Icons.Default.Call, contentDescription = "Llamada de voz")
                    }
                }
            )
        },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Column {
                    sendError?.let { err ->
                        Text(
                            err,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("Escribe un mensaje seguro...") },
                            colors = TextFieldDefaults.colors(
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent
                            ),
                            shape = RoundedCornerShape(24.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        IconButton(
                            onClick = {
                                if (inputText.isNotBlank()) {
                                    if (currentUserId.isBlank()) {
                                        sendError = "Inicia sesión verificada antes de enviar mensajes."
                                        return@IconButton
                                    }
                                    val textToSend = inputText.trim()
                                    inputText = ""
                                    sendError = null
                                    val newMsg = Message(
                                        id = "msg_${System.currentTimeMillis()}_${(1000..9999).random()}",
                                        conversationId = conversation.id,
                                        senderId = currentUserId,
                                        senderName = currentUserName,
                                        text = textToSend,
                                        type = MessageType.TEXT
                                    )
                                    coroutineScope.launch {
                                        chatRepository.sendMessage(newMsg).onFailure {
                                            sendError = it.message
                                        }
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "Enviar", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    ) { padding ->
        if (messages.isEmpty()) {
            Box(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "No hay mensajes aún.\nEnvía el primer mensaje cifrado a ${conversation.title}.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages) { msg ->
                    val isMe = currentUserId.isNotBlank() && msg.senderId == currentUserId
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                    ) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            tonalElevation = 2.dp
                        ) {
                            Text(
                                text = msg.text,
                                modifier = Modifier.padding(12.dp),
                                color = if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ActiveCallScreen(
    contactName: String,
    isVideo: Boolean,
    onEndCall: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A)).padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Box(
                modifier = Modifier.size(120.dp).clip(CircleShape).background(Color(0xFF1E293B)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(60.dp), tint = Color.White)
            }
            Spacer(Modifier.height(16.dp))
            Text(contactName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            Text(
                if (isVideo) "Videollamada WebRTC en curso" else "Llamada de voz WebRTC",
                color = Color(0xFF10B981),
                fontSize = 14.sp
            )
            Spacer(Modifier.height(48.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                IconButton(
                    onClick = {},
                    modifier = Modifier.size(56.dp).clip(CircleShape).background(Color(0xFF334155))
                ) {
                    Icon(Icons.Default.Mic, contentDescription = "Silenciar", tint = Color.White)
                }
                IconButton(
                    onClick = onEndCall,
                    modifier = Modifier.size(56.dp).clip(CircleShape).background(Color(0xFFEF4444))
                ) {
                    Icon(Icons.Default.CallEnd, contentDescription = "Finalizar", tint = Color.White)
                }
                IconButton(
                    onClick = {},
                    modifier = Modifier.size(56.dp).clip(CircleShape).background(Color(0xFF334155))
                ) {
                    Icon(Icons.Default.VolumeUp, contentDescription = "Altavoz", tint = Color.White)
                }
            }
        }
    }
}

@Composable
fun StatusListScreen() {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Actualizaciones de Estado (24h)", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(Modifier.height(8.dp))
        Text("Tus estados sincronizan vistas, privacidad y reacciones con el backend.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun CallsHistoryScreen(onStartCall: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Historial de Llamadas", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onStartCall) {
            Text("Iniciar nueva llamada WebRTC")
        }
    }
}

@Composable
fun SettingsScreen(chatRepository: ChatRepository) {
    var wallet by remember { mutableStateOf<WalletAccount?>(null) }
    val token = chatRepository.getAuthToken()

    LaunchedEffect(token) {
        if (!token.isNullOrBlank()) {
            chatRepository.getWalletBalance().onSuccess { wallet = it }
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Ajustes y Billetera NAKEIC", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = if (token.isNullOrBlank()) "Sesión: No autenticada" else "Sesión verificada: ${chatRepository.getCurrentUserDisplayName()}",
                    fontWeight = FontWeight.Bold
                )
                wallet?.let { w ->
                    Text("NAKEIC Coins: ${w.coinsBalance} · Diamantes: ${w.creatorDiamonds} · KYC: ${w.kycStatus}", fontSize = 13.sp)
                }
            }
        }
        Text("• Verificación OTP + Contraseña scrypt", fontSize = 14.sp)
        Text("• Cifrado E2EE (ECDH P-256 + HKDF + Double Ratchet AES-256-GCM)", fontSize = 14.sp)
        Text("• NAKEIC LIVE (Co-Hosts WebRTC, Batallas PK y Monetización)", fontSize = 14.sp)
    }
}
