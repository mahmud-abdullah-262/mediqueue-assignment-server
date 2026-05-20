
const express = require('express')
const app = express()
require('dotenv').config() 
const port = process.env.PORT || 5000
const cors = require('cors');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_CONNECTION;


let tutorCollection;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();

    const db = client.db('mediqueue');
    tutorCollection = db.collection('mediqueue-collection'); 
   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);


app.use(cors())
app.use(express.json())


app.get('/tutors', async (req, res) => {
  if (!tutorCollection) {
    return res.status(500).send('MongoDB collection not initialized.');
  }
  const cursor = tutorCollection.find();
  const result = await cursor.toArray();
  res.json(result);
});


 app.get('/tutors/:id', async (req, res) => {
      const id = req.params.id;
    
      if (!tutorCollection){
        return res.status(500).send('tutors data didnt found')
      }
      const query = {_id: new ObjectId(id)}
      // console.log(query, 'query') 
      const result = await tutorCollection.findOne(query);
      // console.log(result, 'tutor')
      res.json(result)
      
    })

      app.post('/tutors', async (req, res) => {
      const newTutor = req.body;
      const result = await tutorCollection.insertOne(newTutor);
       console.log(result, 'New Tutor Added')
      res.send(result)
    })

     app.patch('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id, 'id from server')
      console.log(id, 'id')
      const query = {_id: new ObjectId(id)}
      const modifiedTutor = req.body;
      const updatedDocument = {
          $set : {
           tutorName: modifiedTutor.tutorName,
    photo: modifiedTutor.photo,
    subject: modifiedTutor.subject,
    availability: modifiedTutor.availability,
    availableTime: modifiedTutor.availableTime,
    feeName: modifiedTutor.feeName,
    seats: modifiedTutor.seats,
    sessionStartDate: modifiedTutor.sessionStartDate,
    institutionName: modifiedTutor.institutionName,
    experience: modifiedTutor.experience,
    location: modifiedTutor.location,
    teachingMode: modifiedTutor.teachingMode,
          }
      }
      const result = await tutorCollection.updateOne(query, updatedDocument);
      console.log(result, 'modified Tutor')
      res.json(result)
    })


       app.delete('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id) }
      const result = await tutorCollection.deleteOne(query)
      res.json(result)
    })


app.get( '/', (req, res) => {
  res.send('mediqueue assignment project server is running')
 
})

app.listen(port, ()=> {
  console.log(`mediqueue assignment project server is running in ${port}`)
})
