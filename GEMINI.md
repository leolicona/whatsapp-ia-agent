# Project Analysis: whatsapp-ia-agent

This document provides an analysis of the `whatsapp-ia-agent` project to facilitate future development sessions.

## Project Overview

- **Project Name:** `whatsapp-ia-agent`
- **Description:** A Cloudflare Worker application that functions as a WhatsApp AI agent. It is built using the Hono web framework.
- **Key Technologies:**
    - **Runtime:** Cloudflare Workers
    - **Web Framework:** Hono
    - **Language:** TypeScript
    - **Testing:** Vitest
    - **CLI:** Wrangler
    - **Schema Validation:** Zod
    - **AI:** Google Gemini AI SDK (`@google/generative-ai`)

## Project Structure

The project is organized as follows:

- **`src/index.ts`**: The main entry point of the application. It initializes the Hono app, applies middleware, and sets up routes.
- **`src/core/`**: This directory contains the core business logic of the application.
    - **`src/core/ia/`**: Handles the integration with the Google Gemini AI.
    - **`src/core/whatsapp/`**: Manages interactions with the WhatsApp API.
- **`src/middleware/`**: Contains Hono middleware for various functionalities such as CORS, security headers, rate limiting, and error handling.
- **`src/routes/`**: Defines the application's API routes.
    - **`src/routes/webhook/`**: Handles incoming WhatsApp webhooks. It utilizes a Durable Object (`WebhookProcessor`) for stateful processing of these webhooks.
- **`tests/`**: Contains the test suite for the application.
- **`wrangler.jsonc`**: The configuration file for the Cloudflare Worker. It specifies Durable Objects, migrations, and other necessary resources.
- **`package.json`**: Lists the project's dependencies and defines the available scripts.
- **`tsconfig.json`**: The configuration file for the TypeScript compiler.
- **`vitest.config.ts`**: The configuration file for the Vitest testing framework.

## Core Functionality

- The application exposes a `/webhook` endpoint to receive and process messages from WhatsApp.
- It uses a Cloudflare Durable Object (`WebhookProcessor`) to handle the stateful processing of incoming webhooks. This is an effective pattern for managing state in a serverless architecture.
- The application integrates with the Google Gemini AI to generate intelligent responses to the WhatsApp messages it receives.
- It leverages Hono middleware to address common web application requirements, including security, CORS, and rate limiting.

## Development and Deployment

The following scripts are available in `package.json`:

- **`npm install`**: Installs the project's dependencies.
- **`npm run dev`**: Starts the application in development mode using Wrangler.
- **`npm run deploy`**: Deploys the application to the Cloudflare network.
- **`npm test`**: Executes the project's test suite.
