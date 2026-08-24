# ── Swastik DTOs & Models ──
-keepclassmembers class com.example.swastik.data.remote.dto.** { *; }
-keep class com.example.swastik.data.remote.dto.** { *; }
-keepclassmembers class com.example.swastik.data.model.** { *; }
-keep class com.example.swastik.data.model.** { *; }
-keep class com.example.swastik.data.local.** { *; }
-keepclassmembers class com.example.swastik.data.local.** { *; }

# ── Gson ──
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# ── Retrofit ──
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Exceptions,Signature,InnerClasses,EnclosingMethod
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault
-keep class kotlin.Metadata { *; }
-keep class kotlin.coroutines.Continuation
-keep class kotlin.coroutines.SafeContinuation
-keepclasseswithmembers interface * {
    @retrofit2.http.* <methods>;
}
-keep interface com.example.swastik.data.remote.ApiService { *; }

# ── OkHttp ──
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# ── Socket.IO ──
-keep class io.socket.** { *; }
-dontwarn io.socket.**
-keep class io.socket.engineio.** { *; }
-dontwarn io.socket.engineio.**

# ── Room Database ──
-keep class * extends androidx.room.RoomDatabase
-keepclassmembers class * extends androidx.room.RoomDatabase { *; }
-keep class com.example.swastik.data.local.db.** { *; }
-keepclassmembers class com.example.swastik.data.local.db.** { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }
-dontwarn androidx.room.paging.**

# ── Hilt & ViewModels ──
-keep class * extends androidx.lifecycle.ViewModel {
    <init>(...);
}
-keep class * extends androidx.lifecycle.AndroidViewModel {
    <init>(...);
}
-keep class dagger.hilt.** { *; }
-keep class com.example.swastik.di.** { *; }
-keepclassmembers class com.example.swastik.di.** { *; }

# ── Coroutines ──
-dontwarn kotlinx.coroutines.**
-keep class kotlinx.coroutines.** { *; }

# ── EncryptedSharedPreferences / Security Crypto ──
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**

# ── SQLCipher ──
-keep class net.zetetic.database.sqlcipher.** { *; }
-dontwarn net.zetetic.database.sqlcipher.**

# ── DataStore ──
-keepclassmembers class * extends androidx.datastore.preferences.core.Preferences { *; }
-dontwarn androidx.datastore.**

# ── WebRTC ──
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
-keep class io.getstream.webrtc.android.** { *; }

# ── MediaPipe (FaceLandmarker JNI bridge) ──
-keep class com.google.mediapipe.** { *; }
-dontwarn com.google.mediapipe.**
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.protobuf.**

# ── CameraX ──
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ── Paging ──
-keep class androidx.paging.** { *; }
-dontwarn androidx.paging.**

# ── R8 Missing Class Suppressions (AGP-generated) ──
-dontwarn javax.lang.model.SourceVersion
-dontwarn javax.lang.model.element.Element
-dontwarn javax.lang.model.element.ElementKind
-dontwarn javax.lang.model.element.Modifier
-dontwarn javax.lang.model.type.TypeMirror
-dontwarn javax.lang.model.type.TypeVisitor
-dontwarn javax.lang.model.util.SimpleTypeVisitor8
-dontwarn com.google.auto.value.**
-dontwarn autovalue.shaded.**

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile