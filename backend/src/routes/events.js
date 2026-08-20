const express = require('express');
const router = express.Router();
const {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getEventsStats
} = require('../controllers/eventsController');
const { authenticate } = require('../middleware/auth');
const { validateEvent, validateEventUpdate } = require('../middleware/validation');
const { filterByAssignments, validateAssignmentAccess, addAssignmentContext } = require('../middleware/assignmentMiddleware');

// Apply authentication to all routes
router.use(authenticate);

// Add assignment context to all routes
router.use(addAssignmentContext());

// Events CRUD routes
router.get('/', filterByAssignments(), getEvents); // Add assignment filtering for event listings
router.post('/', validateEvent, createEvent);
router.get('/stats', getEventsStats);
router.get('/:id', validateAssignmentAccess('read'), getEvent); // Validate assignment access for individual events
router.put('/:id', validateAssignmentAccess('update'), validateEventUpdate, updateEvent);
router.delete('/:id', validateAssignmentAccess('delete'), deleteEvent);

// Event registration
router.post('/:id/register', validateAssignmentAccess('read'), registerForEvent);

module.exports = router;