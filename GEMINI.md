# Project Analysis: whatsapp-ia-agent

This document provides an analysis of the `whatsapp-ia-agent` project to facilitate future development sessions.

## Project Overview

- **Project Name:** `whatsapp-ia-agent`
- **Description:** A Cloudflare Worker application that functions as a WhatsApp AI agent. It is built using the Hono web framework.
- **Key Technologies:**
    - **Runtime:** Cloudflare Workers
    - **Web Framework:** Hono
    - **Language:** TypeScript
    - **Database:** Cloudflare D1
    - **Schema Validation:** Zod
    - **AI:** Google Gemini AI SDK (`@google/generative-ai`)
    - **Testing:** Vitest
    - **CLI:** Wrangler

## Project Structure

The project is organized as follows:

- **`src/index.ts`**: The main entry point of the application. It initializes the Hono app, applies middleware, and sets up routes.
- **`src/core/`**: This directory contains the core business logic of the application.
    - **`src/core/ai/`**: Handles the integration with the Google Gemini AI, including function calling and prompt management.
    - **`src/core/database/`**: Manages interactions with the Cloudflare D1 database, including services for users, businesses, and messages.
    - **`src/core/whatsapp/`**: Manages interactions with the WhatsApp API.
- **`src/middleware/`**: Contains Hono middleware for various functionalities such as CORS, security headers, rate limiting, and error handling.
- **`src/routes/`**: Defines the application's API routes.
    - **`src/routes/webhook/`**: Handles incoming WhatsApp webhooks. It utilizes a Durable Object (`WebhookProcessor`) for stateful processing of these webhooks.
- **`tests/`**: Contains the test suite for the application.
- **`wrangler.jsonc`**: The configuration file for the Cloudflare Worker. It specifies Durable Objects, D1 databases, and other necessary resources.
- **`package.json`**: Lists the project's dependencies and defines the available scripts.
- **`tsconfig.json`**: The configuration file for the TypeScript compiler.
- **`vitest.config.ts`**: The configuration file for the Vitest testing framework.

## Core Functionality

- The application exposes a `/webhook` endpoint to receive and process messages from WhatsApp.
- It uses a Cloudflare Durable Object (`WebhookProcessor`) to handle the stateful processing of incoming webhooks. This is an effective pattern for managing state in a serverless architecture.
- The application integrates with the Google Gemini AI to generate intelligent responses to the WhatsApp messages it receives. It uses a sophisticated function-calling mechanism to allow the AI to interact with external tools.
- It leverages Hono middleware to address common web application requirements, including security, CORS, and rate limiting.
- The application uses Cloudflare D1 as its database to store information about users, businesses, and messages.

## Development and Deployment

The following scripts are available in `package.json`:

- **`npm install`**: Installs the project's dependencies.
- **`npm run dev`**: Starts the application in development mode using Wrangler.
- **`npm run deploy`**: Deploys the application to the Cloudflare network.
- **`npm test`**: Executes the project's test suite.

## Tool Analysis

### `checkfreeBussyAndSchedule.ts`

This tool is responsible for checking appointment availability and booking new appointments. It is a critical component of the AI agent's scheduling capabilities.

**Key Features:**

- **Dynamic Availability Check:** The tool can check for availability in two ways:
    1. **Specific Time Slot:** If the user provides a specific day and time, the tool checks if that exact slot is available.
    2. **Full Day Scan:** If the user only provides a day, the tool scans the entire day and returns all available slots.
- **Automated Booking:** If a requested time slot is available, the tool can automatically book the appointment by creating a new event in the Google Calendar.
- **Natural Language Date Parsing:** The tool can understand and process natural language dates, such as "today," "tomorrow," and "next monday."
- **Configurable Services:** The tool is designed to work with multiple calendar services, each with its own settings for business hours, appointment duration, and Google Calendar ID.

**Workflow:**

1. **Input:** The tool takes the desired day, an optional time, and the service name as input.
2. **Configuration:** It fetches the relevant calendar service configuration from the database.
3. **Availability Check:** It checks the Google Calendar for free/busy times within the specified window.
4. **Booking/Suggestions:**
    - If a specific time is requested and available, it books the appointment.
    - If no time is specified or the requested time is unavailable, it returns a list of suggested time slots.

This tool is essential for enabling the AI agent to handle the entire appointment scheduling process, from checking availability to confirming the booking.

### `listEvents.ts`

This tool is responsible for retrieving a list of calendar events for a specific service. It is a versatile tool that can be used to get a general overview of upcoming appointments or to find specific events within a given timeframe.

**Key Features:**

- **Flexible Timeframes:** The tool can retrieve events for a variety of timeframes, including:
    - **Smart Default:** By default, it fetches events for the next 14 days.
    - **Natural Language:** It understands natural language queries such as "today," "tomorrow," "this week," "next week," and specific days of the week.
- **Service-Specific:** The tool retrieves events for a specific calendar service, which is determined by the `serviceName` parameter.
- **Detailed Output:** The tool returns a rich set of information for each event, including the event ID, title, description, start and end times, location, and a list of attendees.

**Workflow:**

1. **Input:** The tool takes a `serviceName` and an optional `timeFrame` as input.
2. **Configuration:** It fetches the `googleCalendarId` for the specified service from the database.
3. **Timeframe Parsing:** It parses the `timeFrame` input to determine the start and end times for the event search.
4. **Event Retrieval:** It calls the `listEvents` function from the Google Calendar service to retrieve the events.
5. **Output:** It returns a formatted list of events that fall within the specified timeframe.