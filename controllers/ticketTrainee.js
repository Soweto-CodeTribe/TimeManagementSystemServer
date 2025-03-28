// import { db } from '../config/firebaseConfig.js';
// import { 
//   collection, 
//   doc, 
//   getDoc, 
//   getDocs, 
//   addDoc, 
//   updateDoc, 
//   deleteDoc,
//   query, 
//   where, 
//   orderBy
// } from 'firebase/firestore';


// export const createTicket = async (req, res) => {
//     try {
//         const ticketsRef = collection(db, 'tickets');
        
//         const ticket = {
//             title: req.body.title,
//             description: req.body.description,
//             category: req.body.category,
//             priority: req.body.priority || 'medium',
//             status: 'open',
//             submittedBy: req.user.uid,
//             createdAt: new Date().toISOString(),
//             updatedAt: new Date().toISOString()
//         };
        
//         // Fetch trainee name from trainees collection
//         try {
//             const traineesRef = collection(db, 'trainees');
//             const snapshot = await getDocs(traineesRef);
//             const traineeDoc = snapshot.docs.find(doc => doc.data().uid === req.user.uid);
            
//             if (traineeDoc) {
//                 const name = traineeDoc.data().name || traineeDoc.data().fullName;
//                 const surname = traineeDoc.data().surname
//                 if (name && surname) {
//                     ticket.traineeName = name;
//                     ticket.traineeSurname = surname;
//                     console.log("Found trainee name:", name);
//                 }
//             }
//         } catch (fetchError) {
//             console.error('Error fetching trainee data:', fetchError);
//             // Continue without traineeName if there's an error fetching
//         }
        
//         const docRef = await addDoc(ticketsRef, ticket);
//         res.status(201).json({ id: docRef.id, ...ticket });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//         console.error('Error creating ticket:', error);
//     }
// };


// export const getMyTickets = async (req, res) => {
//     try {
//         const ticketsRef = collection(db, 'tickets');
//         const q = query(
//             ticketsRef,
//             where('submittedBy', '==', req.user.uid),
//             orderBy('createdAt', 'desc')
//         );
        
//         const ticketDocs = await getDocs(q);
//         const tickets = await Promise.all(ticketDocs.docs.map(async (doc) => {
//         const ticket = { id: doc.id, ...doc.data() };
        
//         return ticket;
//         }));
        
//         res.json(tickets);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };



// export const getMyTicketById = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
//         // Check ownership
//         if (ticket.submittedBy !== req.user.uid) {
//             return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         res.json(ticket);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };



// export const updateMyTicket = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//         return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Check ownership
//         if (ticket.submittedBy !== req.user.uid) {
//         return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         // Check if ticket can be updated
//         if (ticket.status !== 'open') {
//             return res.status(400).json({ 
//                 error: 'Cannot update ticket: It is already being processed' 
//             });
//         }
        
//         // Update allowed fields
//         const updates = {
//         updatedAt: new Date().toISOString()
//         };
        
//         if (req.body.description) updates.description = req.body.description;
//         if (req.body.title) updates.title = req.body.title;
//         if (req.body.priority) updates.priority = req.body.priority;
        
//         await updateDoc(ticketRef, updates);
        
//         const updatedTicket = await getDoc(ticketRef);
//         res.json({ id: updatedTicket.id, ...updatedTicket.data() });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };



// export const cancelMyTicket = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//         return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Check ownership
//         if (ticket.submittedBy !== req.user.uid) {
//         return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         // Check if ticket can be canceled
//         if (['resolved', 'closed'].includes(ticket.status)) {
//         return res.status(400).json({ 
//             error: 'Cannot cancel ticket: It is already resolved or closed' 
//         });
//         }
        
//         // Update status to closed
//         await updateDoc(ticketRef, {
//             status: 'closed',
//             updatedAt: new Date().toISOString()
//         });
        
//         const updatedTicket = await getDoc(ticketRef);
//         res.json({
//             message: 'Ticket has been canceled',
//             ticket: { id: updatedTicket.id, ...updatedTicket.data() }
//         });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };


// export const deleteMyTicket = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Check ownership - trainee can only delete their own tickets
//         if (ticket.submittedBy !== req.user.uid) {
//             return res.status(403).json({ 
//                 error: 'Unauthorized: This is not your ticket' 
//             });
//         }
        
//         // Delete the ticket
//         await deleteDoc(ticketRef);
        
//         res.json({
//             message: 'Ticket has been deleted successfully by trainee',
//             ticketId: req.params.id
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// import { db } from '../config/firebaseConfig.js';
// import { 
//   collection, 
//   doc, 
//   getDoc, 
//   getDocs, 
//   addDoc, 
//   updateDoc, 
//   deleteDoc,
//   query, 
//   where, 
//   orderBy
// } from 'firebase/firestore';


// export const createTicket = async (req, res) => {
//     try {
//         const ticketsRef = collection(db, 'tickets');
        
//         // Use traineeId from request if available, otherwise fall back to req.user.uid
//         const submittedBy = req.body.traineeId || req.user.uid;
        
//         const ticket = {
//             title: req.body.title,
//             description: req.body.description,
//             category: req.body.category,
//             priority: req.body.priority || 'medium',
//             status: 'open',
//             submittedBy: submittedBy, // Use the determined submittedBy
//             traineeId: submittedBy, // Add traineeId field explicitly for consistency
//             createdAt: new Date().toISOString(),
//             updatedAt: new Date().toISOString()
//         };
        
//         // Fetch trainee name from trainees collection
//         try {
//             const traineesRef = collection(db, 'trainees');
//             const snapshot = await getDocs(traineesRef);
//             const traineeDoc = snapshot.docs.find(doc => doc.data().uid === submittedBy);
            
//             if (traineeDoc) {
//                 const name = traineeDoc.data().name || traineeDoc.data().fullName;
//                 const surname = traineeDoc.data().surname
//                 if (name && surname) {
//                     ticket.traineeName = name;
//                     ticket.traineeSurname = surname;
//                     console.log("Found trainee name:", name);
//                 }
//             }
//         } catch (fetchError) {
//             console.error('Error fetching trainee data:', fetchError);
//             // Continue without traineeName if there's an error fetching
//         }
        
//         const docRef = await addDoc(ticketsRef, ticket);
//         res.status(201).json({ id: docRef.id, ...ticket });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//         console.error('Error creating ticket:', error);
//     }
// };


// export const getMyTickets = async (req, res) => {
//     try {
//         // Use traineeId from params if provided, otherwise use authenticated user
//         const userId = req.params.traineeId || req.user.uid;
        
//         const ticketsRef = collection(db, 'tickets');
//         const q = query(
//             ticketsRef,
//             where('traineeId', '==', userId), // Use traineeId for consistency
//             orderBy('createdAt', 'desc')
//         );
        
//         const ticketDocs = await getDocs(q);
//         const tickets = await Promise.all(ticketDocs.docs.map(async (doc) => {
//             const ticket = { id: doc.id, ...doc.data() };
//             return ticket;
//         }));
        
//         res.json(tickets);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


// export const getMyTicketById = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
//         // Check ownership using either traineeId or submittedBy
//         const requesterId = req.body.traineeId || req.user.uid;
//         if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
//             return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         res.json(ticket);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


// export const updateMyTicket = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Check ownership using either traineeId or submittedBy
//         const requesterId = req.body.traineeId || req.user.uid;
//         if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
//             return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         // Check if ticket can be updated
//         if (ticket.status !== 'open') {
//             return res.status(400).json({ 
//                 error: 'Cannot update ticket: It is already being processed' 
//             });
//         }
        
//         // Update allowed fields
//         const updates = {
//             updatedAt: new Date().toISOString()
//         };
        
//         if (req.body.description) updates.description = req.body.description;
//         if (req.body.title) updates.title = req.body.title;
//         if (req.body.priority) updates.priority = req.body.priority;
        
//         await updateDoc(ticketRef, updates);
        
//         const updatedTicket = await getDoc(ticketRef);
//         res.json({ id: updatedTicket.id, ...updatedTicket.data() });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };


// export const cancelMyTicket = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Check ownership using either traineeId or submittedBy
//         const requesterId = req.body.traineeId || req.user.uid;
//         if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
//             return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         // Check if ticket can be canceled
//         if (['resolved', 'closed'].includes(ticket.status)) {
//             return res.status(400).json({ 
//                 error: 'Cannot cancel ticket: It is already resolved or closed' 
//             });
//         }
        
//         // Update status to closed
//         await updateDoc(ticketRef, {
//             status: 'closed',
//             updatedAt: new Date().toISOString()
//         });
        
//         const updatedTicket = await getDoc(ticketRef);
//         res.json({
//             message: 'Ticket has been canceled',
//             ticket: { id: updatedTicket.id, ...updatedTicket.data() }
//         });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };


// export const deleteMyTicket = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Check ownership using either traineeId or submittedBy
//         const requesterId = req.body.traineeId || req.user.uid;
//         if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
//             return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
//         }
        
//         // Delete the ticket
//         await deleteDoc(ticketRef);
        
//         res.json({
//             message: 'Ticket has been deleted successfully',
//             ticketId: req.params.id
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

import { db } from '../config/firebaseConfig.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy
} from 'firebase/firestore';


export const createTicket = async (req, res) => {
    try {
        const ticketsRef = collection(db, 'tickets');
        
        // Use traineeId from query if available, otherwise fall back to req.user.uid
        const submittedBy = req.query.traineeId || req.user.uid;
        
        const ticket = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            priority: req.body.priority || 'medium',
            status: 'open',
            submittedBy: submittedBy, // Use the determined submittedBy
            traineeId: submittedBy, // Add traineeId field explicitly for consistency
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Fetch trainee name from trainees collection
        try {
            const traineesRef = collection(db, 'trainees');
            const snapshot = await getDocs(traineesRef);
            const traineeDoc = snapshot.docs.find(doc => doc.data().uid === submittedBy);
            
            if (traineeDoc) {
                const name = traineeDoc.data().name || traineeDoc.data().fullName;
                const surname = traineeDoc.data().surname
                if (name && surname) {
                    ticket.traineeName = name;
                    ticket.traineeSurname = surname;
                    console.log("Found trainee name:", name);
                }
            }
        } catch (fetchError) {
            console.error('Error fetching trainee data:', fetchError);
            // Continue without traineeName if there's an error fetching
        }
        
        const docRef = await addDoc(ticketsRef, ticket);
        res.status(201).json({ id: docRef.id, ...ticket });
    } catch (error) {
        res.status(400).json({ error: error.message });
        console.error('Error creating ticket:', error);
    }
};


export const getMyTickets = async (req, res) => {
    try {
        // Use traineeId from params or query, otherwise use authenticated user
        const userId = req.params.traineeId || req.query.traineeId || req.user.uid;
        
        const ticketsRef = collection(db, 'tickets');
        const q = query(
            ticketsRef,
            where('traineeId', '==', userId), // Use traineeId for consistency
            orderBy('createdAt', 'desc')
        );
        
        const ticketDocs = await getDocs(q);
        const tickets = await Promise.all(ticketDocs.docs.map(async (doc) => {
            const ticket = { id: doc.id, ...doc.data() };
            return ticket;
        }));
        
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const getMyTicketById = async (req, res) => {
    try {
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
        // Check ownership using either traineeId param, query or user id
        const requesterId = req.query.traineeId || req.user.uid;
        if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
            return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
        }
        
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const updateMyTicket = async (req, res) => {
    try {
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        
        // Check ownership using query param instead of body
        const requesterId = req.query.traineeId || req.user.uid;
        if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
            return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
        }
        
        // Check if ticket can be updated
        if (ticket.status !== 'open') {
            return res.status(400).json({ 
                error: 'Cannot update ticket: It is already being processed' 
            });
        }
        
        // Update allowed fields
        const updates = {
            updatedAt: new Date().toISOString()
        };
        
        if (req.body.description) updates.description = req.body.description;
        if (req.body.title) updates.title = req.body.title;
        if (req.body.priority) updates.priority = req.body.priority;
        
        await updateDoc(ticketRef, updates);
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({ id: updatedTicket.id, ...updatedTicket.data() });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


export const cancelMyTicket = async (req, res) => {
    try {
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        
        // Use query param instead of body
        const requesterId = req.query.traineeId || req.user.uid;
        if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
            return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
        }
        
        // Check if ticket can be canceled
        if (['resolved', 'closed'].includes(ticket.status)) {
            return res.status(400).json({ 
                error: 'Cannot cancel ticket: It is already resolved or closed' 
            });
        }
        
        // Update status to closed
        await updateDoc(ticketRef, {
            status: 'closed',
            updatedAt: new Date().toISOString()
        });
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({
            message: 'Ticket has been canceled',
            ticket: { id: updatedTicket.id, ...updatedTicket.data() }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


export const deleteMyTicket = async (req, res) => {
    try {
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        
        // Use query param instead of body
        const requesterId = req.query.traineeId || req.user.uid;
        if (ticket.traineeId !== requesterId && ticket.submittedBy !== requesterId) {
            return res.status(403).json({ error: 'Unauthorized: This is not your ticket' });
        }
        
        // Delete the ticket
        await deleteDoc(ticketRef);
        
        res.json({
            message: 'Ticket has been deleted successfully',
            ticketId: req.params.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};