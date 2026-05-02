package com.example.swastik.ambulance.di

import com.example.swastik.ambulance.data.remote.ApiConfig
import com.example.swastik.ambulance.data.remote.ApiService
import com.example.swastik.ambulance.data.remote.AuthInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import com.example.swastik.ambulance.BuildConfig
import javax.inject.Named

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
        }
        val certificatePinner = buildCertificatePinner()
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .apply { certificatePinner?.let { certificatePinner(it) } }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    @Named("socket")
    fun provideSocketOkHttpClient(): OkHttpClient {
        val certificatePinner = buildCertificatePinner()
        return OkHttpClient.Builder()
            .apply { certificatePinner?.let { certificatePinner(it) } }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(ApiConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    private fun buildCertificatePinner(): CertificatePinner? {
        val host = ApiConfig.API_HOST
        val pins = BuildConfig.CERT_PINS.split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }

        if (host.isBlank() || pins.isEmpty()) return null

        val builder = CertificatePinner.Builder()
        pins.forEach { pin ->
            builder.add(host, pin)
        }
        return builder.build()
    }
}
