
const express = require('express')
const app = express()
require('dotenv').config() 
const port = process.env.PORT || 5000
const cors = require('cors');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createLocalJWKSet, jwtVerify, createRemoteJWKSet } = require('jose-cjs');
const uri = process.env.MONGODB_CONNECTION;


let tutorCollection;
let bookedSessionCollection;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)

const verifyToken = async (req, res, next) => {
  // হেডার নিয়ে আসা
      const authHeader = req?.headers?.authorization;
      // যদি হেডার না পায় তাহলে এরর দেবে
     if(!authHeader){
      res.status(401).json({message: 'unauthorized'})
     }  
    //  হেডারের ভেতরে টোকেনটা নিয়ে আসা এবং Bearer থেকে আলাদা করা। যদি না থাকে তাহলে এরর দেয়া। যদি টোকেন থাকে তাহলে পরের অপারেশনে যেতে দেয়া।
     const token = authHeader.split(' ')[1]
   if(!token){
     return res.status(401).json({message: 'unauthorized'})
      
     } 
   
    //  ভেরিফিকেশন করা। যদি না থাকে তাহলে এরর দেয়া।
     try{
      const {payload} = await jwtVerify(token, JWKS);
      console.log(payload, 'payload') // এটা দেখা গেলে ভেরিফিকেশন সম্পন্ন হবে
      next()
     } catch(error){
     return res.status(403).json({message: 'forbidden'})
     }
     }



async function run() {
  try {
    
    await client.connect();

    const db = client.db('mediqueue');
    tutorCollection = db.collection('mediqueue-collection');
     bookedSessionCollection = db.collection('booked-session-collection') 
   
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


 app.get('/tutors/:id', verifyToken, async (req, res) => {
 
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

      app.post('/tutors', verifyToken, async (req, res, ) => {
  

      const newTutor = req.body;
      const result = await tutorCollection.insertOne(newTutor);
      //  console.log(result, 'New Tutor Added')
      res.send(result)
    })

     app.patch('/tutors/:id', async (req, res) => {
           
      const id = req.params.id;
      // console.log(id, 'id from server')
      // console.log(id, 'id')
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
      // console.log(result, 'modified Tutor')
      // res.json(result)
    })


       app.delete('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id) }
      const result = await tutorCollection.deleteOne(query)
      res.json(result)
    })


     // বুকিং ডাটা যোগ করা ও স্লট কমানো
   app.post('/booking', verifyToken, async (req, res, next) => {
       
  const bookingData = req.body;
  const { tutorId } = bookingData; 
    // console.log(bookingData, 'bookingData')
    //  console.log(tutorId, 'tutorId')
  try {
    
    const updatedTutor = await tutorCollection.findOneAndUpdate(
      { 
        _id: new ObjectId(tutorId), 
        totalSlot: { $gt: 0 } 
      },
      { $inc: { totalSlot: -1 } },       
      { returnDocument: "after" }   
    );

  
    if (!updatedTutor) {
      return res.status(400).json({ error: "No slots available!" });
    }

  //Booking collection এ জমা করা
    const result = await bookedSessionCollection.insertOne(bookingData);
    // console.log(result, 'data on server');

  
    res.json({ 
      success: true, 
      bookingResult: result,
      remainingSeats: updatedTutor.totalSlot 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});


// booking ডাটা দেখা। আইডি দিয়ে ফিল্টার্ড

app.get('/booking/:userId', verifyToken, async (req, res, next) => {
  

  // console.log(req.params, 'params' )
     const {userId} = req.params;
    //  console.log(userId, 'userId')
     
      const result = await bookedSessionCollection.find({userId : userId}).toArray()
      res.json(result) 
      // console.log(result, 'result')
    })


 

    // বুকিং ক্যানসেল করা 

   
    app.patch('/booking/:bookingId', async (req, res) => {
        const {bookingId} = req.params;
      console.log(bookingId, 'bookingId from server');
      
  console.log('server url:', process.env.MEDIQUEUE_ASSIGNMENT_SERVER);
      const query = {_id: new ObjectId(bookingId)}
      const modifiedSession = req.body;
      const updatedDocument = {
          $set : {
            bookingStatus: "false"
          }
      }
      const result = await bookedSessionCollection.updateOne(query, updatedDocument);
      console.log(result, 'modified session')
      res.json(result)
    })

app.get( '/', (req, res) => {
  res.send('mediqueue assignment project server is running')
 
})

app.listen(port, ()=> {
  console.log(`mediqueue assignment project server is running in ${port}`)
})
