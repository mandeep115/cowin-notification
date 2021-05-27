import axios from "axios";
import { isEqual } from "lodash";
import moment from "moment";
import { districtCalCollection, pincodeCalCollection } from "./index";
import { Center, user, session } from "./types";

const apiUrl = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/";
// const apiUrl = "http://localhost:5000/fakeApi/";
// const delay = 120000;
const delay = 5000;

export const isPincodeSearchActive = async (pincode: number) => {
  try {
    let response = await pincodeCalCollection.findOne({ pincode });
    return response == null ? null : response.searchActive;
  } catch (err) {
    throw new Error(err);
  }
};

export const isDistrictSearchActive = async (district: number) => {
  try {
    let response = await districtCalCollection.findOne({ district });
    return response == null ? null : response.searchActive;
  } catch (err) {
    throw new Error(err);
  }
};

export const activatePincodeSearch = (pincode: number) => {
  try {
    pincodeCalCollection.findOneAndUpdate({ pincode }, { $set: { searchActive: true } });
  } catch (err) {
    console.log(err);
  }
};

export const activateDistrictSearch = (district: number) => {
  try {
    pincodeCalCollection.findOneAndUpdate({ district }, { $set: { searchActive: true } });
  } catch (err) {
    console.log(err);
  }
};

export const deactivatePincodeSearch = (pincode: number) => {
  try {
    pincodeCalCollection.findOneAndDelete({ pincode });
  } catch (err) {
    console.log(err);
  }
};

export const deactivateDistrictSearch = (district: number) => {
  try {
    pincodeCalCollection.findOneAndDelete({ district });
  } catch (err) {
    console.log(err);
  }
};

export class searchVaccine {
  prevCentersArray: any[];
  pincode = -1;
  district = -1;
  currInterval: any;

  constructor(pincode: number, district: number, prevResponse: any[]) {
    this.pincode = pincode;
    this.district = district;
    this.prevCentersArray = prevResponse;
    this.searchFunction();
  }
  private sendMessage(phone: string) {
    console.log(phone);
  }
  private checkPreference(value: any, preference: any) {
    if (preference == "any") return true;
    return value == preference;
  }
  searchFunction() {
    let resType;
    let resParams;
    this.pincode > 0 ? activatePincodeSearch(this.pincode) : activateDistrictSearch(this.district);

    this.currInterval = setInterval(async () => {
      console.log("searching");
      if (this.pincode > 0) {
        resType = "calendarByPin";
        resParams = {
          pincode: this.pincode,
          date: moment().format("D-M-Y"),
        };
      } else {
        resType = "calendarByDistrict";
        resParams = {
          district: this.district,
          date: moment().format("D-M-Y"),
        };
      }
      // console.log(resType, resParams);
      let { data }: { data: { centers: Center[] } } = await axios.get(`${apiUrl}${resType}`, {
        params: resParams,
        headers: { "Content-Type": "application/json" },
      });
      // console.log(data);
      for (let i = 0; i < data.centers.length; i++) {
        const center = data.centers[i];
        // console.log(center.sessions.filter((s) => s.available_capacity > 0).length > 0);
        if (center.sessions.filter((s) => s.available_capacity > 0).length > 0) {
          // console.log("inside");
          let response: { usersArray: user[] };
          if (this.pincode > 0) {
            response = await pincodeCalCollection.findOne({ pincode: this.pincode });
          } else {
            response = await districtCalCollection.findOne({ district: this.district });
          }
          // console.log(response.usersArray);
          let allMessageSent = await this.sendNotification(data.centers, response.usersArray);
          console.log(allMessageSent);
          if (allMessageSent) {
            this.pincode > 0 ? deactivatePincodeSearch(this.pincode) : deactivateDistrictSearch(this.district);
            clearInterval(this.currInterval);
            return;
          }
          break;
        }
      }
      // this.prevCentersArray = data.centers;
    }, delay);
  }

  async sendNotification(centersArray: any[], usersArray: user[]): Promise<boolean> {
    // if (isEqual(centersArray, this.prevCentersArray)) {
    //   console.log(this.prevCentersArray);
    //   return false;
    // }
    let leftUsersArray: user[] = [];
    usersArray.forEach((user: user) => {
      for (let i = 0; i < centersArray.length; i++) {
        const center: Center = centersArray[i];
        let doesFeeMatch = center.fee_type == user.preferences.fee_type;
        let filteredSessions = center.sessions.filter(
          (session: session) =>
            session.available_capacity > 0 &&
            this.checkPreference(session.min_age_limit, user.preferences.min_age_limit) &&
            this.checkPreference(session.vaccine, user.preferences.vaccine)
        );
        console.log();
        if (doesFeeMatch && filteredSessions.length > 0) {
          this.sendMessage(user.phone);
          break;
        } else leftUsersArray.push(user);
      }
    });
    if (leftUsersArray.length > 0) return false;
    return true;
  }
}

export const onServerStart = async () => {
  const [pinArr, distArr] = await Promise.all([
    pincodeCalCollection.find({}).toArray(),
    districtCalCollection.find({}).toArray(),
  ]);
  pinArr.forEach((pinColl) => {
    if (!pinColl.searchActive) return;
    new searchVaccine(pinColl.pincode, -1, []);
  });
  distArr.forEach((distColl) => {
    if (!distColl.searchActive) return;
    new searchVaccine(-1, distColl.district, []);
  });
};
