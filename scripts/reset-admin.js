import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// Permet de charger server/.env même si le script est lancé depuis un autre dossier
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");

dotenv.config({
  path: path.join(serverDir, ".env"),
});

function showUsage() {
  console.log(`
Utilisation :

  node scripts/reset-admin.js <identifiant> <nouveau_mot_de_passe>

Exemple :

  node scripts/reset-admin.js m.nabet@netprocess.ma Admin@2026
`);
}

async function main() {
  const login = process.argv[2]?.trim();
  const newPassword = process.argv[3];

  if (!login || !newPassword) {
    showUsage();
    process.exitCode = 1;
    return;
  }

  if (newPassword.length < 3) {
    console.error("[ERROR] Le mot de passe doit contenir au moins 3 caractères.");
    process.exitCode = 1;
    return;
  }

  const requiredVariables = ["DB_HOST", "DB_NAME", "DB_USER"];

  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]?.trim()
  );

  if (missingVariables.length > 0) {
    console.error(
      `[ERROR] Variables manquantes dans server/.env : ${missingVariables.join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || "3306", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  });

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.execute(
      `
        SELECT id, email, is_active
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [login]
    );

    if (users.length === 0) {
      throw new Error(`Le compte "${login}" est introuvable.`);
    }

    const user = users[0];

    // Même niveau de hachage que le code d'inscription du projet
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await connection.execute(
      `
        UPDATE users
        SET password_hash = ?,
            is_active = 1
        WHERE id = ?
      `,
      [passwordHash, user.id]
    );

    const [roles] = await connection.execute(
      `
        SELECT id
        FROM user_roles
        WHERE user_id = ?
          AND role = 'admin'
        LIMIT 1
      `,
      [user.id]
    );

    if (roles.length === 0) {
      await connection.execute(
        `
          INSERT INTO user_roles (id, user_id, role)
          VALUES (?, ?, 'admin')
        `,
        [randomUUID(), user.id]
      );

      console.log("[OK] Le rôle administrateur a été ajouté.");
    }

    await connection.commit();

    console.log("");
    console.log("============================================");
    console.log("Mot de passe réinitialisé avec succès");
    console.log("============================================");
    console.log(`Compte : ${login}`);
    console.log("Statut : actif");
    console.log("Rôle   : admin");
    console.log("");
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Rien à faire si le rollback échoue
      }
    }

    console.error("");
    console.error("[ERROR] Réinitialisation impossible.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      connection.release();
    }

    await pool.end();
  }
}

main().catch((error) => {
  console.error("[ERROR]", error);
  process.exitCode = 1;
});
