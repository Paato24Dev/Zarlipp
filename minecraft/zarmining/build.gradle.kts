plugins {
    java

    // Opcional (MUY recomendado): levanta un servidor Paper de pruebas con `./gradlew runServer`.
    // Descomenta la línea y comprueba la última versión en https://plugins.gradle.org/plugin/xyz.jpenilla.run-paper
    // id("xyz.jpenilla.run-paper") version "2.3.1"
}

group = "dev.zarlipp"
version = "1.0.0"

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
}

dependencies {
    // Paper 26.2 ("Chaos Cubed"). `.build.+` coge siempre el último build de esa versión.
    // Si prefieres fijarlo: "io.papermc.paper:paper-api:26.2.build.65-beta"
    compileOnly("io.papermc.paper:paper-api:26.2.build.+")
}

java {
    // Minecraft 26.x exige Java 25 en el servidor.
    toolchain.languageVersion.set(JavaLanguageVersion.of(25))
}

tasks {
    compileJava {
        options.encoding = "UTF-8"
    }

    processResources {
        filteringCharset = "UTF-8"
        val props = mapOf(
            "version" to project.version.toString(),
            "apiVersion" to "26.2"
        )
        inputs.properties(props)
        filesMatching("plugin.yml") {
            expand(props)
        }
    }

    // Descomenta junto con el plugin run-paper de arriba.
    // runServer {
    //     minecraftVersion("26.2")
    // }
}
