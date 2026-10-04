package com.sincronizacion.app.domain

import com.sincronizacion.app.domain.TipoOperacion.CREATE
import com.sincronizacion.app.domain.TipoOperacion.DELETE
import com.sincronizacion.app.domain.TipoOperacion.UPDATE
import org.junit.Assert.assertEquals
import org.junit.Test

class ColaOperacionesTest {

    private fun guardar(tipo: TipoOperacion, base: Int?) = CambioEnCola.Guardar(OperacionEnCola(tipo, base))

    @Test
    fun `sin pendiente, crear encola un CREATE sin base_version`() {
        assertEquals(guardar(CREATE, null), ColaOperaciones.combinar(null, CREATE, 0))
    }

    @Test
    fun `sin pendiente, editar un registro sincronizado usa su version como base`() {
        assertEquals(guardar(UPDATE, 3), ColaOperaciones.combinar(null, UPDATE, 3))
    }

    @Test
    fun `sin pendiente, editar algo que nunca llego al servidor lo vuelve a crear`() {
        assertEquals(guardar(CREATE, null), ColaOperaciones.combinar(null, UPDATE, 0))
    }

    @Test
    fun `sin pendiente, borrar un registro sincronizado encola DELETE con su version`() {
        assertEquals(guardar(DELETE, 5), ColaOperaciones.combinar(null, DELETE, 5))
    }

    @Test
    fun `sin pendiente, borrar algo que nunca llego al servidor no sube nada`() {
        assertEquals(CambioEnCola.Descartar, ColaOperaciones.combinar(null, DELETE, 0))
    }

    @Test
    fun `CREATE pendiente mas ediciones sigue siendo un CREATE`() {
        assertEquals(guardar(CREATE, null), ColaOperaciones.combinar(OperacionEnCola(CREATE, null), UPDATE, 0))
    }

    @Test
    fun `CREATE pendiente mas borrar se descarta por completo`() {
        assertEquals(CambioEnCola.Descartar, ColaOperaciones.combinar(OperacionEnCola(CREATE, null), DELETE, 0))
    }

    @Test
    fun `varias ediciones conservan la base_version original`() {
        assertEquals(guardar(UPDATE, 2), ColaOperaciones.combinar(OperacionEnCola(UPDATE, 2), UPDATE, 2))
    }

    @Test
    fun `editar y luego borrar sube un DELETE con la base_version original`() {
        assertEquals(guardar(DELETE, 2), ColaOperaciones.combinar(OperacionEnCola(UPDATE, 2), DELETE, 2))
    }

    @Test
    fun `un DELETE pendiente no cambia`() {
        assertEquals(guardar(DELETE, 4), ColaOperaciones.combinar(OperacionEnCola(DELETE, 4), UPDATE, 4))
    }
}
