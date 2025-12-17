# Adaptive SQL Learning Feedback System

An intelligent full-stack learning system that analyzes **SQL errors** and **typing patterns** to deliver **adaptive learning feedback**.

This project integrates **React + Flask + Firebase + behavioral analytics** to provide personalized SQL learning support based on both correctness and human-computer interaction signals.

## Key Features

-  **Interactive SQL Practice**
  - Multiple SQL questions 
  - Built-in database schema reference
  - Fixed attempt limits per question

-  **Typing Behavior Capture**
  - Keystroke-level event tracking
  - Average dwell time & flight time
  - Typing speed (keys/sec)
  - Backspace and delete rates

-  **Learner Profile**
  - Behavior-based learner clustering
  - Per-question learner type inference
  - Persona-based encouragement and insights

-  **LLM-Assisted Feedback**
  - SQL error type and subtype detection
  - Personalized feedback for incorrect attempts

-  **Session Management**
  - Attempt tracking per question
  - Retry / quit logic
  - Full session lifecycle handling

## Tech Stack
### Frontend
- React 
- TypeScript
- Firebase SDK

### Backend
- Flask
- RESTful APIs
- Session and attempt management

### Database & Cloud
- Firebase Firestore

## App Link: https://adaptive-sql-learning.vercel.app/

