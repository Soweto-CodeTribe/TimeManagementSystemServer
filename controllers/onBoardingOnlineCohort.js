import { stringify } from "csv-stringify/sync";
import axios from "axios";
import fs from "fs";

export const fetchAndConvertExternalTrainees = async () => {
  const token = process.env.MLAB_API_TOKEN;
  try {
    const response = await axios.get(
      "https://codetribe-admin.mlab.co.za/users/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const traineeData = response.data.data;

    const csvData = stringify([traineeData], {
      header: true,
      columns: {
        first_name: "Full Name",
        last_name: "Surname",
        email: "Email",
        location: "Location",
      },
    });

    fs.writeFileSync("external_trainees.csv", csvData);

    console.log("External trainees converted to CSV successfully!");
    console.log("csv data: ", csvData);
    return csvData;
  } catch (error) {
    console.error("Error fetching external trainees:", error.message);
    return null;
  }
};
