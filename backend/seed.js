const db = require('./src/config/db');

setTimeout(() => {
  db.serialize(() => {
    db.run("DELETE FROM categories");
    
    db.run("INSERT INTO categories (name) VALUES ('Viveres'), ('Charcuteria'), ('Bebidas'), ('Alcohol'), ('Cosmeticos')");
    
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '40.00')", (err) => {
      if (err) console.error(err);
      console.log('Categorías iniciales y configuración creadas.');
      process.exit();
    });
  });
}, 1000);
