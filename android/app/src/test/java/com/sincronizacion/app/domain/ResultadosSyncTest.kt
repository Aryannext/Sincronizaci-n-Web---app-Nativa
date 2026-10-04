package com.sincronizacion.app.domain

import com.sincronizacion.app.domain.TipoOperacion.CREATE
import com.sincronizacion.app.domain.TipoOperacion.DELETE
import com.sincronizacion.app.domain.TipoOperacion.UPDATE
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ResultadosSyncTest {

    private val registro = RegistroServidor(1, "u-1", "Ana", "Ruiz", "3001234567", "ana@example.com", 2, false)

    @Test
    fun `los estados del servidor se leen sin importar mayusculas`() {
        assertEquals(EstadoPush.APPLIED, EstadoPush.desde("applied"))
        assertEquals(EstadoPush.NOT_FOUND, EstadoPush.desde("not_found"))
        assertEquals(EstadoPush.DESCONOCIDO, EstadoPush.desde("otro"))
    }

    @Test
    fun `applied y duplicate confirman la version del servidor`() {
        assertEquals(AccionLocal.Confirmar(registro), ResultadosSync.decidir(UPDATE, EstadoPush.APPLIED, registro, null, null))
        assertEquals(AccionLocal.Confirmar(registro), ResultadosSync.decidir(CREATE, EstadoPush.DUPLICATE, registro, null, null))
    }

    @Test
    fun `conflict acepta la version del servidor`() {
        assertEquals(AccionLocal.AceptarServidor(registro), ResultadosSync.decidir(UPDATE, EstadoPush.CONFLICT, null, registro, null))
    }

    @Test
    fun `not_found en un DELETE solo borra en local`() {
        assertEquals(AccionLocal.BorrarLocal, ResultadosSync.decidir(DELETE, EstadoPush.NOT_FOUND, null, null, null))
    }

    @Test
    fun `not_found en un UPDATE se marca como error`() {
        assertTrue(ResultadosSync.decidir(UPDATE, EstadoPush.NOT_FOUND, null, null, null) is AccionLocal.MarcarError)
    }

    @Test
    fun `rejected muestra el motivo del servidor`() {
        assertEquals(
            AccionLocal.MarcarError("El correo ya está registrado."),
            ResultadosSync.decidir(CREATE, EstadoPush.REJECTED, null, null, "El correo ya está registrado.")
        )
    }

    @Test
    fun `un cambio remoto solo se aplica si es mas nuevo y no hay cambios locales pendientes`() {
        assertTrue(ResultadosSync.debeAplicarCambioRemoto(null, tienePendiente = false, versionRemota = 1))
        assertTrue(ResultadosSync.debeAplicarCambioRemoto(2, tienePendiente = false, versionRemota = 3))
        assertFalse(ResultadosSync.debeAplicarCambioRemoto(3, tienePendiente = false, versionRemota = 3))
        assertFalse(ResultadosSync.debeAplicarCambioRemoto(2, tienePendiente = true, versionRemota = 5))
    }
}
