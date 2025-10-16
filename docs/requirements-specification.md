# Requirements Specification – Dust IRC VS Code Extension

## 1. Introduction

- **Purpose:** Define the functional and non-functional requirements for the Dust IRC VS Code Extension so the single developer can plan, build, and validate the product consistently.
- **Scope:** VS Code extension that connects to IRC servers, negotiates mandatory IRCv3 capabilities, surfaces chat UI/UX, and provides observability and documentation suitable for enterprise environments.
- **References:** `docs/project-charter.md`, `docs/project-plan.md`, `docs/work-breakdown-structure.md`, `docs/adr-0001-irc-protocol.md`.

## 2. Stakeholders & Personas

- **Primary User (Developer/Operator):** Technical staff who need IRC connectivity within VS Code, often juggling multiple servers and requiring secure authentication.
- **Network Administrator:** Configures servers, reviews capability requirements, and provides credentials or SASL setup instructions.
- **Project Maintainer (You):** Solo developer responsible for implementing features, tests, and documentation.

## 3. System Context & Constraints

- Operates as a VS Code extension running inside the editor process.
- Communicates with IRC servers over TCP/TLS; no server-side component introduced.
- Must function when IRC server lacks CAP support, falling back gracefully.
- Network environments may enforce strict auth (SASL) and logging policies.
- No direct access to external telemetry backends; logs remain local by default.

## 4. Functional Requirements

FR-1 Connection Management

- FR-1.1: Provide configuration for server host, port, TLS toggle, nickname, username, realname, and optional password.
- FR-1.2: Establish connection on demand when user activates the extension or chooses to connect via command.
- FR-1.3: Detect connection drops and provide optional automatic reconnect with configurable backoff.
- FR-1.4: Surface connection status via UI (status bar or panel) and actionable notifications on errors.

FR-2 Capability Negotiation

- FR-2.1: Initiate CAP negotiation per RFC 1459/IRCv3 when the server supports it.
- FR-2.2: Request mandatory capabilities (`cap-notify`, `sasl`, `account-tag`, `away-notify`, `server-time`, `message-tags`).
- FR-2.3: Handle servers that decline capabilities by logging the outcome and continuing with best-effort functionality.
- FR-2.4: Operate correctly against servers without CAP support (legacy mode).

FR-3 Authentication

- FR-3.1: Support SASL PLAIN authentication with secure handling of credentials.
- FR-3.2: Provide UI flows for entering/updating credentials and indicate auth success/failure.
- FR-3.3: Allow bypassing SASL when servers do not support it, warning the user if required capabilities are missing.

FR-4 Messaging & Channels

- FR-4.1: Allow users to join, leave, and list channels.
- FR-4.2: Display channel membership and handle server responses for joins/parts/kicks.
- FR-4.3: Send and receive messages in channels and private chats with timestamps.
- FR-4.4: Apply account-tag and message-tags metadata to messages for downstream features (e.g., display sender identity, annotate events).
- FR-4.5: Respect away-notify updates and reflect user states in the UI.

FR-5 User Interface Integration

- FR-5.1: Provide VS Code views for server connections, channel list, and message timeline.
- FR-5.2: Implement command palette entries for connect/disconnect, join/leave, send messages, and open logs.
- FR-5.3: Offer quick pick dialogs or forms for common configuration actions.
- FR-5.4: Support keyboard navigation and adhere to VS Code theming.

FR-6 Observability & Diagnostics

- FR-6.1: Maintain structured logs for connection events, capability negotiation, and errors with timestamp data.
- FR-6.2: Provide an in-extension log viewer and export capability for support.
- FR-6.3: Enable configurable verbosity levels including a debug mode.
- FR-6.4: When telemetry is enabled, emit anonymized event counts (optional future integration) with privacy controls.

FR-7 Configuration & Storage

- FR-7.1: Store user settings using VS Code configuration APIs with sensible defaults.
- FR-7.2: Support multiple server profiles saved in settings.
- FR-7.3: Provide documentation and UI hints for configuration keys.

FR-8 Documentation & Support

- FR-8.1: Include an install and configuration guide bundled with the extension.
- FR-8.2: Publish a capability matrix detailing supported features and requirements.
- FR-8.3: Offer troubleshooting steps covering connection, authentication, and capability negotiation issues.
- FR-8.4: Document known limitations and planned optional capabilities.

## 5. Non-Functional Requirements

- **NFR-1 Reliability:** Extension must sustain a 4-hour continuous session without crashes or memory leaks during soak testing.
- **NFR-2 Performance:** Initial connection and capability negotiation should complete within 5 seconds on typical networks (<200 ms latency).
- **NFR-3 Security:** Credentials handled in memory only; no plaintext logging of passwords; respect VS Code secret storage APIs if used.
- **NFR-4 Usability:** UI must meet VS Code accessibility guidelines (keyboard navigation, ARIA labels, high-contrast themes).
- **NFR-5 Maintainability:** Codebase adheres to TypeScript strict mode, lint rules, and includes unit/integration tests covering core flows.
- **NFR-6 Compatibility:** Support IRC servers conforming to RFC 1459/2810-2813 and mandatory IRCv3 capabilities listed in ADR-0001.
- **NFR-7 Documentation Completeness:** All user-facing flows documented before release; docs updated within one working day of feature change.

## 6. Use Cases

- **UC-1 Connect to Server:** User configures server profile, initiates connection, authenticates successfully, and joins default channel.
- **UC-2 Capability Fallback:** Server declines `account-tag`; extension logs warning, proceeds without metadata, and informs user in status view.
- **UC-3 Reconnect after Drop:** Network interruption occurs; extension attempts reconnect per configured backoff and restores joined channels.
- **UC-4 Message Logging:** User enables debug logging, reproduces issue, exports logs, and shares with admin for diagnosis.
- **UC-5 Multi-Server Profile:** User switches between two saved server configurations without editing JSON manually.

## 7. Acceptance Criteria

- All functional requirements satisfied and demonstrable via manual testing scripts.
- Automated test suite (unit + integration) passes in CI.
- Documentation verified against functionality during release prep.
- Sign-off recorded by project maintainer in project log.

## 8. Open Issues & Future Enhancements

- Evaluate adding SASL EXTERNAL when client certificate requirement emerges.
- Plan for optional IRCv3 features (`batch`, `sts`, `chghost`, `labeled-response`) post-MVP.
- Determine approach for telemetry backend if enterprise adoption requires aggregated insights.

## 9. Traceability Matrix (Excerpt)

| Requirement | Source Document / Decision |
| --- | --- |
| FR-1–FR-4 | `docs/adr-0001-irc-protocol.md`, Project Plan Milestones Weeks 3–6 |
| FR-5 | Project Plan Weeks 7–8 |
| FR-6 | Project Plan Weeks 9–10 |
| FR-7, FR-8 | Project Plan Weeks 11–12 |
| NFR-1, NFR-2 | Project Plan + Solo Testing Strategy |

## 10. Approval

- Maintainer review and approval recorded in project notes upon completion of initial implementation cycle.
