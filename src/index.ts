import { Collection, MongoClient } from "mongodb";
import express, { Application } from "express";
import cors from "cors";
import {
  activatePincodeSearch,
  deactivatePincodeSearch,
  isDistrictSearchActive,
  isPincodeSearchActive,
  onServerStart,
  searchVaccine,
} from "./logic";
import { Center, data_findVaccine } from "./types";
import axios from "axios";

// import cors from "cors";
// import bodyParser from "body-parser";
const port = 5000;
const app: Application = express();
app.use(express.json());
app.use(cors());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// app.on("listening", onServerStart);

export let pincodeCalCollection: Collection<any>;
export let districtCalCollection: Collection<any>;
export let fakeApiCollection: Collection<Center>;
(async function () {
  let client;
  try {
    client = await MongoClient.connect("mongodb://localhost:27017/", {
      useUnifiedTopology: true,
    });
    console.log("connected");
  } catch (err) {
    console.error("not connected due to", err);
    throw new Error("DB not connected");
  }

  const db = client.db("cowinNotification");
  districtCalCollection = db.collection("districtCal");
  pincodeCalCollection = db.collection("pincodeCal");
  fakeApiCollection = db.collection("fakeApi");

  app.get("/find-vaccine", async (req, res) => {
    let data: data_findVaccine = req.body;

    if (data.pincode > 999999) return res.status(404).send("invalid pincode");
    if (data.district > 999) return res.status(404).send("invalid district");
    if (data.user.preferences.fee_type !== "Free" && data.user.preferences.fee_type !== "Paid") {
      return res.status(404).send("invalid fee");
    }
    if (data.user.userName.length > 500) return res.status(404).send("invalid name must be less than 500 char");
    if (data.user.preferences.vaccine !== "COVAXIN" && data.user.preferences.vaccine !== "COVISHIELD") {
      return res.status(404).send("invalid name must be less than 500 char");
    }

    if (data.district > 0) {
      if (await isDistrictSearchActive(data.district)) {
        districtCalCollection.findOneAndUpdate({ district: data.district }, { $push: { userArray: data.user } });
      } else {
        districtCalCollection.insertOne({
          district: data.district,
          usersArray: [data.user],
          searchActive: false,
        });
        new searchVaccine(-1, data.district, []);
      }
    } else {
      if (await isPincodeSearchActive(data.pincode)) {
        pincodeCalCollection.findOneAndUpdate({ pincode: data.pincode }, { $push: { usersArray: data.user } });
      } else {
        pincodeCalCollection.insertOne({
          pincode: data.pincode,
          usersArray: [data.user],
          searchActive: false,
        });
        new searchVaccine(data.pincode, -1, []);
      }
    }
    return res.json({ ...req.body, message: "You will get notified once we find vaccine." });
  });
  app.get("/fakeApi/:type?", async (_, res) => {
    return res.send(await fakeApiCollection.findOne({}));
  });
  app.get("/test", async (req, res) => {
    let data: data_findVaccine = req.body;
    // deactivatePincodeSearch(444303);
    activatePincodeSearch(444301);
    // let response = await pincodeCalCollection.findOne({ pincode: data.pincode });
    // let response = await pincodeCalCollection.findOneAndUpdate(
    //   { pincode: data.pincode },
    //   { $push: { usersArray: data.user } }
    // );
    // let response = await pincodeCalCollection.insertOne({
    //   pincode: data.pincode,
    //   usersArray: [data.user],
    //   searchActive: false,
    // });
    // const apiUrl = "http://localhost:5000/fakeApi/hi";
    // const apiUrl = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/";
    // let response;
    // try {
    //   response = await axios.get(apiUrl, {
    //     params: {},
    //   });
    //   response = response.data;
    // } catch (err) {
    //   response = err;
    // }
    return res.json(data);
  });
  
  app.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
    onServerStart();
  });
})();
