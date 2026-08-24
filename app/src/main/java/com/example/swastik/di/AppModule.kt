package com.example.swastik.di

import android.content.Context
import com.example.swastik.data.local.TokenManager
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.AuthInterceptor
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.repository.AuthRepository
import com.example.swastik.data.repository.PatientRepository
import com.example.swastik.data.repository.DoctorRepository
import com.example.swastik.data.repository.DoctorRepositoryImpl
import com.example.swastik.data.repository.AppointmentRepository
import com.example.swastik.data.repository.ChatbotRepository
import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.repository.EmergencyRepositoryImpl
import com.example.swastik.data.repository.MedicineRepository
import com.example.swastik.data.repository.HospitalRepository
import com.example.swastik.data.repository.RecordsRepository
import com.example.swastik.data.repository.DiagnosticRepository
import com.example.swastik.data.repository.VitalsRepository
import com.example.swastik.data.local.db.SwastikDatabase
import com.example.swastik.data.local.db.*
import com.example.swastik.notifications.PushNotificationCoordinator
import com.example.swastik.data.sync.SyncManager
import com.example.swastik.utils.NetworkObserver
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import com.example.swastik.data.remote.ApiConfig
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import com.example.swastik.BuildConfig
import okhttp3.HttpUrl.Companion.toHttpUrl

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private val BASE_URL = ApiConfig.BASE_URL

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.NONE
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
        @ApplicationContext context: android.content.Context
    ): OkHttpClient {
        val appCache = okhttp3.Cache(java.io.File(context.cacheDir, "okhttpcache"), 10 * 1024 * 1024)
        val bootstrapClient = OkHttpClient.Builder()
            .cache(appCache)
            .build()
            
        val dns = okhttp3.dnsoverhttps.DnsOverHttps.Builder().client(bootstrapClient)
            .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
            .bootstrapDnsHosts(
                java.net.InetAddress.getByName("1.1.1.1"),
                java.net.InetAddress.getByName("1.0.0.1"),
                java.net.InetAddress.getByName("8.8.8.8"),
                java.net.InetAddress.getByName("8.8.4.4")
            )
            .build()

        return OkHttpClient.Builder()
            .dns(dns)
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .connectionPool(okhttp3.ConnectionPool(5, 5, TimeUnit.MINUTES))
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    // ==================== Repository Bindings ====================

    @Provides
    @Singleton
    fun provideAuthRepository(
        apiService: ApiService,
        tokenManager: TokenManager,
        socketManager: SocketManager,
        database: SwastikDatabase,
        chatbotRepository: ChatbotRepository,
        pushNotificationCoordinator: PushNotificationCoordinator
    ): AuthRepository {
        return AuthRepository(
            apiService,
            tokenManager,
            socketManager,
            database,
            chatbotRepository,
            pushNotificationCoordinator
        )
    }

    @Provides
    @Singleton
    fun providePatientRepository(
        apiService: ApiService,
        socketManager: SocketManager,
        notificationDao: NotificationDao,
        prescriptionDao: PrescriptionDao,
        @ApplicationContext context: Context
    ): PatientRepository {
        val prefs = context.getSharedPreferences("patient_prefs", Context.MODE_PRIVATE)
        return PatientRepository(apiService, socketManager, notificationDao, prescriptionDao, prefs)
    }

    @Provides
    @Singleton
    fun provideAppointmentRepository(
        apiService: ApiService,
        socketManager: SocketManager,
        appointmentDao: AppointmentDao,
        syncQueueDao: SyncQueueDao,
        networkObserver: NetworkObserver
    ): AppointmentRepository {
        return AppointmentRepository(apiService, socketManager, appointmentDao, syncQueueDao, networkObserver)
    }

    @Provides
    @Singleton
    fun provideDoctorRepository(apiService: ApiService, doctorDao: DoctorDao): DoctorRepository {
        return DoctorRepositoryImpl(apiService, doctorDao)
    }

    @Provides
    @Singleton
    fun provideEmergencyRepository(apiService: ApiService): EmergencyRepository {
        return EmergencyRepositoryImpl(apiService)
    }

    @Provides
    @Singleton
    fun provideChatbotRepository(apiService: ApiService, @ApplicationContext context: Context): ChatbotRepository {
        return ChatbotRepository(apiService, context)
    }

    @Provides
    @Singleton
    fun provideMedicineRepository(apiService: ApiService, medicineDao: MedicineDao): MedicineRepository {
        return MedicineRepository(apiService, medicineDao)
    }

    @Provides
    @Singleton
    fun provideHospitalRepository(apiService: ApiService, hospitalDao: HospitalDao): HospitalRepository {
        return HospitalRepository(apiService, hospitalDao)
    }

    @Provides
    @Singleton
    fun provideRecordsRepository(apiService: ApiService, @ApplicationContext context: Context): RecordsRepository {
        return RecordsRepository(apiService, context)
    }

    @Provides
    @Singleton
    fun provideDiagnosticRepository(apiService: ApiService): DiagnosticRepository {
        return DiagnosticRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideVitalsRepository(
        apiService: ApiService,
        alarmScheduler: com.example.swastik.notifications.ReminderAlarmScheduler
    ): VitalsRepository {
        return VitalsRepository(apiService, alarmScheduler)
    }

    // ==================== Room Database ====================

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SwastikDatabase {
        return SwastikDatabase.getDatabase(context)
    }

    @Provides
    fun provideDoctorDao(database: SwastikDatabase): DoctorDao = database.doctorDao()

    @Provides
    fun provideAppointmentDao(database: SwastikDatabase): AppointmentDao = database.appointmentDao()

    @Provides
    fun provideNotificationDao(database: SwastikDatabase): NotificationDao = database.notificationDao()

    @Provides
    fun providePrescriptionDao(database: SwastikDatabase): PrescriptionDao = database.prescriptionDao()

    @Provides
    fun provideMedicineDao(database: SwastikDatabase): MedicineDao = database.medicineDao()

    @Provides
    fun provideHospitalDao(database: SwastikDatabase): HospitalDao = database.hospitalDao()

    @Provides
    fun provideSyncQueueDao(database: SwastikDatabase): SyncQueueDao = database.syncQueueDao()

    @Provides
    fun provideFitnessDao(database: SwastikDatabase): FitnessDao = database.fitnessDao()

    @Provides
    @Singleton
    fun provideGuardianDao(db: SwastikDatabase) = db.guardianDao()


    @Provides
    @Singleton
    fun provideFitnessRepository(fitnessDao: FitnessDao, @ApplicationContext context: Context): com.example.swastik.data.repository.FitnessRepository {
        return com.example.swastik.data.repository.FitnessRepository(fitnessDao, context)
    }

    // ==================== Sync Manager ====================

    @Provides
    @Singleton
    fun provideSyncManager(
        syncQueueDao: SyncQueueDao,
        apiService: ApiService,
        networkObserver: NetworkObserver
    ): SyncManager {
        return SyncManager(syncQueueDao, apiService, networkObserver)
    }

    // ==================== Alarm Scheduler ====================

    @Provides
    @Singleton
    fun provideReminderAlarmScheduler(@ApplicationContext context: Context): com.example.swastik.notifications.ReminderAlarmScheduler {
        return com.example.swastik.notifications.AndroidAlarmScheduler(context)
    }


}
