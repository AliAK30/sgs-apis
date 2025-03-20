const neo4j = require('neo4j-driver')

const neo4jConnection = process.env.NODE_ENV === 'production'
    ? 'bolt://192.168.255.4:7687' // Local connection string
    : 'bolt://edumatch.southeastasia.cloudapp.azure.com:7687'; // Public connection string

//NEO4J CONNECTION

const driver = neo4j.driver(neo4jConnection, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
//driver.getServerInfo().then(serverInfo=>console.log('Connected to Neo4J', serverInfo)).catch(err=>console.log(err.cause));

module.exports = driver;