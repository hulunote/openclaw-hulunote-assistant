# AGENTS.md

## Project

TypeScript project using Node.js. OpenClaw plugin for Hulunote note management.

## Code Style

* Prefer `unknown` over `any`
* Avoid type assertions (`as`) unless necessary
* Export types for public APIs
* Prefer pure functions when possible
* Prefer **async/await** over callbacks

## Error Handling

* Avoid using exceptions for normal control flow
* Prefer returning Result-style values or undefined
* Only throw exceptions for unexpected failures

## Testing

* Write tests for new features
* Update tests when behavior changes
* Use descriptive test names

## Rules for Agents

* Do not change dependencies unless necessary
