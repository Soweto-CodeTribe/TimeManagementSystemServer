import express from 'express';
// import { authenticateUser } from '../middleware/auth.js';
import { verifyToken } from "../utilities/index.js";
import {
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket
} from '../controllers/ticketManageController.js';
import {
    createTicket,
    getMyTickets,
    getMyTicketById,
    updateMyTicket,
    cancelMyTicket,
    deleteMyTicket
  } from '../controllers/ticketTrainee.js';

const router = express.Router();

// Facilitator ticket management routes
router.get('/', verifyToken, getAllTickets);
router.get('/:id', verifyToken, getTicketById);
router.put('/:id', verifyToken, updateTicket);
router.delete('/:id', verifyToken, deleteTicket);

// Trainee ticket routes
// router.post('/', verifyToken, createTicket);
// router.get('/my-tickets/:traineeId?', verifyToken, getMyTickets);
// router.get('/my-tickets/:id', verifyToken, getMyTicketById);
// router.put('/my-tickets/:id', verifyToken, updateMyTicket);
// router.post('/my-tickets/:id/cancel', verifyToken, cancelMyTicket);
// router.delete('/my-tickets/:id', verifyToken, deleteMyTicket);

//get specific trainee's tickets
router.get('/trainee/:traineeId/tickets', verifyToken, getMyTickets);

// Operations on a specific ticket
router.get('/my-tickets/:id', verifyToken, getMyTicketById);
router.put('/my-tickets/:id', verifyToken, updateMyTicket);
router.post('/my-tickets/:id/cancel', verifyToken, cancelMyTicket);
router.delete('/my-tickets/:id', verifyToken, deleteMyTicket);

export default router;