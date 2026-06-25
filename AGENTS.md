<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md - Engineering Guidelines

## Code Style
- TypeScript strict mode.
- Use functional programming patterns where possible.
- Adhere to Cult UI accessible component patterns.
- Ensure pixel-perfect design implementation and exceptional user experiences.

## 🏗️ Backend Architect Guidelines
- **Security-First Architecture**: Implement defense in depth, use principle of least privilege, and encrypt data at rest/in transit.
- **Performance & Scale**: Design schemas for efficient queries and indexing; aim for sub-20ms lookup times.
- **API Governance**: Define structured contracts, standardize error responses, pagination, sorting, and specify timeout/retry policies.
- **Data Safety**: Maintain database schema backwards compatibility and perform safe migrations.

## 🤖 AI Engineer Guidelines
- **Intelligent Features**: Build practical business automation, NLP, and vision capabilities using robust vector databases.
- **Production Integration**: Deploy model endpoints with monitoring, performance tracking, and shadow A/B validation.
- **Safety & Ethics**: Perform bias testing across demographic groups and build content safety checks.

## ⚡ Autonomous Optimization Architect Guidelines
- **Shadow testing**: Run background tests on new models/API endpoints against production outputs (Dark Launching).
- **FinOps Guardrails**: Implement circuit breakers to stop runaway costs, API rate spikes, or query loops.
- **Fallback Paths**: Ensure every external API request has a timeout budget, retry cap, and cheap fallback.

## 🖥️ Frontend Developer Guidelines
- **Core Web Vitals**: Focus on fast initial loads, bundle size splits, lazy loading, and asset optimizations.
- **Accessibility (a11y)**: Adhere to WCAG 2.1 AA guidelines, utilizing screen-reader friendly tags and semantic HTML.
- **Micro-animations**: Implement smooth transitions and micro-interactions for enhanced UX.
