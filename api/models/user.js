var {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLSchema,
	GraphQLList,
	GraphQLNonNull
} = require('graphql');

module.exports = new GraphQLObjectType({
	name: 'User',
	fields: {
		id: {type: GraphQLInt},
		name: {type: GraphQLString},
		username: {type: GraphQLString},
		password: {type: GraphQLString}
	}
});