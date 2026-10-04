package com.sincronizacion.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Mismos colores que el panel web (frontend/src/index.css)
private val esquema = darkColorScheme(
    primary = Color(0xFF8B5CF6),
    onPrimary = Color.White,
    secondary = Color(0xFF06B6D4),
    background = Color(0xFF0B0F19),
    onBackground = Color(0xFFF1F5F9),
    surface = Color(0xFF111827),
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = Color(0xFF1F2937),
    onSurfaceVariant = Color(0xFF94A3B8),
    error = Color(0xFFF87171),
    tertiary = Color(0xFFFBBF24)
)

@Composable
fun TemaSyncPulse(contenido: @Composable () -> Unit) {
    MaterialTheme(colorScheme = esquema, content = contenido)
}
