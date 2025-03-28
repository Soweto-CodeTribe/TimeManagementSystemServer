// import express from 'express';
// import { authenticateUser } from '../middleware/auth.js';
// import { verifyToken } from "../utilities/index.js";
// import {
//   getAllTickets,
//   getTicketById,
//   updateTicket,
//   deleteTicket
// } from '../controllers/ticketManageController.js';
// import {
//     createTicket,
//     getMyTickets,
//     getMyTicketById,
//     updateMyTicket,
//     cancelMyTicket,
//     deleteMyTicket
//   } from '../controllers/ticketTrainee.js';

// const router = express.Router();

// // Facilitator ticket management routes
// router.get('/', verifyToken, getAllTickets);
// router.get('/:id', verifyToken, getTicketById);
// router.put('/:id', verifyToken, updateTicket);
// router.delete('/:id', verifyToken, deleteTicket);

// // Trainee ticket routes
// // router.post('/', verifyToken, createTicket);
// // router.get('/my-tickets/:traineeId?', verifyToken, getMyTickets);
// // router.get('/my-tickets/:id', verifyToken, getMyTicketById);
// // router.put('/my-tickets/:id', verifyToken, updateMyTicket);
// // router.post('/my-tickets/:id/cancel', verifyToken, cancelMyTicket);
// // router.delete('/my-tickets/:id', verifyToken, deleteMyTicket);

// //get specific trainee's tickets
// router.get('/trainee/:traineeId/tickets', verifyToken, getMyTickets);
// router.post('/', verifyToken, createTicket);
// // Operations on a specific ticket
// router.get('/my-tickets/:id', verifyToken, getMyTicketById);
// router.put('/my-tickets/:id', verifyToken, updateMyTicket);
// router.post('/my-tickets/:id/cancel', verifyToken, cancelMyTicket);
// router.delete('/my-tickets/:id', verifyToken, deleteMyTicket);

// export default router;

import express from 'express';
import { verifyToken } from "../utilities/index.js";
import {
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  resolveTicket,
  closeTicket,
  reassignTicket,
  getTicketStats
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
router.get('/stats', verifyToken, getTicketStats);
router.get('/:id', verifyToken, getTicketById);
router.put('/:id', verifyToken, updateTicket);
router.post('/:id/resolve', verifyToken, resolveTicket);
router.post('/:id/close', verifyToken, closeTicket);
router.post('/:id/reassign', verifyToken, reassignTicket);
router.delete('/:id', verifyToken, deleteTicket);

// Trainee ticket routes
router.get('/trainee/:traineeId/tickets', verifyToken, getMyTickets);
router.post('/', verifyToken, createTicket);
// Operations on a specific ticket
router.get('/my-tickets/:id', verifyToken, getMyTicketById);
router.put('/my-tickets/:id', verifyToken, updateMyTicket);
router.post('/my-tickets/:id/cancel', verifyToken, cancelMyTicket);
router.delete('/my-tickets/:id', verifyToken, deleteMyTicket);

export default router;