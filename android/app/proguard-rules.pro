# Clases que kotlinx.serialization convierte desde/hacia JSON
-keep,includedescriptorclasses class com.sincronizacion.app.data.remote.**$$serializer { *; }
-keepclassmembers class com.sincronizacion.app.data.remote.** {
    *** Companion;
}
-keepclasseswithmembers class com.sincronizacion.app.data.remote.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Interfaces de Retrofit
-keep,allowobfuscation interface com.sincronizacion.app.data.remote.ApiService
