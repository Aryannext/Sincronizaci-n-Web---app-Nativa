const { describe, test, before, after, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const { crearEntorno } = require("./helpers/entorno")

let entorno

before(async () => { entorno = await crearEntorno() })
after(async () => { await entorno?.cerrar() })
beforeEach(async () => { await entorno.reiniciarDatos() })

const persona = (correo, nombre = "Prueba") => ({ nombre, apellido: "Correo", telefono: "3001234567", correo })
const comoAdmin = (ruta, opciones = {}) => entorno.llamar(ruta, { ...opciones, token: entorno.tokens.admin })

describe("CRUD", () => {

    test("crear, leer, editar (sube la versión) y borrar (pasa a la papelera)", async () => {
        const creada = await comoAdmin("/personas", { method: "POST", body: persona("ana@example.com", "Ana") })
        assert.equal(creada.status, 201)
        assert.equal(creada.data.version, 1)

        assert.equal((await comoAdmin(`/personas/${creada.data.id}`)).data.nombre, "Ana")

        const editada = await comoAdmin(`/personas/${creada.data.id}`, { method: "PUT", body: { ...persona("ana@example.com", "Ana Maria"), version: 1 } })
        assert.equal(editada.status, 200)
        assert.equal(editada.data.version, 2)

        const borrada = await comoAdmin(`/personas/${creada.data.id}`, { method: "DELETE" })
        assert.equal(borrada.status, 200)
        assert.ok(borrada.data.deleted_at)
        assert.equal((await comoAdmin(`/personas/${creada.data.id}`)).status, 404)
    })

    test("cada cambio queda en sync_log", async () => {
        const creada = (await comoAdmin("/personas", { method: "POST", body: persona("log@example.com") })).data
        await comoAdmin(`/personas/${creada.id}`, { method: "PUT", body: persona("log@example.com", "Cambio") })
        await comoAdmin(`/personas/${creada.id}`, { method: "DELETE" })
        const eventos = (await comoAdmin("/sync?last_change_id=0")).data.changes
        assert.deepEqual(eventos.map(e => e.operation), ["CREATE", "UPDATE", "DELETE"])
    })

})

describe("Validación (punto 5)", () => {

    test("PUT sin campos -> 400 con el detalle por campo", async () => {
        const r = await comoAdmin("/personas/1", { method: "PUT", body: { nombre: "Solo" } })
        assert.equal(r.status, 400)
        assert.deepEqual(r.data.errors.map(e => e.campo).sort(), ["apellido", "correo", "telefono"])
    })

    test("POST y PUT con correo inválido -> 400", async () => {
        assert.equal((await comoAdmin("/personas", { method: "POST", body: persona("no-es-correo") })).status, 400)
        assert.equal((await comoAdmin("/personas/1", { method: "PUT", body: persona("juan@") })).status, 400)
    })

    test("id no numérico -> 400; id inexistente -> 404", async () => {
        assert.equal((await comoAdmin("/personas/abc")).status, 400)
        assert.equal((await comoAdmin("/personas/99999")).status, 404)
    })

})

describe("Correos (punto 6)", () => {

    test("se guarda lo que escribe el usuario, solo en minúsculas y sin espacios", async () => {
        const casos = [
            ["juan.perez+trabajo@gmail.com", "juan.perez+trabajo@gmail.com"],
            ["  Ana.Maria@GoogleMail.com ", "ana.maria@googlemail.com"],
            ["soporte+tickets@outlook.com", "soporte+tickets@outlook.com"]
        ]
        for (const [escrito, guardado] of casos) {
            const r = await comoAdmin("/personas", { method: "POST", body: persona(escrito) })
            assert.equal(r.status, 201, escrito)
            assert.equal(r.data.correo, guardado)
        }
    })

    test("correos que antes chocaban por la normalización ahora son distintos", async () => {
        assert.equal((await comoAdmin("/personas", { method: "POST", body: persona("pedro.gomez@gmail.com") })).status, 201)
        assert.equal((await comoAdmin("/personas", { method: "POST", body: persona("pedrogomez@gmail.com") })).status, 201)
    })

    test("el mismo correo con otras mayúsculas sigue siendo duplicado -> 409", async () => {
        const r = await comoAdmin("/personas", { method: "POST", body: persona("JUAN@gmail.com") })
        assert.equal(r.status, 409)
        assert.equal(r.data.message, "El correo ya está registrado.")
    })

})

describe("Conflictos desde la web", () => {

    test("PUT con la versión actual -> 200; con versión vieja -> 409 y el registro actual", async () => {
        const juan = persona("juan@gmail.com", "Juan")
        assert.equal((await comoAdmin("/personas/2", { method: "PUT", body: { ...juan, version: 1 } })).data.version, 2)

        const viejo = await comoAdmin("/personas/2", { method: "PUT", body: { ...juan, telefono: "3000000001", version: 1 } })
        assert.equal(viejo.status, 409)
        assert.equal(viejo.data.data.version, 2)
        assert.equal(viejo.data.data.telefono, "3001234567")
    })

    test("PUT sin versión sigue funcionando (compatibilidad); versión no numérica -> 400", async () => {
        assert.equal((await comoAdmin("/personas/2", { method: "PUT", body: persona("juan@gmail.com", "Juan") })).status, 200)
        assert.equal((await comoAdmin("/personas/2", { method: "PUT", body: { ...persona("juan@gmail.com"), version: "abc" } })).status, 400)
    })

})
