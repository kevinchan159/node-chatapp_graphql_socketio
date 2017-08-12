var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
require('dotenv').config();

var pg = require('pg');
var config = {
	user: process.env.DB_USER,
	database: process.env.DB_NAME,
	password: '123',
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT)
};
var pool = new pg.Pool(config);
console.log(process.env.DB_USER);
// Serialize/Deserialize 
passport.serializeUser(function(user, done) {
	console.log('serializing');
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	console.log('deserializing');
	pool.connect(function(err, client, poolDone) {
		if (err) {
			return console.error('Error fetching client: ' + err);
		}
		client.query('SELECT * FROM users WHERE id = $1', [id], function(err, result) {
			if (err) {
				return console.error('Error matching user: ' + err);
			}
			poolDone();
			done(null, result.rows[0]);
		});
	});
});

// gets called when passport.authenticate is called (which is called when POST /login)
passport.use(new LocalStrategy({
	usernameField: 'username',  // put the names of the input fields from login form here
	passwordField: 'password'  // default is already 'username' and 'password'. I just put it here to show
},
  function(username, password, done) {
    pool.connect(function(err, client, poolDone) {
		if (err) {
			// server err
			poolDone()
			return done(err);
		}
		client.query('SELECT * FROM users WHERE username = $1', [username], function(err, result) {
			if (err) {
				throw err;
			}
			if (result.rows.length == 0) {
				// no user found (aka result.rows is empty array [])
				poolDone()
				return done(null, false, { message: 'No user found with specified username' });
			} else {
			// user found with specified username so comapre passwords.
				bcrypt.compare(password, result.rows[0].password, function(err, isMatch) {
				    // res === true 
				    if (isMatch == true) {
				    	poolDone()
				    	return done(null, result.rows[0]);
				    } else {
				    	poolDone()	
				    	return done(null, false, { message: 'Incorrect password'});
				    }
				});
			}
		});
	});
  }
));

module.exports = passport;