import { db } from '../config/firebaseConfig.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    query, 
    where, 
    orderBy
  } from 'firebase/firestore';


  export const getAllTickets = async (req, res) => {
    try {
        // Check if user is a facilitator
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);

        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }

        // Build query constraints
        const constraints = [];
        if (req.query.status) constraints.push(where('status', '==', req.query.status));
        if (req.query.priority) constraints.push(where('priority', '==', req.query.priority));
        if (req.query.assigned === 'true') {
            constraints.push(where('assignedTo', '==', req.user.uid));
        } else if (req.query.assigned === 'false') {
            constraints.push(where('assignedTo', '==', null));
        }
        constraints.push(orderBy('updatedAt', 'desc'));

        // Get tickets
        const ticketsRef = collection(db, 'tickets');
        const q = query(ticketsRef, ...constraints);
        const ticketDocs = await getDocs(q);

        // Fixing the "doc is not a function" error
        const tickets = await Promise.all(ticketDocs.docs.map(async (ticketDoc) => {
            const ticket = { id: ticketDoc.id, ...ticketDoc.data() };

            // Fetch submitter details
            if (ticket.submittedBy) {
                const submitterRef = doc(db, 'users', ticket.submittedBy);
                const submitterDoc = await getDoc(submitterRef);
                if (submitterDoc.exists()) {
                    ticket.submitter = {
                        name: submitterDoc.data().name || null,
                        email: submitterDoc.data().email || null
                    };
                }
            }

            // Fetch assignee details
            if (ticket.assignedTo) {
                const assigneeRef = doc(db, 'facilitators', ticket.assignedTo);
                const assigneeDoc = await getDoc(assigneeRef);
                if (assigneeDoc.exists()) {
                    ticket.assignee = {
                        name: assigneeDoc.data().name || null,
                        email: assigneeDoc.data().email || null
                    };
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
        const ticketRef = doc(db, 'tickets', req.params.id);
        const ticketDoc = await getDoc(ticketRef);
        
        if (!ticketDoc.exists()) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
        // Get submitter and assignee details
        if (ticket.submittedBy) {
            const submitterDoc = await getDoc(doc(db, 'users', ticket.submittedBy));
            ticket.submitter = {
            name: submitterDoc.data()?.name,
            email: submitterDoc.data()?.email
            };
        }
        
        if (ticket.assignedTo) {
            const assigneeDoc = await getDoc(doc(db, 'facilitators', ticket.assignedTo));
            ticket.assignee = {
            name: assigneeDoc.data()?.name,
            email: assigneeDoc.data()?.email
            };
        }
        
        res.json(ticket);
    } catch (error) {
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
        
        // Update allowed fields
        const updates = {
            updatedAt: new Date().toISOString()
        };
        
        if (req.body.status) updates.status = req.body.status;
        if (req.body.priority) updates.priority = req.body.priority;
        
        await updateDoc(ticketRef, updates);
        
        const updatedTicket = await getDoc(ticketRef);
        res.json({ id: updatedTicket.id, ...updatedTicket.data() });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };