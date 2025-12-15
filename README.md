כיוונון -i3dad – إعداد
Description
i3dad is a bilingual (Arabic–Hebrew) academic orientation application implemented using React Native and Expo.
The system provides a personalized assessment flow based on a structured questionnaire and maps user responses to recommended academic study domains.
The application is designed as a proof of concept, focusing on frontend logic, data modeling, and system architecture.

Features
Structured personality and interest questionnaire (30 questions, multi-dimensional)
Domain matching logic with ranked recommendations
Academic field and institution information modules
Success stories module
Multi-language support (i18n)
User authentication via Supabase

Tech Stack
Frontend: React Native, Expo
Language: JavaScript (primary), TypeScript (partial)
Navigation: React Navigation
Backend & Auth: Supabase
Database: PostgreSQL
Build Tools: Node.js, npm, Webpack, Babel

Project Structure:
components/    Reusable UI components  
screens/       Application screens  
services/      Business logic and assessment services  
contexts/      Global state management  
database/      SQL schema and tables  
i18n/          Localization files  

Setup:
npm install
npx expo start

Status:
This project is under active development and currently serves as an academic and technical proof of concept.