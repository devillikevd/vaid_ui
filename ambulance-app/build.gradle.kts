import java.util.Properties
import org.gradle.api.GradleException
import java.net.DatagramSocket
import java.net.InetAddress

val localBuildProperties = Properties().apply {
    val localPropsFile = rootProject.file("local.properties")
    if (localPropsFile.exists()) {
        load(localPropsFile.inputStream())
    }
}

fun localBuildProperty(key: String): String? =
    localBuildProperties.getProperty(key)?.takeIf { it.isNotBlank() }

fun localOrEnvProperty(key: String): String? =
    localBuildProperty(key) ?: System.getenv(key)?.takeIf { it.isNotBlank() }

fun localOrEnvBoolean(key: String, default: Boolean): Boolean =
    (localOrEnvProperty(key) ?: default.toString()).toBooleanStrictOrNull() ?: default

fun getHostIpAddress(): String {
    try {
        DatagramSocket().use { socket ->
            socket.connect(InetAddress.getByName("8.8.8.8"), 10002)
            return socket.localAddress.hostAddress
        }
    } catch (e: Exception) {
        return "10.0.2.2"
    }
}

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.jetbrains.kotlin.android)
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

android {
    namespace = "com.example.swastik.ambulance"
    compileSdk = 34

    signingConfigs {
        create("release") {
            val storeFilePath = localOrEnvProperty("RELEASE_STORE_FILE")
            val storePasswordValue = localOrEnvProperty("RELEASE_STORE_PASSWORD")
            val keyAliasValue = localOrEnvProperty("RELEASE_KEY_ALIAS")
            val keyPasswordValue = localOrEnvProperty("RELEASE_KEY_PASSWORD")

            if (!storeFilePath.isNullOrBlank() &&
                !storePasswordValue.isNullOrBlank() &&
                !keyAliasValue.isNullOrBlank() &&
                !keyPasswordValue.isNullOrBlank()
            ) {
                storeFile = file(storeFilePath)
                storePassword = storePasswordValue
                keyAlias = keyAliasValue
                keyPassword = keyPasswordValue
            }
        }
    }

    defaultConfig {
        applicationId = "com.example.swastik.ambulance"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
        val defaultIp = getHostIpAddress()
        buildConfigField("String", "API_BASE_URL", "\"http://$defaultIp:5001/api/\"")
        buildConfigField("String", "DEVICE_API_BASE_URL", "\"\"")
        buildConfigField("String", "CERT_PINS", "\"\"")


    }

    buildTypes {
        debug {
            localBuildProperty("API_BASE_URL")?.let { apiUrl ->
                buildConfigField("String", "API_BASE_URL", "\"$apiUrl\"")
            }
            localBuildProperty("API_BASE_URL_DEVICE")?.let { deviceApiUrl ->
                buildConfigField("String", "DEVICE_API_BASE_URL", "\"$deviceApiUrl\"")
            }
            localBuildProperty("CERT_PINS")?.let { pins ->
                buildConfigField("String", "CERT_PINS", "\"$pins\"")
            }
        }
        release {
            val useDebugSigningForRelease = localOrEnvBoolean("USE_DEBUG_SIGNING_FOR_RELEASE", false)
            isMinifyEnabled = !useDebugSigningForRelease
            isShrinkResources = !useDebugSigningForRelease
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "API_BASE_URL", "\"https://api.vaididea.in/api/\"")
            localBuildProperty("CERT_PINS")?.let { pins ->
                buildConfigField("String", "CERT_PINS", "\"$pins\"")
            }

            if (useDebugSigningForRelease) {
                // Local QA release build (installable quickly on test devices)
                signingConfig = signingConfigs.getByName("debug")
            } else {
                val required = listOf(
                    "RELEASE_STORE_FILE",
                    "RELEASE_STORE_PASSWORD",
                    "RELEASE_KEY_ALIAS",
                    "RELEASE_KEY_PASSWORD"
                )
                val missing = required.filter { localOrEnvProperty(it).isNullOrBlank() }
                if (missing.isNotEmpty()) {
                    throw GradleException(
                        "Missing release signing properties: ${missing.joinToString(", ")}. " +
                            "Set them in local.properties or environment variables."
                    )
                }
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Google Location & OpenStreetMap
    implementation(libs.play.services.location)
    implementation(libs.osmdroid.android)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)

    // Coroutines
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // ViewModel & Lifecycle
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Hilt DI
    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-android-compiler:2.51.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Security Crypto
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    
    // SQLCipher integration for local database encryption
    implementation("net.zetetic:android-database-sqlcipher:4.5.4")
    implementation("androidx.sqlite:sqlite:2.4.0")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Socket.IO client (official Maven Central)
    implementation("io.socket:socket.io-client:2.1.0") {
        exclude(group = "org.json", module = "json")
    }

    // Firebase Cloud Messaging
    implementation(platform(libs.firebase.bom))
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-crashlytics-ktx")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

configurations.all {
    resolutionStrategy { force("com.squareup:javapoet:1.13.0") }
}
