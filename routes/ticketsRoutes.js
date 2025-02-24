import express from 'express';
// import { authenticateUser } from '../middleware/auth.js';
import { verifyToken } from "../utilities/index.js";
import {
  getAllTickets,
  getTicketById,
  updateTicket
} from '../controllers/ticketManageController.js';
import {
    createTicket,
    getMyTickets,
    getMyTicketById,
    updateMyTicket,
    cancelMyTicket
  } from '../controllers/ticketTrainee.js';

const router = express.Router();

// Facilitator ticket management routes
router.get('/', verifyToken, getAllTickets);
router.get('/:id', verifyToken, getTicketById);
router.put('/:id', verifyToken, updateTicket);


// Trainee ticket routes
router.post('/', verifyToken, createTicket);
router.get('/my-tickets', verifyToken, getMyTickets);
router.get('/my-tickets/:id', verifyToken, getMyTicketById);
router.put('/my-tickets/:id', verifyToken, updateMyTicket);
router.post('/my-tickets/:id/cancel', verifyToken, cancelMyTicket);

export default router;