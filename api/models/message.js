var {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLSchema,
	GraphQLList,
	GraphQLNonNull
} = require('graphql');

module.exports = new GraphQLObjectType({
	name: 'Message',
	fields: {
		id: {type: GraphQLInt},
		content: {type: GraphQLString},
		senderid: {type: GraphQLInt},
		receiverid: {type: GraphQLInt}
	}
})