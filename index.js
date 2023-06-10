const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const pass = process.env.DOC_PASS;
const user = process.env.DOC_USER;

const uri = `mongodb+srv://${user}:${pass}@cluster0.rbjgw7e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("Fashion-House-DB").collection("users");
    const classCollection = client.db("Fashion-House-DB").collection("class");
    const enrolledClassInfoCollection = client
      .db("Fashion-House-DB")
      .collection("enrolledClassInfo");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    //get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //create a single user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "This user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //checking whether the user is admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
        // console.log("sended false");
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
      //console.log(result);
    });
    //checking whether the user is instructor
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
        //console.log("sended false");
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
      // console.log(result);
    });
    //checking whether the user is student
    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ student: false });
        //console.log("sended false");
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === "student" };
      res.send(result);
      //console.log(result);
    });

    //checking all type user role
    app.get("/checkuser", async (req, res) => {
      if (req.query?.email) {
        if (req.query.email == "undefined") {
          console.log("undefined");
          res.send({});
        } else {
          let mail = req.query.email;
          const query = { email: mail };
          const result = await usersCollection.findOne(query);
          res.send(result);
        }
      } else {
        console.log("no mail");
        res.send({});
      }
    });

    //update user to admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //update user to Instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      //console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //==================================CLASS API==================================================

    //get all the class
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //get  class by email
    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email; // console.log(email);
      query = { instructorEmail: `${email}` };
      const result = await classCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    //add one class
    app.post("/classes", verifyJWT, async (req, res) => {
      const newItem = req.body;
      // console.log("from add claass", newItem);
      const result = await classCollection.insertOne(newItem);
      res.send(result);
    });

    //update class status
    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      let mystatus = req.query.status;
      console.log(id);
      console.log(mystatus);

      const filter = { _id: new ObjectId(id) };
      let status;
      switch (mystatus) {
        case "approved":
          status = "approved";
          break;
        case "denied":
          status = "denied";
          break;

        default:
          // Set a default value in case mystatus is not one of the expected values
          status = "pending";
          break;
      }

      const updateDoc = {
        $set: {
          status: status,
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //update only class feedback
    app.patch("/updatefeedback/:id", async (req, res) => {
      const id = req.params.id;
      let myfeedback = req.query.feedback;
      //  console.log(id);
      // console.log("feedback", myfeedback);

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          feedback: myfeedback,
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //==================================students class enrolled==================================================

    app.post("/enrolledClass", async (req, res) => {
      const newItem = req.body;
      // console.log("from add enrolled claass", newItem);
      const result = await enrolledClassInfoCollection.insertOne(newItem);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send(`FASHION HOUSE is running `);
});

app.listen(port, () => {
  console.log(`FASHION HOUSE is running on port: ${port}`);
});
