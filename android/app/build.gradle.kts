import java.util.Properties

// Versiones fijadas en gradle.lockfile y buildscript-gradle.lockfile (plugins).
// Tras cambiar libs.versions.toml: ./gradlew :app:dependencies :app:buildEnvironment --write-locks
buildscript {
    configurations.classpath {
        resolutionStrategy.activateDependencyLocking()
    }
}

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
}

fun leerPropiedades(nombre: String) = Properties().apply {
    val archivo = rootProject.file(nombre)
    if (archivo.exists()) archivo.inputStream().use { load(it) }
}

// Cada URL se toma de local.properties (si existe) o de gradle.properties / -P
val propiedadesLocales = leerPropiedades("local.properties")
fun propiedad(clave: String): String? =
    propiedadesLocales.getProperty(clave) ?: providers.gradleProperty(clave).orNull

val apiUrl: String = propiedad("api.url") ?: error("Falta api.url en gradle.properties.")
// La versión release solo admite HTTPS; se valida al compilarla (ver validarRelease)
val apiUrlRelease: String = propiedad("api.url.release").orEmpty()

// Firma de release: android/keystore.properties (no se sube a git, ver keystore.properties.example)
val firma = leerPropiedades("keystore.properties")
val hayFirma = listOf("storeFile", "storePassword", "keyAlias", "keyPassword").all { !firma.getProperty(it).isNullOrBlank() }

android {
    namespace = "com.sincronizacion.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.sincronizacion.app"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (hayFirma) {
            create("release") {
                storeFile = rootProject.file(firma.getProperty("storeFile"))
                storePassword = firma.getProperty("storePassword")
                keyAlias = firma.getProperty("keyAlias")
                keyPassword = firma.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_URL", "\"$apiUrl\"")
        }
        release {
            buildConfigField("String", "API_URL", "\"$apiUrlRelease\"")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hayFirma) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencyLocking {
    lockAllConfigurations()
}

// Falla pronto y con un mensaje claro si la versión release no se puede publicar
val validarRelease by tasks.registering {
    val url = apiUrlRelease
    val firmada = hayFirma
    doLast {
        check(url.startsWith("https://")) {
            "api.url.release debe ser una URL https:// (actual: \"$url\"). Defínela en local.properties."
        }
        check(firmada) {
            "Falta la firma de release: crea android/keystore.properties a partir de keystore.properties.example."
        }
    }
}
tasks.matching { it.name == "preReleaseBuild" }.configureEach { dependsOn(validarRelease) }

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.androidx.datastore.preferences)

    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    testImplementation(libs.junit)
}
