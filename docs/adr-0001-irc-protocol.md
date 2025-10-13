# ADR 0001 – IRC Protocol Support Strategy

- **Status:** Proposed
- **Date:** 2024-11-02
- **Context:** The VS Code extension needs to speak IRC in a way that stays compatible with legacy networks while meeting modern enterprise expectations for authentication, observability, and extensibility.

## Decision

1. **Baseline protocol:** Implement RFC 1459 with clarifications from RFC 2810, RFC 2811, RFC 2812, and RFC 2813 to ensure compatibility with the widest set of IRC servers.
2. **Mandatory IRCv3 capabilities:** Negotiate and support the following capabilities to cover enterprise requirements and modern clients:
   - `cap-notify`
   - `sasl` (prefer `sasl/plain`, add `sasl/external` when client certificates become a requirement)
   - `account-tag`
   - `away-notify`
   - `server-time`
   - `message-tags`
3. **Optional capabilities roadmap:** Track additional IRCv3 extensions (e.g., `batch`, `sts`, `chghost`, `labeled-response`) and adopt them once they appear on target networks or unblock extension features.
4. **Spec changes:** Monitor [ircv3.net](https://ircv3.net/irc/) for updates; revisit this ADR whenever the supported capability set changes materially.

## Rationale

- **Longevity:** RFC 1459 + 2810–2813 remain the de facto baseline across public and private networks.
- **Enterprise readiness:** SASL-backed auth, account tagging, and server time simplify audit trails and identity integration.
- **Client UX:** Away indicators, message tags, and server timestamps keep the UI in sync and support richer interactions (e.g., threading, reactions).
- **Future-proofing:** A documented roadmap lets the team phase in IRCv3 features without losing sight of compatibility constraints.

## Consequences

- Connection and capability negotiation logic must handle both legacy servers (no `CAP` support) and modern ones gracefully.
- Testing needs coverage for each negotiated capability, including fallback behavior when a server declines a capability.
- Documentation should surface which capabilities are required vs. optional so administrators can prepare their servers accordingly.
- Maintenance work includes watching for IRCv3 working group updates and revisiting the capability set as requirements evolve.

## References

- [RFC 1459: Internet Relay Chat Protocol](https://www.rfc-editor.org/rfc/rfc1459)
- [RFC 2810: Internet Relay Chat: Architecture](https://www.rfc-editor.org/rfc/rfc2810)
- [RFC 2811: Internet Relay Chat: Channel Management](https://www.rfc-editor.org/rfc/rfc2811)
- [RFC 2812: Internet Relay Chat: Client Protocol](https://www.rfc-editor.org/rfc/rfc2812)
- [RFC 2813: Internet Relay Chat: Server Protocol](https://www.rfc-editor.org/rfc/rfc2813)
- [IRCv3 Working Group Specifications](https://ircv3.net/irc/)
