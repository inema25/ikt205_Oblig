import { doc, getDoc } from "firebase/firestore";
import {db} from "./firebaseConfig.js";

const docRef = doc(db, "students", "TXyWajDvukikiWCaBlPL");
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
} else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
}