# Avioservis - Project Overview

## Project Summary

Avioservis is a comprehensive aviation service management system with a primary focus on fuel operations management. The application implements a complete fuel lifecycle management system - from intake and storage to distribution, aircraft fueling, and handling excess fuel inventory.

## Technical Architecture

### Backend

- **Framework**: Node.js with Express 5
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication (currently stored in localStorage, planned migration to HttpOnly cookies)
- **Validation**: Express-validator (migration to Zod schema validation in progress)
- **Logging**: Custom logging implementation
- **Error Handling**: Structured error handling with custom middleware

### Frontend

- **Framework**: React with TypeScript
- **Styling**: TailwindCSS with custom component system
- **UI Components**: Custom component library with shadcn/ui inspired design
- **Animation**: Framer Motion for smooth transitions and animations
- **State Management**: React Context API
- **API Communication**: Custom fetch wrapper with authentication
- **Form Handling**: React hooks-based forms

## Core Functionality

### Fuel Management System

The system implements a sophisticated fuel management process with the following flow:

1. **Fuel Intake**: Recording new fuel deliveries with customs declaration (MRN) tracking
2. **Fixed Tank Storage**: Management of fixed storage tanks capacity and inventory
3. **Tank-to-Tank Transfers**: Tracking movement between fixed storage tanks 
4. **Tank-to-Tanker Transfers**: Managing fuel distribution to mobile cisterns/tankers
5. **Aircraft Fueling**: Recording fuel dispensed to aircraft
6. **Excess Fuel Management**: System for handling fuel with zero MRN kg but remaining liters
7. **Density Calculation**: Precise tracking of fuel density for accurate kg/liter conversion
8. **FIFO Implementation**: First-in-first-out processing of fuel based on MRN records

### Operations Management

- Tracking of fuel draining operations
- Reverse operations for returning fuel to tanks
- Fuel sale transactions with third parties
- Equipment maintenance scheduling
- User activity logging and audit trails

## Security Features

The application has several security measures implemented and others planned for enhancement:

### Current Security Implementation

- Authentication middleware for protected routes
- Role-based access control
- Rate limiting for critical endpoints
- Input validation on API endpoints
- Database query security with parameterized queries via Prisma
- Secure password storage with bcryptjs

### Security Improvement Plan

As outlined in the SECURITY_IMPROVEMENT_PLAN.md document, several security enhancements are in progress:

1. **Input Validation**: Migration from express-validator to Zod for more robust schema-based validation
2. **File Upload Security**: Moving uploaded files to private storage and implementing authorized access only
3. **HttpOnly Cookies**: Replacing localStorage JWT storage with secure HttpOnly cookies
4. **Security Headers**: Implementation of Helmet and Content Security Policy (CSP)
5. **CORS Configuration**: Strict CORS settings based on environment variables
6. **Rate Limiting**: Implementation complete for critical endpoints

## Visual Design

- **Modern UI**: Clean, professional interface with consistent spacing and typography
- **Responsive Design**: Mobile-friendly layouts that adapt to different screen sizes
- **Interactive Elements**: Animated transitions and feedback using Framer Motion
- **Component System**: Consistent UI elements using a custom component library
- **Data Visualization**: Tables and charts for operational data representation
- **Modal Dialogs**: Context-preserving modal workflows for complex operations

## Project Structure

```
avioservis/
│
├── backend/
│   ├── src/
│   │   ├── controllers/     # Business logic handlers
│   │   ├── middleware/      # Request processing middleware
│   │   ├── routes/          # API endpoint definitions
│   │   ├── schemas/         # Data validation schemas
│   │   ├── services/        # Reusable business logic
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper functions
│   │   ├── validators/      # Input validation rules
│   │   ├── app.ts           # Express application setup
│   │   └── db.ts            # Database connection
│   │
│   └── prisma/              # Database schema and migrations
│
├── frontend/
│   ├── src/
│   │   ├── app/             # App initialization and routing
│   │   ├── components/      # UI components
│   │   │   ├── ui/          # Basic UI elements
│   │   │   └── fuel/        # Fuel management components
│   │   ├── contexts/        # React context providers
│   │   ├── lib/             # Utility functions and API clients
│   │   └── types/           # TypeScript type definitions
│   │
│   ├── public/              # Static assets
│   └── tailwind.config.js   # TailwindCSS configuration
│
├── docs/                    # Project documentation
└── ...
```

## Development Practices

- TypeScript for type safety across the entire codebase
- Prisma for type-safe database access
- Comprehensive logging throughout the application
- Transaction management for data consistency
- Density calculations and conversions for accurate fuel measurement
- Error handling with detailed feedback

## Audit and Improvement Plans

The system has undergone audit processes that identified several areas for improvement, particularly in the fuel management system:

1. Enhanced logging for critical operations
2. Improved transaction management
3. Standardization of density calculations
4. Robust reconciliation for KG/Liter discrepancies
5. Centralized FIFO service implementation
6. Synchronization improvements between components
7. Standardized data structures for MRN breakdown

## Dependencies

**Production**:
- @prisma/client: Database ORM
- bcryptjs: Password hashing
- dayjs: Date manipulation
- express: Web framework
- express-validator: Input validation (being replaced with Zod)
- framer-motion: Animation library
- nodemon: Development server
- ts-node: TypeScript execution
- typescript: Type checking
- uuid: Unique ID generation

**Development**:
- @types packages for TypeScript definitions
- autoprefixer, postcss, tailwindcss: CSS processing
- prisma: Database schema management

## Testing and Deployment

- Deployment documentation available in DEPLOYMENT.md
- Fuel management tasks and improvement plans documented in separate files
