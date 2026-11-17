package com.nakeic.app.ui.screens

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nakeic.app.data.network.LiveReportRequest
import com.nakeic.app.data.network.NakeicApiClient
import com.nakeic.app.data.repository.NetworkEnvironment
import com.nakeic.app.domain.model.LiveGift
import com.nakeic.app.domain.model.LiveHistoryItem
import com.nakeic.app.domain.model.LiveRoom
import com.nakeic.app.live.NakeicLiveEngine
import kotlinx.coroutines.launch

/**
 * LiveScreen
 * Pantalla nativa Jetpack Compose (Material 3) para NAKEIC LIVE:
 * - Descubrimiento por pestañas (Recomendados, Populares, Siguiendo, Historial).
 * - Visualización en tiempo real de video/audio, co-anfitriones y batallas PK.
 * - Regalos autoritativos con NAKEIC Coins, chat en vivo y moderación/reportes.
 */
@Composable
fun LiveScreen(
    liveEngine: NakeicLiveEngine,
    currentUserId: String,
    currentUserName: String,
    authToken: String?,
    initialRoomId: String? = null
) {
    val state by liveEngine.state.collectAsState()
    val scope = rememberCoroutineScope()
    val api = remember { NakeicApiClient.create(NetworkEnvironment.resolve().httpBaseUrl) }

    var selectedExploreTab by remember { mutableStateOf("recommended") }
    var searchQuery by remember { mutableStateOf("") }
    var historyItems by remember { mutableStateOf<List<LiveHistoryItem>>(emptyList()) }
    var giftCatalog by remember {
        mutableStateOf(
            listOf(
                LiveGift("gift_rose", "Rosa NAKEIC", "🌹", 1, "float"),
                LiveGift("gift_heart", "Corazón Neón", "💖", 5, "pulse"),
                LiveGift("gift_fire", "Llama", "🔥", 20, "burst"),
                LiveGift("gift_rocket", "Cohete", "🚀", 100, "burst"),
                LiveGift("gift_crown", "Corona Real", "👑", 500, "supernova")
            )
        )
    }

    var showSetupDialog by remember { mutableStateOf(false) }
    var setupTitle by remember { mutableStateOf("En vivo desde NAKEIC Android") }
    var setupCategory by remember { mutableStateOf("Charla") }
    var setupJoinPolicy by remember { mutableStateOf("everyone") }
    var commentDraft by remember { mutableStateOf("") }
    var showGiftSheet by remember { mutableStateOf(false) }
    var showReportDialog by remember { mutableStateOf(false) }
    var reportReason by remember { mutableStateOf("Contenido inapropiado") }

    LaunchedEffect(authToken, currentUserId) {
        liveEngine.connect(authToken, currentUserId, currentUserName)
        runCatching {
            val giftsRes = api.getGiftCatalog()
            if (giftsRes.isSuccessful && giftsRes.body()?.gifts?.isNotEmpty() == true) {
                giftCatalog = giftsRes.body()!!.gifts
            }
        }
        initialRoomId?.let { liveEngine.joinRoom(it) }
    }

    LaunchedEffect(selectedExploreTab) {
        if (selectedExploreTab == "history") {
            runCatching {
                val res = api.getLiveHistory()
                if (res.isSuccessful) {
                    historyItems = res.body()?.history ?: emptyList()
                }
            }
        }
    }

    val currentRoom = state.hostingRoom ?: state.activeRoom

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF090D16))) {
        if (currentRoom != null) {
            // ACTIVE ROOM / BROADCAST VIEW
            Column(modifier = Modifier.fillMaxSize()) {
                // Frame Surface
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A))
                ) {
                    state.latestFrameBase64?.let { raw ->
                        val bitmap = remember(raw) {
                            runCatching {
                                val pure = raw.substringAfter("base64,", raw)
                                val bytes = Base64.decode(pure, Base64.DEFAULT)
                                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                            }.getOrNull()
                        }
                        if (bitmap != null) {
                            Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = currentRoom.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }

                    // Top Room Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color.Black.copy(alpha = 0.6f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFE11D48))
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = "${currentRoom.hostName} · ${currentRoom.viewerCount} 👁",
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (state.hostingRoom == null) {
                                IconButton(
                                    onClick = { showReportDialog = true },
                                    modifier = Modifier.background(Color.Black.copy(alpha = 0.55f), CircleShape)
                                ) {
                                    Icon(Icons.Default.Flag, contentDescription = "Reportar", tint = Color.White)
                                }
                            }
                            Button(
                                onClick = {
                                    if (state.hostingRoom != null) {
                                        liveEngine.stopBroadcast(currentRoom.id)
                                    } else {
                                        liveEngine.leaveRoom(currentRoom.id)
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48))
                            ) {
                                Text(if (state.hostingRoom != null) "Finalizar" else "Salir", fontSize = 12.sp)
                            }
                        }
                    }

                    // PK Battle HUD if active
                    state.activeBattle?.let { battle ->
                        Surface(
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 64.dp, start = 16.dp, end = 16.dp)
                                .fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = Color.Black.copy(alpha = 0.78f)
                        ) {
                            Column(Modifier.padding(10.dp)) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("${battle.challengerHostName}: ${battle.challengerScore}", color = Color(0xFF22D3EE), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    Text("⚔️ PK LIVE", color = Color(0xFFFBBF24), fontSize = 11.sp, fontWeight = FontWeight.Black)
                                    Text("${battle.opponentScore} :${battle.opponentHostName}", color = Color(0xFFFB7185), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Co-Host Badges Strip
                    if (currentRoom.coHosts.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(top = 115.dp, end = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            currentRoom.coHosts.forEach { guest ->
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF06B6D4).copy(alpha = 0.85f)
                                ) {
                                    Text(
                                        text = guest.userName,
                                        color = Color.Black,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Action Rail on Right
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        IconButton(
                            onClick = { liveEngine.sendReaction(currentRoom.id, "❤️") },
                            modifier = Modifier.background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        ) {
                            Icon(Icons.Default.Favorite, contentDescription = "Me gusta", tint = Color(0xFFFB7185))
                        }
                        Text("${currentRoom.likesCount}", color = Color.White, fontSize = 11.sp)

                        IconButton(
                            onClick = { showGiftSheet = true },
                            modifier = Modifier.background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        ) {
                            Icon(Icons.Default.CardGiftcard, contentDescription = "Regalo", tint = Color(0xFFFBBF24))
                        }
                        Text("${currentRoom.giftsCount}", color = Color.White, fontSize = 11.sp)

                        if (state.hostingRoom == null) {
                            IconButton(
                                onClick = { liveEngine.requestCoHostSlot(currentRoom.id) },
                                modifier = Modifier.background(Color.Black.copy(alpha = 0.6f), CircleShape)
                            ) {
                                Icon(Icons.Default.GroupAdd, contentDescription = "Subir como invitado", tint = Color(0xFF22D3EE))
                            }
                        }
                    }

                    // Live Comments Overlay Bottom-Left
                    LazyColumn(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(start = 12.dp, bottom = 12.dp, end = 72.dp)
                            .heightIn(max = 170.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(state.comments) { comment ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color.Black.copy(alpha = 0.55f)
                            ) {
                                Text(
                                    text = "${comment.userName}: ${comment.text}",
                                    color = if (comment.type == "gift") Color(0xFFFDE68A) else Color.White,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }

                // Comment Input Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A))
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextField(
                        value = commentDraft,
                        onValueChange = { commentDraft = it },
                        placeholder = { Text("Comentar en NAKEIC LIVE...", fontSize = 12.sp) },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(onClick = {
                        if (commentDraft.isNotBlank()) {
                            liveEngine.sendComment(currentRoom.id, commentDraft)
                            commentDraft = ""
                        }
                    }) {
                        Icon(Icons.Default.Send, contentDescription = "Enviar", tint = Color(0xFF22D3EE))
                    }
                }
            }
        } else {
            // DISCOVERY & FEED EXPLORER
            Column(modifier = Modifier.fillMaxSize().padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("NAKEIC LIVE", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Text(
                            if (state.isConnected) "Conectado · ${state.rooms.size} salas activas" else "Conectando al servidor...",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                    }
                    Button(
                        onClick = { showSetupDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48))
                    ) {
                        Icon(Icons.Default.Videocam, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Transmitir", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(10.dp))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Buscar creadores o categorías...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(Modifier.height(10.dp))

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val tabs = listOf(
                        "recommended" to "Recomendados",
                        "popular" to "Populares",
                        "following" to "Siguiendo",
                        "history" to "Historial"
                    )
                    items(tabs) { (id, label) ->
                        FilterChip(
                            selected = selectedExploreTab == id,
                            onClick = { selectedExploreTab = id },
                            label = { Text(label, fontSize = 12.sp) }
                        )
                    }
                }

                Spacer(Modifier.height(10.dp))

                if (selectedExploreTab == "history") {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(historyItems) { hist ->
                            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))) {
                                Column(Modifier.padding(12.dp).fillMaxWidth()) {
                                    Text(hist.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text(
                                        "${hist.hostName} · ${hist.peakViewers} pico · ${hist.earnedCoins} Coins",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }
                } else {
                    val filteredRooms = state.rooms.filter { r ->
                        searchQuery.isBlank() ||
                            r.title.contains(searchQuery, ignoreCase = true) ||
                            r.hostName.contains(searchQuery, ignoreCase = true) ||
                            r.category.contains(searchQuery, ignoreCase = true)
                    }
                    if (filteredRooms.isEmpty()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                "No hay transmisiones activas ahora.\nPulsa \"Transmitir\" para iniciar la primera.",
                                color = Color(0xFF94A3B8),
                                fontSize = 13.sp
                            )
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(filteredRooms) { room: LiveRoom ->
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { liveEngine.joinRoom(room.id) }
                                ) {
                                    Row(
                                        Modifier.padding(14.dp).fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            Text(room.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                            Text("${room.hostName} (@${room.hostUsername}) · ${room.category}", color = Color(0xFF94A3B8), fontSize = 12.sp)
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = Color(0xFFE11D48)
                                        ) {
                                            Text(
                                                "LIVE · ${room.viewerCount}",
                                                color = Color.White,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Notice Banner Overlay
        state.noticeBanner?.let { msg ->
            Snackbar(
                modifier = Modifier.align(Alignment.TopCenter).padding(12.dp),
                action = {
                    TextButton(onClick = { liveEngine.clearNotice() }) {
                        Text("OK")
                    }
                }
            ) {
                Text(msg)
            }
        }
    }

    // Broadcaster Setup Dialog
    if (showSetupDialog) {
        AlertDialog(
            onDismissRequest = { showSetupDialog = false },
            title = { Text("Iniciar NAKEIC LIVE") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = setupTitle,
                        onValueChange = { setupTitle = it },
                        label = { Text("Título") }
                    )
                    OutlinedTextField(
                        value = setupCategory,
                        onValueChange = { setupCategory = it },
                        label = { Text("Categoría") }
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("everyone" to "Público", "followers" to "Seguidores").forEach { (pol, lbl) ->
                            FilterChip(
                                selected = setupJoinPolicy == pol,
                                onClick = { setupJoinPolicy = pol },
                                label = { Text(lbl, fontSize = 11.sp) }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    showSetupDialog = false
                    liveEngine.startBroadcast(
                        title = setupTitle,
                        category = setupCategory,
                        joinPolicy = setupJoinPolicy
                    )
                }) {
                    Text("Salir En Vivo")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSetupDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // Gift Catalog Sheet Dialog
    if (showGiftSheet && currentRoom != null) {
        AlertDialog(
            onDismissRequest = { showGiftSheet = false },
            title = { Text("Regalos NAKEIC LIVE") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.walletCoinsBalance?.let { bal ->
                        Text("Saldo actual: $bal Coins", fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                    }
                    giftCatalog.forEach { gift ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    liveEngine.sendGift(currentRoom.id, gift.id, 1)
                                    showGiftSheet = false
                                }
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("${gift.emoji} ${gift.name}", fontWeight = FontWeight.SemiBold)
                            Text("${gift.coins} Coins", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showGiftSheet = false }) { Text("Cerrar") }
            }
        )
    }

    // Report Live Dialog
    if (showReportDialog && currentRoom != null) {
        AlertDialog(
            onDismissRequest = { showReportDialog = false },
            title = { Text("Reportar transmisión") },
            text = {
                OutlinedTextField(
                    value = reportReason,
                    onValueChange = { reportReason = it },
                    label = { Text("Motivo") }
                )
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        authToken?.let { tk ->
                            runCatching {
                                api.reportLiveRoom(
                                    "Bearer $tk",
                                    LiveReportRequest(currentRoom.id, currentRoom.hostId, reportReason)
                                )
                            }
                        }
                        showReportDialog = false
                    }
                }) { Text("Enviar") }
            },
            dismissButton = {
                TextButton(onClick = { showReportDialog = false }) { Text("Cancelar") }
            }
        )
    }
}
