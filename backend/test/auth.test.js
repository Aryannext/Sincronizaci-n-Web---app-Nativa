const { describe, test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const jwt = require("jsonwebtoken")
const { crearEntorno } = require("./helpers/entorno")

let entorno

before(async () => { entorno = await crearEntorno() })
after(async () => { await entorno?.cerrar() })

const media = (valores) => valores.reduce((suma, v) => suma + v, 0) / valores.length

describe("Login", () => {

    test("admin: token de 8 h y usuario sin hash; el correo no distingue mayúsculas", async () => {
        const r = await entorno.login("  ADMIN@prueba.com ", entorno.passwords.admin)
        assert.equal(r.status, 200)
        assert.equal(r.data.usuario.rol, "admin")
        assert.equal(r.data.usuario.password_hash, undefined)
        const { iat, exp } = jwt.decode(r.data.token)
        assert.equal(exp - iat, 8 * 3600)
    })

    test("operador: token de 30 días", async () => {
        const r = await entorno.login("movil1@prueba.com", entorno.passwords.operador)
        assert.equal(r.status, 200)
        const { iat, exp } = jwt.decode(r.data.token)
        assert.equal(exp - iat, 30 * 86400)
    })

    test("contraseña mala y correo inexistente: mismo 401, mismo mensaje y tiempo similar", async () => {
        const tiempos = { mala: [], inexistente: [] }
        for (let i = 0; i < 3; i++) {
            let inicio = performance.now()
            const mala = await entorno.login("admin@prueba.com", "contrasena-incorrecta")
            tiempos.mala.push(performance.now() - inicio)
            inicio = performance.now()
            const inexistente = await entorno.login("nadie@prueba.com", "contrasena-incorrecta")
            tiempos.inexistente.push(performance.now() - inicio)
            assert.equal(mala.status, 401)
            assert.equal(inexistente.status, 401)
            assert.equal(mala.data.message, inexistente.data.message)
        }
        // Ambos caminos ejecutan bcrypt: no se puede saber qué correos existen midiendo el tiempo
        const diferencia = Math.abs(media(tiempos.mala) - media(tiempos.inexistente))
        assert.ok(diferencia < media(tiempos.mala) * 0.6, `diferencia de ${diferencia.toFixed(0)} ms`)
    })

    test("usuario desactivado no puede iniciar sesión", async () => {
        const r = await entorno.login("movil2@prueba.com", entorno.passwords.operador)
        assert.equal(r.status, 401)
    })

    test("datos inválidos -> 400", async () => {
        const r = await entorno.llamar("/auth/login", { method: "POST", body: { correo: "no-es-correo", password: 123 } })
        assert.equal(r.status, 400)
    })

    test("GET /auth/me devuelve el usuario del token", async () => {
        const r = await entorno.llamar("/auth/me", { token: entorno.tokens.admin })
        assert.equal(r.status, 200)
        assert.equal(r.data.correo, "admin@prueba.com")
    })

})

describe("Tokens", () => {

    for (const ruta of ["/personas", "/sync", "/auth/me"]) {
        test(`sin token: GET ${ruta} -> 401`, async () => {
            assert.equal((await entorno.llamar(ruta)).status, 401)
        })
    }

    test("sin token: POST /sync/push -> 401", async () => {
        const r = await entorno.llamar("/sync/push", { method: "POST", body: { operations: [] } })
        assert.equal(r.status, 401)
    })

    test("tokens manipulados, caducados o ajenos -> 401", async () => {
        const tokenOperador = entorno.tokens.operador
        const [cabecera, , firma] = tokenOperador.split(".")
        const payloadAdmin = Buffer.from(JSON.stringify({ ...jwt.decode(tokenOperador), rol: "admin", sub: "1" })).toString("base64url")
        const secreto = process.env.JWT_SECRET

        const falsos = {
            "payload alterado (operador -> admin)": `${cabecera}.${payloadAdmin}.${firma}`,
            "alg none": `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${payloadAdmin}.`,
            "firmado con otro secreto": jwt.sign({ rol: "admin" }, "x".repeat(64), { subject: "1" }),
            "caducado": jwt.sign({ rol: "admin" }, secreto, { subject: "1", expiresIn: -10 }),
            "de un usuario que no existe": jwt.sign({ rol: "admin" }, secreto, { subject: "999" })
        }

        for (const [nombre, token] of Object.entries(falsos)) {
            assert.equal((await entorno.llamar("/personas", { token })).status, 401, nombre)
        }

        const basic = await entorno.llamar("/personas", { headers: { Authorization: `Basic ${entorno.tokens.admin}` } })
        assert.equal(basic.status, 401, "esquema Basic")
    })

})

describe("Roles", () => {

    test("operador: /personas -> 403, pero puede sincronizar", async () => {
        assert.equal((await entorno.llamar("/personas", { token: entorno.tokens.operador })).status, 403)
        assert.equal((await entorno.llamar("/personas/1", { token: entorno.tokens.operador, method: "DELETE" })).status, 403)
        assert.equal((await entorno.llamar("/sync", { token: entorno.tokens.operador })).status, 200)
    })

    test("admin: acceso a /personas", async () => {
        assert.equal((await entorno.llamar("/personas", { token: entorno.tokens.admin })).status, 200)
    })

    test("sync_log guarda quién hizo cada cambio", async () => {
        await entorno.reiniciarDatos()
        const uuid = "aaaaaaaa-1111-4111-8111-111111111111"
        await entorno.llamar("/personas/2", {
            token: entorno.tokens.admin,
            method: "PUT",
            body: { nombre: "Juan", apellido: "Perez", telefono: "3001112233", correo: "juan@gmail.com" }
        })
        await entorno.llamar("/sync/push", {
            token: entorno.tokens.operador,
            method: "POST",
            body: { operations: [{ op: "CREATE", uuid, data: { nombre: "Auditada", apellido: "Movil", telefono: "3001239999", correo: "auditada@example.com" } }] }
        })
        const eventos = (await entorno.llamar("/sync?last_change_id=0&limit=1000", { token: entorno.tokens.admin })).data.changes
        assert.equal(eventos.find(e => e.operation === "UPDATE").usuario, "Admin Prueba")
        assert.equal(eventos.find(e => e.record_uuid === uuid).usuario, "Tablet 1")
    })

})

describe("Validación y límites", () => {

    for (const [consulta, esperado] of [
        ["limit=5000", 400],
        ["limit=0", 400],
        ["last_change_id=-1", 400],
        ["last_change_id=abc", 400],
        ["limit=1000&last_change_id=0", 200]
    ]) {
        test(`GET /sync?${consulta} -> ${esperado}`, async () => {
            assert.equal((await entorno.llamar(`/sync?${consulta}`, { token: entorno.tokens.admin })).status, esperado)
        })
    }

    test("JSON mal formado -> 400", async () => {
        const r = await entorno.llamar("/sync/push", { token: entorno.tokens.operador, method: "POST", raw: "{ esto no es json" })
        assert.equal(r.status, 400)
    })

    test("cuerpo de más de 200 KB -> 413", async () => {
        const raw = JSON.stringify({ operations: [], relleno: "x".repeat(300 * 1024) })
        const r = await entorno.llamar("/sync/push", { token: entorno.tokens.operador, method: "POST", raw })
        assert.equal(r.status, 413)
    })

})

describe("CORS y cabeceras", () => {

    test("origen no permitido -> 403 sin Access-Control-Allow-Origin", async () => {
        const r = await entorno.llamar(`${entorno.origen}/`, { headers: { Origin: "https://sitio-malicioso.example" } })
        assert.equal(r.status, 403)
        assert.equal(r.headers.get("access-control-allow-origin"), null)
    })

    test("origen del panel permitido, con preflight para Authorization", async () => {
        const r = await entorno.llamar(`${entorno.origen}/`, { headers: { Origin: "http://localhost:5173" } })
        assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:5173")

        const preflight = await fetch(`${entorno.origen}/api/personas`, {
            method: "OPTIONS",
            headers: {
                Origin: "http://localhost:5173",
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "authorization,content-type"
            }
        })
        assert.equal(preflight.status, 204)
        assert.match(preflight.headers.get("access-control-allow-headers") || "", /authorization/i)
    })

    test("sin Origin (app nativa) -> permitido, con cabeceras de seguridad", async () => {
        const r = await entorno.llamar(`${entorno.origen}/`)
        assert.equal(r.status, 200)
        assert.equal(r.headers.get("x-content-type-options"), "nosniff")
        assert.ok(r.headers.get("content-security-policy"))
        assert.equal(r.headers.get("x-powered-by"), null)
        assert.ok(r.headers.get("ratelimit-policy"))
    })

})

// Al final: deja el login bloqueado para la IP de las pruebas
describe("Fuerza bruta", () => {

    test("tras 10 intentos fallidos el login queda bloqueado (429), sin afectar sesiones abiertas", async () => {
        let bloqueado = null
        for (let intento = 0; intento < 20 && !bloqueado; intento++) {
            const r = await entorno.login("admin@prueba.com", `adivinanza-${intento}`)
            if (r.status === 429) bloqueado = r
        }
        assert.ok(bloqueado, "nunca respondió 429")
        assert.match(bloqueado.data.message, /Demasiados intentos/)

        assert.equal((await entorno.login("admin@prueba.com", entorno.passwords.admin)).status, 429)
        assert.equal((await entorno.llamar("/personas", { token: entorno.tokens.admin })).status, 200)
    })

})
