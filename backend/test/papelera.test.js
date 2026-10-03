const { test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { crearEntorno } = require("./helpers/entorno")

let entorno

before(async () => { entorno = await crearEntorno() })
after(async () => { await entorno?.cerrar() })

const persona = (correo, nombre = "Ana") => ({ nombre, apellido: "Ruiz", telefono: "3001234567", correo })
const comoAdmin = (ruta, opciones = {}) => entorno.llamar(ruta, { ...opciones, token: entorno.tokens.admin })
const comoOperador = (ruta, opciones = {}) => entorno.llamar(ruta, { ...opciones, token: entorno.tokens.operador })
const push = (operations) => comoOperador("/sync/push", { method: "POST", body: { operations } })

// Los tests de este archivo van en orden y comparten estado
let ana
let otraAna

test("borrar envía a la papelera: sale de /personas y aparece en /personas/eliminadas", async () => {
    ana = (await comoAdmin("/personas", { method: "POST", body: persona("ana@example.com") })).data
    assert.equal((await comoAdmin(`/personas/${ana.id}`, { method: "DELETE" })).status, 200)

    const activas = (await comoAdmin("/personas")).data
    const papelera = (await comoAdmin("/personas/eliminadas")).data
    assert.ok(!activas.some(p => p.id === ana.id))
    assert.ok(papelera.some(p => p.id === ana.id && p.deleted_at))
})

test("el correo de una persona borrada se puede volver a usar -> 201", async () => {
    const r = await comoAdmin("/personas", { method: "POST", body: persona("ana@example.com", "Otra Ana") })
    assert.equal(r.status, 201)
    otraAna = r.data
})

test("no se restaura si otra persona activa usa el correo -> 409 y sigue en la papelera", async () => {
    const r = await comoAdmin(`/personas/${ana.id}/restaurar`, { method: "POST", body: { version: 2 } })
    assert.equal(r.status, 409)
    assert.match(r.data.message, /otra persona activa ya usa ese correo/)
    assert.ok((await comoAdmin("/personas/eliminadas")).data.some(p => p.id === ana.id))
})

test("restaurar con versión desactualizada -> 409 con la versión actual", async () => {
    await comoAdmin(`/personas/${otraAna.id}`, { method: "DELETE" })
    const r = await comoAdmin(`/personas/${ana.id}/restaurar`, { method: "POST", body: { version: 1 } })
    assert.equal(r.status, 409)
    assert.equal(r.data.data.version, 2)
})

test("restaurar: vuelve a /personas con versión 3 y los móviles reciben un UPDATE", async () => {
    const antes = (await comoAdmin("/sync?last_change_id=0&limit=1000")).data.last_change_id

    const r = await comoAdmin(`/personas/${ana.id}/restaurar`, { method: "POST", body: { version: 2 } })
    assert.equal(r.status, 200)
    assert.equal(r.data.deleted_at, null)
    assert.equal(r.data.version, 3)

    assert.ok((await comoAdmin("/personas")).data.some(p => p.id === ana.id))
    const papelera = (await comoAdmin("/personas/eliminadas")).data
    assert.ok(!papelera.some(p => p.id === ana.id))
    assert.ok(papelera.some(p => p.id === otraAna.id))

    const eventos = (await comoOperador(`/sync?last_change_id=${antes}`)).data.changes
    assert.equal(eventos.length, 1)
    assert.equal(eventos[0].operation, "UPDATE")
    assert.equal(eventos[0].record_uuid, ana.uuid)
    assert.equal(eventos[0].data.deleted_at, null)
    assert.equal(eventos[0].data.version, 3)
    assert.equal(eventos[0].usuario, "Admin Prueba")
})

test("restaurar una persona activa -> 409; sin versión, el correo en uso también da 409", async () => {
    const activa = await comoAdmin(`/personas/${ana.id}/restaurar`, { method: "POST", body: {} })
    assert.equal(activa.status, 409)
    assert.match(activa.data.message, /no está en la papelera/)

    const sinVersion = await comoAdmin(`/personas/${otraAna.id}/restaurar`, { method: "POST" })
    assert.equal(sinVersion.status, 409)
    assert.match(sinVersion.data.message, /correo/)
})

test("restaurar con id inexistente -> 404; id o versión no numéricos -> 400", async () => {
    assert.equal((await comoAdmin("/personas/99999/restaurar", { method: "POST", body: {} })).status, 404)
    assert.equal((await comoAdmin("/personas/abc/restaurar", { method: "POST", body: {} })).status, 400)
    assert.equal((await comoAdmin(`/personas/${ana.id}/restaurar`, { method: "POST", body: { version: "x" } })).status, 400)
})

test("la papelera y la restauración son solo para admin", async () => {
    assert.equal((await comoOperador("/personas/eliminadas")).status, 403)
    assert.equal((await comoOperador(`/personas/${otraAna.id}/restaurar`, { method: "POST", body: {} })).status, 403)
    assert.equal((await entorno.llamar("/personas/eliminadas")).status, 401)
})

test("móvil: un CREATE choca con correos activos pero no con los de la papelera", async () => {
    const activo = await push([{ op: "CREATE", uuid: "bbbbbbbb-1111-4111-8111-111111111111", data: persona("ana@example.com", "Ana Movil") }])
    assert.equal(activo.data.results[0].status, "rejected")

    await comoAdmin(`/personas/${ana.id}`, { method: "DELETE" })
    const libre = await push([{ op: "CREATE", uuid: "bbbbbbbb-2222-4222-8222-222222222222", data: persona("ana@example.com", "Ana Movil") }])
    assert.equal(libre.data.results[0].status, "applied")
})
