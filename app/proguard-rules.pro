# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Swastik DTOs & Models ──
-keepclassmembers class com.example.swastik.data.remote.dto.** { *; }
-keep class com.example.swastik.data.remote.dto.** { *; }
-keepclassmembers class com.example.swastik.data.model.** { *; }
-keep class com.example.swastik.data.model.** { *; }

# ── Gson ──
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# ── Retrofit ──
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Exceptions,Signature,InnerClasses,EnclosingMethod
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault
-keep class kotlin.Metadata { *; }
-keep class kotlin.coroutines.Continuation
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keepclassmembers,allowshrinking,allowobfuscation interface * {
  @retrofit2.http.* <methods>;
}
-keep,allowobfuscation interface * {
  @retrofit2.http.* <methods>;
}
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# ── OkHttp ──
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# ── Socket.IO ──
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# ── Room ──
-keep class * extends androidx.room.RoomDatabase
-keepclassmembers class * extends androidx.room.RoomDatabase { *; }

# ── WebRTC ──
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# ── EncryptedSharedPreferences ──
-keep class androidx.security.crypto.** { *; }

# ── R8 Missing Class Suppressions (AGP-generated) ──
# Some transitive libraries ship annotation-processor artifacts (AutoValue/Javapoet)
# that reference javax.lang.model.* (JDK compiler APIs not present on Android runtime).
# These are not used at runtime and can be safely ignored for app minification.
-dontwarn javax.lang.model.SourceVersion
-dontwarn javax.lang.model.element.Element
-dontwarn javax.lang.model.element.ElementKind
-dontwarn javax.lang.model.element.Modifier
-dontwarn javax.lang.model.type.TypeMirror
-dontwarn javax.lang.model.type.TypeVisitor
-dontwarn javax.lang.model.util.SimpleTypeVisitor8

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── MediaPipe (FaceLandmarker JNI bridge) ──
-keep class com.google.mediapipe.** { *; }
-dontwarn com.google.mediapipe.**
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.protobuf.**

# ── Socket.IO Engine (reflection-based transport) ──
-keep class io.socket.engineio.** { *; }
-dontwarn io.socket.engineio.**

# ── CameraX internal lifecycle binding ──
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ── Suppress warnings for annotation-processor-only classes ──
-dontwarn com.google.auto.value.**
-dontwarn autovalue.shaded.**