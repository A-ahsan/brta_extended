# Chapter 4
## Authentication and Security

In this chapter, the author describes the authentication processes and security practices that are adopted to enforce user data, user privacy, and system integrity in the BRTA 2.0 system.

### 4.1 Authentication
**User Registration / Login:** Users (citizens, staff, police) can register and log in through the use of their mobile number or email address. Authored credentials are checked against records that are stored in Supabase.

**Password Management:** Hashing of passwords is done before storage. The password change is done through the OTP verification that is sent to the registered contact.

**Session Management:** Secure tokens are used in managing authenticated sessions. Auto-cleanup processes and session time outs serve to eliminate unauthorized access.

**Role-Based Access Control:** Every user receives a role (citizen, staff, police) according to which he/she has a specific access level and access features. Frontend and backend role checks are implemented.

### 4.2 Security Practices
**Data Encryption:** Sensitive data is transmitted and stored encrypted with TLS/SSL and encrypted with AES, respectively.

**Security of API:** API endpoints are secured with Authentication middleware, input validation and CORS policy to minimize cross-site attacks and illegal access.

**Environment Variables:** Environment variables contain secrets called API keys, database credentials among others and are never coded.

**Input Verification and Sanitizing:** The frontend and the backend sanitizing and verifying the inputs minimize risks likes the SQL injection and XSS.

**Audit Logging:** The action and changes which are the most critical are logged to be monitored and analyzed.

**Conformance to laws:** The system complies with data protection laws in Bangladesh, and it is reviewed on a regular basis to ascertain its security levels.

**Automated Cleanup:** In-memory session data and expired tokens are periodically deleted in order to reduce the risk and to enhance the performance.

### 4.3 User Privacy Policy
**Privacy Policy:** Users are educated by a transparent privacy policy about the information they gathered, their usage and our protection of it.

**User Control:** The user is capable of passing information about themselves, as well as altering passwords safely via their own profile dashboard.

**Security Event Notification:** Notices are supplied to users about security-related events, e.g. password alterations or dubious log-in.
