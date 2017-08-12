// Setup PostgreSQL connection
require('dotenv').config();
var pg = require('pg');
var config = {
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT)
}
var pool = new pg.Pool(config);

var Promise = require('promise');

var bcrypt = require('bcryptjs');
// GraphQL setup
var {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLSchema,
	GraphQLList,
	GraphQLNonNull
} = require('graphql');
// import models
var UserType = require('./user');
var MessageType = require('./message');

function queryWithPg(queryString, queryValues, callback) {
	pool.connect(function(err, client, done) {
		if (err) {
			throw err;
		}
		client.query(queryString, queryValues, function(err, result) {
			if (err) {
				throw err;
			}
			done();
			callback(result);
		})
	});
}

var RootQuery = new GraphQLObjectType({
	name: 'RootQueryType',
	fields: {
		user: {
			type: UserType,
			args: {
				id: {type: GraphQLInt}
			},
			resolve(parentValue, args) {
				// resolve expects immediate return of value but we are connecting/querying
				// first so we need to use a Promise
				return new Promise(function(fulfill, reject) {
						queryWithPg('SELECT * FROM users WHERE id = $1', [args.id], function(result) {
							console.log(result);
							var response = {
									id: result.rows[0].id,
									name: result.rows[0].name,
									username: result.rows[0].username
							}
							fulfill(response);
						});
				});
			}
		},
		users: {
			type: new GraphQLList(UserType),
			resolve(parentValue, args) {
				return new Promise(function(fulfill, reject) {
					queryWithPg('SELECT * FROM users', [], function(result) {
						fulfill(result.rows);
					});
				});
			}
		},
		message: {
			type: MessageType,
			args: {
				id: {type: new GraphQLNonNull(GraphQLInt)}
			},
			resolve(parentValue, args) {
				return new Promise(function(fulfill, reject) {
					queryWithPg('SELECT * FROM messages WHERE id = $1', [args.id], function(result) {
						var response = {
							id: result.rows[0].id,
							content: result.rows[0].content,
							senderid: result.rows[0].senderid,
							receiverid: result.rows[0].receiverid
						};
						fulfill(response);
					});
				});
			}
		},
		messages: {
			type: new GraphQLList(MessageType),
			resolve(parentValue, args) {
				return new Promise(function(fulfill, reject) {
					queryWithPg('SELECT * FROM messages', [], function(result) {
						fulfill(result.rows);
					});
				});
			}
		}
	}
})


var mutation = new GraphQLObjectType({
	name: 'Mutation',
	fields: {
		addUser: {
			type: UserType,
			args: {
				name: {type: new GraphQLNonNull(GraphQLString)},
				username: {type: new GraphQLNonNull(GraphQLString)},
				password: {type: new GraphQLNonNull(GraphQLString)},
			},
			resolve(parentValue, args) {
				var name = args.name;
				var username = args.username;
				var password = args.password;
				return new Promise(function(fulfill, reject) {
					bcrypt.genSalt(10, function(err, salt) {
					    bcrypt.hash(password, salt, function(err, hash) {
					        if (err) {
					        	throw err;
					        }
					        password = hash;
					        queryWithPg('INSERT INTO users (name, username, password) VALUES ($1, $2, $3) RETURNING id, name, username',
					        	[name, username, password], function(result) {
					        		var response = {
					        				id: result.rows[0].id,
					        				name: result.rows[0].name,
					        				username: result.rows[0].username,
					        		};
					        		fulfill(response);
					        	})
					    });
					});
				});
			}
		},
		deleteUser: {
		type: UserType,
		args: {
			id: {type: new GraphQLNonNull(GraphQLInt)}
		},
		resolve(parentValue, args) {
			return new Promise(function(fulfill, reject) {
				queryWithPg('DELETE FROM users WHERE id = $1 RETURNING *', [args.id], function(result) {
					var response = {
							id: result.rows[0].id,
							name: result.rows[0].name,
							username: result.rows[0].username
					}
					fulfill(response);
				});
			});
		}
		},
		editUser: {
			type: UserType,
			args: {
				id: {type: new GraphQLNonNull(GraphQLInt)},
				name: {type: GraphQLString},
				username: {type: GraphQLString}
			},
			resolve(parentValue, args) {
				return new Promise(function(fulfill, reject) {
					pool.connect(function(err, client, done) {
						if (err) {
							throw err;
						}
						if (args.name != null) {
							client.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
							[args.name, args.id], function(err, result) {
								if (err) {
									throw err;
								}
								if (args.username == null) {
									done();
									var response = {
										id: result.rows[0].id,
										name: result.rows[0].name,
										username: result.rows[0].username
									}
									fulfill(response);
								}
								
							});
						}
						if (args.username != null) {
							client.query('UPDATE users SET username = $1 WHERE id = $2 RETURNING *',
							[args.username, args.id], function(err, result) {
								if (err) {
									throw err;
								}
								done();
								var response = {
									id: result.rows[0].id,
									name: result.rows[0].name,
									username: result.rows[0].username
								}
								fulfill(response);
							});
						}
					})
				});
			}
		},
		addMessage: {
			type: MessageType,
			args: {
				content: {type: new GraphQLNonNull(GraphQLString)},
				senderId: {type: new GraphQLNonNull(GraphQLInt)},
				receiverId: {type: new GraphQLNonNull(GraphQLInt)}
			},
			resolve(parentValue, args) {
				return new Promise(function(fulfill, reject) {
					queryWithPg('INSERT INTO messages (content, senderId, receiverId) VALUES ($1, $2, $3) RETURNING *',
						[args.content, args.senderId, args.receiverId], function(result) {
							var response = {
								id: result.rows[0].id,
								content: result.rows[0].content,
								senderid: result.rows[0].senderid,
								receiverid: result.rows[0].receiverid
							};
							fulfill(response);
						});
				});
			}
		},
		deleteMessage: {
			type: MessageType,
			args: {
				id: {type: new GraphQLNonNull(GraphQLInt)}
			},
			resolve(parentValue, args) {
				return new Promise(function(fulfill, reject) {
					queryWithPg('DELETE FROM messages WHERE id = $1 RETURNING *',
						[args.id], function(result) {
							var response = {
								id: result.rows[0].id,
								content: result.rows[0].content,
								senderid: result.rows[0].senderid,
								receiverid: result.rows[0].receiverid
							};
							fulfill(response);
						});
				});
			}
		}
	}
})

module.exports = new GraphQLSchema({
	query: RootQuery,
	mutation: mutation
});