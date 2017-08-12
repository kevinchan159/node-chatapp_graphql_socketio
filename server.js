var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var pg = require('pg');
var handlebars = require('express-handlebars');
var bcrypt = require('bcryptjs');
var session = require('express-session');
var flash = require('connect-flash');
var expressGraphQL = require('express-graphql');
var Promise = require('promise');
var passport = require('./auth/passport');
var http = require('http');
var request = require('request');
require('dotenv').config();


var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

connections = [];

io.on('connection', function(socket) {
	connections.push(socket);
	console.log('Connected: %s sockets connected', connections.length);

	socket.on('disconnect', function(data) {
		connections.splice(connections.indexOf(socket), 1);
		console.log('Disconnected: %s sockets connected', connections.length);
	});

	socket.on('chat message', function(data) {
		io.sockets.emit('new message', {
			msg: data
		});
		console.log('message: ' + data);
	});

	socket.on('new user', function(data) {
		console.log('in here');
		console.log(data.user);
	});
});

module.exports = io;




app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', handlebars({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(session({
	secret: process.env.SECRET_KEY,
	resave: false,
	saveUninitialized: true,
	cookie: {
		maxAge: 1000 * 60 * 30 
	}
}));

app.use(flash());
// Setup global variables
app.use(function(req, res, next) {
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	next();
});

app.use(passport.initialize());
app.use(passport.session());


var routes = require('./api/routes/routes');
app.use('/', routes);


var schema = require('./api/models/schema');
app.use('/graphql', expressGraphQL({
	schema: schema,
	graphiql: true
}))


var port = process.env.PORT || 3000;
server.listen(port, function() {
	console.log('Running on port: ' + port);
});