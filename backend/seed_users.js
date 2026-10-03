const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

setTimeout(async () => {
  try {
    const hash = await bcrypt.hash('123456', 10);
    db.run(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Administrador', 'admin@pos.com', ?, 'admin')",
      [hash],
      (err) => {
        if (err) {
          console.log('El usuario ya existe o hubo un error.');
        } else {
          console.log('Usuario administrador creado con éxito. Email: admin@pos.com | Password: 123456');
        }
        process.exit();
      }
    );
  } catch (error) {
    console.error(error);
  }
}, 500);
