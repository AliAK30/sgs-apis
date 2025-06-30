const neo4j = require('neo4j-driver')

const neo4jConnection = process.env.NODE_ENV === 'production'
    ? 'bolt://192.168.255.4:7687' // Local connection string
    : 'bolt://edumatch.southeastasia.cloudapp.azure.com:7687'; // Public connection string

//NEO4J CONNECTION

const driver = neo4j.driver(neo4jConnection, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
//driver.getServerInfo().then(serverInfo=>console.log('Connected to Neo4J', serverInfo)).catch(err=>console.log(err.cause));

const addToGraph = async (student) => {
  
  try {
    let { records } = await driver.executeQuery(
      "CREATE (p:Student{id: $id, name: $name }) RETURN p",
      { id: student.id, name: `${student.first_name} ${student.last_name}` },
      { database: "neo4j" }
    );
    

    for(let i = 0; i < 44; i++)
    {
        const name = `${student.questions[i].answer}${student.questions[i].q}`
        let {records} = await driver.executeQuery(
            'MATCH (s:Student {id: $id}) MATCH (o:Option {name: $name}) CREATE (s)-[:SELECTED]->(o)',
              { id: student.id, name: name },
              { database: 'neo4j' }
        )
        console.log('DONE ADDING TO GRAPH')
          return true;
    }

  }catch (err) {
    console.error('Cant add to Graph',err);
    return false;
  } 
  
  
}

module.exports = {driver, addToGraph};


/* const myFunc = async () => {
  
  // Use the driver to run queries
  for(let i = 1; i < 45; i++)
  {
      await driver.executeQuery(
          'CREATE (:Option {name: $name})',
           { name: `a${i}` },
           { database: 'neo4j' }
      )
      await driver.executeQuery(
          'CREATE (:Option {name: $name})',
           { name: `b${i}` },
           { database: 'neo4j' }
      )
        
  }
  
  console.log("done")
  await driver.close()

};
myFunc(); */
