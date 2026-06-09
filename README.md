Shakey's Delivery SystemA hybrid ordering and delivery system for Shakey's with:
a web app built with Next.js + React + TypeScript
an Android app built with Kotlin in Android Studio Iguana
Firebase for authentication, Firestore, and shared live order data
MySQL for legacy/admin data that still exists on the web side
Project StructureWeb AppLocation:
C:\Users\joseph\OneDrive\Desktop\shakeys
Main stack:
Next.js 16
React 19
TypeScript
Firebase Web SDK
Firebase Admin SDK
MySQL (mysql2)
Android AppLocation:
C:\android studio projects\shakeys-delivery
Main stack:
Kotlin
Android Studio Iguana
Firebase Auth
Firestore
Firebase Storage
Firebase Functions
Hilt
Navigation Component
View Binding
Current ScopeWebThe web app currently handles:
customer registration and login
customer checkout and order tracking
general admin
branch admin
employee order handling
rider web dashboard
branch and menu management
AndroidThe Android app is intentionally focused on:
customer flow
rider flow
Admin and employee management are handled on the web side.
Order FlowDeliveryPending -> Order_Accepted -> Preparing -> Ready_For_Delivery -> In_Transit -> Completed
Dine-inPending -> Order_Accepted -> Preparing -> Completed
TakeoutCheck the current employee logic before changing this flow further.
RequirementsWebInstall:
Node.js 20+
npm
MySQL
Firebase project with Firestore/Auth/Storage enabled
AndroidInstall:
Android Studio Iguana
Android SDK for the project build
JDK supported by Android Studio
a Firebase project matching the web app
Web SetupOpen the web project folder:C:\Users\joseph\OneDrive\Desktop\shakeys

Install dependencies:npm install

Create .env.local using .env.example
Fill in your Firebase and MySQL values
Make sure your MySQL database exists
Start the web app:npm run dev

Environment VariablesUse `.env.example` as the template.
Important groups:
NEXT_PUBLIC_FIREBASE_* for the web client
FIREBASE_ADMIN_* for Firestore admin scripts and secure server operations
MYSQL_* for the web app database helper
DB_* for the Firestore sync scripts
