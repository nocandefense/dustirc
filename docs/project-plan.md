Om Namah Shivaya
# Dust IRC VS Code Extension – Project Plan

## 1. Project Overview
- **Objective:** Deliver a VS Code extension that connects to IRC servers, negotiates baseline and required IRCv3 capabilities, and provides a reliable, debuggable client experience for enterprise and legacy environments.
- **Products:** Published VS Code extension package, configuration documentation, operational playbooks, and supporting test harness for protocol coverage.
- **Success Criteria:** Successful connections to at least two reference IRC networks (one legacy, one modern), SASL authentication working end-to-end, capability fallback verified, and user onboarding documented.

## 2. Scope Definition
- **In Scope:** Core connection management, capability negotiation, SASL PLAIN authentication, account tags, away notifications, server timestamps, message tags, VS Code UI surfaces (channel list, message stream, command input), observability hooks, documentation.
- **Out of Scope (Phase 1):** Optional IRCv3 capabilities (batch, sts, chghost, labeled-response), client certificate auth, advanced UI features (threading, reactions), marketplace marketing assets beyond essentials.
- **Assumptions:** Solo developer with 12-week schedule, network captures accessible, target IRC servers support negotiated capability set, no external dependency upgrades mid-cycle.
- **Constraints:** Single contributor capacity, limited integration environments, no production telemetry storage.

## 3. Deliverables
- VS Code extension source tree and automated build scripts.
- Integration test harness with scripted IRC server responses.
- Documentation set (install guide, capability matrix, troubleshooting).
- Maintenance artifacts (ADR updates, roadmap for optional capabilities).

## 4. Milestone Schedule (12 Weeks)
| Phase | Weeks | Outcomes |
| --- | --- | --- |
| Foundations | 1–2 | Tooling confirmed, scope triaged, IRC transcript captures, baseline backlog groomed. |
| Connection Core | 3–4 | Connection manager, capability negotiation scaffold, logging pipeline, integration harness skeleton. |
| Mandatory Capability Slice | 5–6 | SASL (PLAIN) implemented, account-tag/away-notify/server-time/message-tags wired, fallback paths tested. |
| VS Code UX | 7–8 | UI surfaces built, capability-aware interactions implemented, accessibility baseline checked. |
| Observability & Hardening | 9–10 | Debug console, log filtering, soak testing on two networks, performance fixes. |
| Documentation & Packaging | 11 | User/admin docs authored, capability matrix published, marketplace assets polished. |
| Release & Retro | 12 | Preview release pushed, feedback collected, roadmap adjustments logged. |

## 5. Work Breakdown Structure (WBS)
1. **Project Management**
   - Weekly planning, retrospectives, backlog grooming.
2. **Protocol Foundations**
   - Evaluate libraries vs custom implementation.
   - Capture/annotate network transcripts.
3. **Connection & Negotiation**
   - Socket management, reconnect strategy.
   - CAP negotiation flow with fallback handling.
4. **Authentication & Capabilities**
   - SASL PLAIN implementation, error handling.
   - Account tags, away notifications, server time, message tags.
5. **VS Code Integration**
   - Activation logic, status indicators, channel/messaging UI.
   - Command palette contributions, configuration settings.
6. **Testing & Quality**
   - Unit tests for message parsing/state transitions.
   - Integration tests against scripted servers.
   - Manual smoke checklist per milestone.
7. **Observability & Tooling**
   - Logging framework, telemetry toggles, debugging aids.
8. **Documentation & Release**
   - Install/config guides, troubleshooting, capability matrix.
   - Packaging scripts, release notes, ADR updates.

## 6. Resource & Time Management
- **Team:** 1 developer (project lead, engineer, tester).
- **Ceremonies:** Daily written standup log, weekly planning + retro, monthly roadmap review.
- **Tools:** VS Code, WeKan board, Node.js toolchain, mock IRC server harness.
- **Time Allocation:** 70% feature implementation, 20% testing/QA, 10% documentation and PM overhead; adjust weekly based on burndown.

## 7. Risk Management
| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Protocol edge cases break capability negotiation | Medium | High | Acquire diverse server transcripts early, implement feature flags and fallback logic. |
| Schedule slip due to research spikes | Medium | Medium | Timebox spikes, capture outcomes, defer optional capabilities. |
| Debugging complexity slows progress | High | Medium | Invest in logging harness and mock server tests in Weeks 3–4. |
| Solo contributor burnout | Medium | High | Enforce work hours, document decisions promptly, maintain weekly retros to adjust workload. |
| Dependency upgrades introduce regressions | Low | Medium | Lock dependencies, review before updates, rerun integration tests. |

## 8. Quality Management
- **Standards:** ESLint + TypeScript checks, Prettier formatting, TypeScript strict mode.
- **Test Strategy:** Unit tests for parser/state machine logic, integration tests via mock server scenarios (success, capability decline, legacy server). Manual regression checklist before each milestone.
- **Acceptance Criteria:** Each user story includes validation steps, logging coverage, and documentation updates.

## 9. Communication Plan
- **Status Updates:** Weekly summary in project journal + WeKan board lane review.
- **Decision Records:** ADR updates stored under `docs/`.
- **Issues & Blockers:** Logged as WeKan comments with next-action date.
- **Stakeholder Reporting:** Monthly email/report summarizing progress, risks, and upcoming milestones.

## 10. Change Control
- Document scope changes in backlog with impact assessment.
- Update ADRs for any protocol or architecture decisions.
- Re-baseline schedule after any change exceeding one-week effort delta.

## 11. Project Closeout
- Finalize documentation, archive WeKan board, tag release in repo.
- Conduct solo retrospective → capture lessons learned and backlog for optional capabilities.
- Transition plan for maintenance (update cadence, monitoring hooks, dependency review schedule).

## 12. Typical Project Management Documents
- **Project Charter:** High-level objectives, stakeholders, constraints.
- **Project Plan (this document):** Scope, schedule, resources, risk, quality frameworks.
- **Work Breakdown Structure (WBS):** Hierarchical task decomposition.
- **Requirements Specification:** Functional and non-functional requirements.
- **Risk Register:** Tracked risks with mitigation strategies.
- **Communication Plan:** Stakeholder touchpoints, cadence, formats.
- **Budget/Resource Plan:** Allocation of time, cost, tooling.
- **Quality/Test Plan:** Testing approaches, acceptance criteria, metrics.
- **Change Log / Change Control Register:** Approved changes with rationale.
- **Issue Log:** Active blockers with owners and resolutions.
- **Status Reports:** Periodic progress summaries for stakeholders.
- **Lessons Learned / Retrospective Report:** Post-milestone insights.
