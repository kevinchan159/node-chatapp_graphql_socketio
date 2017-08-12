require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var flash = require('connect-flash');
var http = require('http');
var request = require('request');
var serverIo = require('../../server');

var passport = require('../../auth/passport');
var pg = require('pg');
var config = {
	user: process.env.DB_USER,
	database: process.env.DB_NAME,
	password: '123',
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT)
};
var pool = new pg.Pool(config);

var router = express.Router();

function checkLoginForDashboardAndLogout(req, res, next) {
	if (req.user) {
		next();
	} else {
		res.redirect('/login');
	}
};

function checkLoginForLoginAndRegister(req, res, next) {
	if (req.user) {
		res.redirect('/');
	} else {
		next();
	}
};


router.get('/', checkLoginForDashboardAndLogout, function(req, res) {
	// successful authentication automatically stores user in req.user
	res.locals.user = req.user;
	serverIo.sockets.emit('new user', {
		user: req.user
	});
	res.render('index');
	// curl -X POST \
	// > -H "Content-Type: application/json" \
	// > -d '{"query": "{users {id, name, username}}"}' \
	// > http://localhost:3000/graphql

	// request({
	// 	uri: "http://localhost:3000/graphql",
	// 	method: "POST",
	// 	form: {
	// 		query: "{users {id, name, username}}"
	// 	}
	// }, function(error, response, body) {
	// 	console.log(body);
	// });

});

router.get('/login', checkLoginForLoginAndRegister, function(req, res) {
	res.render('login');
});

router.post('/login', passport.authenticate('local', {failureRedirect: '/login',
 failureFlash: true}), 
	function(req, res) {
		res.redirect('/');
});

router.get('/register', checkLoginForLoginAndRegister, function(req, res) {
	res.render('register');
});

router.post('/register', function(req, res) {
	var name = req.body.name;
	var username = req.body.username;
	var password = req.body.password;
	bcrypt.genSalt(10, function(err, salt) {
	    bcrypt.hash(password, salt, function(err, hash) {
	        // Store hash in your password DB. 
	        password = hash;
	        pool.connect(function(err, client, done) {
	        	if (err) {
	        		return console.error('Error fetching client: ' + err);
	        	}
	        	client.query('INSERT INTO users (name, username, password) VALUES ($1, $2, $3)' ,
	        	[name, username, password], function(err, result) {
	        		if (err) {
	        			return console.error('Error storing user :' + err);
	        		}
	        		done();
	        		req.flash('success', 'Successfully registered!');
	        		res.redirect('/login');
	        	});
	        });
	    });
	});
});

router.get('/logout', checkLoginForDashboardAndLogout, function(req, res) {
	// passport provides req.logOut() which removes req.user and clears login session
	req.logout();
	res.redirect('/login');
});



module.exports = router;