import java.util.Properties
import org.gradle.api.GradleException

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

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.jetbrains.kotlin.android)
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
    // id("com.google.gms.google-services")
}




android {
    namespace = "com.example.swastik"
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
        applicationId = "com.example.swastik"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Default API base URL (Android Emulator → host localhost)
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:5001/api/\"")
        buildConfigField("String", "AI_WS_BASE_URL", "\"\"")
        buildConfigField("String", "TURN_URL", "\"\"")
        buildConfigField("String", "TURN_USERNAME", "\"\"")
        buildConfigField("String", "TURN_CREDENTIAL", "\"\"")


    }

    buildTypes {
        debug {
            // Override from local.properties if set (e.g. for physical device testing)
            localBuildProperty("API_BASE_URL")?.let { apiUrl ->
                buildConfigField("String", "API_BASE_URL", "\"$apiUrl\"")
            }
            localBuildProperty("AI_WS_BASE_URL")?.let { aiWsUrl ->
                buildConfigField("String", "AI_WS_BASE_URL", "\"$aiWsUrl\"")
            }
            localBuildProperty("TURN_URL")?.let { turnUrl ->
                buildConfigField("String", "TURN_URL", "\"$turnUrl\"")
            }
            localBuildProperty("TURN_USERNAME")?.let { turnUsername ->
                buildConfigField("String", "TURN_USERNAME", "\"$turnUsername\"")
            }
            localBuildProperty("TURN_CREDENTIAL")?.let { turnCredential ->
                buildConfigField("String", "TURN_CREDENTIAL", "\"$turnCredential\"")
            }
        }
        create("staging") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            matchingFallbacks += listOf("debug")
            signingConfig = signingConfigs.getByName("debug")

            // Production-like build with debug signing for easy local installs
            val stagingApiUrl = localBuildProperty("API_BASE_URL") ?: "http://10.0.2.2:5001/api/"
            val stagingAiWsUrl = localBuildProperty("AI_WS_BASE_URL") ?: ""
            val stagingTurnUrl = localBuildProperty("TURN_URL") ?: ""
            val stagingTurnUsername = localBuildProperty("TURN_USERNAME") ?: ""
            val stagingTurnCredential = localBuildProperty("TURN_CREDENTIAL") ?: ""
            buildConfigField("String", "API_BASE_URL", "\"$stagingApiUrl\"")
            buildConfigField("String", "AI_WS_BASE_URL", "\"$stagingAiWsUrl\"")
            buildConfigField("String", "TURN_URL", "\"$stagingTurnUrl\"")
            buildConfigField("String", "TURN_USERNAME", "\"$stagingTurnUsername\"")
            buildConfigField("String", "TURN_CREDENTIAL", "\"$stagingTurnCredential\"")
        }
        release {
            val useDebugSigningForRelease = localOrEnvBoolean("USE_DEBUG_SIGNING_FOR_RELEASE", false)
            isMinifyEnabled = !useDebugSigningForRelease
            isShrinkResources = !useDebugSigningForRelease
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Keep release APKs on the production API. Debug/staging can still
            // use API_BASE_URL from local.properties for local device testing.
            val releaseApiUrl = localOrEnvProperty("RELEASE_API_BASE_URL") ?: "https://api.vaididea.in/api/"
            val releaseAiWsUrl = localOrEnvProperty("AI_WS_BASE_URL") ?: ""
            val releaseTurnUrl = localOrEnvProperty("TURN_URL") ?: ""
            val releaseTurnUsername = localOrEnvProperty("TURN_USERNAME") ?: ""
            val releaseTurnCredential = localOrEnvProperty("TURN_CREDENTIAL") ?: ""
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiUrl\"")
            buildConfigField("String", "AI_WS_BASE_URL", "\"$releaseAiWsUrl\"")
            buildConfigField("String", "TURN_URL", "\"$releaseTurnUrl\"")
            buildConfigField("String", "TURN_USERNAME", "\"$releaseTurnUsername\"")
            buildConfigField("String", "TURN_CREDENTIAL", "\"$releaseTurnCredential\"")

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
        isCoreLibraryDesugaringEnabled = true
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {

    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Location & OpenStreetMap
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

    // ViewModel
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Room Database for offline caching
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // DataStore - used by AppSettingsStore.kt for theme & language preferences
    // Added by Divyanshu - fixes Unresolved reference: AppSettingsStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Hilt Dependency Injection
    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-android-compiler:2.51.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Security Crypto for encrypted shared preferences
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Navigation Compose
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Socket.IO for real-time communication
    implementation("io.socket:socket.io-client:2.1.0") {
        exclude(group = "org.json", module = "json")
    }

    // WebRTC for Video Calls
    implementation("io.getstream:stream-webrtc-android:1.1.1")

    // Coil for async image loading in Compose
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Firebase Cloud Messaging (gracefully no-ops when project config is absent)
    implementation("com.google.firebase:firebase-messaging:24.1.0")

    // ZXing for QR code generation
    implementation("com.google.zxing:core:3.5.3")

    // MediaPipe for Edge CV
    implementation("com.google.mediapipe:tasks-vision:0.10.0")

    // FFT math for rPPG calculations
    implementation("com.github.wendykierp:JTransforms:3.1")

    // CameraX
    implementation("androidx.camera:camera-camera2:1.3.0")
    implementation("androidx.camera:camera-lifecycle:1.3.0")
    implementation("androidx.camera:camera-view:1.3.0")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

configurations.all {
    resolutionStrategy {
        force("com.squareup:javapoet:1.13.0")
    }
}