# Project Charter – Dust IRC VS Code Extension

## 1. Executive Summary

Create and release a VS Code extension that connects reliably to legacy and modern IRC networks, negotiating mandatory IRCv3 capabilities to support enterprise use cases while maintaining backward compatibility.

## 2. Purpose & Objectives

- Deliver a manageable, debuggable IRC client experience inside VS Code for teams operating across heterogeneous IRC infrastructures.
- Provide SASL-backed authentication, capability-aware behaviors, and transparent observability to simplify support and audits.
- Establish a foundation for future capability expansions without disrupting existing users.

## 3. Scope Overview

- **Included:** Connection management, capability negotiation (baseline + mandatory IRCv3 list), SASL PLAIN auth, UI surfaces (channel navigation, messaging), logging/telemetry hooks, documentation, automated tests.
- **Excluded (Phase 1):** Optional IRCv3 extensions (batch, sts, chghost, labeled-response), advanced UI enhancements (threading, reactions), client certificate auth, marketing campaigns beyond marketplace essentials.

## 4. Success Metrics

- Connects and negotiates capabilities with at least one legacy (no CAP) and one modern IRC server.
- SASL PLAIN authentication succeeds in scripted integration tests and manual trials.
- Capability fallback paths verified for each mandatory capability; automated tests green.
- Extension published (preview/release) with install instructions and troubleshooting guide.
- At least one week of manual soak testing without critical defects.

## 5. Schedule Baseline

- **Planned Duration:** 12 weeks (see `docs/project-plan.md` for milestone breakdown).
- **Key Milestones:** Foundation (Week 2), Connection Core (Week 4), Capability Slice (Week 6), VS Code UX (Week 8), Hardening (Week 10), Release Prep (Week 11), Launch & Retro (Week 12).

## 6. Stakeholders & Roles

- **Project Lead / Engineer / Tester:** Solo contributor (you). Responsible for delivery, risk management, documentation.
- **Advisors / Future Stakeholders:** Potential end users, IRC network admins, extension marketplace reviewers (consulted as needed).

## 7. Assumptions & Constraints

- Solo time availability supports ~25–30 focused hours per week.
- Access to representative IRC servers or transcripts for testing.
- Node.js/TypeScript toolchain remains stable during project window.
- No budget for external contractors or paid infrastructure.

## 8. Risks & High-Level Mitigations

- **Protocol edge cases:** Collect transcripts early; maintain feature flags.
- **Time overruns:** Timebox research spikes; defer non-essential capabilities.
- **Debug complexity:** Invest in observability tooling during Connection Core phase.
- **Solo fatigue:** Maintain weekly retrospectives and adjust workload promptly.

## 9. Approval & Governance

- Charter owner approves scope changes and schedule adjustments (self-approval logged in project notes).
- Decisions impacting protocol or architecture captured as ADRs in `docs/`.

## 10. Communication Plan Summary

- Daily written standup log (personal).
- Weekly status/retro note stored alongside WeKan board.
- Monthly roadmap review and stakeholder update summary.

## 11. Deliverable Acceptance

- Deliverables accepted when they meet defined success metrics, pass agreed tests, and documentation is updated. Acceptance recorded in project log at milestone checkpoints.
