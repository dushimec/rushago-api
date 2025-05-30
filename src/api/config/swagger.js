import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RushaGO API Docs',
      version: '1.0.0',
      description: `RushaGO is a comprehensive backend API for a ride-hailing and delivery platform. 
It provides endpoints for user registration and authentication, ride booking, driver management, 
real-time tracking, payment processing, and order delivery. The API is designed to support both 
passenger and driver mobile applications, as well as admin dashboards. Features include:

- User and driver onboarding
- Secure authentication and authorization
- Ride and delivery request management
- Real-time location tracking and status updates
- Fare calculation and payment integration
- Ratings and feedback system
- Admin controls and analytics

This documentation covers all available endpoints, request/response formats, authentication requirements, 
and error handling conventions for seamless integration with RushaGO services.`,
    },
  },
  apis: [path.resolve('src/api/routes/*.js')],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};