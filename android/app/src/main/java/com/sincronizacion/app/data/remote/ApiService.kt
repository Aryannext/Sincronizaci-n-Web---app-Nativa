package com.sincronizacion.app.data.remote

import com.sincronizacion.app.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body cuerpo: LoginRequest): LoginResponse

    @POST("sync/push")
    suspend fun push(@Body cuerpo: PushRequest): PushResponse

    @GET("sync")
    suspend fun cambios(
        @Query("last_change_id") lastChangeId: Long,
        @Query("limit") limit: Int
    ): CambiosResponse

    companion object {

        /** Máximos que acepta el servidor por petición (ver docs/api.md). */
        const val MAX_OPERACIONES_PUSH = 200
        const val TAM_PAGINA_PULL = 500

        val json = Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }

        /** tokenActual se consulta en cada petición; si hay token se envía como Bearer. */
        fun crear(tokenActual: () -> String?): ApiService {

            val autenticacion = Interceptor { cadena ->
                val token = tokenActual()
                val peticion = if (token != null) {
                    cadena.request().newBuilder().header("Authorization", "Bearer $token").build()
                } else {
                    cadena.request()
                }
                cadena.proceed(peticion)
            }

            val cliente = OkHttpClient.Builder()
                .addInterceptor(autenticacion)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            return Retrofit.Builder()
                .baseUrl(BuildConfig.API_URL)
                .client(cliente)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
                .create(ApiService::class.java)
        }
    }
}
