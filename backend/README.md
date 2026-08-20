# CampusBuddy Backend API

A comprehensive student management system backend API built with Node.js, Express.js, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Academic Management**: Attendance tracking, marks management, CGPA/SGPA calculation
- **Events Management**: Campus events with targeting and registration
- **Notes Sharing**: File upload/download with content moderation
- **Forum System**: Q&A platform with voting and reputation
- **Notifications**: Targeted notifications with real-time delivery
- **Security**: Rate limiting, input validation, and comprehensive error handling

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: MongoDB 6.x with Mongoose ODM
- **Caching**: Redis 7.x
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Joi
- **Testing**: Jest + Supertest

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB 6.x
- Redis 7.x (optional for development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

### API Documentation

Once the server is running, visit `http://localhost:5000/api-docs` for interactive API documentation.

## Project Structure

```
src/
├── config/          # Database and Redis configuration
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── utils/           # Utility functions
└── server.js        # Main server file
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/avatar` - Upload avatar
- `GET /api/users/search` - Search users

### Academic
- `GET /api/academic/records` - Get academic records
- `GET /api/academic/attendance` - Get attendance
- `GET /api/academic/marks` - Get marks
- `PUT /api/academic/attendance/:subjectId` - Update attendance
- `PUT /api/academic/marks/:subjectId` - Update marks

### Events
- `GET /api/events` - Get events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `POST /api/events/:id/register` - Register for event

### Notes
- `GET /api/notes` - Get notes
- `POST /api/notes` - Upload note
- `GET /api/notes/:id/download` - Download note

### Forum
- `GET /api/forum/questions` - Get questions
- `POST /api/forum/questions` - Create question
- `POST /api/forum/questions/:id/answers` - Add answer
- `POST /api/forum/questions/:id/vote` - Vote on question

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

## License

This project is licensed under the ISC License.