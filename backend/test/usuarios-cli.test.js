const { test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { execFile } = require("node:child_process")
const { crearEntorno } = require("./helpers/entorno")

const SCRIPT = path.join(__dirname, "..", "scripts", "crear-usuario.js")

let entorno

before(async () => { entorno = await crearEntorno() })
after(async () => { await entorno?.cerrar() })

// Ejecuta npm run crear-usuario con los datos de conexión del entorno de pruebas
const crearUsuario = (args, password = "") => new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, ...args], {
        env: { ...process.env, USUARIO_PASSWORD: password }
    }, (error, stdout, stderr) => {
        resolve({ codigo: error ? error.code : 0, salida: `${stdout}${stderr}` })
    })
})

const PASSWORD = "contrasena-de-prueba-larga"

test("crea un usuario con el correo en minúsculas y la contraseña cifrada", async () => {
    const r = await crearUsuario(["--correo", "Nuevo@Prueba.com", "--nombre", "Tablet 3", "--rol", "operador"], PASSWORD)
    assert.equal(r.codigo, 0, r.salida)
    const fila = (await entorno.pool.query("SELECT correo, rol, activo, password_hash FROM usuarios WHERE correo = $1", ["nuevo@prueba.com"])).rows[0]
    assert.equal(fila.rol, "operador")
    assert.equal(fila.activo, true)
    assert.match(fila.password_hash, /^\$2[aby]\$12\$/)
    assert.equal((await entorno.login("nuevo@prueba.com", PASSWORD)).status, 200)
})

test("rechaza duplicados, contraseñas cortas, roles y correos inválidos", async () => {
    const casos = [
        [["--correo", "nuevo@prueba.com", "--nombre", "Tablet 3", "--rol", "operador"], PASSWORD, /ya existe/],
        [["--correo", "x@prueba.com", "--nombre", "Xx", "--rol", "admin"], "corta", /al menos 10 caracteres/],
        [["--correo", "y@prueba.com", "--nombre", "Yy", "--rol", "jefe"], PASSWORD, /--rol debe ser/],
        [["--correo", "no-es-correo", "--nombre", "Yy", "--rol", "admin"], PASSWORD, /correo válido/]
    ]
    for (const [args, password, mensaje] of casos) {
        const r = await crearUsuario(args, password)
        assert.equal(r.codigo, 1, args.join(" "))
        assert.match(r.salida, mensaje)
    }
})

test("--desactivar revoca la sesión al momento y --actualizar la reactiva", async () => {
    const token = (await entorno.login("nuevo@prueba.com", PASSWORD)).data.token
    assert.equal((await entorno.llamar("/sync", { token })).status, 200)

    assert.equal((await crearUsuario(["--correo", "nuevo@prueba.com", "--desactivar"])).codigo, 0)
    assert.equal((await entorno.llamar("/sync", { token })).status, 401)

    const nueva = "otra-contrasena-de-prueba"
    assert.equal((await crearUsuario(["--correo", "nuevo@prueba.com", "--actualizar"], nueva)).codigo, 0)
    assert.equal((await entorno.login("nuevo@prueba.com", PASSWORD)).status, 401)
    assert.equal((await entorno.login("nuevo@prueba.com", nueva)).status, 200)
})
