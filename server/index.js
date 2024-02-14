const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken"); //for generating jwt token
const bcrypt = require("bcrypt");
const User = require("./models/User");
const cookiesParser = require("cookie-parser"); //for reading cookies
const imageDownloader = require("image-downloader"); //for uploading file in the local folder
const multer = require("multer");
const fs = require("fs");
const place = require("./models/place");
require("dotenv").config();

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10); // for encrypt password
const jwtSecret = "fasefraw4r5r3wq45wdfgw34twdfg";
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.use(express.json());
app.use(cookiesParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body.formData;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required fields" });
  }
  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });

    res.status(200).json(userDoc, { message: "user created succesfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});

app.post("/login", async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(userDoc);
        }
      );
    } else {
      res.status(422).json("pass not ok");
    }
  } else {
    res.json("not found");
  }
});

app.get("/profile", (req, res) => {
  // mongoose.connect(process.env.MONGO_URL);
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      //verify token
      if (err) throw err;
      const { name, email, _id } = await User.findById(userData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;
  const newName = "photo" + Date.now() + ".jpg";
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });

  res.json(__dirname + "/uploads/" + newName);
});

const photosMiddleware = multer({ dest: "uploads/" });
app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newpath = path + "." + ext;
    fs.renameSync(path, newpath);
    uploadedFiles.push(newpath.replace("uploads/", ""));
  }
  res.json(uploadedFiles);
});

app.post("/places", (req, res) => {
  const { token } = req.cookies;
  const {
    title,
    address,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    description,
    price,
    addedPhotos,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    //verify token
    if (err) throw err;
    const Place = place.create({
      owner: userData.id,
      title,
      address,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      description,
      price,
      photos: addedPhotos,
    });

    res.json(Place);
  });
});

app.get("/user-places", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    //verify token
    if (err) throw err;
    const { id } = userData;
    res.json(await place.find({ owner: id }));
  });
});


app.get('/places/:id',async  (req,res)=>{
  mongoose.connect(process.env.MONGO_URL);
  const {id} = req.params;
  res.json(await place.findById(id));
})

app.put('/places' ,async(req,res)=>{
  const {token} = req.cookies
  const {
    id,
    title,
    address,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    description,
    addedPhotos,
    price
  } = req.body;

 
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const placeDoc= await place.findById(id)
    //verify token
    if (err) throw err;
   
    if(userData.id==placeDoc.owner.toString()){
      await placeDoc.set({
        title,
        address,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        description,
        photos: addedPhotos,
        price
      })
       await placeDoc.save()
       res.status(200).json('ok')
    }
  });
})


app.get('/places',async(req,res)=>{
  let Places=  await place.find()
  res.json(Places)
})
const port = 5000;

app.listen(port, async(req,res) => {
  console.log(`Server is running on port ${port}`);
});
