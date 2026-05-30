package com.example.swastik.utils

import androidx.lifecycle.Lifecycle
import androidx.navigation.NavController
import androidx.navigation.NavOptions
import androidx.navigation.NavOptionsBuilder
import androidx.navigation.Navigator

/**
 * Extension function to prevent multiple navigation events from triggering 
 * if the user double-clicks a button.
 */
fun NavController.navigateSafe(
    route: String,
    navOptions: NavOptions? = null,
    navigatorExtras: Navigator.Extras? = null
) {
    if (currentBackStackEntry?.lifecycle?.currentState == Lifecycle.State.RESUMED) {
        navigate(route, navOptions, navigatorExtras)
    }
}

fun NavController.navigateSafe(
    route: String,
    builder: NavOptionsBuilder.() -> Unit
) {
    if (currentBackStackEntry?.lifecycle?.currentState == Lifecycle.State.RESUMED) {
        navigate(route, builder)
    }
}
