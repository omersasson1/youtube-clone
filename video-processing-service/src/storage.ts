// 1. GCS file interactions
// 2. Local file interactions for storing raw and processed videos

import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg"; 



const storage = new Storage();

const rawVideoBucketName = "omer-yt-raw-videos";
const processedVideoBucketName = "omer-yt-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";


/**
 * Creates the local directories for raw and processed videos.
 */
export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}


/**
 * Ensures a directory exists, creating it if necessary.
 * @param {string} dirPath - The directory path to check.
 */
function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }); // recursive: true -> enables creating nested directories
    console.log(`Directory created at ${dirPath}`);
  }
}




/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */
export function convertVideo(rawVideoName: string, processedVideoName: string) {
  // A. This returns IMMEDIATELY. The 'await' outside catches this Promise object.
  return new Promise<void>((resolve, reject) => {
    
    // B. Setup the FFmpeg external process. 
    // FFmpeg is NOT JavaScript; it's a separate C++ process in the OS.
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360") 
      
      // C. This function is a 'Callback'.
      // It is stored in memory and DOES NOT run now.
      .on("end", function () {
        console.log("Processing finished successfully");
        
        // D. THE BRIDGE: When the OS tells us FFmpeg is done, 
        // we use the 'remote control' (resolve) to update the Promise state.
        resolve(); 
      })
      
      .on("error", function (err: any) {
        // If the OS process fails, we use the other 'remote control'.
        reject(err);
      })

      // E. This triggers the OS 'spawn' command to actually start FFmpeg and to put it in the right file.
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}


/**
 * @param fileName - The name of the file to download from the 
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been downloaded.
 */
export async function downloadRawVideo(fileName: string) {
  
  await storage.bucket(rawVideoBucketName)
    .file(fileName)
    // The .download() method returns a Promise.
    .download({
      destination: `${localRawVideoPath}/${fileName}`, // Local path on the Docker container
    });

  // 3. EXECUTION RESUMPTION:
  console.log(
    `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
  );
}


/**
 * @param fileName - The name of the file to upload from the 
 * {@link localProcessedVideoPath} folder into the {@link processedVideoBucketName}.
 * @returns A promise that resolves when the file has been uploaded.
 */
export async function uploadProcessedVideo(fileName: string) {
  // 1. OBJECT MAPPING:
  // Create a local reference to the cloud bucket.
  const bucket = storage.bucket(processedVideoBucketName);

  // 2. THE DATA TRANSFER:
  // We 'await' the upload process. 
  // Under the hood: Node.js reads from the Docker filesystem and streams bytes to GCS.
  // The Event Loop is NOT blocked; it handles other requests while bytes travel over the wire.
  await bucket
    .upload(`${localProcessedVideoPath}/${fileName}`, {
      destination: fileName, // The name the file will have in the cloud
    });

  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
  );

  // 3. ATOMIC PERMISSION UPDATE:
  // Making the file public beacause by default, files uploaded to GCS are maybe private.
  // This 'await' ensures the file is fully stored before we modify its access rights (ACL).
  await bucket.file(fileName).makePublic();
}






/**
 * @param fileName - The name of the file to delete from the
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 * 
 */
export function deleteRawVideo(fileName: string) {
  return deleteFile(`${localRawVideoPath}/${fileName}`);
}


/**
* @param fileName - The name of the file to delete from the
* {@link localProcessedVideoPath} folder.
* @returns A promise that resolves when the file has been deleted.
* 
*/
export function deleteProcessedVideo(fileName: string) {
  return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}


/**
 * @param filePath - The path of the file to delete.
 * @returns A promise that resolves when the file has been deleted.
 * it actuallt will be used as a helper function for deleteRawVideo and deleteProcessedVideo
 */
function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 1. PRE-FLIGHT CHECK:
    // check if the file exists to avoid unnecessary errors.
    if (fs.existsSync(filePath)) {
      
      // 2. ASYNC DELETION (The OS Level):
      // 'unlink' is the standard system call for removing a file entry.
      // We pass a callback function that the OS will trigger once the disk is updated.
      fs.unlink(filePath, (err) => {
        if (err) {
          // If the OS returns an error (e.g., File Locked), we reject the Promise.
          console.error(`Failed to delete file at ${filePath}`, err);
          reject(err);
        } else {
          // Success: The file entry is gone from the disk.
          console.log(`File deleted at ${filePath}`);
          resolve();
        }
      });
    } else {
      // 3. IDEMPOTENCY:
      // If the file is already gone, we don't treat it as an error.
      // We simply resolve so the pipeline can continue smoothly.
      console.log(`File not found at ${filePath}, skipping delete.`);
      resolve();
    }
  });
}
