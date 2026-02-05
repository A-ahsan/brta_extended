# Chapter 6
## Testing

In this chapter, the author outlines the two primary categories of automated tests which are employed in BRTA 2.0 system in order to guarantee reliability, accuracy, and quality user experience.

### 6.1 API Testing
**Framework:** Python, pytest
**Intention:** Checks the health of backend API along with endpoint availability, response header and the configuration of CORS.
**Process:** Tests are secure and are not elemental (do not update data). Pytest is used to test and produce Excel and HTML reports. Examples of these tests are server availability, response time, checking of header and CORS verification.
**Reporting:** Visual results, condition, and time are recorded when a specific test is run.

### 6.2 Selenium UI Testing
**Framework:** Python, pytest, Selenium WebDriver.
**Purpose:** Tools Browser-based user flows are automatable To be tested On the end-to-end testing.
**Process:** Includes authentication, licencing application, payment, booking, and so on. Processes user actions (was clicks and form fills) and verifies responses of the UI. Captures screen shots and records the results of every test step. Produces test result Excel reports.
**Example Scenarios:** Login and signup flow, Password reset, Applications and renewal of license, Licensing and payment of digital license, Reserving and scheduling physical examination appointments.

### 6.3 Test Coverage and Quality
**Coverage:** Both API and UI tests are concerned with essential modules (authentication, payments, chatbot, booking and so on).
**Continuous Testing:** Automated tests are executing at the regular periods and at every monumental update, to identify the regressions at an early stage.
**Bug Tracking:** During the testing process, the issues are reported in GitHub Issues and addressed before launch.


