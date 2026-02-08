# Chapter 2

![BRTA Home Page](assets/hp.png)

## Project Description

The following chapter is the detailed description of the major functional modules of the BRTA 2.0 system. Each module is created to fulfill a particular need of the transport management ecosystem of Bangladesh to make it efficiently, transparently, and with user satisfaction.

### 2.1 Core Functional Modules

#### 2.1.1 User Authentication and Profile Management

![Admin Login](assets/al.png)
![Police Login](assets/pl.png)
![User Login](assets/ul.png)

**Technical:** Based on secure JWT-based authentication and Supabase as the back-end database. User registrations and logins use user credentials that are validated by registration and logins and assign roles (citizen, staff, police) where access is granted on a fine-grain level. Passwords have been hashed and stored in a secure location; OTP verification is done on password reset and other essential activities. RESTful APIs control user profiles, and role changes and updates are permitted.

**User Interface:** The users are allowed to sign up and also Log in with their mobile number or email address. The system takes them through OTP authentication to enhance security. The profile management process is also user-friendly, wherein an individual is able to change personal details and passwords. There are dedicated dashboards with additional controls on staff and police.

#### 2.1.2 Driving License Management

![License  1](assets/L1.png)
![License  2](assets/L2.png)
![License  3](assets/L3.png)
![License  4](assets/L4.png)
![License  5](assets/L5.png)
![License  6](assets/L6.png)

**Technical:** License application forms contain dynamic validation and support document uploading (PDF/JPG). The calendar API is applied in exam scheduling, which takes physical and online exam slots. Supabase tables hold the license information, and workflow provides statuses. A (server-side) library helps create digital licenses with unique QR codes which are instantly verifiable by scanning.

**User Experience:** The applicants complete a online form, submit documents and choose dates of exams. They are notified regarding applications and test schedule. Past generation- After completion, we can download a digital license, which is instantaneous to verify by the authorities through the QR code. Checking is done automatically through scripts which compare the data submitted and the government records. Status events result in notification events through email/SMS APIs.

#### 2.1.3 Vehicle Registration and Ownership Transfer

![Vehicle Registration 1](assets/v1.png)
![Vehicle Registration 2](assets/v2.png)
![Vehicle Registration 3](assets/v3.png)
![Vehicle Registration 4](assets/v4.png)

**Technical:** These workflows are based on form and document uploading in vehicle registration and ownership transfer modules. Verification automatic Backend scripts are used to compare submitted data against government records. The changes in status cause notification events through email/SMS APIs.

**User Experience:** The user has an option of registering new cars or transferring ownership of the vehicles online by filling in forms and uploading documents. The system reminds them about renewals and checks up on them. Everything is available in the user dashboard.

#### 2.1.4 Route Permit Management

![Route Permit 1](assets/rt1.png)
![Route Permit 2](assets/rt2.png)
![Route Permit 3](assets/rt3.png)

**Technical:** Route permit applications are handled using a multi-step approval workflow, which is operated by Supabase triggers and role-based access. This is then integrated with the police systems through secure REST APIs, and permit validation can be done in real time. Renewal, cancellation is done through updating of permit records and reporting to the concerned parties.

**User Experience:** The transport operators request route permits online, monitor approvals and/or get notifications. BRTA and police employees countercheck permits online and minimize the time spent on paperwork and delays. Renewals and cancellations can be done with a couple of clicks.

#### 2.1.5 Payment Gateway Integration

![Payment Gateway 1](assets/pm.png)
![Payment Gateway 2](assets/pm2.png)

**Technical:** Payments can be done via third-party gateways (SSLCommerz) which have been integrated through secure API end-points. Every single transaction is recorded in Supabase, and electronic receipts are created and sent to the users via email. Service workflows are connected with payment status; in this manner only paid applications could be provided.

**User Experience:** The client can make payments safely and online using their favorite mode of payment. The system has immediate confirmation and online receipts. The user dashboard contains payment history.

#### 2.1.6 Chatbot Assistance

![Chatbot](assets/cbot.png)

**Technical:** The chatbot service in the backend is provided by Gemini 2.5 Flash Lite to achieve quick and affordable AI responses. Handling of session management is done in memory with automatically cleaned up inactive sessions. The chatbot is strict in terms of topic (BRTA-related queries only). Multi-language assistive is added by transmitting the user language preferences to the AI API.

**User Experiences:** It has a chatbot where the users can get real-time assistance and instructions in English and Bangali. Off topic questions To maintain a focus on the conversation, off topic questions are gracefully rejected.

#### 2.1.7 Admin Dashboard

![Admin Dashboard 1](assets/ad.png)
![Admin Dashboard 2](assets/ad1.png)

**Technical:** Built with current frontend frameworks (React) and integrated Supabase to update data in real time. It displays application statistics, approval queues and health metrics of the system and analytics charts and downloadable reports. Only authorized staff will be able to access role management and audit logs.

**User Experience:** BRTA employees can review applications, grant requests and check the systems health on a single dashboard.

#### 2.1.8 Police Portal

![Police Portal 1](assets/pol.png)
![Police Portal 2](assets/pol2.png)

**Technical:** Police officers are subjected to a secure portal allowing them to access secured information based on authentication and other role-centric rules. The process of verification in real-time is made possible through QRane scanning and Supabase record querying. The portal has overlaying search and filtering capabilities to rapidly access vehicle and license information.

**User Experience:** These will allow the police to check licenses, vehicle registrations, and route permits by scan or search of records. The portal is used to simplify roadside checking and enforcement, and minimize paperwork and delays in the manual system.

#### 2.1.9 Notification

![Notification System](assets/nt.png)

**Technical:** Messages are dispatched through high-level email and SMS APIs. Application notification System Backend event triggers and frontend state handling in-app notifications. Form based user feedback is stored and used by the support staff, ticket management is used via Supabase tables.

**User Experience:** It is done through email, texts, and in-app notifications that inform users of the status of an application, timetables, and renewals. They are able to provide feedback or support requests, which are monitored and addressed by the staff through industry standard methods of encryption at rest. Authentication Intermediate and Input Checking Secure the API Endpoints. The system would be in line with the data protection laws in Bangladesh and the system gets subjected to frequent security audits. Ongoing maintenance includes the vulnerability scanning and management of a patch.

