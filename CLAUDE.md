# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a "Right or Left" voting system for educational presentations. The system enables:
- Teachers to present two-choice questions (left side vs right side options)
- Students to vote online for their preferred choice
- Teachers to display voting results in real-time

The project requirements are documented in RPD.md (in Japanese).

## Commands

### Development
- `npm install` - Install dependencies
- `npm start` - Start the server (default port: 3000)
- `PORT=8080 npm start` - Start server on custom port

### Testing the Application
- Access presenter interface: `http://localhost:3000/presenter`
- Access student interface: `http://localhost:3000/student`
- Main page: `http://localhost:3000`

## Architecture

### Technology Stack
- **Backend**: Node.js + Express
- **Real-time Communication**: WebSocket (ws library)
- **Frontend**: Vanilla JavaScript (no framework)

### System Architecture

The application uses WebSocket for bidirectional real-time communication:

1. **Server (`server.js`)**
   - Manages WebSocket connections for presenters and students
   - Maintains voting state (active status, vote counts, voter tracking)
   - Prevents duplicate voting using Set-based voter tracking
   - Broadcasts updates to appropriate client groups

2. **Client Roles**
   - **Presenter** (`presenter.html`): Controls voting sessions, views real-time vote counts, displays results
   - **Student** (`student.html`): Submits votes, views results when revealed

3. **Message Types**
   - `register_presenter` / `register_student` - Client registration
   - `start_voting` - Initiates new voting session
   - `vote` - Student submits choice (left/right)
   - `vote_update` - Server sends vote count to presenters
   - `show_results` - Presenter reveals results to all clients
   - `reset` - Clears voting session

### Key Implementation Details

- **Duplicate Vote Prevention**: Each student gets a unique ID stored in localStorage, tracked server-side in a Set
- **Auto-reconnection**: Clients automatically reconnect on disconnect with 3-second retry
- **State Synchronization**: New connections receive current voting state
- **Responsive Design**: CSS flexbox layouts adapt to mobile/desktop
