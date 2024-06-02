const sql = require('mysql');

const rds = sql.createConnection({
  user: 'admin',
  host: 'database-1.cbw17h3xbqbv.us-east-1.rds.amazonaws.com',
  database: 'games',
  password: 'admin123',
  port: '3306',
})

rds.connect();

console.log('Połączono');

const createQuery = 
  `CREATE TABLE IF NOT EXISTS ScoreTable (
  recId int AUTO_INCREMENT PRIMARY KEY,
  Player1 varchar(30) not null,
  Player2 varchar(30) not null,
  Winner varchar(30) not null
  )`;

rds.query(createQuery);

console.log('Stworzono tabelę');

const insertScore = (player1, player2, winner) => {
  console.log("Inserting score");

  const insertQuery = `
  INSERT INTO ScoreTable (Player1, Player2, Winner)
  VALUES (?, ?, ?)
  `;
  const values = [player1, player2, winner];

  rds.query(insertQuery, values, (err, results) => {
    if (err) {
      console.error('Błąd:', err.stack);
      return;
    }
    console.log('Zapisano wynik');
  });
}

module.exports = {
  insertScore
}