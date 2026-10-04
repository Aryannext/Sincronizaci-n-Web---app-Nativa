// Versiones fijadas en gradle.lockfile y buildscript-gradle.lockfile.
// Tras cambiar libs.versions.toml: ./gradlew :app:dependencies buildEnvironment --write-locks
buildscript {
    configurations.classpath {
        resolutionStrategy.activateDependencyLocking()
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
}

dependencyLocking {
    lockAllConfigurations()
}
