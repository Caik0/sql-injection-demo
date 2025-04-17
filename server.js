const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

app.use(bodyParser.urlencoded({ extended: true }));

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

// Rota vulnerável
app.post("/login-vulnerable", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).send("Erro no servidor");

    if (rows.length > 0) {
      res.send(`
          <p>✅ Bem-vindo, ${rows[0].username}!</p>
          <p><strong>Query SQL executada:</strong><br><code>${query}</code></p>
        `);
    } else {
      res.send(`
          <p>❌ Credenciais inválidas.</p>
          <p><strong>Query SQL executada:</strong><br><code>${query}</code></p>
        `);
    }
  });
});

// Rota segura
app.post("/login-safe", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  const params = [username, password];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).send("Erro no servidor");

    const queryInfo = `
        <p><strong>Query SQL executada:</strong><br><code>${query}</code></p>
        <p><strong>Valores:</strong><br><code>${JSON.stringify(
          params
        )}</code></p>
      `;

    if (rows.length > 0) {
      res.send(`
          <p>✅ Bem-vindo, ${rows[0].username}!</p>
          ${queryInfo}
        `);
    } else {
      res.send(`
          <p>❌ Credenciais inválidas.</p>
          ${queryInfo}
        `);
    }
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
