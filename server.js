const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const segredo = "segredo123";
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "segredo-super-seguro",
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, "views")));

// Criar tabela e inserir usuários
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT
  )`);

  db.run(`DELETE FROM users`);
  db.run(`INSERT INTO users (username, password) VALUES ('admin', 'admin123')`);
  db.run(`INSERT INTO users (username, password) VALUES ('user', 'user123')`);
});


db.serialize(() => {
  db.run(`INSERT INTO users (username, password) VALUES ('Hacker', 'Coisa ruim')`);
});

// 🔓 Rota de login vulnerável
app.post("/login-vulnerable", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).send("Erro no servidor");

    if (rows.length > 0) {
      req.session.username = rows[0].username;
      res.redirect("/dashboard");
    } else {
      res.send(`
        <p>❌ Credenciais inválidas.</p>
        <p><strong>Query SQL executada:</strong><br><code>${query}</code></p>
        <a href="/">Voltar</a>
      `);
    }
  });
});

app.post("/change-password", (req, res) => {
  const { newPassword } = req.body;
  const username = req.session.username;

  if (!username) {
    return res.status(401).send("Você precisa estar logado");
  }

  const query = `UPDATE users SET password = '${newPassword}' WHERE username = '${username}'`;

  db.run(query, (err) => {
    if (err) return res.status(500).send("Erro no servidor");

    res.send(`Senha alterada com sucesso para ${newPassword}`);
  });
});

function escapeAttribute(str) {
  if (!str) return "";
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}


app.get("/dashboard", (req, res) => {
  const name = req.session.username || "Visitante";
  const comment = req.query.comment || "";

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard</title>
      <script>
      var segredo = "${segredo}";
      </script>
    </head>
    <body>
      <h1>Dashboard</h1>
      <h2>Bem-vindo, ${escapeAttribute(name)}</h2>

      <form method="GET" action="/dashboard">
        <label>Adicione um comentário: <input type="text" name="comment"></label>
        <button type="submit">Enviar</button>
      </form>

      <div>
        <h2>Resultado:</h2>
        <!-- Comentário refletido sem sanitização (XSS possível) -->
        <div id="resposta">${comment}</div>
      </div>

      <form id="csrfForm" action="/change-password" method="POST" style="display:none;">
      <input type="hidden" name="newPassword" value="senhaDoAtacante123">
      </form>   
      <button onclick="document.getElementById('csrfForm').submit();">
  Altere sua senha
</button>
      <a href="/">Sair</a>
    </body>
    </html>
  `);
});



// Rota 404
app.use((req, res) => {
  res.status(404).send("Página não encontrada");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
