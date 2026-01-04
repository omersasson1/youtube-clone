import express from "express";

import {
  uploadProcessedVideo,
  downloadRawVideo,
  deleteRawVideo,
  deleteProcessedVideo,
  convertVideo,
  setupDirectories,
} from "./storage";
import { isVideoNew, setVideo } from "./firestore";

// Create the local directories for raw and processed videos
setupDirectories();

// create an Express application
const app = express();
// Middleware to parse JSON bodies
app.use(express.json());



// getting a post request from Cloud Pub/Sub to process a video and update Firestore
// first validate the request, then process the video
app.post("/process-video", validateRequest,  async (req, res) => {
  
  // Get the bucket and filename from the Cloud Pub/Sub message(which will send the event to this endpoint)
  const data = res.locals.videodata;

  const inputFileName = data.name; // Format: <UID>-<DATE>.<EXTENSION>

  // Extract video UID and DATE from the filename (by removing the file extension)
  const videoId = inputFileName.split(".")[0];

  if (!(await isVideoNew(videoId))) {
    // already processing or processed
    return res.status(400).send("Bad Request: video is already processing or processed.");
  } else {
    // create a new video document in Firestore with status 'processing'
    await setVideo(videoId, {
      id: videoId,
      uid: videoId.split("-")[0],
      status: "processing",
    });
  }

  
  // Process the video: download, convert, upload, update Firestore and clean up local files
  return await processVideo(inputFileName, videoId, res);

});

// Use the port provided by the environment (e.g Google Cloud Run)
// or default to 3000 for local development.
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});




// #region Helper Functions


// helper function -> Middleware to validate incoming requests from Cloud Pub/Sub:
//  The "Gatekeeper" that runs BEFORE the main handler.
// It checks and prepares the request, and MUST call next() to pass execution forward.
function validateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  
  try {
    // Decode the Pub/Sub message(Base64: A binary-to-text encoding scheme, UTF-8: The standard character encoding)
    const message = Buffer.from(req.body.message.data, "base64").toString(
      "utf8"
    );
    // create a JS object from the message(which is a JSON string)
    const data = JSON.parse(message);
    if (!data.name) {
      throw new Error("Invalid message: missing filename.");
    }
    res.locals.videodata = data;
    next();

  } catch (error) {
    console.error(error);
    // a client error
    return res.status(400).send("Bad Request: missing filename.");
  }
}

// Main function to process the video - download, convert, upload, update Firestore and clean up local files
async function processVideo(inputFileName: string, videoId: string, res: express.Response) {
  const outputFileName = `processed-${inputFileName}`;
  // Process the video: download, convert, upload, update Firestore
  try {
    // Download the raw video from Cloud Storage to local storage
    await downloadRawVideo(inputFileName);
    // Process the video into 360p
    await convertVideo(inputFileName, outputFileName);
    // Upload the processed video to Cloud Storage
    await uploadProcessedVideo(outputFileName);
    // Update the video document in Firestore with status 'processed' and filename
    await setVideo(videoId, {
    status: "processed",
    filename: outputFileName,
    });
    // Success response
    return res.status(200).send("Processing finished successfully");
  } catch (err) {
      console.error("Error:", err);
      return res.status(500).send("Internal Server Error: video processing failed.");
  }
  finally {
    // Cleanup local files in case of success or failure.
    // FFmpeg may have created a partial/corrupted file before failing.
    await cleanUp(inputFileName, outputFileName);
  }

}


// Helper function to clean up local files for the processed video function
async function cleanUp(inputFileName: string, outputFileName: string) {
  await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName),
    ]);
}
// #endregion