var mysql = require('mysql2');
var db = mysql.createConnection({
host : '127.0.0.1',
port: '3306',
user : 'root',
password : 'qwertzxc228',
database: 'studentwork1'
});
db.connect( function (err) {
if (err) {
console.log("!!! Cannot connect !!! Error:"); throw err;
} else {
console.log("Connection established.");
}
});
module.exports = db;