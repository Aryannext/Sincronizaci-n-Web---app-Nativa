const { describe, test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { crearEntorno } = require("./helpers/entorno")

let entorno

before(async () => {
    entorno = await crearEntorno()
    await entorno.reiniciarDatos()
})
after(async () => { await entorno?.cerrar() })

const push = (operations) => entorno.llamar("/sync/push", { token: entorno.tokens.operador, method: "POST", body: { operations } })
const resultados = async (operations) => (await push(operations)).data.results
const totalEventos = async () => (await entorno.llamar("/sync?last_change_id=0&limit=1000", { token: entorno.tokens.operador })).data.changes.length

const U1 = "11111111-1111-4111-8111-111111111111"
const U2 = "22222222-2222-4222-8222-222222222222"
const U3 = "33333333-3333-4333-8333-333333333333"
const datos = { nombre: "Laura", apellido: "Gomez", telefono: "3001234500", correo: "laura@example.com" }
const cambios = { ...datos, telefono: "3009990000" }

describe("Pull: instalación nueva", () => {

    test("los datos de ejemplo llegan al móvil en el primer pull", async () => {
        const personas = (await entorno.llamar("/personas", { token: entorno.tokens.admin })).data
        const cambios = (await entorno.llamar("/sync?last_change_id=0", { token: entorno.tokens.operador })).data.changes
        assert.ok(personas.length > 0)
        for (const persona of personas) {
            const cambio = cambios.find(c => c.record_uuid === persona.uuid)
            assert.ok(cambio, `falta en el pull: ${persona.correo}`)
            assert.equal(cambio.operation, "CREATE")
            assert.equal(cambio.data.version, persona.version)
        }
    })

})

// Los tests de este bloque van en orden sobre el mismo registro (U1)
describe("Push: duplicados, conflictos y reintentos", () => {

    let eventosIniciales

    test("CREATE nuevo -> applied v1 con el uuid del móvil", async () => {
        eventosIniciales = await totalEventos()
        const [r] = await resultados([{ op: "CREATE", uuid: U1, data: datos }])
        assert.equal(r.status, "applied")
        assert.equal(r.record.uuid, U1)
        assert.equal(r.record.version, 1)
    })

    test("CREATE repetido (reintento) -> duplicate, sin crear otra fila", async () => {
        const [r] = await resultados([{ op: "CREATE", uuid: U1, data: datos }])
        assert.equal(r.status, "duplicate")
        assert.equal(r.record.uuid, U1)
    })

    test("UPDATE con base_version correcta -> applied v2", async () => {
        const [r] = await resultados([{ op: "UPDATE", uuid: U1, base_version: 1, data: cambios }])
        assert.equal(r.status, "applied")
        assert.equal(r.record.version, 2)
        assert.equal(r.record.telefono, "3009990000")
    })

    test("UPDATE repetido con los mismos datos (reintento) -> applied, sigue en v2", async () => {
        const [r] = await resultados([{ op: "UPDATE", uuid: U1, base_version: 1, data: cambios }])
        assert.equal(r.status, "applied")
        assert.equal(r.record.version, 2)
    })

    test("UPDATE sobre versión vieja con otros datos -> conflict y versión del servidor", async () => {
        const [r] = await resultados([{ op: "UPDATE", uuid: U1, base_version: 1, data: { ...datos, nombre: "Otra" } }])
        assert.equal(r.status, "conflict")
        assert.equal(r.server.version, 2)
        assert.equal(r.server.nombre, "Laura")
    })

    test("DELETE sobre versión vieja -> conflict", async () => {
        const [r] = await resultados([{ op: "DELETE", uuid: U1, base_version: 1 }])
        assert.equal(r.status, "conflict")
        assert.equal(r.server.deleted_at, null)
    })

    test("DELETE correcto -> applied v3; repetido -> applied sin cambios", async () => {
        const [primero, repetido] = await resultados([
            { op: "DELETE", uuid: U1, base_version: 2 },
            { op: "DELETE", uuid: U1, base_version: 2 }
        ])
        assert.equal(primero.status, "applied")
        assert.equal(primero.record.version, 3)
        assert.ok(primero.record.deleted_at)
        assert.equal(repetido.status, "applied")
        assert.equal(repetido.record.version, 3)
    })

    test("UPDATE de un registro borrado -> conflict con deleted_at", async () => {
        const [r] = await resultados([{ op: "UPDATE", uuid: U1, base_version: 3, data: datos }])
        assert.equal(r.status, "conflict")
        assert.ok(r.server.deleted_at)
    })

    test("UPDATE/DELETE de un uuid desconocido -> not_found", async () => {
        const r = await resultados([
            { op: "UPDATE", uuid: U3, base_version: 1, data: datos },
            { op: "DELETE", uuid: U3, base_version: 1 }
        ])
        assert.deepEqual(r.map(x => x.status), ["not_found", "not_found"])
    })

    test("correo repetido -> rejected, y el resto del lote sigue (CREATE + UPDATE del mismo uuid)", async () => {
        const r = await resultados([
            { op: "CREATE", uuid: U2, data: { ...datos, correo: "cristian@gmail.com" } },
            { op: "CREATE", uuid: U2, data: { ...datos, correo: "laura2@example.com" } },
            { op: "UPDATE", uuid: U2, base_version: 1, data: { ...datos, correo: "laura2@example.com", nombre: "Laura M" } }
        ])
        assert.equal(r[0].status, "rejected")
        assert.equal(r[0].message, "El correo ya está registrado.")
        assert.equal(r[1].status, "applied")
        assert.equal(r[2].status, "applied")
        assert.equal(r[2].record.version, 2)
        assert.deepEqual(r.map(x => x.index), [0, 1, 2])
    })

    test("operaciones inválidas -> invalid con el detalle por campo", async () => {
        const r = await resultados([
            { op: "BORRAR", uuid: U2 },
            { op: "CREATE", uuid: "no-es-uuid", data: datos },
            { op: "CREATE", uuid: U3 },
            { op: "UPDATE", uuid: U2, base_version: 0, data: { ...datos, correo: "malo" } },
            "texto"
        ])
        assert.deepEqual(r.map(x => x.status), ["invalid", "invalid", "invalid", "invalid", "invalid"])
        assert.equal(r[0].errors[0].campo, "op")
        assert.equal(r[1].errors[0].campo, "uuid")
        assert.equal(r[2].errors[0].campo, "data")
        assert.deepEqual(r[3].errors.map(e => e.campo).sort(), ["base_version", "correo"])
    })

    test("sync_log solo registra los cambios reales", async () => {
        // CREATE, UPDATE y DELETE de U1 + CREATE y UPDATE de U2
        assert.equal(await totalEventos() - eventosIniciales, 5)
    })

    test("lote vacío, sin operations o con más de 200 -> 400", async () => {
        for (const body of [{ operations: [] }, {}, { operations: Array(201).fill({ op: "DELETE", uuid: U3, base_version: 1 }) }]) {
            const r = await entorno.llamar("/sync/push", { token: entorno.tokens.operador, method: "POST", body })
            assert.equal(r.status, 400)
        }
    })

})

describe("Concurrencia", () => {

    test("el mismo CREATE enviado 5 veces a la vez -> 1 applied y 4 duplicate, sin filas repetidas", async () => {
        const conteo = {}
        for (let i = 0; i < 15; i++) {
            const uuid = `66666666-6666-4666-8666-${String(i).padStart(12, "0")}`
            const operacion = { op: "CREATE", uuid, data: { nombre: "Paralelo", apellido: "Test", telefono: "3001231234", correo: `p${i}@example.com` } }
            const estados = (await Promise.all([1, 2, 3, 4, 5].map(() => resultados([operacion])))).map(r => r[0].status)
            estados.forEach(s => { conteo[s] = (conteo[s] || 0) + 1 })
            assert.equal(estados.filter(s => s === "applied").length, 1, estados.join(","))
        }
        assert.deepEqual(conteo, { applied: 15, duplicate: 60 })
        const filas = (await entorno.pool.query("SELECT count(*)::int AS n FROM personas WHERE nombre = 'Paralelo'")).rows[0].n
        assert.equal(filas, 15)
    })

    test("4 móviles editan el mismo registro a la vez -> siempre gana exactamente uno", async () => {
        const uuid = "77777777-7777-4777-8777-777777777777"
        const d = (nombre) => ({ nombre, apellido: "Diaz", telefono: "3001231234", correo: "carlos@example.com" })
        await resultados([{ op: "CREATE", uuid, data: d("Carlos") }])

        for (let ronda = 0; ronda < 10; ronda++) {
            const estados = (await Promise.all(["A", "B", "C", "D"].map(m =>
                resultados([{ op: "UPDATE", uuid, base_version: ronda + 1, data: d(`Movil${m}${ronda}`) }])
            ))).map(r => r[0].status)
            assert.equal(estados.filter(s => s === "applied").length, 1, estados.join(","))
            assert.equal(estados.filter(s => s === "conflict").length, 3)
        }

        const version = (await entorno.pool.query("SELECT version FROM personas WHERE uuid = $1", [uuid])).rows[0].version
        assert.equal(version, 11)
    })

})
