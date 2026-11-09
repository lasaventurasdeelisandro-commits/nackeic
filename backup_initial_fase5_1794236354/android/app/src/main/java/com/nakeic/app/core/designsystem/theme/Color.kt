package com.nakeic.app.core.designsystem.theme

import androidx.compose.ui.graphics.Color

/**
 * NAKEIC Design System - Paleta de Colores Exclusiva
 * Identidad visual moderna: Tonos profundos Índigo, Teal Eléctrico, Ciruela Neón y Carbono.
 * Cero parecido o referencia a marcas comerciales externas.
 */

// Tonos Nakeic Predeterminados (Nordic Dark / Modern Cyan)
val NakeicCyanPrimary = Color(0xFF00B4D8)
val NakeicCyanSecondary = Color(0xFF0077B6)
val NakeicCyanBackgroundDark = Color(0xFF0A0F1D)
val NakeicCyanSurfaceDark = Color(0xFF141B2D)
val NakeicCyanSurfaceVariantDark = Color(0xFF1E283F)

// Paletas Temáticas NAKEIC
object NakeicPalettes {
    // 1. Cyan Nakeic (Por defecto)
    val DefaultPrimary = Color(0xFF00B4D8)
    val DefaultSecondary = Color(0xFF0077B6)
    val DefaultBubbleSent = Color(0xFF0077B6)
    val DefaultBubbleReceivedDark = Color(0xFF1F293D)
    val DefaultBubbleReceivedLight = Color(0xFFF0F4F8)

    // 2. Violeta / Amatista
    val PurplePrimary = Color(0xFF8B5CF6)
    val PurpleSecondary = Color(0xFF6D28D9)
    val PurpleBubbleSent = Color(0xFF7C3AED)

    // 3. Esmeralda / Menta Profunda
    val EmeraldPrimary = Color(0xFF10B981)
    val EmeraldSecondary = Color(0xFF059669)
    val EmeraldBubbleSent = Color(0xFF047857)

    // 4. Carmesí / Rubí
    val CrimsonPrimary = Color(0xFFF43F5E)
    val CrimsonSecondary = Color(0xFFE11D48)
    val CrimsonBubbleSent = Color(0xFFBE123C)

    // 5. Ámbar / Solar
    val AmberPrimary = Color(0xFFF59E0B)
    val AmberSecondary = Color(0xFFD97706)
    val AmberBubbleSent = Color(0xFFB45309)

    // 6. Midnight / OLED Black puro
    val MidnightPrimary = Color(0xFF64748B)
    val MidnightBackground = Color(0xFF000000)
    val MidnightSurface = Color(0xFF0F172A)
    val MidnightBubbleSent = Color(0xFF334155)
}

// Estados de entrega de mensajes
val StatusSending = Color(0xFF94A3B8)
val StatusSent = Color(0xFF64748B)
val StatusDelivered = Color(0xFF94A3B8)
val StatusRead = Color(0xFF38BDF8) // Doble verificación azul celeste Nakeic
val StatusFailed = Color(0xFFEF4444)
