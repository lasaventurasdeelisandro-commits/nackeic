package com.nakeic.app.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color

/**
 * Modelo de Estado de Tema Dinámico NAKEIC.
 * Permite al usuario personalizar a su gusto:
 * - Color Primario
 * - Color Secundario
 * - Fondo
 * - Botones
 * - Burbuja de mensaje enviado
 * - Burbuja de mensaje recibido
 * - Modo oscuro / claro / automático
 */
data class NakeicThemeConfig(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val primaryColor: Color = NakeicPalettes.DefaultPrimary,
    val secondaryColor: Color = NakeicPalettes.DefaultSecondary,
    val bubbleSentColor: Color = NakeicPalettes.DefaultBubbleSent,
    val bubbleReceivedColor: Color = NakeicPalettes.DefaultBubbleReceivedDark,
    val backgroundColorDark: Color = Color(0xFF090D16),
    val surfaceColorDark: Color = Color(0xFF131B2C),
    val backgroundColorLight: Color = Color(0xFFF8FAFC),
    val surfaceColorLight: Color = Color(0xFFFFFFFF),
    val isOledBlackEnabled: Boolean = false
)

enum class ThemeMode {
    LIGHT, DARK, SYSTEM
}

val LocalNakeicTheme = staticCompositionLocalOf { NakeicThemeConfig() }

@Composable
fun NakeicTheme(
    config: NakeicThemeConfig = NakeicThemeConfig(),
    content: @Composable () -> Unit
) {
    val isDark = when (config.themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }

    val background = if (isDark) {
        if (config.isOledBlackEnabled) Color.Black else config.backgroundColorDark
    } else {
        config.backgroundColorLight
    }

    val surface = if (isDark) {
        if (config.isOledBlackEnabled) Color(0xFF121212) else config.surfaceColorDark
    } else {
        config.surfaceColorLight
    }

    val colorScheme = if (isDark) {
        darkColorScheme(
            primary = config.primaryColor,
            secondary = config.secondaryColor,
            background = background,
            surface = surface,
            onPrimary = Color.White,
            onSecondary = Color.White,
            onBackground = Color(0xFFF1F5F9),
            onSurface = Color(0xFFF1F5F9),
            surfaceVariant = if (config.isOledBlackEnabled) Color(0xFF1E1E1E) else Color(0xFF1E293B)
        )
    } else {
        lightColorScheme(
            primary = config.primaryColor,
            secondary = config.secondaryColor,
            background = background,
            surface = surface,
            onPrimary = Color.White,
            onSecondary = Color.White,
            onBackground = Color(0xFF0F172A),
            onSurface = Color(0xFF0F172A),
            surfaceVariant = Color(0xFFE2E8F0)
        )
    }

    CompositionLocalProvider(LocalNakeicTheme provides config) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography(),
            content = content
        )
    }
}
