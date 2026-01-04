import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions/v1";
import {Storage} from "@google-cloud/storage";
import {onCall} from "firebase-functions/v2/https";

// Start the Firebase App.
initializeApp();

// Get a handle on the Database.
const db = getFirestore();
// Get a handle on Cloud Storage.
const storage = new Storage();
// Define the name of the bucket for raw videos.
const rawVideoBucketName = "omer-yt-raw-videos";
// Define the name of the collection in Firestore for videos.
const videoCollectionId = "videos";
// Define allowed video file extensions.
const ALLOWED_EXTENSIONS = ["mp4", "mov", "avi", "webm"];

// Define the video components.
export interface Video {
  id?: string,
  uid?: string,
  filename?: string,
  status?: "processing" | "processed",
  title?: string,
  description?: string
}



// Callable function for client to get a list of videos from Firestore.
export const getVideos = onCall({maxInstances: 1}, async () => {
  const querySnapshot = await db
    .collection(videoCollectionId)
    .where("status", "==", "processed")  //  Only show processed videos
    .orderBy("createdAt", "desc") // descending order (newest first)
    .limit(10)
    .get();

  // Firestore Analogy:
  // querySnapshot = The Mailbag (the whole batch of results).
  // .docs         = The Envelopes (contains metadata + content).
  // .data()       = The Letter inside (opening the envelope to extract the actual JSON).
  return querySnapshot.docs.map((doc) => doc.data());
});

/**
 * The Trigger Function.
 * This function wakes up automatically when a new user signs up.
 */
export const createUser = functions.auth.user().onCreate(async (userRecord) => {
  const user = userRecord;

  // Safety Check.
  if (!user) {
    logger.error("No user data found!");
    return;
  }

  // make a user object
  const userInfo = {
    uid: user.uid,
    email: user.email,
    photoUrl: user.photoURL,
    createdAt: new Date(),
  };

  // 5. Saving to the Database.
  try {
    // Save to the "users" collection.
    await db.collection("users").doc(user.uid).set(userInfo);

    // Log a success message.
    logger.info(`Success: User ${user.uid} was added.`);
  } catch (error) {
    // Log the error.
    logger.error(`Error saving user: ${error}`);
    throw error;  // Re-throw so Firebase knows it failed
  }
});


// Callable function to generate a signed URL for uploading a video from the client to Cloud Storage.
export const generateUploadUrl = onCall({maxInstances: 1}, async (req) => {
  // Ensure the user is authenticated.
  if (!req.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const { fileExtension } = req.data;

  // ✅ Validate file extension
  if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension.toLowerCase())) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }


  const auth = req.auth;  // User info (uid, email, etc.)
  const bucket = storage.bucket(rawVideoBucketName);
  // Generate a unique filename for upload using user ID, timestamp and file extension.
  const fileName = `${auth.uid}-${Date.now()}.${fileExtension}`;

  // Generate signed URL (temporary permission to upload)
  const [url] = await bucket.file(fileName).getSignedUrl({
    version: "v4",
    action: "write",            // Permission to WRITE (upload)
    expires: Date.now() + 15 * 60 * 1000, // Valid for 15 minutes
  });

  // Send back to frontend
  return {url, fileName};
});

