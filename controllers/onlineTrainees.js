import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig.js";

export const fetchOnlineTrainees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * pageSize;

    const onlineTraineesRef = collection(db, "onlineTrainees");

    const snapshot = await getDocs(onlineTraineesRef);

    const onlineTrainees = snapshot.docs
      .filter((doc) => doc.data().role === "online_trainee")
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt
          ? doc.data().createdAt.toDate().toISOString()
          : null,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + pageSize);

    res.status(200).json({
      success: true,
      data: onlineTrainees,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(snapshot.docs.length / pageSize),
        totalTrainees: snapshot.docs.length,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("Error fetching online trainees:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching online trainees",
      error: error.message,
    });
  }
};

export const fetchSingleOnlineTrainee = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = doc(db, "onlineTrainees", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Online trainee not found",
      });
    }

    const traineeData = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt
        ? docSnap.data().createdAt.toDate().toISOString()
        : null,
    };

    res.status(200).json({
      success: true,
      data: traineeData,
    });
  } catch (error) {
    console.error("Error fetching single online trainee:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching online trainee",
      error: error.message,
    });
  }
};
