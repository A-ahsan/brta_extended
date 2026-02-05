# Chapter 5
## Version Control and Collaboration

This chapter describes the version control system and collaboration practices used by the BRTA 2.0 development team to ensure code quality, traceability, and efficient teamwork.

### 5.1 Version Control System
- **System Used:** Git is used for distributed version control, with all code hosted on GitHub.
- **Repositories:** The project consists of a main code repository and a separate design repository, both linked for seamless development and UI/UX integration.
- **Branching Strategy:**
  - `main` branch for ongoing development and integration.
  - `deployment-ready` branch for stable releases and production deployment.
  - Feature and bugfix branches are created for individual tasks and merged after review.
- **Commit Practices:**
  - Team members commit changes regularly with clear, descriptive messages.
  - Pull requests are used for merging, with mandatory code reviews to maintain quality.
  - Merge conflicts are resolved collaboratively, ensuring no loss of work.
- **Tagging & Releases:**
  - Major releases are tagged for easy rollback and deployment tracking.

### 5.2 Collaboration Insights
- **Team Structure:** Five developers contributed to the project, dividing tasks based on expertise (frontend, backend, design, integration).
- **Design Repository:** The design repository contains UI/UX assets and prototypes, kept in sync with the main codebase for consistent user experience.
- **Task Assignment:** Tasks are assigned and tracked using GitHub Issues and Discussions, with regular standups for progress updates.
- **Code Review:** Every pull request is reviewed by at least one other team member before merging, ensuring code quality and knowledge sharing.
- **Continuous Integration:** Automated checks run on each pull request to catch errors early and maintain stability.
- **Benefits:**
  - Enables traceability of changes and accountability.
  - Facilitates teamwork and parallel development.
  - Provides a clear audit trail and rollback capability.
  - Streamlines deployment and release management.


