import { Fragment } from "react";
import signOutWithGoogle, { signInWithGoogle } from "../firebase/firebase";
import styles from "./sign-in.module.css";
import { User } from "firebase/auth";

/**
 * SIGN-IN COMPONENT - "THE GATEKEEPER"
 * -----------------------------------
 * BIG PICTURE:
 * This component acts as a visual toggle. It doesn't handle the "how" of
 * authentication, but rather the "what to show" based on the user's status.
 * * INTERACTING PARTS:
 * 1. Firebase: The "Back-office" that verifies who the user is.
 * 2. User (Prop): The "Access Card". If it has data, the user is logged in.
 * If it's null, they are a guest.
 * 3. signInWithGoogle/signOut: The "Action Triggers" that tell Firebase what to do.
 * 4. CSS Modules: The "Stylist" ensuring this component looks consistent
 * without affecting others.
 * * LOGIC:
 * - User exists? -> Show "Sign Out" button.
 * - User is null? -> Show "Sign in" button.
 */

// union types
interface SignInProps {
  user: User | null; // The "Access Card" - can be a User object or nothing (null)
}

export default function SignIn({ user }: SignInProps) {
  return (
    <Fragment>
      {user ? (
        // If user is signed in, show sign-out button with appropriate styling. if clicked, triggers signOut function
        <button className={styles.signin} onClick={signOutWithGoogle}>
          Sign Out
        </button>
      ) : (
        // If user is not signed in, show sign-in button. if clicked, triggers signInWithGoogle function
        <button className={styles.signin} onClick={signInWithGoogle}>
          Sign in
        </button>
      )}
    </Fragment>
  );
}
