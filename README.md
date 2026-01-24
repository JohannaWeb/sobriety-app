# Sobriety App (Narcotics Anonymous Support)

A full-stack application for managing sobriety, journals, meetings, and forums for NA support. Built with Angular (Frontend) and Node.js/Express (Backend).

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### 🛠️ Environment Setup

1. **Frontend**: The frontend connects to the backend running at `http://localhost:3001` (proxied in dev).
2. **Backend**: Requires a `.env` file in the root directory.

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your secrets:

```env
JWT_SECRET=your-strong-secret-key
OPENVIDU_URL=https://your-openvidu-server
OPENVIDU_SECRET=your-openvidu-secret
```

> **Note**: For local development, there is a default `.env` provided, but you should update the secrets for production context.

### 🏃 Running the Application

To start both Backend and Frontend concurrently:

```bash
npm start
```

This will run:
- Frontend at: http://localhost:4201
- Backend at: http://localhost:3001

## 📂 Project Structure

- `src/` - Angular Frontend source
- `backend/` - Node.js/Express Backend source
- `backend/middleware/` - Security and utility middleware
- `backend/routes/` - API Routes (coming soon)

## 🔒 Security

This application implements several security features:
- JWT Authentication with Refresh Tokens
- Rate Limiting on API endpoints
- Helmet for secure HTTP headers
- Input Validation using express-validator
- Centralized Error Handling

## Development server

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

To start a local development server for frontend only, run:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Screenshots

<img width="2555" height="454" alt="image" src="https://github.com/user-attachments/assets/78a13830-4f13-4a3b-85b3-88fb2dea0717" />
<img width="2558" height="1091" alt="image" src="https://github.com/user-attachments/assets/473e41a5-5161-4697-9363-402524213c2a" />
<img width="2556" height="627" alt="image" src="https://github.com/user-attachments/assets/da8071ec-fea6-44f5-b65b-753107d5feac" />



