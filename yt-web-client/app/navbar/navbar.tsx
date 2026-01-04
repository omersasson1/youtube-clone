/**
 * NAVBAR COMPONENT - THE "STATE MANAGER" (The Controller - Observer Pattern)
 * ------------------------------------------------------
 * BIG PICTURE:
 * This component acts as the "Source of Truth" for the entire header.
 * Instead of every button asking Firebase for user data, this 'Manager'
 * asks once and distributes the info to its 'Employees' (Children).
 *
 * ARCHITECTURAL FLOW:
 * 1. INITIALIZE: Create a reactive memory slot (State) for the user.
 * 2. OBSERVE: Setup a persistent listener (Observer) to Firebase's Auth API.
 * 3. REACT: When the user logs in/out, update the State.
 * 4. NOTIFY: React automatically re-runs this function and passes the 
 * updated data to child components like <SignIn />.
 */

'use client'; // Directive: This code manages UI state, so it must run on the Client (Browser).

import { useEffect, useState } from "react";
import { onAuthStateChangedHelper } from "../firebase/firebase";
import { User } from "firebase/auth";
import SignIn from "./sign-in";
import Link from "next/link";
import styles from "./navbar.module.css";
import Upload from "./upload";
import Image from "next/image";

function NavBar() {
  /**
   * 1. STATE ALLOCATION (Reactive Buffer)
   * We define 'user' as a piece of data that React "watches".
   * When 'setUser' is called, React triggers a RE-RENDER of the entire UI.
   */
  const [user, setUser] = useState<User | null>(null);

  /**
   * 2. COMPONENT LIFECYCLE (The 'Init' Method)
   * 'useEffect' with an empty array [] acts like a Constructor/Main.
   * It ensures the setup code inside runs ONLY ONCE when the app starts.
   */
  useEffect(() => {
    /**
     * 3. REGISTERING THE OBSERVER (The Callback)
     * We tell Firebase: "Call this function whenever the login status changes".
     * This is asynchronous. Firebase will 'shout' the new user data to us.
     */
    const unsubscribe = onAuthStateChangedHelper((newUser) => {
      // 4. TRIGGERING UI UPDATE
      // We store the new data. React sees this and re-executes the 'return' block below.
      setUser(newUser); 
    });

    /**
     * 5. MEMORY CLEANUP (The 'Destructor')
     * We return the 'unsubscribe' function. React will call this if the component
     * is destroyed, preventing memory leaks (similar to free() in C).
     */
    return () => unsubscribe();
  }, []); 

  return (
  <nav className={styles.nav}>
    {/* Left - Logo */}
    <div className={styles.left}>
      <Link href="/">
        
        <Image src="/youtube-logo.svg" alt="Logo" width={90} height={20} />
      </Link>
    </div>

    {/* Center - Upload */}
    <div className={styles.center}>
      {user && <Upload />}
    </div>

    {/* Right - Sign In */}
    <div className={styles.right}>
      <SignIn user={user} />
    </div>
  </nav>
);
}

export default NavBar;

