package com.example.swastik.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.theme.SwastikPrimary
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

enum class ButtonState {
    IDLE, LOADING, SUCCESS
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun AnimatedPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    buttonState: ButtonState = ButtonState.IDLE,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = tween(durationMillis = 150),
        label = "button_scale"
    )

    Button(
        onClick = onClick,
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .height(52.dp),
        enabled = enabled && buttonState == ButtonState.IDLE,
        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
        shape = RoundedCornerShape(14.dp),
        interactionSource = interactionSource
    ) {
        AnimatedContent(
            targetState = buttonState,
            label = "button_state_animation"
        ) { state ->
            when (state) {
                ButtonState.IDLE -> {
                    Text(text, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, fontSize = 16.sp)
                }
                ButtonState.LOADING -> {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                }
                ButtonState.SUCCESS -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Check, contentDescription = "Success")
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.success_1), fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}
