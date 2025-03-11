const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',     
  user: 'root',         
  password: 'root',    
  database: 'gps_data'
});

// Établir la connexion
connection.connect((err) => {
  if (err) {
    console.error(' Erreur de connexion à MySQL :', err);
    return;
  }
  console.log('Connexion MySQL réussie !');
});

module.exports = connection;
