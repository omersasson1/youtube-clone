import { credential } from "firebase-admin";
import {initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";

initializeApp({credential: credential.applicationDefault()});

// Initialize Firestore (the NoSQL database from Firebase)
const firestore = new Firestore();


// Collection ID for videos
const videoCollectionId = 'videos';

// Video interface representing the structure of a video document in Firestore
export interface Video {
  id?: string,
  uid?: string,
  filename?: string,
  status?: 'processing' | 'processed',
  title?: string,
  description?: string
}


// set (create or update) a video document in Firestore
export function setVideo(videoId: string, video: Video) {
  // 'set' will create the document if it does not exist
  return firestore.collection(videoCollectionId).doc(videoId)
    // 'merge: true' to only update the provided fields
    .set(video, { merge: true })
}

// check if a video is new (not processing or processed)
export async function isVideoNew(videoId: string) {
  const video = await getVideo(videoId);
  return video?.status === undefined;
}


// Helper function to get a video document by its ID from Firestore
async function getVideo(videoId: string): Promise<Video> {
  // Get the document snapshot from Firestore
  const snapshot = await firestore.collection(videoCollectionId).doc(videoId).get();
  // Return the video data (inside the snapshot) or an empty object if the document does not exist
  if (!snapshot.exists) {
    console.log(`No video found with ID: ${videoId}`);
    return {} as Video;
  }
  return (snapshot.data() as Video);
}