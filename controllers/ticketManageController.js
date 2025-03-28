// import { db } from '../config/firebaseConfig.js';
// import { 
//     collection, 
//     doc, 
//     getDoc, 
//     getDocs, 
//     addDoc, 
//     updateDoc, 
//     deleteDoc,
//     query, 
//     where, 
//     orderBy
//   } from 'firebase/firestore';


//   export const getAllTickets = async (req, res) => {
//     try {
//         // Check if user is a facilitator
//         const facilitatorRef = doc(db, 'facilitators', req.user.uid);
//         const facilitatorDoc = await getDoc(facilitatorRef);

//         if (!facilitatorDoc.exists()) {
//             return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
//         }

//         // Build query constraints
//         const constraints = [];
//         if (req.query.status) constraints.push(where('status', '==', req.query.status));
//         if (req.query.priority) constraints.push(where('priority', '==', req.query.priority));
//         if (req.query.assigned === 'true') {
//             constraints.push(where('assignedTo', '==', req.user.uid));
//         } else if (req.query.assigned === 'false') {
//             constraints.push(where('assignedTo', '==', null));
//         }
//         constraints.push(orderBy('updatedAt', 'desc'));

//         // Get tickets
//         const ticketsRef = collection(db, 'tickets');
//         const q = query(ticketsRef, ...constraints);
//         const ticketDocs = await getDocs(q);

//         // Fixing the "doc is not a function" error
//         const tickets = await Promise.all(ticketDocs.docs.map(async (ticketDoc) => {
//             const ticket = { id: ticketDoc.id, ...ticketDoc.data() };

//             // Fetch submitter details
//             if (ticket.submittedBy) {
//                 const submitterRef = doc(db, 'users', ticket.submittedBy);
//                 const submitterDoc = await getDoc(submitterRef);
//                 if (submitterDoc.exists()) {
//                     ticket.submitter = {
//                         name: submitterDoc.data().name || null,
//                         email: submitterDoc.data().email || null
//                     };
//                 }
//             }

//             // Fetch assignee details
//             if (ticket.assignedTo) {
//                 const assigneeRef = doc(db, 'facilitators', ticket.assignedTo);
//                 const assigneeDoc = await getDoc(assigneeRef);
//                 if (assigneeDoc.exists()) {
//                     ticket.assignee = {
//                         name: assigneeDoc.data().name || null,
//                         email: assigneeDoc.data().email || null
//                     };
//                 }
//             }

//             return ticket;
//         }));

//         res.json(tickets);
//     } catch (error) {
//         console.error("Error fetching tickets:", error);
//         res.status(500).json({ error: error.message });
//     }
// };



// export const getTicketById = async (req, res) => {
//     try {
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
//         // Get submitter and assignee details
//         if (ticket.submittedBy) {
//             const submitterDoc = await getDoc(doc(db, 'users', ticket.submittedBy));
//             ticket.submitter = {
//             name: submitterDoc.data()?.name,
//             email: submitterDoc.data()?.email
//             };
//         }
        
//         if (ticket.assignedTo) {
//             const assigneeDoc = await getDoc(doc(db, 'facilitators', ticket.assignedTo));
//             ticket.assignee = {
//             name: assigneeDoc.data()?.name,
//             email: assigneeDoc.data()?.email
//             };
//         }
        
//         res.json(ticket);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


// export const updateTicket = async (req, res) => {
//     try {
//       // Verify facilitator
//         const facilitatorRef = doc(db, 'facilitators', req.user.uid);
//         const facilitatorDoc = await getDoc(facilitatorRef);
        
//         if (!facilitatorDoc.exists()) {
//             return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
//         }
        
//         const ticketRef = doc(db, 'tickets', req.params.id);
//         const ticketDoc = await getDoc(ticketRef);
        
//         if (!ticketDoc.exists()) {
//             return res.status(404).json({ error: 'Ticket not found' });
//         }
        
//         const ticket = ticketDoc.data();
        
//         // Update allowed fields
//         const updates = {
//             updatedAt: new Date().toISOString()
//         };
        
//         if (req.body.status) updates.status = req.body.status;
//         if (req.body.priority) updates.priority = req.body.priority;
        
//         await updateDoc(ticketRef, updates);
        
//         const updatedTicket = await getDoc(ticketRef);
//         res.json({ id: updatedTicket.id, ...updatedTicket.data() });
//         } catch (error) {
//             res.status(400).json({ error: error.message });
//         }
//     };


//     export const deleteTicket = async (req, res) => {
//         try {
//             // Check if user is a facilitator or super admin
//             let userRole = '';
//             let useName = '';
            

//             const facilitatorRef = doc(db, 'facilitators', req.user.uid);
//             const facilitatorDoc = await getDoc(facilitatorRef);
//             const user = facilitatorDoc.data();
            
//             if (facilitatorDoc.exists()) {
//                 userRole = user.role ;
//                 useName = user.name || user.fullName;
//             } 
            
            
//             if (!facilitatorDoc.exists()) {
//                 return res.status(403).json({ 
//                     error: 'Unauthorized: Only facilitators and super admins can delete tickets' 
//                 });
//             }
            
//             const ticketRef = doc(db, 'tickets', req.params.id);
//             const ticketDoc = await getDoc(ticketRef);
            
//             if (!ticketDoc.exists()) {
//                 return res.status(404).json({ error: 'Ticket not found' });
//             }
            
//             // Delete the ticket
//             await deleteDoc(ticketRef);
            
//             res.json({
//                 message: `Ticket has been deleted successfully by ${userRole}, ${useName} `,
//                 ticketId: req.params.id
//             });
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     };

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
    orderBy, 
    limit
} from 'firebase/firestore';

// export const getAllTickets = async (req, res) => {
//     try {
//         // Check if user is a facilitator
//         const facilitatorRef = doc(db, 'facilitators', req.user.uid);
//         const facilitatorDoc = await getDoc(facilitatorRef);

//         if (!facilitatorDoc.exists()) {
//             return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
//         }

//         // Build query constraints
//         const constraints = [];
//         if (req.query.status) constraints.push(where('status', '==', req.query.status));
//         if (req.query.priority) constraints.push(where('priority', '==', req.query.priority));
//         if (req.query.category) constraints.push(where('category', '==', req.query.category));
//         if (req.query.traineeId) constraints.push(where('traineeId', '==', req.query.traineeId));
        
//         // Handle assignment filtering
//         if (req.query.assigned === 'true') {
//             constraints.push(where('assignedTo', '==', req.user.uid));
//         } else if (req.query.assigned === 'false') {
//             constraints.push(where('assignedTo', '==', null));
//         }
        
//         constraints.push(orderBy('updatedAt', 'desc'));

//         // Get tickets
//         const ticketsRef = collection(db, 'tickets');
//         const q = query(ticketsRef, ...constraints);
//         const ticketDocs = await getDocs(q);

//         const tickets = await Promise.all(ticketDocs.docs.map(async (ticketDoc) => {
//             const ticket = { id: ticketDoc.id, ...ticketDoc.data() };

//             // Fetch trainee details
//             if (ticket.traineeId) {
//                 try {
//                     const traineeRef = doc(db, 'trainees', ticket.traineeId);
//                     const traineeDoc = await getDoc(traineeRef);
//                     if (traineeDoc.exists()) {
//                         ticket.traineeDetails = {
//                             name: traineeDoc.data().name || traineeDoc.data().fullName || null,
//                             surname: traineeDoc.data().surname || null,
//                             email: traineeDoc.data().email || null
//                         };
//                     }
//                 } catch (error) {
//                     console.error("Error fetching trainee details:", error);
//                 }
//             }

//             // Fetch assignee details
//             if (ticket.assignedTo) {
//                 try {
//                     const assigneeRef = doc(db, 'facilitators', ticket.assignedTo);
//                     const assigneeDoc = await getDoc(assigneeRef);
//                     if (assigneeDoc.exists()) {
//                         ticket.assigneeDetails = {
//                             name: assigneeDoc.data().name || assigneeDoc.data().fullName || null,
//                             email: assigneeDoc.data().email || null
//                         };
//                     }
//                 } catch (error) {
//                     console.error("Error fetching assignee details:", error);
//                 }
//             }

//             return ticket;
//         }));

//         res.json(tickets);
//     } catch (error) {
//         console.error("Error fetching tickets:", error);
//         res.status(500).json({ error: error.message });
//     }
// };


export const getAllTickets = async (req, res) => {
    try {
        // Check if user is a facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);

        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }

        // Get facilitator's location
        const facilitatorLocation = facilitatorDoc.data().location;

        // Base query for tickets
        const ticketsRef = collection(db, 'tickets');
        const constraints = [];

        // Location-based filtering
        if (facilitatorLocation) {
            // Fetch trainees in the facilitator's location
            const traineesRef = collection(db, 'trainees');
            const traineeQuery = query(traineesRef, where('location', '==', facilitatorLocation));
            const traineeSnapshot = await getDocs(traineeQuery);
            
            // Get trainee IDs from the location
            const traineeIds = traineeSnapshot.docs.map(doc => doc.id);
            
            // If no trainees found, return empty array
            if (traineeIds.length === 0) {
                return res.json([]);
            }

            // Add trainee ID filter
            constraints.push(where('traineeId', 'in', traineeIds));
        }

        // Additional optional filters from query parameters
        if (req.query.status) constraints.push(where('status', '==', req.query.status));
        if (req.query.priority) constraints.push(where('priority', '==', req.query.priority));
        if (req.query.category) constraints.push(where('category', '==', req.query.category));
        if (req.query.traineeId) constraints.push(where('traineeId', '==', req.query.traineeId));
        
        // Handle assignment filtering
        if (req.query.assigned === 'true') {
            constraints.push(where('assignedTo', '==', req.user.uid));
        } else if (req.query.assigned === 'false') {
            constraints.push(where('assignedTo', '==', null));
        }
        
        // Add ordering
        constraints.push(orderBy('updatedAt', 'desc'));

        // Limit results if specified
        const pageSize = parseInt(req.query.limit) || 50;
        constraints.push(limit(pageSize));

        // Execute query
        const q = query(ticketsRef, ...constraints);
        const ticketDocs = await getDocs(q);

        const tickets = await Promise.all(ticketDocs.docs.map(async (ticketDoc) => {
            const ticket = { id: ticketDoc.id, ...ticketDoc.data() };

            // Fetch trainee details
            if (ticket.traineeId) {
                try {
                    const traineeRef = doc(db, 'trainees', ticket.traineeId);
                    const traineeDoc = await getDoc(traineeRef);
                    if (traineeDoc.exists()) {
                        ticket.traineeDetails = {
                            name: traineeDoc.data().name || traineeDoc.data().fullName || null,
                            surname: traineeDoc.data().surname || null,
                            email: traineeDoc.data().email || null,
                            location: traineeDoc.data().location || null
                        };
                    }
                } catch (error) {
                    console.error("Error fetching trainee details:", error);
                }
            }

            // Fetch assignee details
            if (ticket.assignedTo) {
                try {
                    const assigneeRef = doc(db, 'facilitators', ticket.assignedTo);
                    const assigneeDoc = await getDoc(assigneeRef);
                    if (assigneeDoc.exists()) {
                        ticket.assigneeDetails = {
                            name: assigneeDoc.data().name || assigneeDoc.data().fullName || null,
                            email: assigneeDoc.data().email || null
                        };
                    }
                } catch (error) {
                    console.error("Error fetching assignee details:", error);
                }
            }

            return ticket;
        }));

        res.json(tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getTicketById = async (req, res) => {
    try {
        // Verify facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }
        
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
        // Fetch trainee details
        if (ticket.traineeId) {
            try {
                const traineeRef = doc(db, 'trainees', ticket.traineeId);
                const traineeDoc = await getDoc(traineeRef);
                if (traineeDoc.exists()) {
                    ticket.traineeDetails = {
                        name: traineeDoc.data().name || traineeDoc.data().fullName || null,
                        surname: traineeDoc.data().surname || null,
                        email: traineeDoc.data().email || null
                    };
                }
            } catch (error) {
                console.error("Error fetching trainee details:", error);
            }
        }
        
        // Fetch assignee details
        if (ticket.assignedTo) {
            try {
                const assigneeRef = doc(db, 'facilitators', ticket.assignedTo);
                const assigneeDoc = await getDoc(assigneeRef);
                if (assigneeDoc.exists()) {
                    ticket.assigneeDetails = {
                        name: assigneeDoc.data().name || assigneeDoc.data().fullName || null,
                        email: assigneeDoc.data().email || null
                    };
                }
            } catch (error) {
                console.error("Error fetching assignee details:", error);
            }
        }
        
        // Add ticket history to response
        const historyRef = collection(db, 'tickets', req.params.id, 'history');
        const historySnapshot = await getDocs(historyRef);
        const history = historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        ticket.history = history;
        
        res.json(ticket);
    } catch (error) {
        console.error("Error fetching ticket:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateTicket = async (req, res) => {
    try {
        // Verify facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }
        
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        const facilitator = facilitatorDoc.data();
        
        // Update ticket fields
        const updates = {
            updatedAt: new Date().toISOString()
        };
        
        // Fields that can be updated by facilitators
        if (req.body.status) updates.status = req.body.status;
        if (req.body.priority) updates.priority = req.body.priority;
        if (req.body.notes) updates.notes = req.body.notes;
        
        // Handle assignment
        if (req.body.assign === true && !ticket.assignedTo) {
            // Assign to current facilitator
            updates.assignedTo = req.user.uid;
            updates.assignedAt = new Date().toISOString();
            updates.assigneeName = facilitator.name || facilitator.fullName;
        } else if (req.body.assign === false && ticket.assignedTo === req.user.uid) {
            // Unassign from current facilitator
            updates.assignedTo = null;
            updates.assignedAt = null;
            updates.assigneeName = null;
        }
        
        // Add history entry
        const historyEntry = {
            timestamp: new Date().toISOString(),
            facilitatorId: req.user.uid,
            facilitatorName: facilitator.name || facilitator.fullName,
            changes: {}
        };
        
        // Track changes for history
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'updatedAt' && ticket[key] !== value) {
                historyEntry.changes[key] = {
                    from: ticket[key],
                    to: value
                };
            }
        }
        
        // Only add history if there are actual changes
        if (Object.keys(historyEntry.changes).length > 0) {
            const historyRef = collection(db, 'tickets', req.params.id, 'history');
            await addDoc(historyRef, historyEntry);
        }
        
        // Update ticket
        await updateDoc(ticketRef, updates);
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({ 
            id: updatedTicket.id, 
            ...updatedTicket.data(), 
            message: 'Ticket updated successfully' 
        });
    } catch (error) {
        console.error("Error updating ticket:", error);
        res.status(400).json({ error: error.message });
    }
};

export const resolveTicket = async (req, res) => {
    try {
        // Verify facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }
        
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        
        // Check if ticket can be resolved
        if (['resolved', 'closed'].includes(ticket.status)) {
            return res.status(400).json({ 
                error: 'Cannot resolve ticket: It is already resolved or closed' 
            });
        }
        
        // Check if ticket is assigned to this facilitator
        if (ticket.assignedTo && ticket.assignedTo !== req.user.uid) {
            return res.status(403).json({ 
                error: 'Unauthorized: This ticket is assigned to another facilitator' 
            });
        }
        
        // Update ticket
        const updates = {
            status: 'resolved',
            resolvedBy: req.user.uid,
            resolvedAt: new Date().toISOString(),
            resolution: req.body.resolution || 'Issue resolved',
            updatedAt: new Date().toISOString()
        };
        
        // Add history entry
        const historyRef = collection(db, 'tickets', req.params.id, 'history');
        await addDoc(historyRef, {
            timestamp: new Date().toISOString(),
            facilitatorId: req.user.uid,
            facilitatorName: facilitatorDoc.data().name || facilitatorDoc.data().fullName,
            changes: {
                status: {
                    from: ticket.status,
                    to: 'resolved'
                }
            },
            resolution: updates.resolution
        });
        
        await updateDoc(ticketRef, updates);
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({ 
            message: 'Ticket has been resolved',
            ticket: { id: updatedTicket.id, ...updatedTicket.data() }
        });
    } catch (error) {
        console.error("Error resolving ticket:", error);
        res.status(400).json({ error: error.message });
    }
};

export const closeTicket = async (req, res) => {
    try {
        // Verify facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }
        
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        
        // Update ticket
        const updates = {
            status: 'closed',
            closedBy: req.user.uid,
            closedAt: new Date().toISOString(),
            closingNotes: req.body.notes || 'Ticket closed',
            updatedAt: new Date().toISOString()
        };
        
        // Add history entry
        const historyRef = collection(db, 'tickets', req.params.id, 'history');
        await addDoc(historyRef, {
            timestamp: new Date().toISOString(),
            facilitatorId: req.user.uid,
            facilitatorName: facilitatorDoc.data().name || facilitatorDoc.data().fullName,
            changes: {
                status: {
                    from: ticket.status,
                    to: 'closed'
                }
            },
            closingNotes: updates.closingNotes
        });
        
        await updateDoc(ticketRef, updates);
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({ 
            message: 'Ticket has been closed',
            ticket: { id: updatedTicket.id, ...updatedTicket.data() }
        });
    } catch (error) {
        console.error("Error closing ticket:", error);
        res.status(400).json({ error: error.message });
    }
};

export const deleteTicket = async (req, res) => {
            try {
                // Check if user is a facilitator or super admin
                let userRole = '';
                let useName = '';
                
    
                const facilitatorRef = doc(db, 'facilitators', req.user.uid);
                const facilitatorDoc = await getDoc(facilitatorRef);
                const user = facilitatorDoc.data();
                
                if (facilitatorDoc.exists()) {
                    userRole = user.role ;
                    useName = user.name || user.fullName;
                } 
                
                
                if (!facilitatorDoc.exists()) {
                    return res.status(403).json({ 
                        error: 'Unauthorized: Only facilitators and super admins can delete tickets' 
                    });
                }
                
                const ticketRef = doc(db, 'tickets', req.params.id);
                const ticketDoc = await getDoc(ticketRef);
                
                if (!ticketDoc.exists()) {
                    return res.status(404).json({ error: 'Ticket not found' });
                }
                
                // Delete the ticket
                await deleteDoc(ticketRef);
                
                res.json({
                    message: `Ticket has been deleted successfully by ${userRole}, ${useName} `,
                    ticketId: req.params.id
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        };

export const reassignTicket = async (req, res) => {
    try {
        // Verify facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }
        
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = ticketDoc.data();
        
        // Check if new assignee exists
        const newAssigneeId = req.body.assigneeId;
        if (!newAssigneeId) {
            return res.status(400).json({ error: 'New assignee ID is required' });
        }
        
        const newAssigneeRef = doc(db, 'facilitators', newAssigneeId);
        const newAssigneeDoc = await getDoc(newAssigneeRef);
        
        if (!newAssigneeDoc.exists()) {
            return res.status(404).json({ error: 'New assignee not found' });
        }
        
        const newAssigneeName = newAssigneeDoc.data().name || newAssigneeDoc.data().fullName || 'Unknown';
        
        // Update ticket
        const updates = {
            assignedTo: newAssigneeId,
            assignedAt: new Date().toISOString(),
            assigneeName: newAssigneeName,
            updatedAt: new Date().toISOString()
        };
        
        // Add history entry
        const historyRef = collection(db, 'tickets', req.params.id, 'history');
        await addDoc(historyRef, {
            timestamp: new Date().toISOString(),
            facilitatorId: req.user.uid,
            facilitatorName: facilitatorDoc.data().name || facilitatorDoc.data().fullName,
            changes: {
                assignedTo: {
                    from: ticket.assignedTo || 'none',
                    to: newAssigneeId
                },
                assigneeName: {
                    from: ticket.assigneeName || 'none',
                    to: newAssigneeName
                }
            }
        });
        
        await updateDoc(ticketRef, updates);
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({ 
            message: `Ticket reassigned to ${newAssigneeName}`,
            ticket: { id: updatedTicket.id, ...updatedTicket.data() }
        });
    } catch (error) {
        console.error("Error reassigning ticket:", error);
        res.status(400).json({ error: error.message });
    }
};

export const getTicketStats = async (req, res) => {
    try {
        // Verify facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }
        
        const ticketsRef = collection(db, 'tickets');
        const ticketDocs = await getDocs(ticketsRef);
        
        const tickets = ticketDocs.docs.map(doc => doc.data());
        
        // Calculate stats
        const stats = {
            total: tickets.length,
            byStatus: {
                open: tickets.filter(t => t.status === 'open').length,
                inProgress: tickets.filter(t => t.status === 'inProgress').length,
                resolved: tickets.filter(t => t.status === 'resolved').length,
                closed: tickets.filter(t => t.status === 'closed').length
            },
            byPriority: {
                low: tickets.filter(t => t.priority === 'low').length,
                medium: tickets.filter(t => t.priority === 'medium').length,
                high: tickets.filter(t => t.priority === 'high').length,
                urgent: tickets.filter(t => t.priority === 'urgent').length
            },
            assignedToMe: tickets.filter(t => t.assignedTo === req.user.uid).length,
            unassigned: tickets.filter(t => !t.assignedTo).length,
            resolvedByMe: tickets.filter(t => t.resolvedBy === req.user.uid).length
        };
        
        // Add category stats if available
        const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];
        stats.byCategory = {};
        categories.forEach(category => {
            stats.byCategory[category] = tickets.filter(t => t.category === category).length;
        });
        
        res.json(stats);
    } catch (error) {
        console.error("Error getting ticket stats:", error);
        res.status(500).json({ error: error.message });
    }
};