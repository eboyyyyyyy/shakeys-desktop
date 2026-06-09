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
Android SetupOpen Android Studio
Open:C:\android studio projects\shakeys-delivery

Let Gradle sync finish
Make sure google-services.json is present in the app module
Run the app on an emulator or real device
Android Build InfoFrom the current app config:
applicationId: com.example.shakeys
compileSdk: 36
targetSdk: 34
minSdk: 25
Firebase SetupThe project expects:
Firestore enabled
Email/Password Auth enabled
Storage enabled
Firestore rules published
reference collections populated:users
memberships
branches
menuItems
orders
riders

Firestore RulesThe web and Android apps depend on the rules in:
firestore.rules
Publish rules with:
firebase deploy --only firestore:rules
Reference Data SyncIf your web admin created data in MySQL but Android cannot see it yet, sync MySQL reference data into Firestore.
Available scripts:
npm run seed:menu
npm run sync:reference-data
These are useful for populating:
menuItems
branches
Useful CommandsWebnpm run dev
npm run build
npm run start
npm run check
AndroidFrom the Android project folder:
./gradlew.bat :app:compileDebugKotlin --no-daemon
Final Checks Before PushingRecommended checks:
Webnpm run check
npm run build
Androidcompile the app in Android Studio
or run:./gradlew.bat :app:compileDebugKotlin --no-daemon

GitHub Safety NotesDo not commit:
.env.local
Firebase service account JSON files
real API keys or passwords
generated build folders like .next or node_modules
This repo already includes a .gitignore, but always double-check before pushing.
Known NotesThe web app still contains some hybrid behavior because some legacy admin data is still in MySQL.
The Android app reads Firebase directly and does not rely on the web API routes.
The web admin auth still uses a lightweight header-based flow in some places, which is acceptable for school/demo use but not production-grade security.
Suggested Demo FlowWebCreate branches and staff on the web admin side
Manage menu items on the web admin side
Create or update riders/employees from the branch admin page
Accept and process orders from the employee page
AndroidRegister or log in as customer
Browse menu
Place order
Track order
Log in as rider
Confirm pickup and delivery
Author NotesThis project was prepared for a school/demo environment, with the customer and rider experience prioritized on Android and full operations/admin features handled mainly on the web.
